(function setupCasualRoomUi(root) {
  let config = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function openModal(target) {
    root.CoupModal?.open(target);
  }

  function closeModal(target) {
    root.CoupModal?.close(target);
  }

  function setupFeedbackModal() {
    const feedbackModal = getElement('feedbackModal');
    const openFeedbackBtn = getElement('openFeedbackBtn');
    const closeFeedbackBtn = getElement('closeFeedbackBtn');

    if (openFeedbackBtn && feedbackModal) {
      openFeedbackBtn.onclick = () => {
        playSound('click');
        openModal(feedbackModal);
        closeModal('settingsModal');
      };
    }

    if (closeFeedbackBtn) {
      closeFeedbackBtn.onclick = () => {
        playSound('click');
        closeModal(feedbackModal);
      };
    }
  }

  function setupFullscreenButton() {
    const fullscreenBtn = getElement('fullscreenBtn');
    if (!fullscreenBtn) return;

    fullscreenBtn.onclick = () => {
      playSound('click');

      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((error) => {
          console.error(`Erro ao ativar tela cheia: ${error.message}`);
        });
        return;
      }

      document.exitFullscreen();
    };
  }

  function setupSettingsModal() {
    const settingsBtn = getElement('settingsBtn');
    const settingsModal = getElement('settingsModal');
    const closeSettingsBtn = getElement('closeSettingsBtn');

    if (settingsBtn && settingsModal) {
      settingsBtn.onclick = () => {
        playSound('click');
        config.beforeOpenSettings?.();
        openModal(settingsModal);
      };
    }

    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.onclick = () => {
        playSound('click');
        closeModal(settingsModal);
      };
    }
  }

  function setupLeaveRoomButton() {
    const leaveRoomBtn = getElement('leaveRoomBtn');
    if (!leaveRoomBtn) return;

    leaveRoomBtn.onclick = () => {
      playSound('click');
      sessionStorage.removeItem('currentRoomMode');
      root.location.href = config.lobbyHref || 'lobby.html';
    };
  }

  function setup(options = {}) {
    config = options;
    setupFeedbackModal();
    setupFullscreenButton();
    setupSettingsModal();
    setupLeaveRoomButton();
  }

  root.CoupRoomUI = {
    setup
  };
})(window);
