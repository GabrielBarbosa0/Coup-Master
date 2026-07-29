// =======================================================
// === INTERFACE DO USUÁRIO E RENDERIZAÇÃO ===
// =======================================================

// Variáveis DOM
const deckCountEl = document.getElementById('deck-count');
const graveCountEl = document.getElementById('grave-count');
const tableDeckCountEl = document.getElementById('table-deck-count');
const tableAsylumScoreEl = document.getElementById('table-asylum-score');
const deckEl = document.getElementById('deck');
const graveyardArea = document.getElementById('graveyardArea');
const graveyardCardsEl = graveyardArea?.querySelector('.graveyard-cards') || graveyardArea;
const resetBtn = document.getElementById('resetBtn');
const asylumScoreEl = document.getElementById('asylum-score');
const asylumPlusBtn = document.getElementById('asylum-plus');
const asylumMinusBtn = document.getElementById('asylum-minus');

const CHAT_MESSAGE_MAX_LENGTH = 240;
const QUICK_CHAT_MESSAGES = [
  'Contesto',
  'Bloqueio',
  'Sou o Duque',
  'Sou o Capitão',
  'Sou o Assassino',
  'Sou a Condessa',
  'Sou o Embaixador',
  'Sou o Inquisidor',
  'Taxar',
  'Extorquir',
  'Assassinar',
  'Trocar',
  'Investigar'
];

let chatMessages = [];
let chatMessagesInitialized = false;
let chatListenerReady = false;
let lastSeenChatMessageKey = '';
let cardFanLayoutFrame = null;
const CASUAL_BALATRO_HOVER = Object.freeze({
  tilt: 36,
  glowOffset: 23.4
});
const CASUAL_HAND_FAN = Object.freeze({
  rotationStep: 0,
  curveLift: 0
});

function calculateAdaptiveFanOverlap(container, items, options) {
  if (!container || items.length < 2) return null;

  const cardWidth = items[0].offsetWidth || items[0].getBoundingClientRect().width;
  const availableWidth = Math.max(cardWidth, container.clientWidth - 4);
  if (!cardWidth || !availableWidth) return null;

  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const baseOverlap = isMobile ? options.baseMobile : options.baseDesktop;
  const progressiveStep = isMobile ? options.progressiveMobile : options.progressiveDesktop;
  const progressiveOverlap = Math.sqrt(Math.max(0, items.length - 3)) * progressiveStep;
  const availableStep = (availableWidth - cardWidth) / (items.length - 1);
  const requiredOverlap = cardWidth - availableStep;
  const minimumReveal = Math.max(3, cardWidth * 0.055);
  const maximumOverlap = cardWidth - minimumReveal;

  return Math.min(
    maximumOverlap,
    Math.max(baseOverlap + progressiveOverlap, requiredOverlap, 0)
  );
}

function updateHandFanLayout(handContainer) {
  if (!handContainer) return;

  const slots = Array.from(handContainer.children)
    .filter((slot) => slot.classList.contains('slot') && slot.querySelector('.card'));
  const cardCount = slots.length;

  handContainer.dataset.cardCount = String(cardCount);

  const middle = (cardCount - 1) / 2;
  slots.forEach((slot, index) => {
    const offset = index - middle;
    const rotation = cardCount > 1 ? offset * CASUAL_HAND_FAN.rotationStep : 0;
    const lift = cardCount > 1 ? Math.abs(offset) * CASUAL_HAND_FAN.curveLift : 0;
    slot.style.setProperty('--slot-base-rotation', `${rotation.toFixed(2)}deg`);
    slot.style.setProperty('--slot-base-shift', `${lift.toFixed(2)}px`);
  });

  const overlap = calculateAdaptiveFanOverlap(handContainer, slots, {
    baseDesktop: 12,
    baseMobile: 8,
    progressiveDesktop: 2,
    progressiveMobile: 1.5
  });

  if (overlap === null) {
    handContainer.style.removeProperty('--hand-overlap');
    return;
  }

  handContainer.style.setProperty('--hand-overlap', `${-overlap.toFixed(2)}px`);
}

function updateGraveyardFanLayout() {
  if (!graveyardCardsEl) return;

  const cards = Array.from(graveyardCardsEl.querySelectorAll('.graveyard-card'));
  graveyardCardsEl.dataset.cardCount = String(cards.length);

  const overlap = calculateAdaptiveFanOverlap(graveyardCardsEl, cards, {
    baseDesktop: 20,
    baseMobile: 10,
    progressiveDesktop: 2.5,
    progressiveMobile: 1.5
  });

  if (overlap === null) {
    graveyardCardsEl.style.removeProperty('--graveyard-overlap');
    return;
  }

  graveyardCardsEl.style.setProperty('--graveyard-overlap', `${-overlap.toFixed(2)}px`);
}

