(function setupCasualDragDrop(root) {
  const CARD_PHYSICS = Object.freeze({
    spring: 0.18,
    damping: 0.86,
    pointerLag: 0.28,
    tiltMax: 46,
    swing: 0.18,
    lift: 36,
    dragScale: 1,
    returnScale: 1,
    repelForce: 72,
    repelRadius: 178,
    fanGap: 84,
    fanCurve: 0,
    fanRotation: 0,
    friction: 0.88
  });
  const CARD_PHYSICS_REFERENCE_WIDTH = 150;

  let compatibleDragState = null;
  let compatibleDragFrame = null;
  let compatibleDragLastTime = 0;
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

  function moveCard(cardId, targetLocation, targetPlayerId, options) {
    const handler = dependencies.moveCard || root.moveCard;
    if (typeof handler === 'function') handler(cardId, targetLocation, targetPlayerId, options);
  }

  function burnTopCard() {
    const handler = dependencies.burnTopCard || root.burnTopCard;
    if (typeof handler === 'function') handler();
  }

  function refreshSamsungDragMode() {
    const handler = dependencies.refreshSamsungDragMode || root.refreshSamsungDragMode;
    if (typeof handler === 'function') handler();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getScaledCardPhysics(sourceRect) {
    const cardWidth = sourceRect?.width || CARD_PHYSICS_REFERENCE_WIDTH;
    const scaleFactor = clamp(cardWidth / CARD_PHYSICS_REFERENCE_WIDTH, 0.32, 1);
    const angularFactor = clamp(0.48 + scaleFactor * 0.52, 0.55, 1);

    return {
      ...CARD_PHYSICS,
      scaleFactor,
      lift: CARD_PHYSICS.lift * scaleFactor,
      repelForce: CARD_PHYSICS.repelForce * scaleFactor,
      repelRadius: CARD_PHYSICS.repelRadius * scaleFactor,
      swing: CARD_PHYSICS.swing * angularFactor,
      tiltMax: CARD_PHYSICS.tiltMax * angularFactor
    };
  }

  function getSourceBaseRotation(sourceElement) {
    const slot = sourceElement?.closest('.slot');
    if (!slot) return 0;

    const rawRotation = slot.style.getPropertyValue('--slot-base-rotation')
      || window.getComputedStyle(slot).getPropertyValue('--slot-base-rotation');
    const rotation = parseFloat(rawRotation);
    return Number.isFinite(rotation) ? rotation : 0;
  }

  function stopCompatibleDragPhysics() {
    if (compatibleDragFrame !== null) {
      cancelAnimationFrame(compatibleDragFrame);
      compatibleDragFrame = null;
    }
  }

  function getCompatiblePhysicsScope(sourceElement) {
    if (!sourceElement) return null;

    const handContainer = sourceElement.closest('[data-hand]');
    if (handContainer) {
      return {
        element: handContainer,
        selector: '.slot .card'
      };
    }

    const graveyardContainer = sourceElement.closest('.graveyard-cards');
    if (graveyardContainer) {
      return {
        element: graveyardContainer,
        selector: '.graveyard-card'
      };
    }

    return null;
  }

  function getMedian(values) {
    if (!values.length) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function getCompatiblePhysicsSetup(sourceElement, physics) {
    const scope = getCompatiblePhysicsScope(sourceElement);
    if (!scope?.element) {
      return {
        repelRadius: physics.repelRadius,
        targets: []
      };
    }

    const cards = Array.from(new Set(scope.element.querySelectorAll(scope.selector)))
      .filter((element) => (
        element.offsetParent !== null
        && !element.classList.contains('is-returning-to-deck')
        && !element.closest('.player-area.is-empty')
      ));

    const centers = cards
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left + (rect.width / 2);
      })
      .sort((a, b) => a - b);
    const gaps = centers
      .slice(1)
      .map((center, index) => center - centers[index])
      .filter((gap) => gap > 1);
    const medianGap = getMedian(gaps);
    const repelRadius = medianGap
      ? Math.min(physics.repelRadius, medianGap * 2.15)
      : physics.repelRadius;

    const targets = cards
      .filter((element) => (
        element !== sourceElement
      ))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--card-repel-x', '0px');
        element.style.setProperty('--card-repel-y', '0px');

        return {
          angle: 0,
          angleVelocity: 0,
          baseRect: rect,
          element,
          isRepelled: false,
          pushX: 0,
          pushY: 0,
          vx: 0,
          vy: 0,
          x: 0,
          y: 0
        };
      });

    return {
      repelRadius,
      targets
    };
  }

  function getElementIndex(element, selector) {
    if (!element?.parentElement) return null;

    const items = Array.from(element.parentElement.querySelectorAll(selector))
      .filter((item) => item.offsetParent !== null);
    const index = items.indexOf(element);
    return index >= 0 ? index : null;
  }

  function getSourceMeta(sourceElement) {
    if (!sourceElement) return { location: null, playerId: null, index: null };

    if (sourceElement.id === 'deck') {
      return { location: 'deck', playerId: null, index: null };
    }

    if (sourceElement.classList.contains('graveyard-card')) {
      return {
        location: 'free',
        playerId: null,
        index: getElementIndex(sourceElement, '.graveyard-card')
      };
    }

    const sourceSlot = sourceElement.closest('.slot');
    const playerArea = sourceElement.closest('.player-area');
    const playerId = playerArea ? parseInt(playerArea.dataset.player, 10) : null;

    if (sourceSlot && playerId) {
      return {
        location: 'player',
        playerId,
        index: getElementIndex(sourceSlot, '.slot')
      };
    }

    return { location: null, playerId: null, index: null };
  }

  function resetCompatiblePhysicsCards(targets = []) {
    targets.forEach((target) => {
      target.element.classList.remove('is-physics-repel-target');
      target.element.style.removeProperty('--card-repel-x');
      target.element.style.removeProperty('--card-repel-y');
      target.element.style.removeProperty('--card-base-rotation');
    });
  }

  function applyCompatibleRepulsion(state, delta) {
    const targets = state.physicsTargets || [];
    if (!targets.length) return;
    const physics = state.physics || CARD_PHYSICS;

    const draggedCenterX = state.x + (state.width / 2);
    const draggedCenterY = state.y + (state.height / 2);

    targets.forEach((target) => {
      target.isRepelled = false;
      target.pushX = 0;
      target.pushY = 0;
    });

    targets.forEach((target) => {
      const centerX = target.baseRect.left + target.x + (target.baseRect.width / 2);
      const centerY = target.baseRect.top + target.y + (target.baseRect.height / 2);
      const dx = centerX - draggedCenterX;
      const dy = centerY - draggedCenterY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const overlap = Math.max(0, physics.repelRadius - distance);

      if (overlap <= 0) return;

      const strength = (overlap / physics.repelRadius) * physics.repelForce;
      const biasY = dy < 0 ? -0.38 : 0.38;
      target.isRepelled = true;
      target.pushX += (dx / distance) * strength;
      target.pushY += (dy / distance + biasY) * strength * 0.55;
    });

    targets.forEach((target) => {
      const springX = (target.pushX - target.x) * physics.spring;
      const springY = (target.pushY - target.y) * physics.spring;
      target.vx = (target.vx + springX) * physics.damping * physics.friction;
      target.vy = (target.vy + springY) * physics.damping * physics.friction;
      target.x += target.vx * delta;
      target.y += target.vy * delta;

      const velocityTilt = clamp(target.vx * physics.swing, -physics.tiltMax, physics.tiltMax);
      const targetAngle = velocityTilt + target.pushX * 0.035;
      target.angleVelocity = (target.angleVelocity + (targetAngle - target.angle) * 0.16) * 0.78;
      target.angle += target.angleVelocity * delta;

      const isVisuallyActive = target.isRepelled
        || Math.abs(target.x) > 0.25
        || Math.abs(target.y) > 0.25
        || Math.abs(target.vx) > 0.2
        || Math.abs(target.vy) > 0.2;
      target.element.classList.toggle('is-physics-repel-target', isVisuallyActive);
      target.element.style.setProperty('--card-repel-x', `${target.x.toFixed(2)}px`);
      target.element.style.setProperty('--card-repel-y', `${target.y.toFixed(2)}px`);
      target.element.style.setProperty('--card-base-rotation', `${target.angle.toFixed(2)}deg`);
    });
  }

  function scheduleCompatibleDragPhysics() {
    if (compatibleDragFrame !== null) return;
    compatibleDragFrame = requestAnimationFrame(updateCompatibleDragPhysics);
  }

  function updateCompatibleDragPhysics(now) {
    compatibleDragFrame = null;
    if (!compatibleDragState?.activated || !compatibleDragState.ghost) return;

    const state = compatibleDragState;
    const physics = state.physics || CARD_PHYSICS;
    const delta = compatibleDragLastTime
      ? Math.min(2.2, (now - compatibleDragLastTime) / 16.667)
      : 1;
    compatibleDragLastTime = now;

    if (state.returning) {
      state.tx = state.returnX;
      state.ty = state.returnY;
    } else {
      const pointerTargetX = state.pointerX - state.pointerOffsetX;
      const pointerTargetY = state.pointerY - state.pointerOffsetY - physics.lift;
      state.tx += (pointerTargetX - state.tx) * physics.pointerLag;
      state.ty += (pointerTargetY - state.ty) * physics.pointerLag;
    }

    const returnSpring = state.returning ? physics.spring * 0.62 : physics.spring;
    const returnDamping = state.returning ? 0.72 : physics.damping;
    const springX = (state.tx - state.x) * returnSpring;
    const springY = (state.ty - state.y) * returnSpring;
    state.vx = (state.vx + springX) * returnDamping;
    state.vy = (state.vy + springY) * returnDamping;
    state.x += state.vx * delta;
    state.y += state.vy * delta;

    const velocityTilt = state.returning ? 0 : clamp(state.vx * physics.swing, -physics.tiltMax, physics.tiltMax);
    const targetAngle = state.returning ? state.returnAngle : velocityTilt;
    state.angleVelocity = (state.angleVelocity + (targetAngle - state.angle) * 0.16) * 0.78;
    state.angle += state.angleVelocity * delta;
    const targetScale = state.returning ? physics.returnScale : physics.dragScale;
    state.scale += (targetScale - state.scale) * 0.18;

    state.ghost.style.left = `${state.x}px`;
    state.ghost.style.top = `${state.y}px`;
    state.ghost.style.transform = `translate3d(0, 0, 0) rotate(${state.angle.toFixed(2)}deg) scale(${state.scale.toFixed(3)})`;
    if (!state.returning) {
      applyCompatibleRepulsion(state, delta);
    }

    if (state.returning) {
      const distance = Math.hypot(state.returnX - state.x, state.returnY - state.y);
      const speed = Math.hypot(state.vx, state.vy);
      const angleDistance = Math.abs(state.returnAngle - state.angle);
      if (distance < 1.4 && speed < 0.7 && angleDistance < 0.8 && Math.abs(state.scale - physics.returnScale) < 0.02) {
        finishCompatibleDrag();
        return;
      }
    }

    scheduleCompatibleDragPhysics();
  }

  function createCompatibleDragGhost(sourceElement, sourceRect) {
    const computedStyle = window.getComputedStyle(sourceElement);
    const ghost = sourceElement.cloneNode(true);
    const isDeckGhost = sourceElement.id === 'deck';

    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    if (isDeckGhost) ghost.replaceChildren();
    ghost.classList.remove('balatro-effect', 'is-tilting', 'is-physics-active', 'is-dragging', 'lifting');
    ghost.classList.add('compatible-drag-ghost', 'card-physics-ghost');
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
    ghost.style.left = `${sourceRect.left}px`;
    ghost.style.top = `${sourceRect.top}px`;
    ghost.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
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
    const sourceRect = compatibleDragState.sourceElement.getBoundingClientRect();
    const physics = getScaledCardPhysics(sourceRect);
    const physicsSetup = getCompatiblePhysicsSetup(compatibleDragState.sourceElement, physics);
    compatibleDragState.ghost = createCompatibleDragGhost(compatibleDragState.sourceElement, sourceRect);
    compatibleDragState.physics = {
      ...physics,
      repelRadius: physicsSetup.repelRadius
    };
    compatibleDragState.sourceSlot = compatibleDragState.sourceElement.closest('.slot');
    compatibleDragState.sourceGraveyardCard = compatibleDragState.sourceElement.classList.contains('graveyard-card')
      ? compatibleDragState.sourceElement
      : null;
    compatibleDragState.sourceElement?.classList.add('is-compatible-drag-source');
    compatibleDragState.sourceSlot?.classList.add('is-compatible-drag-source-slot');
    compatibleDragState.sourceGraveyardCard?.classList.add('is-compatible-drag-source-graveyard-card');
    compatibleDragState.returnX = sourceRect.left;
    compatibleDragState.returnY = sourceRect.top;
    compatibleDragState.returnAngle = getSourceBaseRotation(compatibleDragState.sourceElement);
    compatibleDragState.pointerX = event.clientX;
    compatibleDragState.pointerY = event.clientY;
    compatibleDragState.pointerOffsetX = event.clientX - sourceRect.left;
    compatibleDragState.pointerOffsetY = event.clientY - sourceRect.top;
    compatibleDragState.width = sourceRect.width;
    compatibleDragState.height = sourceRect.height;
    compatibleDragState.x = sourceRect.left;
    compatibleDragState.y = sourceRect.top;
    compatibleDragState.tx = sourceRect.left;
    compatibleDragState.ty = sourceRect.top;
    compatibleDragState.vx = 0;
    compatibleDragState.vy = 0;
    compatibleDragState.angle = 0;
    compatibleDragState.angleVelocity = 0;
    compatibleDragState.scale = 1;
    compatibleDragState.physicsTargets = physicsSetup.targets;
    compatibleDragState.activated = true;
    compatibleDragState.sourceElement?.classList.add('is-dragging');
    compatibleDragLastTime = 0;
    scheduleCompatibleDragPhysics();
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

  function getHorizontalInsertIndex(container, itemSelector, clientX, excludedCardId = null) {
    if (!container) return null;

    const items = Array.from(container.querySelectorAll(itemSelector))
      .filter((item) => (
        item.offsetParent !== null
        && item.dataset.cardId !== excludedCardId
        && item.querySelector?.('.card')?.dataset.cardId !== excludedCardId
        && !item.classList.contains('is-compatible-drag-source-slot')
        && !item.classList.contains('is-compatible-drag-source-graveyard-card')
        && !item.querySelector?.('.is-compatible-drag-source')
      ));

    if (!items.length) return 0;

    return items.reduce((index, item) => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      return clientX > centerX ? index + 1 : index;
    }, 0);
  }

  function getDropOptions(dropzone, clientX, draggedCardId = null) {
    if (!dropzone) return {};

    if (dropzone.id === 'graveyardArea') {
      const graveyardCards = dropzone.querySelector('.graveyard-cards') || dropzone;
      return {
        insertIndex: getHorizontalInsertIndex(graveyardCards, '.graveyard-card', clientX, draggedCardId)
      };
    }

    if (dropzone.classList.contains('player-area')) {
      const handContainer = dropzone.querySelector('[data-hand]');
      return {
        insertIndex: getHorizontalInsertIndex(handContainer, '.slot', clientX, draggedCardId)
      };
    }

    return {};
  }

  function getDropTargetMeta(dropzone) {
    if (!dropzone) return { location: null, playerId: null };

    if (dropzone.id === 'graveyardArea') {
      return { location: 'free', playerId: null };
    }

    if (dropzone.classList.contains('player-area')) {
      const playerId = parseInt(dropzone.dataset.player, 10);
      return { location: 'player', playerId: Number.isFinite(playerId) ? playerId : null };
    }

    if (dropzone.id === 'deck') {
      return { location: 'deck', playerId: null };
    }

    return { location: null, playerId: null };
  }

  function isSameContainerDrop(sourceMeta, targetMeta) {
    if (!sourceMeta || !targetMeta) return false;
    if (sourceMeta.location !== targetMeta.location) return false;
    if (sourceMeta.location === 'player') return sourceMeta.playerId === targetMeta.playerId;
    return sourceMeta.location === 'free';
  }

  function shouldReturnSameContainerDrop(sourceMeta, targetMeta, dropOptions) {
    if (!isSameContainerDrop(sourceMeta, targetMeta)) return false;
    if (!Number.isInteger(sourceMeta.index) || !Number.isInteger(dropOptions.insertIndex)) return false;
    return sourceMeta.index === dropOptions.insertIndex;
  }

  function getRenderedCardElement(cardId) {
    if (!cardId || cardId === 'DECK_DRAW_ACTION') return null;

    return Array.from(document.querySelectorAll('[data-card-id]'))
      .find((element) => element.dataset.cardId === cardId) || null;
  }

  function resolveSameContainerDrop(sourceMeta, targetMeta, dropOptions) {
    if (shouldReturnSameContainerDrop(sourceMeta, targetMeta, dropOptions)) {
      return { shouldMove: false, options: dropOptions };
    }

    if (isSameContainerDrop(sourceMeta, targetMeta)) {
      return {
        shouldMove: true,
        options: {
          ...dropOptions,
          suppressSound: true
        }
      };
    }

    return { shouldMove: true, options: dropOptions };
  }

  function getLegacyDropResolution(dropzone, clientX, cardId) {
    const dropOptions = getDropOptions(dropzone, clientX, cardId);
    const sourceMeta = getSourceMeta(getRenderedCardElement(cardId));
    const targetMeta = getDropTargetMeta(dropzone);
    return resolveSameContainerDrop(sourceMeta, targetMeta, dropOptions);
  }

  function removeCompatiblePointerListeners() {
    document.removeEventListener('pointermove', onCompatiblePointerMove);
    document.removeEventListener('pointerup', onCompatiblePointerUp);
    document.removeEventListener('pointercancel', onCompatiblePointerCancel);
  }

  function finishCompatibleDrag() {
    if (!compatibleDragState) return;

    compatibleDragState.dropzone?.classList.remove('compatible-drop-hover');
    compatibleDragState.sourceElement?.classList.remove('is-dragging');
    compatibleDragState.sourceElement?.classList.remove('is-compatible-drag-source');
    compatibleDragState.sourceSlot?.classList.remove('is-compatible-drag-source-slot');
    compatibleDragState.sourceGraveyardCard?.classList.remove('is-compatible-drag-source-graveyard-card');
    resetBalatroElement(compatibleDragState.sourceElement);
    resetCompatiblePhysicsCards(compatibleDragState.physicsTargets);
    compatibleDragState.ghost?.remove();
    compatibleDragState = null;
    stopCompatibleDragPhysics();
    removeCompatiblePointerListeners();
  }

  function returnCompatibleDragToSource() {
    if (!compatibleDragState?.activated || !compatibleDragState.ghost) {
      finishCompatibleDrag();
      return;
    }

    compatibleDragState.dropzone?.classList.remove('compatible-drop-hover');
    compatibleDragState.dropzone = null;
    compatibleDragState.returning = true;
    compatibleDragState.sourceElement?.classList.remove('is-dragging');
    resetBalatroElement(compatibleDragState.sourceElement);
    resetCompatiblePhysicsCards(compatibleDragState.physicsTargets);
    compatibleDragState.physicsTargets = [];
    removeCompatiblePointerListeners();
    compatibleDragLastTime = 0;
    scheduleCompatibleDragPhysics();
  }

  function handleCompatibleDrop(dragData, dropzone, wasTap, options = {}) {
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

      moveCard(dragData, 'free', null, options);
      return;
    }

    if (dropzone.classList.contains('player-area')) {
      const pid = parseInt(dropzone.dataset.player, 10);
      if (!pid) return;

      if (dragData === 'DECK_DRAW_ACTION') {
        drawCard(pid);
        return;
      }

      moveCard(dragData, 'player', pid, options);
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

    compatibleDragState.pointerX = event.clientX;
    compatibleDragState.pointerY = event.clientY;
    scheduleCompatibleDragPhysics();

    const dropzone = getCompatibleDropzone(event.clientX, event.clientY);
    updateCompatibleDropHighlight(dropzone);
  }

  function onCompatiblePointerUp(event) {
    if (!compatibleDragState) return;

    const { data, dropzone, activated, hasMoved, sourceMeta } = compatibleDragState;
    const finalDropzone = activated ? (dropzone || getCompatibleDropzone(event.clientX, event.clientY)) : null;
    const dropOptions = activated ? getDropOptions(finalDropzone, event.clientX, data) : {};
    const targetMeta = activated ? getDropTargetMeta(finalDropzone) : { location: null, playerId: null };

    if (!activated) {
      finishCompatibleDrag();
      if (data === 'DECK_DRAW_ACTION' && !hasMoved) drawCard();
      return;
    }

    if (!hasMoved && data !== 'DECK_DRAW_ACTION') {
      finishCompatibleDrag();
      return;
    }

    event.preventDefault();
    if (!finalDropzone) {
      returnCompatibleDragToSource();
      return;
    }

    const dropResolution = resolveSameContainerDrop(sourceMeta, targetMeta, dropOptions);
    if (!dropResolution.shouldMove) {
      returnCompatibleDragToSource();
      return;
    }

    finishCompatibleDrag();
    handleCompatibleDrop(data, finalDropzone, false, dropResolution.options);
  }

  function onCompatiblePointerCancel() {
    returnCompatibleDragToSource();
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
      sourceMeta: getSourceMeta(sourceElement),
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

    if (dragData !== 'DECK_DRAW_ACTION') {
      activateCompatibleDrag(event);
    }
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
          const dropResolution = getLegacyDropResolution(area, event.clientX, data);
          if (dropResolution.shouldMove) moveCard(data, 'player', pid, dropResolution.options);
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
        const dropResolution = getLegacyDropResolution(graveyardArea, event.clientX, data);
        if (dropResolution.shouldMove) moveCard(data, 'free', null, dropResolution.options);
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
