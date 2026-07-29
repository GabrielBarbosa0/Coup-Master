(function setupCasualVisualEffects(root) {
  const CASUAL_BALATRO_HOVER = Object.freeze({
    tilt: 36,
    glowOffset: 23.4
  });

  const CASUAL_HAND_FAN = Object.freeze({
    rotationStep: 0,
    curveLift: 0
  });

  let config = {};
  let cardFanLayoutFrame = null;
  let resizeBound = false;

  function getGraveyardCardsElement() {
    return config.getGraveyardCardsElement?.() || null;
  }

  function calculateAdaptiveFanOverlap(container, items, options) {
    if (!container || items.length < 2) return null;

    const cardWidth = items[0].offsetWidth || items[0].getBoundingClientRect().width;
    const availableWidth = Math.max(cardWidth, container.clientWidth - 4);
    if (!cardWidth || !availableWidth) return null;

    const isMobile = root.matchMedia('(max-width: 700px)').matches;
    const baseOverlap = isMobile ? options.baseMobile : options.baseDesktop;
    const progressiveStep = isMobile ? options.progressiveMobile : options.progressiveDesktop;
    const progressiveOverlap = Math.sqrt(Math.max(0, items.length - 3)) * progressiveStep;
    const availableStep = (availableWidth - cardWidth) / (items.length - 1);
    const requiredOverlap = cardWidth - availableStep;
    const minimumReveal = Math.max(3, cardWidth * 0.055);
    const maximumOverlap = cardWidth - minimumReveal;

    return Math.min(
      maximumOverlap,
      Math.max(baseOverlap + progressiveOverlap, requiredOverlap, 0)
    );
  }

  function updateHandFanLayout(handContainer) {
    if (!handContainer) return;

    const slots = Array.from(handContainer.children)
      .filter((slot) => slot.classList.contains('slot') && slot.querySelector('.card'));
    const cardCount = slots.length;

    handContainer.dataset.cardCount = String(cardCount);

    const middle = (cardCount - 1) / 2;
    slots.forEach((slot, index) => {
      const offset = index - middle;
      const rotation = cardCount > 1 ? offset * CASUAL_HAND_FAN.rotationStep : 0;
      const lift = cardCount > 1 ? Math.abs(offset) * CASUAL_HAND_FAN.curveLift : 0;
      slot.style.setProperty('--slot-base-rotation', `${rotation.toFixed(2)}deg`);
      slot.style.setProperty('--slot-base-shift', `${lift.toFixed(2)}px`);
    });

    const overlap = calculateAdaptiveFanOverlap(handContainer, slots, {
      baseDesktop: 12,
      baseMobile: 8,
      progressiveDesktop: 2,
      progressiveMobile: 1.5
    });

    if (overlap === null) {
      handContainer.style.removeProperty('--hand-overlap');
      return;
    }

    handContainer.style.setProperty('--hand-overlap', `${-overlap.toFixed(2)}px`);
  }

  function updateGraveyardFanLayout() {
    const graveyardCardsElement = getGraveyardCardsElement();
    if (!graveyardCardsElement) return;

    const cards = Array.from(graveyardCardsElement.querySelectorAll('.graveyard-card'));
    graveyardCardsElement.dataset.cardCount = String(cards.length);

    const overlap = calculateAdaptiveFanOverlap(graveyardCardsElement, cards, {
      baseDesktop: 20,
      baseMobile: 10,
      progressiveDesktop: 2.5,
      progressiveMobile: 1.5
    });

    if (overlap === null) {
      graveyardCardsElement.style.removeProperty('--graveyard-overlap');
      return;
    }

    graveyardCardsElement.style.setProperty('--graveyard-overlap', `${-overlap.toFixed(2)}px`);
  }

  function updateAllCardFans() {
    document.querySelectorAll('.game-table [data-hand]').forEach(updateHandFanLayout);
    updateGraveyardFanLayout();
  }

  function scheduleCardFanLayout() {
    if (cardFanLayoutFrame !== null) cancelAnimationFrame(cardFanLayoutFrame);
    cardFanLayoutFrame = requestAnimationFrame(() => {
      cardFanLayoutFrame = null;
      updateAllCardFans();
    });
  }

  function resetBalatroElement(element) {
    if (!element) return;
    element.classList.remove('is-tilting');
    element.closest('.slot')?.classList.remove('is-active-card');
    element.style.removeProperty('--tilt-x');
    element.style.removeProperty('--tilt-y');
    element.style.removeProperty('--glow-x');
    element.style.removeProperty('--glow-y');
  }

  function attachBalatroEffect(element) {
    if (!element) return;
    element.classList.add('balatro-effect');

    element.addEventListener('mousemove', (event) => {
      if (element.classList.contains('is-compatible-drag-source')) {
        resetBalatroElement(element);
        return;
      }

      const rect = element.getBoundingClientRect();
      const normalizedX = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
      const normalizedY = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
      const rotateX = normalizedY * -CASUAL_BALATRO_HOVER.tilt;
      const rotateY = normalizedX * CASUAL_BALATRO_HOVER.tilt;

      element.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
      element.style.setProperty('--glow-x', `${(-normalizedX * CASUAL_BALATRO_HOVER.glowOffset).toFixed(2)}px`);
      element.style.setProperty('--glow-y', `${(-normalizedY * CASUAL_BALATRO_HOVER.glowOffset).toFixed(2)}px`);
      element.classList.add('is-tilting');
      element.closest('.slot')?.classList.add('is-active-card');
    });

    element.addEventListener('mouseleave', () => {
      resetBalatroElement(element);
    });
  }

  function setup(options = {}) {
    config = {
      ...config,
      ...options
    };

    if (!resizeBound) {
      resizeBound = true;
      root.addEventListener('resize', scheduleCardFanLayout);
    }
  }

  root.CoupVisualEffects = {
    setup,
    calculateAdaptiveFanOverlap,
    updateHandFanLayout,
    updateGraveyardFanLayout,
    updateAllCardFans,
    scheduleCardFanLayout,
    resetBalatroElement,
    attachBalatroEffect
  };

  root.updateHandFanLayout = updateHandFanLayout;
  root.updateGraveyardFanLayout = updateGraveyardFanLayout;
  root.scheduleCardFanLayout = scheduleCardFanLayout;
  root.resetBalatroElement = resetBalatroElement;
  root.attachBalatroEffect = attachBalatroEffect;
})(window);