function updateAllCardFans() {
  document.querySelectorAll('.game-table [data-hand]').forEach(updateHandFanLayout);
  updateGraveyardFanLayout();
}

function scheduleCardFanLayout() {
  if (cardFanLayoutFrame !== null) cancelAnimationFrame(cardFanLayoutFrame);
  cardFanLayoutFrame = requestAnimationFrame(() => {
    cardFanLayoutFrame = null;
    updateAllCardFans();
  });
}

window.addEventListener('resize', scheduleCardFanLayout);


// =======================================================
// === FUNÇÕES DE RENDERIZAÇÃO ===
// =======================================================


/**
 * LIMPEZA DO DOM (RESET VISUAL)
 * Remove todos os elementos dinâmicos do tabuleiro antes de uma nova renderização.
 * Isso evita a duplicação de cartas e slots ao atualizar o estado do jogo.
 */
function clearDOM() {
  // Limpa o conteúdo das mãos de todos os jogadores
  document.querySelectorAll('[data-hand]').forEach(h => h.innerHTML = '');

  // Remove cartas espalhadas no cemitério
  graveyardCardsEl?.querySelectorAll('.card').forEach(n => n.remove());

  // Remove slots vazios remanescentes
  document.querySelectorAll('.slot').forEach(n => n.remove());

  // Remove a marcação visual de "jogador local" para reatribuição
  document.querySelectorAll('.player-area.local-player')
    .forEach(el => el.classList.remove('local-player'));
}

/**
 * FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
 * Sincroniza o estado do Firebase com a interface e aplica permissões de Host (isAdmin).
 */

function renderAll() {
  const state = localGameState;
  if (!state || !state.players) return;


  // --- 1. TRAVAS DE ADMINISTRADOR (HOST) ---
  // Referências aos elementos de controle global
  const resetBtn = document.getElementById('resetBtn');
  const addBotBtn = document.getElementById('addBotBtn');
  const openDeckConfigBtn = document.getElementById('openDeckConfigBtn');
  const applyDeckBtn = document.getElementById('applyDeckConfigBtn');
  const roomModeLabel = document.getElementById('roomModeLabel');
  const configInputs = document.querySelectorAll('.card-config-item input');
  const isRankedMode = CoupGameModes.isRanked(currentGameMode);

  if (roomModeLabel) {
    roomModeLabel.dataset.mode = currentGameMode;
    roomModeLabel.textContent = CoupGameModes.getLabel(currentGameMode);
  }

  // NOVO: Esconde ou mostra o botão de Reset baseado no status de Admin
  if (resetBtn) {
    resetBtn.style.display = isAdmin ? 'flex' : 'none';
  }

  // Visibilidade dos botões Reset e Adicionar Bot
  if (addBotBtn) {
    const botRow = addBotBtn.closest('.setting-row');
    if (botRow) botRow.style.display = isAdmin && !isRankedMode ? 'flex' : 'none';
  }

  if (openDeckConfigBtn) {
    const deckConfigRow = openDeckConfigBtn.closest('.setting-row');
    if (deckConfigRow) deckConfigRow.style.display = isRankedMode ? 'none' : 'flex';
  }

  // Habilita ou desabilita os campos de texto do baralho em tempo real
  configInputs.forEach(input => {
    input.disabled = !isAdmin || isRankedMode;
  });

  // Configuração visual e funcional do botão de aplicar baralho
  if (applyDeckBtn) {
    if (isRankedMode) {
      applyDeckBtn.disabled = true;
      applyDeckBtn.style.background = '#555';
      applyDeckBtn.textContent = 'Baralho padrão no modo ranqueado';
    } else if (!isAdmin) {
      applyDeckBtn.disabled = true;
      applyDeckBtn.style.background = '#555'; // Cinza para indicar bloqueio
      applyDeckBtn.textContent = 'Apenas o Host pode aplicar';
    } else {
      applyDeckBtn.disabled = false;
      applyDeckBtn.style.background = ''; // Reseta para a cor original do CSS
      applyDeckBtn.textContent = 'Aplicar e Resetar Jogo';
    }
  }


  window.CoupSpectator?.renderSpectatorControls({
    players: state.players,
    myPlayerId,
    maxPlayers: MAX_PLAYERS,
    requestSpectate,
    playSound
  });

  // Limpa o tabuleiro antes de desenhar o novo estado.
  clearDOM();

  window.CoupRenderPlayers?.renderPlayers({
    players: state.players,
    maxPlayers: MAX_PLAYERS,
    myPlayerId,
    createCardElement: window.CoupRenderCards?.createCardElement,
    updateHandFanLayout,
    toggleReligion,
    openQuickActions: window.CoupQuickActions?.openQuickActions || window.openQuickActions
  });

  scheduleCardFanLayout();




  // --- 4. RENDERIZAÇÃO DO TABULEIRO CENTRAL (ÁREA LIVRE / DECK) ---
  // Exibe as cartas que estão abertas no cemitério e atualiza contadores.
  state.freeCards?.forEach(card => {
    const el = window.CoupRenderCards?.createCardElement(card);
    if (!el) return;
    el.classList.add('small', 'graveyard-card');
    graveyardCardsEl?.appendChild(el);
  });
  updateGraveyardFanLayout();

  const deckCount = state.deck?.length || 0;
  const graveyardCount = state.freeCards?.length || 0;
  const asylumScore = state.asylumScore || 0;

  if (deckCountEl) deckCountEl.textContent = deckCount;
  if (graveCountEl) graveCountEl.textContent = graveyardCount;
  if (tableDeckCountEl) tableDeckCountEl.textContent = deckCount;
  if (asylumScoreEl) asylumScoreEl.textContent = asylumScore;
  if (tableAsylumScoreEl) tableAsylumScoreEl.textContent = asylumScore;
}


