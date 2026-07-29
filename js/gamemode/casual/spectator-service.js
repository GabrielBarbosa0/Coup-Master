(function setupCasualSpectatorService(root) {
  function getElement(id) {
    return document.getElementById(id);
  }

  function play(options, soundId) {
    const handler = options.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function requestSpectate(options, targetPid) {
    const handler = options.requestSpectate || root.requestSpectate;
    if (typeof handler === 'function') handler(targetPid);
  }

  function closeSpectatorModal(modal) {
    root.CoupModal?.close(modal);
  }

  function openSpectatorModal(modal) {
    root.CoupModal?.open(modal);
  }

  function createSpectatorTarget(player, pid, options, modal) {
    const button = document.createElement('div');
    button.className = 'spectator-target-btn';

    const avatar = document.createElement('img');
    avatar.src = player.photo || 'img/coup.png';
    avatar.alt = '';

    const name = document.createElement('span');
    name.textContent = player.name || `Jogador ${pid}`;

    button.append(avatar, name);
    button.onclick = () => {
      play(options, 'pop');
      requestSpectate(options, pid);
      closeSpectatorModal(modal);
    };

    return button;
  }

  function renderEmptyState(list) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'muted spectator-empty-message';
    emptyMessage.textContent = 'N\u00e3o tem jogadores dispon\u00edveis.';
    list.appendChild(emptyMessage);
  }

  function populateSpectatorTargets(list, helperText, modal, options) {
    const players = options.players || {};
    const myPlayerId = options.myPlayerId;
    const maxPlayers = options.maxPlayers || 8;
    let availablePlayers = 0;

    list.innerHTML = '';

    for (let pid = 1; pid <= maxPlayers; pid++) {
      const player = players[pid];
      if (player && player.uid && pid !== myPlayerId) {
        availablePlayers++;
        list.appendChild(createSpectatorTarget(player, pid, options, modal));
      }
    }

    if (helperText) {
      helperText.hidden = availablePlayers === 0;
    }

    list.classList.toggle('is-empty', availablePlayers === 0);

    if (availablePlayers === 0) {
      renderEmptyState(list);
    }
  }

  function renderSpectatorControls(options = {}) {
    const spectatorBtn = getElement(options.buttonId || 'spectatorBtn');
    const spectatorModal = getElement(options.modalId || 'spectatorModal');
    const spectatorList = getElement(options.listId || 'spectator-list');
    const spectatorHelperText = getElement(options.helperTextId || 'spectator-helper-text');
    const closeSpectatorModalBtn = getElement(options.closeButtonId || 'closeSpectatorModalBtn');

    if (!spectatorBtn || !spectatorModal || !spectatorList) return;

    spectatorBtn.style.setProperty('display', 'flex', 'important');

    spectatorBtn.onclick = () => {
      play(options, 'click');
      populateSpectatorTargets(spectatorList, spectatorHelperText, spectatorModal, options);
      openSpectatorModal(spectatorModal);
    };

    if (closeSpectatorModalBtn) {
      closeSpectatorModalBtn.onclick = () => {
        play(options, 'click');
        closeSpectatorModal(spectatorModal);
      };
    }
  }

  root.CoupSpectator = {
    renderSpectatorControls
  };
})(window);
