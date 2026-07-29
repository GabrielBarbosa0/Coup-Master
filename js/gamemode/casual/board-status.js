(function setupCasualBoardStatus(root) {
  let config = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function getRoomCode() {
    return config.getRoomCode?.() || '';
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
  }

  function renderStatus(options = {}) {
    const state = options.state || {};
    const roomCode = options.roomCode || getRoomCode();
    const deckCount = state.deck?.length || 0;
    const graveyardCount = state.freeCards?.length || 0;
    const asylumScore = state.asylumScore || 0;

    setText('deck-count', deckCount);
    setText('grave-count', graveyardCount);
    setText('table-deck-count', deckCount);
    setText('asylum-score', asylumScore);
    setText('table-asylum-score', asylumScore);

    if (roomCode) {
      setText('roomCodeDisplay', roomCode);
    }
  }

  function resetCopiedState(roomHeader, roomCodeBtn, originalTitle) {
    roomHeader?.classList.remove('copied');
    if (roomCodeBtn) roomCodeBtn.title = originalTitle;
  }

  function notifyCopied(roomHeader, roomCodeBtn) {
    playSound('pop');
    roomHeader?.classList.add('copied');

    const originalTitle = roomCodeBtn?.title || '';
    if (roomCodeBtn) roomCodeBtn.title = 'Código copiado!';

    root.setTimeout(() => {
      resetCopiedState(roomHeader, roomCodeBtn, originalTitle);
    }, 1200);
  }

  function copyRoomCode() {
    const roomCode = getRoomCode();
    const roomHeader = getElement('roomHeader');
    const roomCodeBtn = getElement('roomCodeBtn');
    if (!roomCode) return;

    if (!root.navigator?.clipboard?.writeText) {
      root.alert?.(`Código da sala: ${roomCode}`);
      return;
    }

    root.navigator.clipboard.writeText(roomCode)
      .then(() => notifyCopied(roomHeader, roomCodeBtn))
      .catch((error) => {
        console.error('Erro ao copiar:', error);
        root.alert?.(`Código da sala: ${roomCode}`);
      });
  }

  function bindRoomCodeButton() {
    const roomCodeBtn = getElement('roomCodeBtn');
    if (!roomCodeBtn || roomCodeBtn.dataset.boardStatusBound === 'true') return;

    roomCodeBtn.dataset.boardStatusBound = 'true';
    roomCodeBtn.addEventListener('click', copyRoomCode);
  }

  function setup(options = {}) {
    config = {
      ...config,
      ...options
    };

    renderStatus({ roomCode: getRoomCode() });
    bindRoomCodeButton();
  }

  root.CoupBoardStatus = {
    setup,
    renderStatus,
    copyRoomCode
  };
})(window);