function resetBalatroElement(element) {
  if (!element) return;
  element.classList.remove('is-tilting');
  element.closest('.slot')?.classList.remove('is-active-card');
  element.style.removeProperty('--tilt-x');
  element.style.removeProperty('--tilt-y');
  element.style.removeProperty('--glow-x');
  element.style.removeProperty('--glow-y');
}

// =======================================================
// === EFEITOS VISUAIS E EXPERIÊNCIA (UX) ===
// =======================================================

/**
 * EFEITO BALATRO (3D + BRILHO NEON AZUL + ONDA)
 * Unifica o visual 3D com a flutuação individual, corrigindo o erro de travamento.
 */
function attachBalatroEffect(element, isDeck = false) {
  if (!element) return;
  element.classList.add('balatro-effect');

  element.addEventListener('mousemove', (e) => {
    if (element.classList.contains('is-compatible-drag-source')) {
      resetBalatroElement(element);
      return;
    }

    const rect = element.getBoundingClientRect();
    const normalizedX = Math.max(-0.5, Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5));
    const normalizedY = Math.max(-0.5, Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5));
    const rotateX = normalizedY * -CASUAL_BALATRO_HOVER.tilt;
    const rotateY = normalizedX * CASUAL_BALATRO_HOVER.tilt;

    element.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
    element.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
    element.style.setProperty('--glow-x', `${(-normalizedX * CASUAL_BALATRO_HOVER.glowOffset).toFixed(2)}px`);
    element.style.setProperty('--glow-y', `${(-normalizedY * CASUAL_BALATRO_HOVER.glowOffset).toFixed(2)}px`);
    element.classList.add('is-tilting');
    element.closest('.slot')?.classList.add('is-active-card');
  });

  element.addEventListener('mouseleave', () => {
    resetBalatroElement(element);
  });
}

window.CoupDragDrop?.setup({
  deckElement: deckEl,
  graveyardArea,
  drawCard,
  moveCard,
  burnTopCard,
  isSamsungDragModeEnabled,
  refreshSamsungDragMode,
  resetBalatroElement,
  hideCardTooltip: window.CoupRenderCards?.hideCardTooltip
});

window.CoupRenderCards?.setup({
  getState: () => localGameState,
  getMyPlayerId: () => myPlayerId,
  getDeckElement: () => deckEl,
  returnCardToDeck,
  isSamsungDragModeEnabled,
  attachBalatroEffect,
  attachCompatiblePointerDrag: window.CoupDragDrop?.attachCompatiblePointerDrag
});

window.CoupQuickActions?.setup({
  getState: () => localGameState,
  getMyPlayerId: () => myPlayerId,
  isAdmin: () => isAdmin,
  getDatabase: () => window.db || (typeof db !== 'undefined' ? db : null),
  updateScore: (...args) => {
    if (typeof updateScore === 'function') updateScore(...args);
  },
  triggerSound: (soundId) => {
    if (typeof triggerSound === 'function') triggerSound(soundId);
  },
  playSound: (soundId) => {
    if (typeof playSound === 'function') playSound(soundId);
  }
});

/**
 * ROLAGEM AUTOMÁTICA DURANTE DRAG
 * Permite que a página role para cima ou para baixo automaticamente quando 
 * o jogador arrasta uma carta para as extremidades da tela.
 */
function setupAutoScroll() {
  const threshold = 80; // Distância da borda para ativar o scroll
  const speed = 15;     // Velocidade da rolagem

  window.addEventListener('dragover', (e) => {
    const y = e.clientY;
    const viewportHeight = window.innerHeight;

    // Rola para cima se estiver perto do topo
    if (y < threshold) window.scrollBy(0, -speed);
    // Rola para baixo se estiver perto da base
    else if (y > (viewportHeight - threshold)) window.scrollBy(0, speed);
  });
}

