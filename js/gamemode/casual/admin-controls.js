(function setupCasualAdminControls(root) {
  let config = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function getState() {
    return config.getState?.() || {};
  }

  function getMyPlayerId() {
    return config.getMyPlayerId?.() || null;
  }

  function getCurrentGameMode() {
    return config.getCurrentGameMode?.() || 'casual';
  }

  function getIsAdmin() {
    return Boolean(config.isAdmin?.());
  }

  function isRankedMode() {
    return root.CoupGameModes?.isRanked(getCurrentGameMode());
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function showError(message) {
    const handler = config.showError || root.showError;
    if (typeof handler === 'function') handler(message);
  }

  function callMutation(name, ...args) {
    const handler = config[name] || root[name];
    if (typeof handler === 'function') return handler(...args);
    return null;
  }

  function setDeckApplyState(button, rankedMode, admin) {
    if (!button) return;

    if (rankedMode) {
      button.disabled = true;
      button.style.background = '#555';
      button.textContent = 'Baralho padrão no modo ranqueado';
      return;
    }

    if (!admin) {
      button.disabled = true;
      button.style.background = '#555';
      button.textContent = 'Apenas o Host pode aplicar';
      return;
    }

    button.disabled = false;
    button.style.background = '';
    button.textContent = 'Aplicar e Resetar Jogo';
  }

  function renderAdminControls(options = {}) {
    const admin = typeof options.isAdmin === 'boolean' ? options.isAdmin : getIsAdmin();
    const rankedMode = typeof options.isRankedMode === 'boolean' ? options.isRankedMode : isRankedMode();
    const resetBtn = getElement('resetBtn');
    const addBotBtn = getElement('addBotBtn');
    const openDeckConfigBtn = getElement('openDeckConfigBtn');
    const applyDeckBtn = getElement('applyDeckConfigBtn');
    const configInputs = document.querySelectorAll('.card-config-item input');

    if (resetBtn) {
      resetBtn.style.display = admin ? 'flex' : 'none';
    }

    if (addBotBtn) {
      const botRow = addBotBtn.closest('.setting-row');
      if (botRow) botRow.style.display = admin && !rankedMode ? 'flex' : 'none';
    }

    if (openDeckConfigBtn) {
      const deckConfigRow = openDeckConfigBtn.closest('.setting-row');
      if (deckConfigRow) deckConfigRow.style.display = rankedMode ? 'none' : 'flex';
    }

    configInputs.forEach((input) => {
      input.disabled = !admin || rankedMode;
    });

    setDeckApplyState(applyDeckBtn, rankedMode, admin);
  }

  function openKickPlayerModal(pid) {
    const state = getState();
    const player = state.players?.[pid];
    const myPlayerId = getMyPlayerId();
    const canKick = Boolean(getIsAdmin() && pid !== myPlayerId && (player?.uid || player?.online));
    if (!canKick) return;

    root.pendingKickPid = pid;

    const modal = getElement('kickPlayerModal');
    const text = getElement('kickPlayerText');

    if (text && player) {
      text.innerText = `Tem certeza que deseja remover ${player.name || 'o Jogador ' + pid} da sala?`;
    }

    if (modal) {
      playSound('click');
      root.CoupModal?.open(modal);
    }
  }

  function bindKickControls() {
    const confirmKickBtn = getElement('confirmKickBtn');
    const cancelKickBtn = getElement('cancelKickBtn');
    const kickModal = getElement('kickPlayerModal');

    root.kickPlayer = openKickPlayerModal;

    if (confirmKickBtn && confirmKickBtn.dataset.adminBound !== 'true') {
      confirmKickBtn.dataset.adminBound = 'true';
      confirmKickBtn.addEventListener('click', () => {
        callMutation('confirmKickAction');
        root.CoupModal?.close(kickModal);
      });
    }

    if (cancelKickBtn && cancelKickBtn.dataset.adminBound !== 'true') {
      cancelKickBtn.dataset.adminBound = 'true';
      cancelKickBtn.addEventListener('click', () => {
        root.CoupModal?.close(kickModal);
        root.pendingKickPid = null;
      });
    }
  }

  function bindResetControls() {
    const resetBtn = getElement('resetBtn');
    const confirmBtn = getElement('confirmResetBtn');
    const cancelBtn = getElement('cancelResetBtn');
    const resetModal = getElement('resetModal');

    if (resetBtn && resetModal && resetBtn.dataset.adminBound !== 'true') {
      resetBtn.dataset.adminBound = 'true';
      resetBtn.addEventListener('click', () => {
        playSound('click');
        root.CoupModal?.open(resetModal);
      });
    }

    if (confirmBtn && confirmBtn.dataset.adminBound !== 'true') {
      confirmBtn.dataset.adminBound = 'true';
      confirmBtn.addEventListener('click', () => {
        if (getIsAdmin()) {
          callMutation('resetTable');
          root.CoupModal?.close(resetModal);
          return;
        }

        root.CoupModal?.close(resetModal);
        showError('Apenas o Host pode realizar esta ação.');
      });
    }

    if (cancelBtn && cancelBtn.dataset.adminBound !== 'true') {
      cancelBtn.dataset.adminBound = 'true';
      cancelBtn.addEventListener('click', () => {
        root.CoupModal?.close(resetModal);
      });
    }
  }

  function bindBotControls() {
    const addBotBtn = getElement('addBotBtn');
    const closeFullRoomBtn = getElement('closeFullRoomBtn');
    const fullRoomModal = getElement('fullRoomModal');

    if (addBotBtn && addBotBtn.dataset.adminBound !== 'true') {
      addBotBtn.dataset.adminBound = 'true';
      addBotBtn.addEventListener('click', () => {
        callMutation('addBot');
      });
    }

    if (closeFullRoomBtn && fullRoomModal && closeFullRoomBtn.dataset.adminBound !== 'true') {
      closeFullRoomBtn.dataset.adminBound = 'true';
      closeFullRoomBtn.addEventListener('click', () => {
        playSound('click');
        root.CoupModal?.close(fullRoomModal);
      });
    }
  }

  function syncDeckConfigInputs() {
    const currentConfig = getState().deckConfig;
    if (!currentConfig) return;

    document.querySelectorAll('.card-config-item input').forEach((input) => {
      const cardType = input.dataset.card;
      if (currentConfig[cardType] !== undefined) {
        input.value = currentConfig[cardType];
      }
    });
  }

  function readDeckConfigFromInputs() {
    const newConfig = {};
    document.querySelectorAll('.card-config-item input').forEach((input) => {
      let value = parseInt(input.value);
      if (isNaN(value) || value < 0) value = 0;
      if (value > 10) value = 10;
      newConfig[input.dataset.card] = value;
    });
    return newConfig;
  }

  function bindDeckConfigControls() {
    const settingsModal = getElement('settingsModal');
    const configModal = getElement('configModal');
    const openDeckConfigBtn = getElement('openDeckConfigBtn');
    const closeConfigModalBtn = getElement('closeConfigModalBtn');
    const applyDeckConfigBtn = getElement('applyDeckConfigBtn');

    if (openDeckConfigBtn && configModal && openDeckConfigBtn.dataset.adminBound !== 'true') {
      openDeckConfigBtn.dataset.adminBound = 'true';
      openDeckConfigBtn.addEventListener('click', () => {
        if (isRankedMode()) return;

        playSound('click');
        syncDeckConfigInputs();
        root.CoupModal?.close(settingsModal);
        root.CoupModal?.open(configModal);
      });
    }

    if (closeConfigModalBtn && closeConfigModalBtn.dataset.adminBound !== 'true') {
      closeConfigModalBtn.dataset.adminBound = 'true';
      closeConfigModalBtn.addEventListener('click', () => {
        playSound('click');
        root.CoupModal?.close(configModal);
        root.CoupModal?.open(settingsModal);
      });
    }

    if (applyDeckConfigBtn && applyDeckConfigBtn.dataset.adminBound !== 'true') {
      applyDeckConfigBtn.dataset.adminBound = 'true';
      applyDeckConfigBtn.addEventListener('click', () => {
        if (!getIsAdmin() || isRankedMode()) return;

        playSound('click');
        callMutation('resetTable', readDeckConfigFromInputs());
        root.CoupModal?.close(configModal);
      });
    }
  }

  function setup(options = {}) {
    config = {
      ...config,
      ...options
    };

    bindKickControls();
    bindResetControls();
    bindBotControls();
    bindDeckConfigControls();
    renderAdminControls();
  }

  root.CoupAdminControls = {
    setup,
    renderAdminControls,
    openKickPlayerModal
  };
})(window);
