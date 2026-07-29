(function setupCasualQuickActions(root) {
  let config = {};
  let quickActionTargetPid = null;
  let quickProfileLoadKey = 0;

  function getElement(id) {
    return document.getElementById(id);
  }

  function getState() {
    return config.getState?.() || {};
  }

  function getMyPlayerId() {
    return config.getMyPlayerId?.() || null;
  }

  function getIsAdmin() {
    return Boolean(config.isAdmin?.());
  }

  function getDatabase() {
    if (config.getDatabase) return config.getDatabase();
    if (root.db) return root.db;
    return null;
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function triggerSound(soundId) {
    const handler = config.triggerSound || root.triggerSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function updateScore(pid, amount, silent) {
    const handler = config.updateScore || root.updateScore;
    if (typeof handler === 'function') handler(pid, amount, silent);
  }

  function quickProfileNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function quickProfilePercent(value) {
    const number = quickProfileNumber(value);
    const percent = number > 0 && number <= 1 ? number * 100 : number;
    return `${Math.round(percent)}%`;
  }

  function setQuickProfileText(id, value) {
    const node = getElement(id);
    if (node) node.textContent = value;
  }

  function renderQuickPlayerProfile(player, stats, options = {}) {
    const name = stats?.name || player?.name || 'Jogador';
    const photo = stats?.photo || player?.photo || 'assets/img/icons/ghost.svg';
    const games = quickProfileNumber(stats?.games);
    const wins = quickProfileNumber(stats?.wins);
    const losses = quickProfileNumber(stats?.losses);
    const rankScore = quickProfileNumber(stats?.rankScore ?? stats?.score ?? stats?.points);
    const status = options.status || (games
      ? `${games} jogo(s) ranqueado(s) registrados.`
      : 'Sem partidas ranqueadas registradas ainda.');

    const avatar = getElement('quickPlayerProfileAvatar');
    const loading = getElement('quickPlayerProfileLoading');
    const statsGrid = getElement('quickPlayerProfileStats');

    if (avatar) {
      avatar.src = photo;
      avatar.alt = `Perfil de ${name}`;
    }

    setQuickProfileText('quickPlayerProfileName', name);
    setQuickProfileText('quickPlayerProfileStatus', status);
    setQuickProfileText('quickPlayerProfileGames', games);
    setQuickProfileText('quickPlayerProfileWins', wins);
    setQuickProfileText('quickPlayerProfileLosses', losses);
    setQuickProfileText('quickPlayerProfileWinRate', quickProfilePercent(stats?.winRate));
    setQuickProfileText('quickPlayerProfileScore', `${rankScore} pts`);

    if (loading) loading.hidden = true;
    if (statsGrid) statsGrid.hidden = false;
  }

  function setQuickPlayerProfileLoading(player) {
    const loading = getElement('quickPlayerProfileLoading');
    const statsGrid = getElement('quickPlayerProfileStats');
    const avatar = getElement('quickPlayerProfileAvatar');
    const name = player?.name || 'Jogador';

    if (avatar) {
      avatar.src = player?.photo || 'assets/img/icons/ghost.svg';
      avatar.alt = `Perfil de ${name}`;
    }

    setQuickProfileText('quickPlayerProfileName', name);
    setQuickProfileText('quickPlayerProfileStatus', 'Carregando estatísticas...');
    if (loading) {
      loading.hidden = false;
      loading.textContent = 'Carregando estatísticas...';
    }
    if (statsGrid) statsGrid.hidden = true;
  }

  function loadQuickPlayerRankedStats(player) {
    const loadKey = ++quickProfileLoadKey;
    setQuickPlayerProfileLoading(player);

    if (!player?.uid) {
      renderQuickPlayerProfile(player, null, {
        status: 'Este jogador ainda não possui perfil ranqueado vinculado.'
      });
      return;
    }

    const database = getDatabase();
    if (!database) {
      renderQuickPlayerProfile(player, null, {
        status: 'Não foi possível acessar as estatísticas agora.'
      });
      return;
    }

    database.ref(`rankedStats/${player.uid}`).once('value')
      .then((snapshot) => {
        if (loadKey !== quickProfileLoadKey) return;
        renderQuickPlayerProfile(player, snapshot.val());
      })
      .catch(() => {
        if (loadKey !== quickProfileLoadKey) return;
        renderQuickPlayerProfile(player, null, {
          status: 'Não foi possível carregar estatísticas.'
        });
      });
  }

  function closeQuickActions() {
    root.CoupModal?.close('quickActionsModal');
    quickActionTargetPid = null;
  }

  function bindCloseButton() {
    const closeQuickActionsBtn = getElement('closeQuickActionsBtn');
    if (!closeQuickActionsBtn) return;
    closeQuickActionsBtn.onclick = closeQuickActions;
  }

  function openQuickActions(pid) {
    const state = getState();
    const player = state.players?.[pid];
    const modal = getElement('quickActionsModal');
    const title = getElement('quickActionsTitle');
    const kickBtn = getElement('quickActionKickBtn');
    const myPlayerId = getMyPlayerId();

    if (!modal || !title || !player) return;

    quickActionTargetPid = pid;
    title.innerText = 'Perfil do jogador';
    loadQuickPlayerRankedStats(player);

    if (kickBtn) {
      const canKick = Boolean(getIsAdmin() && pid !== myPlayerId && (player.uid || player.online));
      kickBtn.hidden = !canKick;
      kickBtn.onclick = canKick ? () => {
        const targetPid = quickActionTargetPid;
        closeQuickActions();
        root.kickPlayer?.(targetPid);
      } : null;
    }

    playSound('click');
    root.CoupModal?.open(modal);
  }

  function executeAction(type) {
    const state = getState();
    const myPlayerId = getMyPlayerId();

    if (!quickActionTargetPid || !myPlayerId) return;

    const myPlayer = state.players?.[myPlayerId];
    const myScore = myPlayer ? (myPlayer.score || 0) : 0;
    const targetPlayer = state.players?.[quickActionTargetPid];
    const targetScore = targetPlayer ? (targetPlayer.score || 0) : 0;

    switch (type) {
      case 'coup':
        if (myScore < 7) {
          console.log('Saldo insuficiente para aplicar um Golpe de Estado.');
          playSound('click');
          return;
        }

        updateScore(myPlayerId, -7, true);
        triggerSound('unity-sword');
        break;

      case 'steal':
        if (targetScore < 2) {
          console.log('Ação cancelada: O alvo deve ter pelo menos 2 moedas.');
          playSound('click');
          break;
        }

        updateScore(quickActionTargetPid, -2);
        updateScore(myPlayerId, 2);
        break;

      case 'assassinate':
        if (myScore < 3) {
          console.log('Saldo insuficiente para assassinar.');
          playSound('click');
          return;
        }

        updateScore(myPlayerId, -3, true);
        triggerSound('ninja-star');
        break;

      case 'tax':
        updateScore(myPlayerId, 3);
        break;
    }

    closeQuickActions();
  }

  function setup(options = {}) {
    config = {
      ...config,
      ...options
    };
    bindCloseButton();
  }

  root.CoupQuickActions = {
    setup,
    openQuickActions,
    executeAction,
    closeQuickActions
  };

  root.openQuickActions = openQuickActions;
  root.executeAction = executeAction;
})(window);