function formatChatTime(timestamp) {
  if (!timestamp) return '--:--';

  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getChatAuthorName() {
  const playerName = localGameState?.players?.[myPlayerId]?.name;
  return playerName || currentUser?.name || 'Jogador';
}

function getChatMessagesRef() {
  return db.ref(`salas/${roomCode}/chatMessages`);
}

function openChatModal() {
  const chatModal = document.getElementById('chatModal');
  const chatBtn = document.getElementById('chatBtn');
  const chatInput = document.getElementById('chatInput');

  if (typeof playSound === 'function') playSound('click');
  window.CoupModal?.open(chatModal);
  if (chatBtn) {
    chatBtn.classList.remove('chat-btn-has-unread');
    chatBtn.classList.add('is-chat-open');
  }
  lastSeenChatMessageKey = getLastChatMessageKey();
  window.setTimeout(() => chatInput?.focus(), 60);
}

function closeChatModal() {
  const chatModal = document.getElementById('chatModal');
  const chatBtn = document.getElementById('chatBtn');

  if (typeof playSound === 'function') playSound('click');
  window.CoupModal?.close(chatModal);
  if (chatBtn) chatBtn.classList.remove('is-chat-open');
}

async function sendChatMessage({ text, type = 'text' }) {
  const cleanText = String(text || '').trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
  if (!cleanText || !roomCode || !currentUser?.uid) return;

  const messageRef = getChatMessagesRef().push();
  await messageRef.set({
    id: messageRef.key,
    type,
    text: cleanText,
    uid: currentUser.uid,
    actorUid: currentUser.uid,
    actorPid: myPlayerId || null,
    displayName: getChatAuthorName(),
    createdAt: firebase.database.ServerValue.TIMESTAMP
  });
}

function getChatMessageKey(message) {
  if (!message) return '';
  return String(message.id || message.createdAt || `${message.uid || message.actorUid || ''}-${message.text || ''}`);
}

function getLastChatMessageKey() {
  return getChatMessageKey(chatMessages[chatMessages.length - 1]);
}

function isOwnChatMessage(message) {
  return message?.uid === currentUser?.uid || message?.actorUid === currentUser?.uid;
}

function isChatModalOpen() {
  return Boolean(window.CoupModal?.isVisible('chatModal'));
}

function isModalVisible(modal) {
  return Boolean(window.CoupModal?.isVisible(modal));
}

function syncFloatingChatButtonVisibility() {
  const chatBtn = document.getElementById('chatBtn');
  if (!chatBtn) return;

  const hasBlockingModalOpen = Array
    .from(document.querySelectorAll('.modal-overlay'))
    .some(modal => modal.id !== 'chatModal' && isModalVisible(modal));

  chatBtn.classList.toggle('is-hidden-by-modal', hasBlockingModalOpen);
}

function setupFloatingChatModalObserver() {
  if (document.body?.dataset.floatingChatObserverBound === 'true') {
    syncFloatingChatButtonVisibility();
    return;
  }

  document.body.dataset.floatingChatObserverBound = 'true';

  const observer = new MutationObserver(syncFloatingChatButtonVisibility);
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  });

  syncFloatingChatButtonVisibility();
}

function setChatMessages(messages = []) {
  chatMessages = messages.slice(-60);
  renderChatMessages();

  const chatBtn = document.getElementById('chatBtn');
  const latestMessage = chatMessages[chatMessages.length - 1];
  const latestKey = getChatMessageKey(latestMessage);

  if (!chatMessagesInitialized) {
    lastSeenChatMessageKey = latestKey;
    chatMessagesInitialized = true;
    return;
  }

  if (!latestKey || latestKey === lastSeenChatMessageKey) return;

  if (isChatModalOpen()) {
    lastSeenChatMessageKey = latestKey;
    chatBtn?.classList.remove('chat-btn-has-unread');
    return;
  }

  if (chatMessagesInitialized
    && !isOwnChatMessage(latestMessage)) {
    chatBtn?.classList.add('chat-btn-has-unread');
    if (typeof playSound === 'function') playSound('pop');
  }

  lastSeenChatMessageKey = latestKey;
}

function renderChatMessages() {
  const chatMessagesList = document.getElementById('chatMessagesList');
  if (!chatMessagesList) return;

  chatMessagesList.innerHTML = '';
  if (chatMessages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'chat-empty-message';
    empty.textContent = 'Nenhuma mensagem ainda.';
    chatMessagesList.append(empty);
    return;
  }

  chatMessages.forEach((message) => {
    const item = document.createElement('article');
    item.className = 'chat-message';
    if (message.uid === currentUser?.uid || message.actorUid === currentUser?.uid) {
      item.classList.add('is-own');
    }
    if (message.type === 'quick') {
      item.classList.add('is-quick');
    }

    const meta = document.createElement('div');
    meta.className = 'chat-message-meta';
    meta.textContent = `${message.displayName || message.actorName || 'Jogador'} · ${formatChatTime(message.createdAt)}`;

    const text = document.createElement('p');
    text.className = 'chat-message-text';
    text.textContent = message.text || '';

    item.append(meta, text);
    chatMessagesList.append(item);
  });

  chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
}

