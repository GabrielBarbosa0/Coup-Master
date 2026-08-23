(function setupCasualPlayerRenderer(root) {
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
    if (avatar) avatar.removeAttribute('src');

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

  function getVisibleMobileSeatLimit(players = {}, maxPlayers = 8) {
    let highestOccupiedSlot = 0;

    for (let pid = 1; pid <= maxPlayers; pid++) {
      const player = players[pid];
      if (player && (player.online || player.uid)) {
        highestOccupiedSlot = pid;
      }
    }

    const minimumVisibleSlots = 4;
    const visibleSlots = Math.max(minimumVisibleSlots, highestOccupiedSlot);

    return Math.min(maxPlayers, Math.ceil(visibleSlots / 2) * 2);
  }

  function applyMobileSeatVisibility(players = {}, maxPlayers = 8) {
    const visibleLimit = getVisibleMobileSeatLimit(players, maxPlayers);
    const bottomRow = document.querySelector('.player-row-bottom');

    for (let pid = 1; pid <= maxPlayers; pid++) {
      const playerEl = document.getElementById(`player-${pid}`);
      if (!playerEl) continue;

      const shouldHideOnMobile = pid > visibleLimit;
      playerEl.classList.toggle('mobile-seat-hidden', shouldHideOnMobile);
      playerEl.setAttribute('aria-hidden', shouldHideOnMobile ? 'true' : 'false');
    }

    if (bottomRow) {
      bottomRow.classList.toggle('mobile-row-hidden', visibleLimit <= 4);
    }
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

  function renderPlayerIdentity(playerEl, player, pid, openQuickActions) {
    const headerEl = ensurePlayerHeader(playerEl);
    const avatarImg = headerEl.querySelector('.player-avatar');
    const nameTxt = headerEl.querySelector('.player-title');

    headerEl.classList.add('player-identity');
    nameTxt?.classList.add('player-name');

    if (avatarImg) {
      avatarImg.src = player.photo || 'img/coup.png';
      avatarImg.alt = t('ranked.profileOf', { name: player.name || t('casual.playerSeat', { seat: pid }, `Jogador ${pid}`) }, `Perfil de ${player.name || 'Jogador ' + pid}`);
      avatarImg.title = t('ranked.viewPlayerProfile', {}, 'Ver perfil do jogador');
      avatarImg.style.cursor = 'pointer';
      avatarImg.tabIndex = 0;
      avatarImg.onclick = (event) => {
        event.stopPropagation();
        if (typeof openQuickActions === 'function') openQuickActions(pid);
      };
      avatarImg.onkeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (typeof openQuickActions === 'function') openQuickActions(pid);
      };
    }

    if (nameTxt) {
      nameTxt.textContent = player.name || t('casual.playerSeat', { seat: pid }, `Jogador ${pid}`);
      nameTxt.style.cursor = 'pointer';
      nameTxt.onclick = () => {
        if (typeof openQuickActions === 'function') openQuickActions(pid);
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

    const headerEl = renderPlayerIdentity(playerEl, player, pid, options.openQuickActions);
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
    getVisibleMobileSeatLimit,
    applyMobileSeatVisibility
  };
})(window);
