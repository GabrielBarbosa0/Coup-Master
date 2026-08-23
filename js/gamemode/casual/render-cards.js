(function setupCasualCardRenderer(root) {
  const CARD_GROUPS = Object.freeze({
    base: ['assassino', 'capitao', 'condessa', 'duque', 'embaixador', 'inquisidor'],
    dlc1: ['bispo', 'diplomata', 'marionetista', 'mercenario', 'tesoureiro', 'vigilante'],
    dlc2: ['estrategista', 'ladrao', 'magnata', 'pistoleiro', 'vigarista', 'xerife'],
    promo: ['benfeitor', 'bufao', 'burgues', 'burocrata']
  });

  const CARD_DISPLAY_NAMES = Object.freeze({
    duque: 'Duque',
    capitao: 'Capit\u00e3o',
    assassino: 'Assassino',
    embaixador: 'Embaixador',
    condessa: 'Condessa',
    inquisidor: 'Inquisidor',
    benfeitor: 'Benfeitor',
    bufao: 'Buf\u00e3o',
    burgues: 'Burgu\u00eas',
    burocrata: 'Burocrata',
    vigilante: 'Vigilante',
    mercenario: 'Mercen\u00e1rio',
    bispo: 'Bispo',
    tesoureiro: 'Tesoureiro',
    diplomata: 'Diplomata',
    marionetista: 'Marionetista',
    pistoleiro: 'Pistoleiro',
    magnata: 'Magnata',
    estrategista: 'Estrategista',
    ladrao: 'Ladr\u00e3o',
    vigarista: 'Vigarista',
    xerife: 'Xerife'
  });

  let cardTooltipEl = null;
  let getState = () => ({});
  let getMyPlayerId = () => null;
  let getDeckElement = () => document.getElementById('deck');
  let returnCardToDeckHandler = null;
  let isSamsungDragModeEnabledHandler = () => false;
  let attachBalatroEffectHandler = null;
  let attachCompatiblePointerDragHandler = null;

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
  }

  function setup(options = {}) {
    if (typeof options.getState === 'function') getState = options.getState;
    if (typeof options.getMyPlayerId === 'function') getMyPlayerId = options.getMyPlayerId;
    if (typeof options.getDeckElement === 'function') getDeckElement = options.getDeckElement;
    if (typeof options.returnCardToDeck === 'function') returnCardToDeckHandler = options.returnCardToDeck;
    if (typeof options.isSamsungDragModeEnabled === 'function') {
      isSamsungDragModeEnabledHandler = options.isSamsungDragModeEnabled;
    }
    if (typeof options.attachBalatroEffect === 'function') {
      attachBalatroEffectHandler = options.attachBalatroEffect;
    }
    if (typeof options.attachCompatiblePointerDrag === 'function') {
      attachCompatiblePointerDragHandler = options.attachCompatiblePointerDrag;
    }
  }

  function shouldShowBack(card) {
    if (card.location === 'deck') return true;
    if (card.location === 'free') return false;

    if (card.location?.startsWith('player-')) {
      const ownerId = card.owner;
      const state = getState() || {};
      const owner = state.players ? state.players[ownerId] : null;
      const myPlayerId = getMyPlayerId();
      const isSpectatingThisOwner = owner && owner.spectators && owner.spectators[myPlayerId];

      return !(ownerId === myPlayerId || isSpectatingThisOwner);
    }

    return false;
  }

  function getCardFolder(type) {
    const normalizedType = String(type || '').toLowerCase();

    if (CARD_GROUPS.base.includes(normalizedType)) return 'base';
    if (CARD_GROUPS.dlc1.includes(normalizedType)) return 'dlc1';
    if (CARD_GROUPS.dlc2.includes(normalizedType)) return 'dlc2';
    if (CARD_GROUPS.promo.includes(normalizedType)) return 'promo';

    return 'base';
  }

  function getCardDisplayName(type) {
    if (!type) return t('ranked.cardFallback', {}, 'Carta');

    const normalizedType = String(type).toLowerCase();
    const translated = t(`casual.cards.${normalizedType}`, {}, '');
    if (translated) return translated;

    return CARD_DISPLAY_NAMES[normalizedType]
      || normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
  }

  function getCardTooltipElement() {
    if (!cardTooltipEl) {
      cardTooltipEl = document.createElement('div');
      cardTooltipEl.id = 'cardTooltip';
      cardTooltipEl.className = 'card-tooltip';
      document.body.appendChild(cardTooltipEl);
    }

    return cardTooltipEl;
  }

  function positionCardTooltip(event) {
    const tooltip = getCardTooltipElement();
    const offset = 14;
    const rect = tooltip.getBoundingClientRect();
    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + rect.width > window.innerWidth - 8) {
      left = event.clientX - rect.width - offset;
    }

    if (top + rect.height > window.innerHeight - 8) {
      top = event.clientY - rect.height - offset;
    }

    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  }

  function showCardTooltip(event, label) {
    const tooltip = getCardTooltipElement();
    tooltip.textContent = label;
    tooltip.classList.add('is-visible');
    positionCardTooltip(event);
  }

  function hideCardTooltip() {
    if (cardTooltipEl) {
      cardTooltipEl.classList.remove('is-visible');
    }
  }

  function attachElementTooltip(element, label) {
    if (!element || !label) return;
    element.dataset.cardLabel = label;
    element.setAttribute('aria-label', label);

    if (element.dataset.tooltipBound === 'true') return;
    element.dataset.tooltipBound = 'true';

    element.addEventListener('mouseenter', (event) => {
      showCardTooltip(event, label);
    });

    element.addEventListener('mousemove', (event) => {
      if (cardTooltipEl?.classList.contains('is-visible')) {
        positionCardTooltip(event);
      }
    });

    element.addEventListener('mouseleave', hideCardTooltip);
  }

  function attachCardTooltip(element, card) {
    const label = shouldShowBack(card) ? t('ranked.hiddenCard', {}, 'Carta oculta') : getCardDisplayName(card.type);
    attachElementTooltip(element, label);
  }

  function animateReturnCardToDeck(cardElement, cardId) {
    const deckElement = getDeckElement();
    if (!cardElement || !deckElement || cardElement.dataset.returningToDeck === 'true') return;

    const sourceRect = cardElement.getBoundingClientRect();
    const targetRect = deckElement.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
      returnCardToDeckHandler?.(cardId);
      return;
    }

    cardElement.dataset.returningToDeck = 'true';
    cardElement.classList.add('is-returning-to-deck');

    const ghost = cardElement.cloneNode(true);
    const cardStyle = window.getComputedStyle(cardElement);
    ghost.className = 'card-return-ghost';
    ghost.removeAttribute('draggable');
    ghost.style.left = `${sourceRect.left}px`;
    ghost.style.top = `${sourceRect.top}px`;
    ghost.style.width = `${sourceRect.width}px`;
    ghost.style.height = `${sourceRect.height}px`;
    ghost.style.border = cardStyle.border;
    ghost.style.borderRadius = cardStyle.borderRadius;
    ghost.style.backgroundColor = cardStyle.backgroundColor;
    ghost.style.backgroundImage = cardStyle.backgroundImage;
    ghost.style.backgroundPosition = cardStyle.backgroundPosition;
    ghost.style.backgroundSize = cardStyle.backgroundSize;
    ghost.style.backgroundRepeat = cardStyle.backgroundRepeat;
    document.body.appendChild(ghost);

    const targetX = targetRect.left + (targetRect.width / 2) - (sourceRect.left + (sourceRect.width / 2));
    const targetY = targetRect.top + (targetRect.height / 2) - (sourceRect.top + (sourceRect.height / 2));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finishReturn = () => {
      ghost.remove();
      returnCardToDeckHandler?.(cardId);
    };

    if (prefersReducedMotion || typeof ghost.animate !== 'function') {
      finishReturn();
      return;
    }

    ghost.animate([
      { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate3d(${targetX * 0.72}px, ${targetY * 0.72 - 18}px, 0) scale(0.86) rotate(4deg)`, opacity: 0.96, offset: 0.72 },
      { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.18) rotate(9deg)`, opacity: 0 }
    ], {
      duration: 430,
      easing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
      fill: 'forwards'
    }).finished.then(finishReturn, finishReturn);
  }

  function createCardElement(card) {
    const element = document.createElement('div');
    element.className = 'card';
    element.draggable = !isSamsungDragModeEnabledHandler();
    element.dataset.cardId = card.id;

    if (shouldShowBack(card)) {
      element.classList.add('back');
      element.style.backgroundImage = "url('./assets/img/cards/base/back.png')";
    } else {
      const folder = getCardFolder(card.type);
      const imageUrl = `./assets/img/cards/${folder}/${card.type.toLowerCase()}.png`;
      element.style.backgroundImage = `url('${imageUrl}')`;
    }

    element.addEventListener('dragstart', (event) => {
      if (isSamsungDragModeEnabledHandler()) {
        event.preventDefault();
        return;
      }

      hideCardTooltip();
      event.dataTransfer.setData('text/plain', card.id);
      event.dataTransfer.effectAllowed = 'move';
      element.classList.add('lifting');

      setTimeout(() => {
        element.classList.remove('lifting');
        element.classList.add('is-dragging');
      }, 0);
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('lifting');
      element.classList.remove('is-dragging');
      hideCardTooltip();
    });

    element.addEventListener('dblclick', () => {
      hideCardTooltip();
      animateReturnCardToDeck(element, card.id);
    });

    attachBalatroEffectHandler?.(element);
    attachCardTooltip(element, card);
    attachCompatiblePointerDragHandler?.(element, card.id);

    return element;
  }

  root.CoupRenderCards = {
    setup,
    shouldShowBack,
    getCardFolder,
    getCardDisplayName,
    attachElementTooltip,
    attachCardTooltip,
    hideCardTooltip,
    animateReturnCardToDeck,
    createCardElement
  };

  root.shouldShowBack = shouldShowBack;
  root.getCardFolder = getCardFolder;
  root.getCardDisplayName = getCardDisplayName;
  root.attachElementTooltip = attachElementTooltip;
  root.hideCardTooltip = hideCardTooltip;
  root.createCardElement = createCardElement;
})(window);