function setupRoomChat() {
  const chatBtn = document.getElementById('chatBtn');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatQuickMessages = document.getElementById('chatQuickMessages');

  setupFloatingChatModalObserver();

  if (chatBtn?.dataset.chatBound === 'true') return;
  if (chatBtn) {
    chatBtn.dataset.chatBound = 'true';
    chatBtn.addEventListener('click', openChatModal);
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', closeChatModal);
  }

  if (chatForm) {
    chatForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = chatInput?.value || '';
      if (!text.trim()) return;

      try {
        if (chatInput) chatInput.value = '';
        await sendChatMessage({ text, type: 'text' });
      } catch (error) {
        console.error('Erro ao enviar mensagem no chat:', error);
      }
    });
  }

  if (chatQuickMessages && chatQuickMessages.children.length === 0) {
    QUICK_CHAT_MESSAGES.forEach((message) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-quick-btn';
      button.textContent = message;
      button.addEventListener('click', () => {
        sendChatMessage({ text: message, type: 'quick' })
          .catch((error) => console.error('Erro ao enviar mensagem rápida:', error));
      });
      chatQuickMessages.append(button);
    });
  }

  renderChatMessages();

  if (!chatListenerReady && roomCode) {
    chatListenerReady = true;
    getChatMessagesRef().limitToLast(60).on('value', (snapshot) => {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        if (message?.text) {
          messages.push({ ...message, id: message.id || childSnapshot.key });
        }
      });
      messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setChatMessages(messages);
    });
  }
}




/**
 * INICIALIZAÇÃO DOS COMPONENTES DA INTERFACE
 * Configura listeners de clique, estados iniciais de modais e controles de áudio/vídeo.
 */
