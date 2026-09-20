(function setupCasualPlayerRenderer(root) {
  let latestPlayers = {};
  let latestMaxPlayers = 8;
  let mobileSeatMediaQuery = null;
  let landscapeSeatMediaQuery = null;
  let responsiveSeatListenersBound = false;

  const DEFAULT_PLAYER = Object.freeze({
    online: false,
    hand: [],
    score: 0,
    religion: 'catolico',
    uid: null
  });

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
  }

  function renderEmptyPlayerSlot(playerEl, pid) {
    playerEl.style.removeProperty('display');
    playerEl.classList.add('is-empty');
    playerEl.setAttribute('aria-label', t('casual.emptySlotAria', { seat: pid }, `Slot ${pid} vazio`));
    playerEl.style.boxShadow = '';
    playerEl.style.border = '';

    const title = playerEl.querySelector('.player-title');
    if (title) {
      title.textContent = '';
      title.style.cursor = 'default';
      title.onclick = null;
    }

    const avatar = playerEl.querySelector('.player-avatar');
    if (avatar) {
      avatar.removeAttribute('src');
      avatar.classList.remove('is-system-avatar', 'is-ai-avatar', 'is-guest-avatar');
    }

    const religion = playerEl.querySelector('.religion-badge');
    if (religion) religion.onclick = null;

    const score = playerEl.querySelector('.score');
    if (score) score.textContent = '0';

    const hand = playerEl.querySelector('[data-hand]');
    if (hand) {
      const emptyLabel = document.createElement('div');
      emptyLabel.className = 'empty-seat-label';
      emptyLabel.textContent = t('casual.waitingPlayer', {}, 'Aguardando jogador');
      hand.appendChild(emptyLabel);
    }
  }

  function getMobileSeatLayout(players = {}, maxPlayers = 8) {
    const occupied = [];
    const empty = [];

    for (let pid = 1; pid <= maxPlayers; pid++) {
      const player = players[pid];
      (player && (player.online || player.uid) ? occupied : empty).push(pid);
    }

    const visible = [...occupied];
    if (occupied.length > 4 && occupied.length % 2 === 1 && empty.length) {
      visible.push(empty[0]);
    }
    const visibleSeats = new Set(visible);

    return {
      visible,
      hidden: Array.from({ length: maxPlayers }, (_, index) => index + 1)
        .filter((pid) => !visibleSeats.has(pid)),
      columns: occupied.length <= 3 ? 1 : 2,
      showBottomRow: visible.some((pid) => pid > 4)
    };
  }

  function getLandscapeSeatLayout(players = {}, maxPlayers = 8) {
    const occupied = [];
    const empty = [];

    for (let pid = 1; pid <= maxPlayers; pid++) {
      const player = players[pid];
      (player && (player.online || player.uid) ? occupied : empty).push(pid);
    }

    let visibleCount = occupied.length;
    if (occupied.length <= 2) visibleCount = 2;
    if (occupied.length > 4 && occupied.length % 2 === 1) visibleCount += 1;
    const visible = [...occupied, ...empty.slice(0, Math.max(0, visibleCount - occupied.length))];
    const visibleSeats = new Set(visible);
    const topCount = visible.filter((pid) => pid <= 4).length;
    const bottomCount = visible.filter((pid) => pid > 4).length;

    return {
      visible,
      hidden: Array.from({ length: maxPlayers }, (_, index) => index + 1)
        .filter((pid) => !visibleSeats.has(pid)),
      topColumns: Math.max(1, topCount),
      bottomColumns: Math.max(1, bottomCount),
      showBottomRow: bottomCount > 0
    };
  }

  function applyMobileSeatVisibility(players = {}, maxPlayers = 8) {
    latestPlayers = players;
    latestMaxPlayers = maxPlayers;
    mobileSeatMediaQuery = mobileSeatMediaQuery || root.matchMedia?.('(max-width: 700px)') || null;
    landscapeSeatMediaQuery = landscapeSeatMediaQuery
      || root.matchMedia?.('(orientation: landscape) and (max-width: 1024px) and (max-height: 560px)')
      || null;
    if (!responsiveSeatListenersBound) {
      const refresh = () => applyMobileSeatVisibility(latestPlayers, latestMaxPlayers);
      mobileSeatMediaQuery?.addEventListener('change', refresh);
      landscapeSeatMediaQuery?.addEventListener('change', refresh);
      responsiveSeatListenersBound = true;
    }

    const isLandscape = Boolean(landscapeSeatMediaQuery?.matches);
    const isMobile = Boolean(mobileSeatMediaQuery?.matches) && !isLandscape;
    const isResponsive = isMobile || isLandscape;
    const layout = isLandscape
      ? getLandscapeSeatLayout(players, maxPlayers)
      : getMobileSeatLayout(players, maxPlayers);
    const topRow = document.querySelector('.player-row-top');
    const bottomRow = document.querySelector('.player-row-bottom');
    const centerArea = document.getElementById('centerArea');

    const visibleSeats = new Set(layout.visible);

    for (let pid = 1; pid <= maxPlayers; pid++) {
      const playerEl = document.getElementById(`player-${pid}`);
      if (!playerEl) continue;

      const shouldHideOnMobile = isResponsive && !visibleSeats.has(pid);
      playerEl.classList.toggle('mobile-seat-hidden', shouldHideOnMobile);
      playerEl.setAttribute('aria-hidden', shouldHideOnMobile ? 'true' : 'false');
    }

    if (isLandscape) {
      topRow?.style.setProperty('--casual-seat-columns', layout.topColumns);
      bottomRow?.style.setProperty('--casual-seat-columns', layout.bottomColumns);
    } else {
      topRow?.style.removeProperty('--casual-seat-columns');
      bottomRow?.style.removeProperty('--casual-seat-columns');
    }

    centerArea?.classList.toggle('single-column-players', isMobile && layout.columns === 1);
    bottomRow?.classList.toggle('mobile-row-hidden', isResponsive && !layout.showBottomRow);
    centerArea?.classList.toggle('extra-row-hidden', isResponsive && !layout.showBottomRow);
  }

  function ensurePlayerHeader(playerEl) {
    let headerEl = playerEl.querySelector('.player-header');
    if (headerEl) return headerEl;

    let titleDiv = playerEl.querySelector('.player-title');
    if (!titleDiv) {
      titleDiv = document.createElement('div');
      titleDiv.className = 'player-title';
    }

    headerEl = document.createElement('div');
    headerEl.className = 'player-header player-identity';

    const img = document.createElement('img');
    img.className = 'player-avatar';

    playerEl.insertBefore(headerEl, playerEl.querySelector('.points'));
    headerEl.appendChild(img);
    headerEl.appendChild(titleDiv);

    return headerEl;
  }

  function getPlayerAvatarKind(player) {
    const photo = String(player?.photo || '');
    const uid = String(player?.uid || '');

    if (player?.ai || uid.startsWith('bot-') || photo.includes('/robot.svg')) return 'ai';
    if (photo.includes('/ghost.svg')) return 'guest';

    return '';
  }

  function renderPlayerIdentity(playerEl, player, pid, options) {
    const headerEl = ensurePlayerHeader(playerEl);
    const avatarImg = headerEl.querySelector('.player-avatar');
    const nameTxt = headerEl.querySelector('.player-title');
    const openPlayerProfile = options.openPlayerProfile;
    const openPlayerActions = options.openPlayerActions;

    headerEl.classList.add('player-identity');
    nameTxt?.classList.add('player-name');

    if (avatarImg) {
      const avatarKind = getPlayerAvatarKind(player);
      avatarImg.src = player.photo || 'img/coup.png';
      avatarImg.classList.toggle('is-system-avatar', Boolean(avatarKind));
      avatarImg.classList.toggle('is-ai-avatar', avatarKind === 'ai');
      avatarImg.classList.toggle('is-guest-avatar', avatarKind === 'guest');
      avatarImg.alt = t('ranked.profileOf', { name: player.name || t('casual.playerSeat', { seat: pid }, `Jogador ${pid}`) }, `Perfil de ${player.name || 'Jogador ' + pid}`);
      avatarImg.title = t('ranked.viewPlayerProfile', {}, 'Ver perfil do jogador');
      avatarImg.style.cursor = 'pointer';
      avatarImg.tabIndex = 0;
      avatarImg.onclick = (event) => {
        event.stopPropagation();
        if (typeof openPlayerProfile === 'function') openPlayerProfile(pid);
      };
      avatarImg.onkeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (typeof openPlayerProfile === 'function') openPlayerProfile(pid);
      };
    }

    if (nameTxt) {
      nameTxt.textContent = player.name || t('casual.playerSeat', { seat: pid }, `Jogador ${pid}`);
      nameTxt.classList.add('has-quick-actions');
      nameTxt.style.cursor = 'pointer';
      nameTxt.setAttribute('role', 'button');
      nameTxt.tabIndex = 0;
      nameTxt.title = t('casual.openQuickActions', {}, 'Abrir ações rápidas');
      nameTxt.onclick = (event) => {
        event.stopPropagation();
        if (typeof openPlayerActions === 'function') openPlayerActions(pid);
      };
      nameTxt.onkeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (typeof openPlayerActions === 'function') openPlayerActions(pid);
      };
    }

    return headerEl;
  }

  function renderReligionBadge(headerEl, player, pid, toggleReligion) {
    let religionIcon = headerEl.querySelector('.religion-badge');

    if (!religionIcon) {
      religionIcon = document.createElement('img');
      religionIcon.className = 'religion-badge';
      headerEl.appendChild(religionIcon);
    }

    const isProtestante = player.religion === 'protestante';
    const iconPath = isProtestante
      ? 'assets/img/cards/religion/protestante-quadrado.png'
      : 'assets/img/cards/religion/catolico-quadrado.png';

    religionIcon.src = iconPath;
    religionIcon.alt = player.religion;
    religionIcon.title = isProtestante ? t('casual.protestant', {}, 'Protestante') : t('casual.catholic', {}, 'Católico');

    religionIcon.onclick = (event) => {
      event.stopPropagation();
      if (typeof toggleReligion === 'function') toggleReligion(pid);
    };
  }

  function renderPlayerHand(playerEl, player, createCardElement, updateHandFanLayout) {
    const handContainer = playerEl.querySelector('[data-hand]');
    if (!handContainer) return;

    player.hand?.forEach((card) => {
      const slot = document.createElement('div');
      slot.className = 'slot small';

      const cardElement = createCardElement(card);
      cardElement.classList.add('small');
      slot.appendChild(cardElement);
      handContainer.appendChild(slot);
    });

    if (!player.hand || player.hand.length === 0) {
      const slot = document.createElement('div');
      slot.className = 'slot small';
      handContainer.appendChild(slot);
    }

    if (typeof updateHandFanLayout === 'function') {
      updateHandFanLayout(handContainer);
    }
  }

  function renderPlayerSlot(pid, options) {
    const playerEl = document.getElementById(`player-${pid}`);
    if (!playerEl) return;

    const player = options.players[pid] || { ...DEFAULT_PLAYER };
    const isOccupied = Boolean(player.online || player.uid);

    playerEl.classList.add('player-seat');
    playerEl.style.removeProperty('display');
    playerEl.classList.toggle('is-empty', !isOccupied);

    if (!isOccupied) {
      renderEmptyPlayerSlot(playerEl, pid);
      return;
    }

    playerEl.setAttribute('aria-label', player.name || t('casual.playerSeat', { seat: pid }, `Jogador ${pid}`));

    if (pid === options.myPlayerId) {
      playerEl.classList.add('local-player');
    }

    const headerEl = renderPlayerIdentity(playerEl, player, pid, options);
    renderReligionBadge(headerEl, player, pid, options.toggleReligion);
    renderPlayerHand(playerEl, player, options.createCardElement, options.updateHandFanLayout);

    const scoreEl = playerEl.querySelector('.score');
    if (scoreEl) scoreEl.textContent = player.score || 0;

    if (player?.spectators && player.spectators[options.myPlayerId]) {
      playerEl.style.boxShadow = '0 0 8px #1e90ff';
      playerEl.style.border = '2px solid #1e90ff';
    } else {
      playerEl.style.boxShadow = '';
      playerEl.style.border = '';
    }
  }

  function renderPlayers(options = {}) {
    const players = options.players || {};
    const maxPlayers = options.maxPlayers || 8;

    applyMobileSeatVisibility(players, maxPlayers);

    for (let pid = 1; pid <= maxPlayers; pid++) {
      renderPlayerSlot(pid, {
        ...options,
        players
      });
    }
  }

  root.CoupRenderPlayers = {
    renderPlayers,
    renderEmptyPlayerSlot,
    getMobileSeatLayout,
    getLandscapeSeatLayout,
    applyMobileSeatVisibility
  };
})(window);
