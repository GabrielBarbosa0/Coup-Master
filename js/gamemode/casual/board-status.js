(function setupCasualBoardStatus(root) {
  const QR_CODE_ENDPOINT = 'https://api.qrserver.com/v1/create-qr-code/';
  let config = {};
  let shareCopyResetTimer = null;
  let lastShareCopyTarget = null;

  function getElement(id) {
    return document.getElementById(id);
  }

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
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
      qrElement.alt = roomCode
        ? t('casual.roomQrWithCode', { room: roomCode }, `QR Code da sala ${roomCode}`)
        : t('casual.roomQr', {}, 'QR Code da sala');
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
    if (roomCodeBtn) roomCodeBtn.title = t('casual.codeCopied', {}, 'Código copiado!');

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
      root.alert?.(t('casual.roomCodeValue', { room: roomCode }, `Código da sala: ${roomCode}`));
      return;
    }

    root.navigator.clipboard.writeText(roomCode)
      .then(() => notifyCopied(roomHeader, roomCodeBtn))
      .catch((error) => {
        console.error('Erro ao copiar:', error);
        root.alert?.(t('casual.roomCodeValue', { room: roomCode }, `Código da sala: ${roomCode}`));
      });
  }

  function notifyShareCopied(target, message, defaultTitle) {
    playSound('pop');
    if (!target) return;

    const status = getElement('shareRoomCopyStatus');
    if (lastShareCopyTarget && lastShareCopyTarget !== target) {
      lastShareCopyTarget.classList.remove('copied');
      lastShareCopyTarget.title = lastShareCopyTarget.dataset.defaultCopyTitle || '';
    }

    target.dataset.defaultCopyTitle = defaultTitle;
    target.classList.remove('copied');
    void target.offsetWidth;
    target.classList.add('copied');
    target.title = message;
    lastShareCopyTarget = target;
    if (status) {
      status.textContent = message;
      status.classList.add('copied');
    }

    if (shareCopyResetTimer) root.clearTimeout(shareCopyResetTimer);
    shareCopyResetTimer = root.setTimeout(() => {
      target.classList.remove('copied');
      target.title = defaultTitle;
      if (status) {
        status.textContent = t('casual.scanToJoin', {}, 'Escaneie para entrar');
        status.classList.remove('copied');
      }
      shareCopyResetTimer = null;
      lastShareCopyTarget = null;
    }, 1200);
  }

  function copyWithSelection(value) {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.setAttribute('aria-hidden', 'true');
    textArea.style.position = 'fixed';
    textArea.style.inset = '-9999px auto auto -9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, value.length);

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      console.warn('Copia alternativa indisponível:', error);
    } finally {
      textArea.remove();
    }

    return copied;
  }

  async function writeClipboardText(value) {
    if (root.navigator?.clipboard?.writeText) {
      try {
        await root.navigator.clipboard.writeText(value);
        return true;
      } catch (error) {
        console.warn('Clipboard API indisponível; tentando cópia alternativa.', error);
      }
    }

    return copyWithSelection(value);
  }

  async function copyText(value, target, fallbackLabel, successMessage, defaultTitle) {
    if (!value) return;

    if (await writeClipboardText(value)) {
      notifyShareCopied(target, successMessage, defaultTitle);
    } else {
      root.alert?.(`${fallbackLabel}: ${value}`);
    }
  }

  function copyShareRoomCode() {
    copyText(
      getRoomCode(),
      getElement('shareRoomCodeCopy'),
      t('casual.roomCode', {}, 'Código da sala'),
      t('casual.codeCopied', {}, 'Código copiado!'),
      t('casual.copyCodeHint', {}, 'Clique para copiar o código da sala')
    );
  }

  function copyShareRoomLink() {
    copyText(
      getRoomUrl(),
      getElement('shareRoomLinkCopy'),
      t('casual.roomLink', {}, 'Link da sala'),
      t('casual.linkCopied', {}, 'Link copiado!'),
      t('casual.copyLinkHint', {}, 'Clique no QR Code para copiar o link da sala')
    );
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
    const shareRoomCodeCopy = getElement('shareRoomCodeCopy');
    const shareRoomLinkCopy = getElement('shareRoomLinkCopy');
    const shareRoomModal = getElement('shareRoomModal');

    if (shareRoomBtn && shareRoomBtn.dataset.boardStatusBound !== 'true') {
      shareRoomBtn.dataset.boardStatusBound = 'true';
      shareRoomBtn.addEventListener('click', openShareRoomModal);
    }

    if (closeShareRoomBtn && closeShareRoomBtn.dataset.boardStatusBound !== 'true') {
      closeShareRoomBtn.dataset.boardStatusBound = 'true';
      closeShareRoomBtn.addEventListener('click', closeShareRoomModal);
    }

    if (shareRoomCodeCopy && shareRoomCodeCopy.dataset.boardStatusBound !== 'true') {
      shareRoomCodeCopy.dataset.boardStatusBound = 'true';
      shareRoomCodeCopy.addEventListener('click', copyShareRoomCode);
      shareRoomCodeCopy.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        copyShareRoomCode();
      });
    }

    if (shareRoomLinkCopy && shareRoomLinkCopy.dataset.boardStatusBound !== 'true') {
      shareRoomLinkCopy.dataset.boardStatusBound = 'true';
      shareRoomLinkCopy.addEventListener('click', copyShareRoomLink);
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