function setupUI() {

  // --- 1. MODAIS DE AVISO E SISTEMA ---
  setupRoomChat();

  // Gerenciamento do Modal de Sala Cheia (Aviso de limite de Bots)
  const fullRoomModal = document.getElementById('fullRoomModal');
  const closeFullRoomBtn = document.getElementById('closeFullRoomBtn');

  if (closeFullRoomBtn && fullRoomModal) {
    closeFullRoomBtn.onclick = () => {
      playSound('click');
      window.CoupModal?.close(fullRoomModal);
    };
  }


  // Feedback Modal
  const feedbackModal = document.getElementById('feedbackModal');
  const openFeedbackBtn = document.getElementById('openFeedbackBtn');
  const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');

  if (openFeedbackBtn && feedbackModal) {
    openFeedbackBtn.onclick = () => {
      if (typeof playSound === 'function') playSound('click');
      window.CoupModal?.open(feedbackModal);
      // Opcional: fecha o modal de configurações ao abrir o de feedback
      window.CoupModal?.close('settingsModal');
    };
  }

  if (closeFeedbackBtn) {
    closeFeedbackBtn.onclick = () => {
      if (typeof playSound === 'function') playSound('click');
      window.CoupModal?.close(feedbackModal);
    };
  }


  // --- 2. CONTROLES DE AMBIENTE E TELA ---

  // Alternância de Tela Cheia (Fullscreen)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.onclick = () => {
      playSound('click');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Erro ao ativar tela cheia: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    };
  }

  window.CoupCasualAudio?.setupBackgroundMusicControls();


  // --- 3. INTERAÇÕES DE JOGO (ASILO, KICK, BOTS) ---

  // Atalho de Gesto: Saque rápido do Asilo via clique duplo na imagem
  const asylumArea = document.getElementById('asylumArea');
  if (asylumArea) {
    const asylumImageWrapper = asylumArea.querySelector('.asylum-image-wrapper');
    const asylumImage = asylumArea.querySelector('.asylum-image-wrapper img');
    if (asylumImageWrapper) {
      attachElementTooltip(asylumImageWrapper, 'Asilo');
    }

    if (asylumImage) {
      asylumImage.ondblclick = () => {
        withdrawAsylumCoins(); // Função no gameState.js
      };
    }
  }



  // =======================================================
  // === SISTEMA DE REMOÇÃO (KICK) ===
  // =======================================================

  /**
   * Função global chamada pela ação de remover jogador.
   * Define quem será expulso e abre o modal de confirmação.
   */
  window.kickPlayer = (pid) => {
    const player = localGameState.players?.[pid];
    const canKick = Boolean(isAdmin && pid !== myPlayerId && (player?.uid || player?.online));
    if (!canKick) return;

    // Sincroniza com a variável global 'pendingKickPid' do gameState.js
    window.pendingKickPid = pid;

    const modal = document.getElementById('kickPlayerModal');
    const text = document.getElementById('kickPlayerText');

    if (text && player) {
      text.innerText = `Tem certeza que deseja remover ${player.name || 'o Jogador ' + pid} da sala?`;
    }

    if (modal) {
      if (typeof playSound === 'function') playSound('click');
      window.CoupModal?.open(modal);
    }
  };

  // Configuração dos botões do Modal
  const confirmKickBtn = document.getElementById('confirmKickBtn');
  const cancelKickBtn = document.getElementById('cancelKickBtn');
  const kickModal = document.getElementById('kickPlayerModal');

  if (confirmKickBtn) {
    confirmKickBtn.onclick = () => {
      // Chamamos a ação principal que agora lida com cartas e remoção
      confirmKickAction();
      window.CoupModal?.close(kickModal);
    };
  }

  if (cancelKickBtn) {
    cancelKickBtn.onclick = () => {
      window.CoupModal?.close(kickModal);
      window.pendingKickPid = null; // Limpa a seleção global de segurança
    };
  }




  // Modal Interno de Confirmação de Reset de Mesa
  const confirmBtn = document.getElementById('confirmResetBtn');
  const cancelBtn = document.getElementById('cancelResetBtn');
  const resetModal = document.getElementById('resetModal');

  if (resetBtn && resetModal) {
    resetBtn.onclick = () => {
      playSound('click');
      window.CoupModal?.open(resetModal); // Abre a janelinha de confirmação
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (isAdmin) { // Checagem dupla de segurança
        resetTable();
        window.CoupModal?.close(resetModal);
      } else {
        window.CoupModal?.close(resetModal);
        showError("Apenas o Host pode realizar esta ação.");
      }
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      window.CoupModal?.close(resetModal);
    };
  }

  // Botão de Adicionar Bot (Menu de Configurações)
  const addBotBtn = document.getElementById('addBotBtn');
  if (addBotBtn) {
    addBotBtn.onclick = () => { addBot(); };
  }


  // --- 4. CONFIGURAÇÕES VISUAIS E CUSTOMIZAÇÃO ---

  // Menu de Configurações (Abertura/Fechamento)
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');

  if (settingsBtn && settingsModal) {
    settingsBtn.onclick = () => {
      playSound('click');
      window.CoupCasualSettings?.updateSamsungDragButton();
      window.CoupModal?.open(settingsModal);
    };
    if (closeSettingsBtn) {
      closeSettingsBtn.onclick = () => {
        playSound('click');
        window.CoupModal?.close(settingsModal);
      };
    }
  }

  window.CoupCasualSettings?.setupSamsungDragPreference({ playSound });

  const deckContainer = document.getElementById('deck');
  attachBalatroEffect(deckContainer, true);
  attachElementTooltip(deckContainer, 'Baralho');


  // --- 5. CONFIGURAÇÃO DE BARALHO (HOST APENAS) ---

  const configModal = document.getElementById('configModal');
  const openDeckConfigBtn = document.getElementById('openDeckConfigBtn');
  const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
  const applyDeckConfigBtn = document.getElementById('applyDeckConfigBtn');
  const configInputs = document.querySelectorAll('.card-config-item input');
  const isRankedMode = CoupGameModes.isRanked(currentGameMode);

  if (openDeckConfigBtn) {
    const deckConfigRow = openDeckConfigBtn.closest('.setting-row');
    if (deckConfigRow) deckConfigRow.style.display = isRankedMode ? 'none' : 'flex';
  }

  // Navegação para o Modal de Baralho
  if (openDeckConfigBtn && configModal) {
    openDeckConfigBtn.onclick = () => {
      if (isRankedMode) return;

      playSound('click');

      // --- NOVO: Sincroniza os inputs com a configuração salva no Firebase ---
      // Busca a configuração atual do estado local (ou a padrão se não existir)
      const currentConfig = localGameState.deckConfig;

      if (currentConfig) {
        // Percorre todos os inputs do modal
        configInputs.forEach(input => {
          const cardType = input.dataset.card; // Pega o tipo da carta (ex: 'duque')

          // Se o banco tiver um valor para essa carta, atualiza o campo de texto
          if (currentConfig[cardType] !== undefined) {
            input.value = currentConfig[cardType];
          }
        });
      }

      // Fecha o menu de configurações e abre o de baralho
      window.CoupModal?.close(settingsModal);
      window.CoupModal?.open(configModal);
    };

    if (closeConfigModalBtn) {
      closeConfigModalBtn.onclick = () => {
        playSound('click');
        window.CoupModal?.close(configModal);
        window.CoupModal?.open(settingsModal);
      };
    }
  }

  // Lógica de Permissão e Aplicação da Configuração (Apenas para o Host)
  configInputs.forEach(input => {
    input.disabled = !isAdmin || isRankedMode;
  });

  if (applyDeckConfigBtn) {
    applyDeckConfigBtn.onclick = () => {
      // Verificação extra de segurança
      if (!isAdmin || isRankedMode) return;

      playSound('click');
      const newConfig = {};
      const configInputs = document.querySelectorAll('.card-config-item input');

      configInputs.forEach(input => {
        let val = parseInt(input.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 10) val = 10;
        newConfig[input.dataset.card] = val;
      });

      resetTable(newConfig); // Aplica e reinicia a partida
      window.CoupModal?.close(configModal);
    };
  }


  // --- 6. MODAL DE INFORMAÇÕES E REGRAS ---

  const characterActionsBtn = document.getElementById('characterActionsBtn') || document.getElementById('infoBtn');
  const infoModal = document.getElementById('infoModal');
  const closeInfoBtn = document.getElementById('closeModalBtn');
  const flipCard = document.querySelector('.flip-card');
  const frontImg = flipCard ? flipCard.querySelector('.flip-card-front img') : null;
  const backImg = flipCard ? flipCard.querySelector('.flip-card-back img') : null;

  let currentRuleImages = [];
  let currentRuleIndex = 0;


  /**
 * Gerencia a exibição do tutorial inicial
 */
  function checkTutorial() {
    const tutorialModal = document.getElementById('tutorialModal');
    const closeBtn = document.getElementById('closeTutorialBtn');
    const startBtn = document.getElementById('startPlayBtn');

    // Verifica se o tutorial já foi visto nesta sessão de navegador
    const tutorialSeen = sessionStorage.getItem('tutorialSeen');

    if (!tutorialSeen) {
      window.CoupModal?.open(tutorialModal);
    }

    const closeAction = () => {
      window.CoupModal?.close(tutorialModal);
      sessionStorage.setItem('tutorialSeen', 'true'); // Salva para não mostrar de novo
    };

    if (closeBtn) closeBtn.onclick = closeAction;
    if (startBtn) startBtn.onclick = closeAction;
  }



  /**
   * Gerencia a fila de imagens das cartas de ajuda (regras) baseada na composição atual do deck.
   * Verifica a presença de personagens de diferentes DLCs (Promo, Revolução e Sombras do Asilo)
   * para exibir apenas os guias de ações pertinentes aos jogadores na partida.
   */

  function calculateRuleImages() {
    const config = localGameState.deckConfig || {};
    let images = [];

    // Definição dos grupos de cartas
    const promoChars = ['bufao', 'benfeitor', 'burgues', 'burocrata'];
    const revolutionChars = ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'];
    const shadowsChars = ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife'];

    // Verifica se há alguma carta de cada expansão no set atual
    const hasPromo = promoChars.some(card => (config[card] || 0) > 0);
    const hasRevolution = revolutionChars.some(card => (config[card] || 0) > 0);
    const hasShadows = shadowsChars.some(card => (config[card] || 0) > 0);

    // 1. Carta Base (Alternativa se houver Revolução)
    if (hasRevolution) {
      images.push('assets/img/guides/front-actions-alternative.png');
    } else {
      images.push('assets/img/guides/front-actions.png');
    }

    // 2. Adiciona as cartas de regras das DLCs detectadas
    if (hasPromo) images.push('assets/img/guides/dlc-actions.png');
    if (hasRevolution) images.push('assets/img/guides/dlc2-actions.png');
    if (hasShadows) images.push('assets/img/guides/dlc3-actions.png'); // Nova carta de regras

    // 3. Verso das cartas de ajuda
    images.push('assets/img/guides/back-actions.png');

    return images;
  }


  if (characterActionsBtn && infoModal) {
    characterActionsBtn.onclick = () => {
      playSound('click');
      currentRuleImages = calculateRuleImages();
      window.CoupModal?.open(infoModal);

      if (flipCard) {
        currentRuleIndex = 0;
        flipCard.classList.remove('is-flipped');
        frontImg.src = currentRuleImages[0];
        backImg.src = currentRuleImages.length > 1 ? currentRuleImages[1] : currentRuleImages[0];
      }
    };

    if (closeInfoBtn) closeInfoBtn.onclick = () => {
      playSound('click');
      window.CoupModal?.close(infoModal);
    };

    if (flipCard) {
      flipCard.onclick = () => {
        playSound('card-slide');
        flipCard.classList.toggle('is-flipped');
        currentRuleIndex = (currentRuleIndex + 1) % currentRuleImages.length;
        setTimeout(() => {
          const nextIndex = (currentRuleIndex + 1) % currentRuleImages.length;
          if (flipCard.classList.contains('is-flipped')) {
            frontImg.src = currentRuleImages[nextIndex];
          } else {
            backImg.src = currentRuleImages[nextIndex];
          }
        }, 500);
      };
    }
  }

  const altRulesBtn = document.getElementById('altRulesBtn');
  const altRulesModal = document.getElementById('altRulesModal');
  const closeAltRulesBtn = document.getElementById('closeAltRulesBtn');
  const altFlipCard = document.getElementById('altRulesFlipCard');
  const altFrontImg = altFlipCard ? altFlipCard.querySelector('.flip-card-front img') : null;
  const altBackImg = altFlipCard ? altFlipCard.querySelector('.flip-card-back img') : null;

  const altRuleImagesList = [
    'assets/img/guides/alternative-rules1.png',
    'assets/img/guides/alternative-rules2.png',
    'assets/img/guides/alternative-rules3.png',
    'assets/img/guides/alternative-rules4.png',
    'assets/img/guides/alternative-rules5.png'
  ];

  let currentAltIndex = 0;

  if (altRulesBtn && altRulesModal) {
    altRulesBtn.onclick = () => {
      playSound('click');
      window.CoupModal?.open(altRulesModal);

      if (altFlipCard) {
        currentAltIndex = 0;
        altFlipCard.classList.remove('is-flipped');
        altFrontImg.src = altRuleImagesList[0];
        altBackImg.src = altRuleImagesList[1];
      }
    };

    if (closeAltRulesBtn) {
      closeAltRulesBtn.onclick = () => {
        playSound('click');
        window.CoupModal?.close(altRulesModal);
      };
    }

    if (altFlipCard) {
      altFlipCard.onclick = () => {
        playSound('card-slide');
        altFlipCard.classList.toggle('is-flipped');
        currentAltIndex = (currentAltIndex + 1) % altRuleImagesList.length;
        setTimeout(() => {
          const nextImageIndex = (currentAltIndex + 1) % altRuleImagesList.length;
          if (altFlipCard.classList.contains('is-flipped')) {
            altFrontImg.src = altRuleImagesList[nextImageIndex];
          } else {
            altBackImg.src = altRuleImagesList[nextImageIndex];
          }
        }, 500);
      };
    }
  }

  document.querySelectorAll('.player-area').forEach(area => {
    const pid = parseInt(area.dataset.player);
    const religionEl = area.querySelector('.religion-status');
    if (religionEl) religionEl.addEventListener('click', () => toggleReligion(pid));
    area.querySelector('.plus').addEventListener('click', () => updateScore(pid, 1));
    area.querySelector('.minus').addEventListener('click', () => updateScore(pid, -1));
  });


  if (document.getElementById('asylum-plus')) {
    document.getElementById('asylum-plus').onclick = () => updateAsylumScore(1);
    document.getElementById('asylum-minus').onclick = () => updateAsylumScore(-1);
  }


  checkTutorial();
}



