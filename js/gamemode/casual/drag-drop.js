(function setupCasualDragDrop(root) {
  let compatibleDragState = null;
  const dependencies = {};

  function setup(options = {}) {
    Object.assign(dependencies, options);
  }

  function getDeckElement() {
    return dependencies.deckElement || document.getElementById('deck');
  }

  function getGraveyardArea() {
    return dependencies.graveyardArea || document.getElementById('graveyardArea');
  }

  function isSamsungDragModeEnabled() {
    const handler = dependencies.isSamsungDragModeEnabled || root.isSamsungDragModeEnabled;
    return typeof handler === 'function' ? handler() : false;
  }

  function hideCardTooltip() {
    const handler = dependencies.hideCardTooltip || root.hideCardTooltip;
    if (typeof handler === 'function') handler();
  }

  function resetBalatroElement(element) {
    const handler = dependencies.resetBalatroElement;
    if (typeof handler === 'function') handler(element);
  }

  function drawCard(targetPid) {
    const handler = dependencies.drawCard || root.drawCard;
    if (typeof handler === 'function') handler(targetPid);
  }

  function moveCard(cardId, targetLocation, targetPlayerId) {
    const handler = dependencies.moveCard || root.moveCard;
    if (typeof handler === 'function') handler(cardId, targetLocation, targetPlayerId);
  }

  function burnTopCard() {
    const handler = dependencies.burnTopCard || root.burnTopCard;
    if (typeof handler === 'function') handler();
  }

  function refreshSamsungDragMode() {
    const handler = dependencies.refreshSamsungDragMode || root.refreshSamsungDragMode;
    if (typeof handler === 'function') handler();
  }

  function createCompatibleDragGhost(sourceElement, pointerEvent) {
    const sourceRect = sourceElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(sourceElement);
    const ghost = sourceElement.cloneNode(true);
    const isDeckGhost = sourceElement.id === 'deck';

    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    if (isDeckGhost) ghost.replaceChildren();
    ghost.classList.remove('balatro-effect', 'is-tilting', 'is-dragging', 'lifting');
    ghost.classList.add('compatible-drag-ghost');
    ghost.style.width = `${sourceRect.width}px`;
    ghost.style.height = `${sourceRect.height}px`;
    ghost.style.aspectRatio = computedStyle.aspectRatio;
    ghost.style.backgroundImage = computedStyle.backgroundImage;
    ghost.style.backgroundColor = computedStyle.backgroundColor;
    ghost.style.backgroundSize = computedStyle.backgroundSize;
    ghost.style.backgroundPosition = computedStyle.backgroundPosition;
    ghost.style.backgroundRepeat = computedStyle.backgroundRepeat;
    ghost.style.borderRadius = computedStyle.borderRadius;
    ghost.style.border = computedStyle.border;
    ghost.style.color = 'transparent';
    ghost.style.textIndent = '-9999px';
    ghost.style.overflow = 'hidden';
    ghost.style.left = `${pointerEvent.clientX}px`;
    ghost.style.top = `${pointerEvent.clientY}px`;
    ghost.style.setProperty('--tilt-x', '0deg');
    ghost.style.setProperty('--tilt-y', '0deg');
    ghost.style.setProperty('--card-scale', '1');
    ghost.style.setProperty('--card-lift', '0px');
    ghost.style.setProperty('--card-base-shift', '0px');
    ghost.style.setProperty('--card-base-rotation', '0deg');
    ghost.style.removeProperty('--glow-x');
    ghost.style.removeProperty('--glow-y');
    document.body.appendChild(ghost);

    return ghost;
  }

  function activateCompatibleDrag(event) {
    if (!compatibleDragState || compatibleDragState.activated) return;

    event.preventDefault();
    hideCardTooltip();
    resetBalatroElement(compatibleDragState.sourceElement);
    compatibleDragState.sourceElement?.classList.add('is-compatible-drag-source');
    compatibleDragState.ghost = createCompatibleDragGhost(compatibleDragState.sourceElement, event);
    compatibleDragState.activated = true;
    compatibleDragState.sourceElement?.classList.add('is-dragging');
  }

  function getCompatibleDropzone(clientX, clientY) {
    if (!compatibleDragState?.ghost) return null;

    compatibleDragState.ghost.style.display = 'none';
    const elementBelowPointer = document.elementFromPoint(clientX, clientY);
    compatibleDragState.ghost.style.display = '';

    if (!elementBelowPointer) return null;

    const playerArea = elementBelowPointer.closest('.player-area');
    if (playerArea && !playerArea.classList.contains('is-empty')) {
      return playerArea;
    }

    const graveyardDropzone = elementBelowPointer.closest('#graveyardArea');
    if (graveyardDropzone) return graveyardDropzone;

    const deckDropzone = elementBelowPointer.closest('#deck');
    if (deckDropzone) return deckDropzone;

    return null;
  }

  function updateCompatibleDropHighlight(dropzone) {
    if (compatibleDragState?.dropzone === dropzone) return;

    compatibleDragState?.dropzone?.classList.remove('compatible-drop-hover');
    if (dropzone) dropzone.classList.add('compatible-drop-hover');
    if (compatibleDragState) compatibleDragState.dropzone = dropzone;
  }

  function finishCompatibleDrag() {
    if (!compatibleDragState) return;

    compatibleDragState.dropzone?.classList.remove('compatible-drop-hover');
    compatibleDragState.sourceElement?.classList.remove('is-dragging');
    compatibleDragState.sourceElement?.classList.remove('is-compatible-drag-source');
    resetBalatroElement(compatibleDragState.sourceElement);
    compatibleDragState.ghost?.remove();
    compatibleDragState = null;

    document.removeEventListener('pointermove', onCompatiblePointerMove);
    document.removeEventListener('pointerup', onCompatiblePointerUp);
    document.removeEventListener('pointercancel', onCompatiblePointerCancel);
  }

  function handleCompatibleDrop(dragData, dropzone, wasTap) {
    if (!dropzone) return;

    if (dropzone.id === 'deck') {
      if (dragData === 'DECK_DRAW_ACTION') {
        if (wasTap) drawCard();
        return;
      }

      moveCard(dragData, 'deck');
      return;
    }

    if (dropzone.id === 'graveyardArea') {
      if (dragData === 'DECK_DRAW_ACTION') {
        burnTopCard();
        return;
      }

      moveCard(dragData, 'free');
      return;
    }

    if (dropzone.classList.contains('player-area')) {
      const pid = parseInt(dropzone.dataset.player, 10);
      if (!pid) return;

      if (dragData === 'DECK_DRAW_ACTION') {
        drawCard(pid);
        return;
      }

      moveCard(dragData, 'player', pid);
    }
  }

  function onCompatiblePointerMove(event) {
    if (!compatibleDragState) return;

    const deltaX = event.clientX - compatibleDragState.startX;
    const deltaY = event.clientY - compatibleDragState.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > 6) {
      compatibleDragState.hasMoved = true;
      activateCompatibleDrag(event);
    }

    if (!compatibleDragState?.activated || !compatibleDragState.ghost) return;

    event.preventDefault();

    compatibleDragState.ghost.style.left = `${event.clientX}px`;
    compatibleDragState.ghost.style.top = `${event.clientY}px`;

    const dropzone = getCompatibleDropzone(event.clientX, event.clientY);
    updateCompatibleDropHighlight(dropzone);
  }

  function onCompatiblePointerUp(event) {
    if (!compatibleDragState) return;

    const { data, dropzone, activated, hasMoved } = compatibleDragState;
    const finalDropzone = activated ? (dropzone || getCompatibleDropzone(event.clientX, event.clientY)) : null;
    finishCompatibleDrag();

    if (!activated) {
      if (data === 'DECK_DRAW_ACTION' && !hasMoved) drawCard();
      return;
    }

    event.preventDefault();
    handleCompatibleDrop(data, finalDropzone, false);
  }

  function onCompatiblePointerCancel() {
    finishCompatibleDrag();
  }

  function startCompatiblePointerDrag(sourceElement, dragData, event) {
    if (
      !isSamsungDragModeEnabled()
      || (event.button !== undefined && event.button !== 0)
      || event.detail > 1
    ) return;

    finishCompatibleDrag();

    compatibleDragState = {
      activated: false,
      data: dragData,
      dropzone: null,
      ghost: null,
      hasMoved: false,
      sourceElement,
      startX: event.clientX,
      startY: event.clientY
    };

    sourceElement.setPointerCapture?.(event.pointerId);
    sourceElement.addEventListener('lostpointercapture', () => {
      sourceElement.classList.remove('is-dragging');
    }, { once: true });

    document.addEventListener('pointermove', onCompatiblePointerMove, { passive: false });
    document.addEventListener('pointerup', onCompatiblePointerUp, { passive: false });
    document.addEventListener('pointercancel', onCompatiblePointerCancel, { passive: false });
  }

  function attachCompatiblePointerDrag(element, dragData) {
    if (!element || element.dataset.compatibleDragBound === 'true') return;

    element.dataset.compatibleDragBound = 'true';
    element.addEventListener('pointerdown', (event) => {
      startCompatiblePointerDrag(element, dragData, event);
    }, { passive: false });
  }

  function setupDropzones() {
    const deckElement = getDeckElement();
    const graveyardArea = getGraveyardArea();
    if (!deckElement || !graveyardArea) return;

    deckElement.addEventListener('dragstart', (event) => {
      if (isSamsungDragModeEnabled()) {
        event.preventDefault();
        return;
      }

      hideCardTooltip();
      event.dataTransfer.setData('text/plain', 'DECK_DRAW_ACTION');
    });

    deckElement.ondragover = (event) => event.preventDefault();
    deckElement.ondrop = (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('text/plain');
      if (id !== 'DECK_DRAW_ACTION') moveCard(id, 'deck');
    };

    deckElement.onclick = () => {
      if (!isSamsungDragModeEnabled()) drawCard();
    };
    deckElement.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        drawCard();
      }
    };

    document.querySelectorAll('.player-area').forEach((area) => {
      area.ondragover = (event) => {
        if (!area.classList.contains('is-empty')) event.preventDefault();
      };
      area.ondrop = (event) => {
        event.preventDefault();
        if (area.classList.contains('is-empty')) return;

        const data = event.dataTransfer.getData('text/plain');
        const pid = parseInt(area.dataset.player, 10);

        if (data === 'DECK_DRAW_ACTION') {
          drawCard(pid);
        } else {
          moveCard(data, 'player', pid);
        }
      };
    });

    graveyardArea.ondragover = (event) => event.preventDefault();
    graveyardArea.ondrop = (event) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('text/plain');

      if (data === 'DECK_DRAW_ACTION') {
        burnTopCard();
      } else {
        moveCard(data, 'free');
      }
    };

    attachCompatiblePointerDrag(deckElement, 'DECK_DRAW_ACTION');
    refreshSamsungDragMode();
  }

  root.CoupDragDrop = {
    setup,
    setupDropzones,
    attachCompatiblePointerDrag,
    finishCompatibleDrag
  };

  root.setupDropzones = setupDropzones;
  root.attachCompatiblePointerDrag = attachCompatiblePointerDrag;
})(window);
