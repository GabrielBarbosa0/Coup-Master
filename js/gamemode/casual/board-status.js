(function setupCasualBoardStatus(root) {
  const QR_CODE_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/';
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

  function getRoomUrl(roomCode = getRoomCode()) {
    if (!roomCode || !root.location) return '';

    const url = new URL(root.location.href);
    url.searchParams.set('room', roomCode);
    url.hash = '';
    return url.toString();
  }

  function getQrCodeUrl(roomUrl) {
    if (!roomUrl) return '';

    const params = new URLSearchParams({
      size: '220x220',
      margin: '12',
      data: roomUrl
    });

    return `${QR_CODE_ENDPOINT}?${params.toString()}`;
  }

  function renderShareModal() {
    const roomCode = getRoomCode();
    const roomUrl = getRoomUrl(roomCode);
    const codeElement = getElement('shareRoomCode');
    const qrElement = getElement('shareRoomQr');

    if (codeElement) codeElement.textContent = roomCode || '...';

    if (qrElement) {
      qrElement.src = getQrCodeUrl(roomUrl);
      qrElement.alt = roomCode ? `QR Code da sala ${roomCode}` : 'QR Code da sala';
    }
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

    if (root.CoupModal?.isVisible?.('shareRoomModal')) {
      renderShareModal();
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

  function notifyShareCopied(button) {
    playSound('pop');
    if (!button) return;

    const originalText = button.textContent;
    button.textContent = 'COPIADO';
    button.classList.add('copied');

    root.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 1200);
  }

  function copyText(value, button, fallbackLabel) {
    if (!value) return;

    if (!root.navigator?.clipboard?.writeText) {
      root.alert?.(`${fallbackLabel}: ${value}`);
      return;
    }

    root.navigator.clipboard.writeText(value)
      .then(() => notifyShareCopied(button))
      .catch((error) => {
        console.error('Erro ao copiar:', error);
        root.alert?.(`${fallbackLabel}: ${value}`);
      });
  }

  function copyShareRoomCode() {
    copyText(getRoomCode(), getElement('copyShareCodeBtn'), 'Código da sala');
  }

  function copyShareRoomLink() {
    copyText(getRoomUrl(), getElement('copyShareLinkBtn'), 'Link da sala');
  }

  function openModal(id) {
    if (root.CoupModal?.open) {
      root.CoupModal.open(id);
      return;
    }

    const modal = getElement(id);
    if (modal) modal.style.display = 'flex';
  }

  function closeModal(id) {
    if (root.CoupModal?.close) {
      root.CoupModal.close(id);
      return;
    }

    const modal = getElement(id);
    if (modal) modal.style.display = 'none';
  }

  function closeShareRoomModal() {
    closeModal('shareRoomModal');
  }

  function openShareRoomModal() {
    if (!getRoomCode()) return;

    renderShareModal();
    playSound('pop');
    openModal('shareRoomModal');
  }

  function bindRoomCodeButton() {
    const roomCodeBtn = getElement('roomCodeBtn');
    if (!roomCodeBtn || roomCodeBtn.dataset.boardStatusBound === 'true') return;

    roomCodeBtn.dataset.boardStatusBound = 'true';
    roomCodeBtn.addEventListener('click', copyRoomCode);
  }

  function bindShareRoomModal() {
    const shareRoomBtn = getElement('shareRoomBtn');
    const closeShareRoomBtn = getElement('closeShareRoomBtn');
    const copyShareCodeBtn = getElement('copyShareCodeBtn');
    const copyShareLinkBtn = getElement('copyShareLinkBtn');
    const shareRoomModal = getElement('shareRoomModal');

    if (shareRoomBtn && shareRoomBtn.dataset.boardStatusBound !== 'true') {
      shareRoomBtn.dataset.boardStatusBound = 'true';
      shareRoomBtn.addEventListener('click', openShareRoomModal);
    }

    if (closeShareRoomBtn && closeShareRoomBtn.dataset.boardStatusBound !== 'true') {
      closeShareRoomBtn.dataset.boardStatusBound = 'true';
      closeShareRoomBtn.addEventListener('click', closeShareRoomModal);
    }

    if (copyShareCodeBtn && copyShareCodeBtn.dataset.boardStatusBound !== 'true') {
      copyShareCodeBtn.dataset.boardStatusBound = 'true';
      copyShareCodeBtn.addEventListener('click', copyShareRoomCode);
    }

    if (copyShareLinkBtn && copyShareLinkBtn.dataset.boardStatusBound !== 'true') {
      copyShareLinkBtn.dataset.boardStatusBound = 'true';
      copyShareLinkBtn.addEventListener('click', copyShareRoomLink);
    }

    if (shareRoomModal && shareRoomModal.dataset.boardStatusBound !== 'true') {
      shareRoomModal.dataset.boardStatusBound = 'true';
      shareRoomModal.addEventListener('click', (event) => {
        if (event.target === shareRoomModal) closeShareRoomModal();
      });
    }
  }

  function setup(options = {}) {
    config = {
      ...config,
      ...options
    };

    renderStatus({ roomCode: getRoomCode() });
    bindRoomCodeButton();
    bindShareRoomModal();
  }

  root.CoupBoardStatus = {
    setup,
    renderStatus,
    copyRoomCode,
    openShareRoomModal
  };
})(window);