// =======================================================
// === INICIALIZAÇÃO E EVENTOS DE HEADER ===
// =======================================================

/**
 * CONFIGURAÇÃO DO EXIBIDOR DE CÓDIGO DA SALA
 * Define o texto do código da sala no cabeçalho e gerencia a funcionalidade 
 * de copiar para a área de transferência ao clicar.
 */
const roomHeader = document.getElementById('roomHeader');
const roomCodeBtn = document.getElementById('roomCodeBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');

// Define o código da sala se o elemento e a variável existirem
if (roomCodeDisplay && typeof roomCode !== 'undefined' && roomCode) {
  roomCodeDisplay.textContent = roomCode;
}

// Configura o evento de clique para copiar o código da sala
if (roomCodeBtn) {
  roomCodeBtn.onclick = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      playSound('pop'); // Som de confirmação
      roomHeader?.classList.add('copied');

      const originalTitle = roomCodeBtn.title;
      roomCodeBtn.title = 'Código copiado!';

      // Reseta o estado visual do botão após 1.2 segundos
      setTimeout(() => {
        roomHeader?.classList.remove('copied');
        roomCodeBtn.title = originalTitle;
      }, 1200);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      // Fallback em caso de falha na API de clipboard
      alert("Código da sala: " + roomCode);
    });
  };
}

window.CoupCasualSettings?.setupReligionVisibilityPreference({ playSound });

// --- BOTÃO SAIR DA SALA ---
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
if (leaveRoomBtn) {
  leaveRoomBtn.onclick = () => {
    if (typeof playSound === 'function') playSound('click');
    sessionStorage.removeItem('currentRoomMode');
    window.location.href = 'lobby.html'; // Retorna ao lobby
  };
}


window.CoupCardPreview?.setup({
  getState: () => localGameState,
  findCardById,
  getCardFolder: window.CoupRenderCards?.getCardFolder,
  shouldShowBack: window.CoupRenderCards?.shouldShowBack,
  playSound
});

window.CoupDeckPresets?.setup({ playSound });
