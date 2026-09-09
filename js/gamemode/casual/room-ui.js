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

  function getPlayerName() {
    return root.currentUser?.displayName
      || root.currentUser?.email
      || document.getElementById('user-name')?.textContent?.trim()
      || 'Visitante';
  }

  function getRoomCode() {
    const searchRoom = new URLSearchParams(root.location.search).get('room');
    return root.roomCode || searchRoom || sessionStorage.getItem('currentRoomCode') || '';
  }

  function setFeedbackStatus(message, type = '') {
    const status = getElement('feedbackStatus');
    if (!status) return;

    status.textContent = message || '';
    status.classList.toggle('is-success', type === 'success');
    status.classList.toggle('is-error', type === 'error');
  }

  function fillFeedbackMetadata() {
    const fields = {
      feedbackPage: root.location.href,
      feedbackRoom: getRoomCode(),
      feedbackPlayer: getPlayerName(),
      feedbackDate: new Date().toISOString()
    };

    Object.entries(fields).forEach(([id, value]) => {
      const input = getElement(id);
      if (input) input.value = value;
    });
  }

  async function submitFeedbackForm(form) {
    const submitButton = form.querySelector('[type="submit"]');
    const originalLabel = submitButton?.textContent || 'Enviar';

    fillFeedbackMetadata();
    setFeedbackStatus('Enviando feedback...');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';
    }

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: new FormData(form)
      });

      if (!response.ok) throw new Error(`Formspark returned ${response.status}`);

      form.reset();
      setFeedbackStatus('Feedback enviado. Obrigado por ajudar o Coup Master!', 'success');
      playSound('success');
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      setFeedbackStatus('Nao foi possivel enviar agora. Tente novamente em instantes.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  }

  function setupFeedbackModal() {
    const feedbackModal = getElement('feedbackModal');
    const openFeedbackBtn = getElement('openFeedbackBtn');
    const closeFeedbackBtn = getElement('closeFeedbackBtn');
    const cancelFeedbackBtn = getElement('cancelFeedbackBtn');
    const feedbackForm = getElement('feedbackForm');

    if (openFeedbackBtn && feedbackModal) {
      openFeedbackBtn.onclick = () => {
        playSound('click');
        fillFeedbackMetadata();
        setFeedbackStatus('');
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

    if (cancelFeedbackBtn) {
      cancelFeedbackBtn.onclick = () => {
        playSound('click');
        closeModal(feedbackModal);
      };
    }

    if (feedbackForm) {
      feedbackForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitFeedbackForm(feedbackForm);
      });
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
