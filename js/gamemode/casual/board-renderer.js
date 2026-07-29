// =======================================================
// === COORDENADOR DA MESA CASUAL ===
// =======================================================

const deckEl = window.CoupTableRender?.getDeckElement?.() || document.getElementById('deck');
const graveyardArea = window.CoupTableRender?.getGraveyardArea?.() || document.getElementById('graveyardArea');

function getDatabase() {
  return window.db || (typeof db !== 'undefined' ? db : null);
}

function getFirebase() {
  return window.firebase || (typeof firebase !== 'undefined' ? firebase : null);
}

function playLocalSound(soundId) {
  if (typeof playSound === 'function') playSound(soundId);
}

function showCasualError(message) {
  if (typeof window.showError === 'function') {
    window.showError(message);
    return;
  }

  const modal = document.getElementById('errorModal');
  const text = document.getElementById('errorModalText');

  if (modal && text) {
    text.textContent = message;
    modal.style.display = 'flex';
    return;
  }

  alert(message);
}

function setupRenderServices() {
  window.CoupTableRender?.setup({
    createCardElement: (card) => window.CoupRenderCards?.createCardElement?.(card),
    updateGraveyardFanLayout: () => window.CoupVisualEffects?.updateGraveyardFanLayout?.(),
    renderStatus: (options) => window.CoupBoardStatus?.renderStatus?.(options)
  });

  window.CoupVisualEffects?.setup({
    getGraveyardCardsElement: () => window.CoupTableRender?.getGraveyardCardsElement?.()
  });

  window.CoupRenderCards?.setup({
    getState: () => localGameState,
    getMyPlayerId: () => myPlayerId,
    getDeckElement: () => deckEl,
    returnCardToDeck,
    isSamsungDragModeEnabled,
    attachBalatroEffect: window.CoupVisualEffects?.attachBalatroEffect,
    attachCompatiblePointerDrag: window.CoupDragDrop?.attachCompatiblePointerDrag
  });
}

function setupInteractionServices() {
  window.CoupDragDrop?.setup({
    deckElement: deckEl,
    graveyardArea,
    drawCard,
    moveCard,
    burnTopCard,
    isSamsungDragModeEnabled,
    refreshSamsungDragMode,
    resetBalatroElement: window.CoupVisualEffects?.resetBalatroElement,
    hideCardTooltip: window.CoupRenderCards?.hideCardTooltip
  });

  window.CoupQuickActions?.setup({
    getState: () => localGameState,
    getMyPlayerId: () => myPlayerId,
    isAdmin: () => isAdmin,
    getDatabase,
    updateScore: (...args) => {
      if (typeof updateScore === 'function') updateScore(...args);
    },
    triggerSound: (soundId) => {
      if (typeof triggerSound === 'function') triggerSound(soundId);
    },
    playSound: playLocalSound
  });

  window.CoupCardPreview?.setup({
    getState: () => localGameState,
    findCardById,
    getCardFolder: window.CoupRenderCards?.getCardFolder,
    shouldShowBack: window.CoupRenderCards?.shouldShowBack,
    playSound
  });
}

function setupHeaderServices() {
  window.CoupBoardStatus?.setup({
    getRoomCode: () => roomCode,
    playSound: playLocalSound
  });

  window.CoupCasualSettings?.setupReligionVisibilityPreference({ playSound });
  window.CoupDeckPresets?.setup({ playSound });
}

function clearDOM() {
  document.querySelectorAll('[data-hand]').forEach((hand) => {
    hand.innerHTML = '';
  });

  window.CoupTableRender?.clearTable();
  document.querySelectorAll('.slot').forEach((slot) => slot.remove());
  document.querySelectorAll('.player-area.local-player')
    .forEach((playerArea) => playerArea.classList.remove('local-player'));
}

function renderRoomModeLabel() {
  const roomModeLabel = document.getElementById('roomModeLabel');
  if (!roomModeLabel) return;

  roomModeLabel.dataset.mode = currentGameMode;
  roomModeLabel.textContent = CoupGameModes.getLabel(currentGameMode);
}

