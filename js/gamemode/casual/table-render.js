(function setupCasualTableRender(root) {
  let dependencies = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function getDeckElement() {
    return getElement('deck');
  }

  function getGraveyardArea() {
    return getElement('graveyardArea');
  }

  function getGraveyardCardsElement() {
    const graveyardArea = getGraveyardArea();
    return graveyardArea?.querySelector('.graveyard-cards') || graveyardArea;
  }

  function createCardElement(card) {
    const handler = dependencies.createCardElement || root.CoupRenderCards?.createCardElement;
    if (typeof handler === 'function') return handler(card);
    return null;
  }

  function updateGraveyardFanLayout() {
    const handler = dependencies.updateGraveyardFanLayout || root.CoupVisualEffects?.updateGraveyardFanLayout;
    if (typeof handler === 'function') handler();
  }

  function renderStatus(options) {
    const handler = dependencies.renderStatus || root.CoupBoardStatus?.renderStatus;
    if (typeof handler === 'function') handler(options);
  }

  function clearTable() {
    getGraveyardCardsElement()?.querySelectorAll('.card').forEach((cardElement) => {
      cardElement.remove();
    });
  }

  function renderFreeCards(cards = []) {
    const graveyardCardsElement = getGraveyardCardsElement();
    if (!graveyardCardsElement) return;

    cards.forEach((card) => {
      const cardElement = createCardElement(card);
      if (!cardElement) return;

      cardElement.classList.add('small', 'graveyard-card');
      graveyardCardsElement.appendChild(cardElement);
    });
  }

  function renderTable(options = {}) {
    const state = options.state || {};

    renderFreeCards(state.freeCards || []);
    updateGraveyardFanLayout();
    renderStatus({
      state,
      roomCode: options.roomCode
    });
  }

  function setup(options = {}) {
    dependencies = options;
  }

  root.CoupTableRender = {
    setup,
    getDeckElement,
    getGraveyardArea,
    getGraveyardCardsElement,
    clearTable,
    renderFreeCards,
    renderTable
  };
})(window);
