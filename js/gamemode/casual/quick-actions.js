(function setupCasualQuickActions(root) {
  let config = {};
  let quickActionTargetPid = null;
  let quickProfileLoadKey = 0;

  function getElement(id) {
    return document.getElementById(id);
  }

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
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
    const name = stats?.name || player?.name || t('ranked.playerFallback', {}, 'Jogador');
    const photo = stats?.photo || player?.photo || 'assets/img/icons/ghost.svg';
    const games = quickProfileNumber(stats?.games);
    const wins = quickProfileNumber(stats?.wins);
    const losses = quickProfileNumber(stats?.losses);
    const rankScore = quickProfileNumber(stats?.rankScore ?? stats?.score ?? stats?.points);
    const status = options.status || (games
      ? t('lobby.gamesRegistered', { count: games }, `${games} jogo(s) ranqueado(s) registrados.`)
      : t('lobby.noRankedMatches', {}, 'Sem partidas ranqueadas registradas ainda.'));

    const avatar = getElement('quickPlayerProfileAvatar');
    const loading = getElement('quickPlayerProfileLoading');
    const statsGrid = getElement('quickPlayerProfileStats');

    if (avatar) {
      avatar.src = photo;
      avatar.alt = t('ranked.profileOf', { name }, `Perfil de ${name}`);
    }

    setQuickProfileText('quickPlayerProfileName', name);
    setQuickProfileText('quickPlayerProfileStatus', status);
    setQuickProfileText('quickPlayerProfileGames', games);
    setQuickProfileText('quickPlayerProfileWins', wins);
    setQuickProfileText('quickPlayerProfileLosses', losses);
    setQuickProfileText('quickPlayerProfileWinRate', quickProfilePercent(stats?.winRate));
    setQuickProfileText('quickPlayerProfileScore', t('ranked.pointsValue', { points: rankScore }, `${rankScore} pts`));

    if (loading) loading.hidden = true;
    if (statsGrid) statsGrid.hidden = false;
  }

  function setQuickPlayerProfileLoading(player) {
    const loading = getElement('quickPlayerProfileLoading');
    const statsGrid = getElement('quickPlayerProfileStats');
    const avatar = getElement('quickPlayerProfileAvatar');
    const name = player?.name || t('ranked.playerFallback', {}, 'Jogador');

    if (avatar) {
      avatar.src = player?.photo || 'assets/img/icons/ghost.svg';
      avatar.alt = t('ranked.profileOf', { name }, `Perfil de ${name}`);
    }

    setQuickProfileText('quickPlayerProfileName', name);
    setQuickProfileText('quickPlayerProfileStatus', t('ranked.loadingStats', {}, 'Carregando estatísticas...'));
    if (loading) {
      loading.hidden = false;
      loading.textContent = t('ranked.loadingStats', {}, 'Carregando estatísticas...');
    }
    if (statsGrid) statsGrid.hidden = true;
  }

  function loadQuickPlayerRankedStats(player) {
    const loadKey = ++quickProfileLoadKey;
    setQuickPlayerProfileLoading(player);

    if (!player?.uid) {
      renderQuickPlayerProfile(player, null, {
        status: t('ranked.noLinkedProfile', {}, 'Este jogador ainda não possui perfil ranqueado vinculado.')
      });
      return;
    }

    const database = getDatabase();
    if (!database) {
      renderQuickPlayerProfile(player, null, {
        status: t('ranked.statsUnavailable', {}, 'Não foi possível acessar as estatísticas agora.')
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
          status: t('lobby.statsLoadError', {}, 'Não foi possível carregar estatísticas.')
        });
      });
  }

  function closeQuickActions() {
    root.CoupModal?.close('quickActionsModal');
  }

  function closePlayerActions() {
    root.CoupModal?.close('playerActionsModal');
    quickActionTargetPid = null;
  }

  function bindCloseButton() {
    const closeQuickActionsBtn = getElement('closeQuickActionsBtn');
    const closePlayerActionsBtn = getElement('closePlayerActionsBtn');
    if (closeQuickActionsBtn) closeQuickActionsBtn.onclick = closeQuickActions;
    if (closePlayerActionsBtn) closePlayerActionsBtn.onclick = closePlayerActions;

    document.querySelectorAll('#playerActionsModal [data-action]').forEach((button) => {
      button.onclick = () => executeAction(button.dataset.action);
    });
  }

  function openPlayerProfile(pid) {
    const state = getState();
    const player = state.players?.[pid];
    const modal = getElement('quickActionsModal');
    const title = getElement('quickActionsTitle');
    const kickBtn = getElement('quickActionKickBtn');
    const myPlayerId = getMyPlayerId();

    if (!modal || !title || !player) return;

    title.innerText = t('ranked.playerProfile', {}, 'Perfil do jogador');
    loadQuickPlayerRankedStats(player);

    if (kickBtn) {
      const canKick = Boolean(
        getIsAdmin()
        && String(pid) !== String(myPlayerId)
        && (player.uid || player.online || player.name)
      );
      kickBtn.hidden = !canKick;
      kickBtn.onclick = canKick ? () => {
        closeQuickActions();
        root.kickPlayer?.(pid);
      } : null;
    }

    playSound('click');
    root.CoupModal?.open(modal);
  }

  function setPlayerActionAvailability(id, enabled, reason = '') {
    const button = getElement(id);
    if (!button) return;
    button.disabled = !enabled;
    button.title = enabled ? '' : reason;
  }

  function openPlayerActions(pid) {
    const state = getState();
    const player = state.players?.[pid];
    const myPlayerId = getMyPlayerId();
    const myPlayer = state.players?.[myPlayerId];
    const modal = getElement('playerActionsModal');

    if (!modal || !player || !myPlayer) return;

    quickActionTargetPid = pid;
    const targetScore = Number(player.score || 0);
    const myScore = Number(myPlayer.score || 0);
    const isSelf = String(pid) === String(myPlayerId);
    const opponentRequired = t(
      'casual.actionOpponentRequired',
      {},
      'Esta ação só pode ser usada contra outro jogador.'
    );

    setPlayerActionAvailability(
      'playerActionSteal',
      !isSelf && targetScore >= 2,
      isSelf
        ? opponentRequired
        : t('casual.actionStealUnavailable', {}, 'O alvo precisa ter pelo menos 2 moedas.')
    );
    setPlayerActionAvailability(
      'playerActionAssassinate',
      !isSelf && myScore >= 3,
      isSelf
        ? opponentRequired
        : t('casual.actionAssassinateUnavailable', {}, 'Você precisa ter pelo menos 3 moedas.')
    );
    setPlayerActionAvailability(
      'playerActionCoup',
      !isSelf && myScore >= 7,
      isSelf
        ? opponentRequired
        : t('casual.actionCoupUnavailable', {}, 'Você precisa ter pelo menos 7 moedas.')
    );
    setPlayerActionAvailability('playerActionTax', true);

    playSound('click');
    root.CoupModal?.open(modal);
  }

  function executeAction(type) {
    const state = getState();
    const myPlayerId = getMyPlayerId();

    if (!quickActionTargetPid || !myPlayerId) return;

    const myPlayer = state.players?.[myPlayerId];
    const targetPlayer = state.players?.[quickActionTargetPid];
    if (!myPlayer || !targetPlayer) {
      closePlayerActions();
      return;
    }

    const myScore = myPlayer.score || 0;
    const targetScore = targetPlayer.score || 0;
    const isSelf = String(quickActionTargetPid) === String(myPlayerId);

    if (isSelf && type !== 'tax') {
      return;
    }

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

    closePlayerActions();
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
    openQuickActions: openPlayerProfile,
    openPlayerProfile,
    openPlayerActions,
    executeAction,
    closeQuickActions,
    closePlayerActions
  };

  root.openQuickActions = openPlayerProfile;
  root.executeAction = executeAction;
})(window);