function renderAdminControls() {
  window.CoupAdminControls?.renderAdminControls({
    isAdmin,
    isRankedMode: CoupGameModes.isRanked(currentGameMode)
  });
}

function renderSpectatorControls(state) {
  window.CoupSpectator?.renderSpectatorControls({
    players: state.players,
    myPlayerId,
    maxPlayers: MAX_PLAYERS,
    requestSpectate,
    playSound
  });
}

function renderPlayers(state) {
  window.CoupRenderPlayers?.renderPlayers({
    players: state.players,
    maxPlayers: MAX_PLAYERS,
    myPlayerId,
    createCardElement: window.CoupRenderCards?.createCardElement,
    updateHandFanLayout: window.CoupVisualEffects?.updateHandFanLayout,
    toggleReligion,
    openQuickActions: window.CoupQuickActions?.openQuickActions || window.openQuickActions
  });
}

function renderTable(state) {
  window.CoupVisualEffects?.scheduleCardFanLayout();
  window.CoupTableRender?.renderTable({
    state,
    roomCode
  });
}

function renderAll() {
  const state = localGameState;
  if (!state || !state.players) return;

  renderRoomModeLabel();
  renderAdminControls();
  renderSpectatorControls(state);
  clearDOM();
  renderPlayers(state);
  renderTable(state);
}

function setupAutoScroll() {
  const threshold = 80;
  const speed = 15;

  window.addEventListener('dragover', (event) => {
    const y = event.clientY;
    const viewportHeight = window.innerHeight;

    if (y < threshold) window.scrollBy(0, -speed);
    else if (y > viewportHeight - threshold) window.scrollBy(0, speed);
  });
}

function setupChatService() {
  window.CoupChat?.setup({
    getState: () => localGameState,
    getRoomCode: () => roomCode,
    getCurrentUser: () => currentUser,
    getMyPlayerId: () => myPlayerId,
    getDatabase,
    getFirebase,
    playSound: playLocalSound
  });
}

function setupAdminService() {
  window.CoupAdminControls?.setup({
    getState: () => localGameState,
    getMyPlayerId: () => myPlayerId,
    getCurrentGameMode: () => currentGameMode,
    isAdmin: () => isAdmin,
    playSound: playLocalSound,
    showError: showCasualError,
    resetTable,
    addBot,
    confirmKickAction
  });
}

function setupRoomUiService() {
  window.CoupRoomUI?.setup({
    playSound,
    beforeOpenSettings: () => window.CoupCasualSettings?.updateSamsungDragButton()
  });
}

function setupAsylumService() {
  window.CoupAsylumControls?.setup({
    updateAsylumScore,
    withdrawAsylumCoins,
    attachElementTooltip: window.CoupRenderCards?.attachElementTooltip || window.attachElementTooltip
  });
}

function setupDeckSurface() {
  window.CoupCasualSettings?.setupSamsungDragPreference({ playSound });
  window.CoupVisualEffects?.attachBalatroEffect(deckEl, true);
  attachElementTooltip(deckEl, 'Baralho');
}

function setupRulesAndTutorial() {
  window.CoupRulesGuides?.setup({
    getDeckConfig: () => localGameState.deckConfig || {},
    playSound
  });

  window.CoupTutorial?.setup();
}

function setupPlayerCoinControls() {
  document.querySelectorAll('.player-area').forEach((area) => {
    const pid = parseInt(area.dataset.player, 10);
    const religionEl = area.querySelector('.religion-status');

    if (religionEl) religionEl.addEventListener('click', () => toggleReligion(pid));
    area.querySelector('.plus')?.addEventListener('click', () => updateScore(pid, 1));
    area.querySelector('.minus')?.addEventListener('click', () => updateScore(pid, -1));
  });
}

function setupUI() {
  setupChatService();
  setupAdminService();
  setupRoomUiService();
  window.CoupCasualAudio?.setupBackgroundMusicControls();
  setupAsylumService();
  setupDeckSurface();
  setupRulesAndTutorial();
  setupPlayerCoinControls();
}

setupRenderServices();
setupInteractionServices();
setupHeaderServices();
