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
let compatibleDragState = null;
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



// Lógica das Ações Rápidas

let quickActionTargetPid = null;
let quickProfileLoadKey = 0;

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
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function getQuickProfileDatabase() {
  if (window.db) return window.db;
  if (typeof db !== 'undefined') return db;
  return null;
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

  const avatar = document.getElementById('quickPlayerProfileAvatar');
  const loading = document.getElementById('quickPlayerProfileLoading');
  const statsGrid = document.getElementById('quickPlayerProfileStats');

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
  const loading = document.getElementById('quickPlayerProfileLoading');
  const statsGrid = document.getElementById('quickPlayerProfileStats');
  const avatar = document.getElementById('quickPlayerProfileAvatar');
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

  const database = getQuickProfileDatabase();
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

window.openQuickActions = (pid) => {
  quickActionTargetPid = pid;
  const modal = document.getElementById('quickActionsModal');
  const title = document.getElementById('quickActionsTitle');
  const kickBtn = document.getElementById('quickActionKickBtn');
  const player = localGameState.players[pid];

  if (modal && title && player) {
    title.innerText = 'Perfil do jogador';
    loadQuickPlayerRankedStats(player);

    if (kickBtn) {
      const canKick = Boolean(isAdmin && pid !== myPlayerId && (player.uid || player.online));
      kickBtn.hidden = !canKick;
      kickBtn.onclick = canKick ? () => {
        const targetPid = quickActionTargetPid;
        window.CoupModal?.close(modal);
        quickActionTargetPid = null;
        window.kickPlayer?.(targetPid);
      } : null;
    }

    if (typeof playSound === 'function') playSound('click');
    window.CoupModal?.open(modal);
  }
};

window.executeAction = (type) => {
  // Verifica se há um alvo e um jogador local definido
  if (!quickActionTargetPid || !myPlayerId) return;

  // Busca o estado atual dos envolvidos
  const myPlayer = localGameState.players[myPlayerId];
  const myScore = myPlayer ? (myPlayer.score || 0) : 0;
  const targetPlayer = localGameState.players[quickActionTargetPid];
  const targetScore = targetPlayer ? (targetPlayer.score || 0) : 0;

  switch (type) {
    case 'coup':
      // 1. Verificação de saldo: Golpe exige no mínimo 7 moedas
      if (myScore < 7) {
        console.log("Saldo insuficiente para aplicar um Golpe de Estado.");
        if (typeof playSound === 'function') playSound('click');
        return; // Bloqueia a ação
      }

      // 2. Deduz as 7 moedas (silencia o som de moeda para usar o impacto)
      updateScore(myPlayerId, -7, true);

      // 3. Dispara som de impacto pesado globalmente
      if (typeof triggerSound === 'function') triggerSound('unity-sword');
      break;

    case 'steal':
      // REGRA: O Capitão só rouba se o alvo tiver 2 ou mais moedas
      if (targetScore < 2) {
        console.log("Ação cancelada: O alvo deve ter pelo menos 2 moedas.");
        if (typeof playSound === 'function') playSound('click');
        break;
      }

      // Executa o roubo de 2 moedas
      updateScore(quickActionTargetPid, -2);
      updateScore(myPlayerId, 2);
      break;

    case 'assassinate':
      // Verifica se o jogador tem saldo para pagar o assassinato (3 moedas)
      if (myScore < 3) {
        console.log("Saldo insuficiente para assassinar.");
        if (typeof playSound === 'function') playSound('click');
        return;
      }

      // Deduz moedas e dispara o som de estrela ninja
      updateScore(myPlayerId, -3, true);
      if (typeof triggerSound === 'function') triggerSound('ninja-star');
      break;

    case 'tax':
      // Duque recebe 3 moedas
      updateScore(myPlayerId, 3);
      break;
  }

  // Fecha o modal após qualquer ação processada
  window.CoupModal?.close('quickActionsModal');
  quickActionTargetPid = null;
};



/**
 * LÓGICA DE VISIBILIDADE DE CARTAS
 * Determina se uma carta deve exibir o seu verso (back) ou a sua face frontal.
 * Leva em conta a localização da carta e permissões de espectador (Ghost Mode).
 */
function shouldShowBack(card) {
  // Cartas no deck sempre mostram o verso
  if (card.location === 'deck') return true;

  // Cartas no cemitério (reveladas) sempre mostram a frente
  if (card.location === 'free') return false;

  // Lógica para cartas em posse de jogadores
  if (card.location?.startsWith('player-')) {
    const ownerId = card.owner;
    const owner = localGameState.players ? localGameState.players[ownerId] : null;

    // Verifica se o dono da carta permitiu que o usuário atual (espectador) veja sua mão
    const isSpectatingThisOwner = owner && owner.spectators && owner.spectators[myPlayerId];

    // Se você for o dono ou um espectador autorizado, vê a frente; caso contrário, vê o verso
    if (ownerId === myPlayerId || isSpectatingThisOwner) {
      return false; // Exibe a frente
    }
    return true; // Exibe o verso
  }
  return false;
}


/**
 * MAPEAMENTO DE DIRETÓRIOS POR TIPO DE CARTA
 * Retorna o subdiretório correto (base, dlc1, dlc2 ou promo) baseado no tipo da influência.
 */
function getCardFolder(type) {
  const t = type.toLowerCase();

  // Categorias baseadas na nova estrutura de pastas
  const base = ['assassino', 'capitao', 'condessa', 'duque', 'embaixador', 'inquisidor'];
  const dlc1 = ['bispo', 'diplomata', 'marionetista', 'mercenario', 'tesoureiro', 'vigilante'];
  const dlc2 = ['estrategista', 'ladrao', 'magnata', 'pistoleiro', 'vigarista', 'xerife'];
  const promo = ['benfeitor', 'bufao', 'burgues', 'burocrata'];

  if (base.includes(t)) return 'base';
  if (dlc1.includes(t)) return 'dlc1';
  if (dlc2.includes(t)) return 'dlc2';
  if (promo.includes(t)) return 'promo';

  return 'base'; // Fallback padrão
}

const CARD_DISPLAY_NAMES = {
  duque: 'Duque',
  capitao: 'Capitão',
  assassino: 'Assassino',
  embaixador: 'Embaixador',
  condessa: 'Condessa',
  inquisidor: 'Inquisidor',
  benfeitor: 'Benfeitor',
  bufao: 'Bufão',
  burgues: 'Burguês',
  burocrata: 'Burocrata',
  vigilante: 'Vigilante',
  mercenario: 'Mercenário',
  bispo: 'Bispo',
  tesoureiro: 'Tesoureiro',
  diplomata: 'Diplomata',
  marionetista: 'Marionetista',
  pistoleiro: 'Pistoleiro',
  magnata: 'Magnata',
  estrategista: 'Estrategista',
  ladrao: 'Ladrão',
  vigarista: 'Vigarista',
  xerife: 'Xerife'
};

function getCardDisplayName(type) {
  if (!type) return 'Carta';

  const normalizedType = String(type).toLowerCase();
  return CARD_DISPLAY_NAMES[normalizedType] || normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
}

let cardTooltipEl = null;

function getCardTooltipElement() {
  if (!cardTooltipEl) {
    cardTooltipEl = document.createElement('div');
    cardTooltipEl.id = 'cardTooltip';
    cardTooltipEl.className = 'card-tooltip';
    document.body.appendChild(cardTooltipEl);
  }

  return cardTooltipEl;
}

function positionCardTooltip(event) {
  const tooltip = getCardTooltipElement();
  const offset = 14;
  const rect = tooltip.getBoundingClientRect();
  let left = event.clientX + offset;
  let top = event.clientY + offset;

  if (left + rect.width > window.innerWidth - 8) {
    left = event.clientX - rect.width - offset;
  }

  if (top + rect.height > window.innerHeight - 8) {
    top = event.clientY - rect.height - offset;
  }

  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}

function showCardTooltip(event, label) {
  const tooltip = getCardTooltipElement();
  tooltip.textContent = label;
  tooltip.classList.add('is-visible');
  positionCardTooltip(event);
}

function hideCardTooltip() {
  if (cardTooltipEl) {
    cardTooltipEl.classList.remove('is-visible');
  }
}

function attachElementTooltip(element, label) {
  if (!element || !label) return;
  element.dataset.cardLabel = label;
  element.setAttribute('aria-label', label);

  if (element.dataset.tooltipBound === 'true') return;
  element.dataset.tooltipBound = 'true';

  element.addEventListener('mouseenter', (event) => {
    showCardTooltip(event, label);
  });

  element.addEventListener('mousemove', (event) => {
    if (cardTooltipEl?.classList.contains('is-visible')) {
      positionCardTooltip(event);
    }
  });

  element.addEventListener('mouseleave', hideCardTooltip);
}

function attachCardTooltip(element, card) {
  const label = shouldShowBack(card) ? 'Carta oculta' : getCardDisplayName(card.type);
  attachElementTooltip(element, label);
}


/**
 * CRIAÇÃO DE ELEMENTO DE CARTA (ATUALIZADA PARA NOVAS PASTAS)
 */
function animateReturnCardToDeck(cardElement, cardId) {
  if (!cardElement || !deckEl || cardElement.dataset.returningToDeck === 'true') return;

  const sourceRect = cardElement.getBoundingClientRect();
  const targetRect = deckEl.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
    returnCardToDeck(cardId);
    return;
  }

  cardElement.dataset.returningToDeck = 'true';
  cardElement.classList.add('is-returning-to-deck');

  const ghost = cardElement.cloneNode(true);
  const cardStyle = window.getComputedStyle(cardElement);
  ghost.className = 'card-return-ghost';
  ghost.removeAttribute('draggable');
  ghost.style.left = `${sourceRect.left}px`;
  ghost.style.top = `${sourceRect.top}px`;
  ghost.style.width = `${sourceRect.width}px`;
  ghost.style.height = `${sourceRect.height}px`;
  ghost.style.border = cardStyle.border;
  ghost.style.borderRadius = cardStyle.borderRadius;
  ghost.style.backgroundColor = cardStyle.backgroundColor;
  ghost.style.backgroundImage = cardStyle.backgroundImage;
  ghost.style.backgroundPosition = cardStyle.backgroundPosition;
  ghost.style.backgroundSize = cardStyle.backgroundSize;
  ghost.style.backgroundRepeat = cardStyle.backgroundRepeat;
  document.body.appendChild(ghost);

  const targetX = targetRect.left + (targetRect.width / 2) - (sourceRect.left + (sourceRect.width / 2));
  const targetY = targetRect.top + (targetRect.height / 2) - (sourceRect.top + (sourceRect.height / 2));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finishReturn = () => {
    ghost.remove();
    returnCardToDeck(cardId);
  };

  if (prefersReducedMotion || typeof ghost.animate !== 'function') {
    finishReturn();
    return;
  }

  ghost.animate([
    { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate3d(${targetX * 0.72}px, ${targetY * 0.72 - 18}px, 0) scale(0.86) rotate(4deg)`, opacity: 0.96, offset: 0.72 },
    { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.18) rotate(9deg)`, opacity: 0 }
  ], {
    duration: 430,
    easing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
    fill: 'forwards'
  }).finished.then(finishReturn, finishReturn);
}

function createCardElement(card) {

  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = !isSamsungDragModeEnabled();
  el.dataset.cardId = card.id;

  // --- DEFINIÇÃO DE APARÊNCIA (FRENTE/VERSO) ---
  if (shouldShowBack(card)) {
    el.classList.add('back');
    // Agora o back.png está dentro da pasta base
    el.style.backgroundImage = `url('./assets/img/cards/base/back.png')`;
  } else {
    // Identifica a pasta correta baseada no tipo
    const folder = getCardFolder(card.type);
    const imageUrl = `./assets/img/cards/${folder}/${card.type.toLowerCase()}.png`;
    el.style.backgroundImage = `url('${imageUrl}')`;
  }

  // --- EVENTOS DE ARRASTAR (DRAG & DROP) ---
  el.addEventListener('dragstart', (ev) => {
    if (isSamsungDragModeEnabled()) {
      ev.preventDefault();
      return;
    }

    hideCardTooltip();
    ev.dataTransfer.setData('text/plain', card.id);
    ev.dataTransfer.effectAllowed = "move";
    el.classList.add('lifting');

    setTimeout(() => {
      el.classList.remove('lifting');
      el.classList.add('is-dragging');
    }, 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('lifting');
    el.classList.remove('is-dragging');
    hideCardTooltip();
  });

  // --- INTERAÇÕES ADICIONAIS ---
  el.addEventListener('dblclick', () => {
    hideCardTooltip();
    animateReturnCardToDeck(el, card.id);
  });

  attachBalatroEffect(el);
  attachCardTooltip(el, card);
  attachCompatiblePointerDrag(el, card.id);

  return el;
}



/**
 * FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
 * Sincroniza o estado do Firebase com a interface e aplica permissões de Host (isAdmin).
 */

function renderEmptyPlayerSlot(playerEl, pid) {
  playerEl.style.removeProperty('display');
  playerEl.classList.add('is-empty');
  playerEl.setAttribute('aria-label', `Slot ${pid} vazio`);
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
    emptyLabel.textContent = 'Aguardando jogador';
    hand.appendChild(emptyLabel);
  }
}

function getVisibleMobileSeatLimit(players = {}) {
  let highestOccupiedSlot = 0;

  for (let pid = 1; pid <= MAX_PLAYERS; pid++) {
    const player = players[pid];
    if (player && (player.online || player.uid)) {
      highestOccupiedSlot = pid;
    }
  }

  const minimumVisibleSlots = 4;
  const visibleSlots = Math.max(minimumVisibleSlots, highestOccupiedSlot);

  return Math.min(MAX_PLAYERS, Math.ceil(visibleSlots / 2) * 2);
}

function applyMobileSeatVisibility(players = {}) {
  const visibleLimit = getVisibleMobileSeatLimit(players);
  const bottomRow = document.querySelector('.player-row-bottom');

  for (let pid = 1; pid <= MAX_PLAYERS; pid++) {
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


  // --- 1. LÓGICA DO SISTEMA DE ESPECTADOR (GHOST MODE) ---

  const spectatorBtn = document.getElementById('spectatorBtn');
  const spectatorModal = document.getElementById('spectatorModal');
  const spectatorList = document.getElementById('spectator-list');
  const spectatorHelperText = document.getElementById('spectator-helper-text');
  const closeSpectatorModalBtn = document.getElementById('closeSpectatorModalBtn');

  if (spectatorBtn && spectatorModal) {
    const myHand = state.players[myPlayerId]?.hand || [];

    // Exibe botão de modo espectador
    spectatorBtn.style.setProperty('display', 'flex', 'important');

    // Abertura do Modal e Listagem de Alvos
    spectatorBtn.onclick = () => {
      playSound('click');
      spectatorList.innerHTML = '';
      let availablePlayers = 0;

      for (let i = 1; i <= MAX_PLAYERS; i++) {
        const p = state.players[i];
        // Só lista jogadores que possuem UID e não são o próprio usuário
        if (p && p.uid && i !== myPlayerId) {
          availablePlayers++;
          const btn = document.createElement('div');
          btn.className = 'spectator-target-btn';
          btn.innerHTML = `
          <img src="${p.photo || 'img/coup.png'}" alt="">
          <span>${p.name || 'Jogador ' + i}</span>
        `;
          btn.onclick = () => {
            playSound('pop');
            requestSpectate(i); // Solicita permissão via Firebase
            window.CoupModal?.close(spectatorModal);
          };
          spectatorList.appendChild(btn);
        }
      }

      if (spectatorHelperText) {
        spectatorHelperText.hidden = availablePlayers === 0;
      }

      spectatorList.classList.toggle('is-empty', availablePlayers === 0);

      if (availablePlayers === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'muted spectator-empty-message';
        emptyMessage.textContent = 'Não tem jogadores disponíveis.';
        spectatorList.appendChild(emptyMessage);
      }
      window.CoupModal?.open(spectatorModal);
    };

    // Botão de Fechamento do Modal
    if (closeSpectatorModalBtn) {
      closeSpectatorModalBtn.onclick = () => {
        playSound('click');
        window.CoupModal?.close(spectatorModal);
      };
    }
  }

  // Limpa o tabuleiro antes de desenhar o novo estado.
  clearDOM();
  applyMobileSeatVisibility(state.players);




  // --- 2. RENDERIZAÇÃO DOS SLOTS DE JOGADORES ---


  for (let pid = 1; pid <= MAX_PLAYERS; pid++) {
    const playerEl = document.getElementById(`player-${pid}`);
    if (!playerEl) continue;

    playerEl.classList.add('player-seat');

    const player = state.players[pid] || { online: false, hand: [], score: 0, religion: 'catolico', uid: null };

    const isOccupied = Boolean(player.online || player.uid);
    playerEl.style.removeProperty('display');
    playerEl.classList.toggle('is-empty', !isOccupied);

    if (!isOccupied) {
      renderEmptyPlayerSlot(playerEl, pid);
      continue;
    }

    playerEl.setAttribute('aria-label', player.name || `Jogador ${pid}`);

    // --- 2.1 IDENTIFICAÇÃO E CONTROLE DE MODERAÇÃO ---
    if (pid === myPlayerId) {
      playerEl.classList.add('local-player');
    }

    // --- 2.2 CABEÇALHO DO JOGADOR (AVATAR E NOME) ---
    let headerEl = playerEl.querySelector('.player-header');
    if (!headerEl) {
      let titleDiv = playerEl.querySelector('.player-title');
      if (!titleDiv) {
        titleDiv = document.createElement('div');
        titleDiv.className = 'player-title';
      }

      headerEl = document.createElement('div');
      headerEl.className = 'player-header player-identity';

      const img = document.createElement('img');
      img.className = 'player-avatar';

      // Mantém a identificação como primeira linha do slot.
      playerEl.insertBefore(headerEl, playerEl.querySelector('.points'));
      headerEl.appendChild(img);
      headerEl.appendChild(titleDiv);
    }

    const avatarImg = headerEl.querySelector('.player-avatar');
    const nameTxt = headerEl.querySelector('.player-title');

    headerEl.classList.add('player-identity');
    nameTxt?.classList.add('player-name');

    if (avatarImg) {
      avatarImg.src = player.photo || 'img/coup.png';
      avatarImg.alt = `Perfil de ${player.name || 'Jogador ' + pid}`;
      avatarImg.title = 'Ver perfil do jogador';
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
      nameTxt.textContent = player.name || `Jogador ${pid}`;

      // NOVO: Gatilho para o Modal de Ações Rápidas
      nameTxt.style.cursor = 'pointer'; // Feedback visual de clique
      nameTxt.onclick = () => {
        if (typeof openQuickActions === 'function') openQuickActions(pid);
      };
    }

    // Atualização do ícone de religião

    // --- 2.3 STATUS DE RELIGIÃO (MODO ÍCONE CIRCULAR) ---
    let religionIcon = headerEl.querySelector('.religion-badge');

    if (!religionIcon) {
      religionIcon = document.createElement('img');
      religionIcon.className = 'religion-badge';
      // Insere o ícone logo após o nome do jogador no cabeçalho
      headerEl.appendChild(religionIcon);
    }

    const isProtestante = player.religion === 'protestante';
    // Utiliza os novos caminhos da estrutura de pastas refatorada 
    const iconPath = isProtestante
      ? 'assets/img/cards/religion/protestante-quadrado.png'
      : 'assets/img/cards/religion/catolico-quadrado.png';

    religionIcon.src = iconPath;
    religionIcon.alt = player.religion;
    religionIcon.title = isProtestante ? 'Protestante' : 'Católico';

    // Permite clicar no ícone para trocar de religião, assim como antes
    religionIcon.onclick = (e) => {
      e.stopPropagation(); // Evita abrir o modal de ações rápidas ao clicar no ícone
      toggleReligion(pid);
    };

    // --- 2.4 RENDERIZAÇÃO DA MÃO E PONTUAÇÃO ---
    const handContainer = playerEl.querySelector('[data-hand]');
    if (handContainer) {
      player.hand?.forEach((card) => {
        const slot = document.createElement('div');
        slot.className = 'slot small';
        const el = createCardElement(card);
        el.classList.add('small');
        slot.appendChild(el);
        handContainer.appendChild(slot);
      });

      if (!player.hand || player.hand.length === 0) {
        const slot = document.createElement('div');
        slot.className = 'slot small';
        handContainer.appendChild(slot);
      }

      updateHandFanLayout(handContainer);
    }

    const scoreEl = playerEl.querySelector('.score');
    if (scoreEl) scoreEl.textContent = player.score || 0;

    // --- INDICADOR DE ESPECTADOR ---
    if (player?.spectators && player.spectators[myPlayerId]) {
      playerEl.style.boxShadow = "0 0 8px #1e90ff";
      playerEl.style.border = "2px solid #1e90ff";
    } else {
      playerEl.style.boxShadow = "";
      playerEl.style.border = "";
    }
  }

  scheduleCardFanLayout();


  const closeQuickActionsBtn = document.getElementById('closeQuickActionsBtn');
  if (closeQuickActionsBtn) {
    closeQuickActionsBtn.onclick = () => {
      window.CoupModal?.close('quickActionsModal');
      quickActionTargetPid = null;
    };
  }




  // --- 4. RENDERIZAÇÃO DO TABULEIRO CENTRAL (ÁREA LIVRE / DECK) ---
  // Exibe as cartas que estão abertas no cemitério e atualiza contadores.
  state.freeCards?.forEach(card => {
    const el = createCardElement(card);
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


// =======================================================
// === CONFIGURAÇÃO DE INTERAÇÕES (DRAG & DROP) ===
// =======================================================

/**
 * CONFIGURAÇÃO DE ZONAS DE DEPÓSITO (DROPZONES)
 * Define como o Deck, as áreas de jogadores e o cemitério reagem ao
 * arrasto e soltura de cartas ou ações de compra.
 */
function createCompatibleDragGhost(sourceElement, pointerEvent) {
  const sourceRect = sourceElement.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(sourceElement);
  const ghost = sourceElement.cloneNode(true);

  ghost.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.remove('balatro-effect', 'is-tilting', 'is-dragging', 'lifting');
  ghost.classList.add('compatible-drag-ghost');
  ghost.style.width = `${sourceRect.width}px`;
  ghost.style.height = `${sourceRect.height}px`;
  ghost.style.aspectRatio = computedStyle.aspectRatio;
  ghost.style.backgroundImage = computedStyle.backgroundImage;
  ghost.style.backgroundColor = computedStyle.backgroundColor;
  ghost.style.backgroundSize = computedStyle.backgroundSize;
  ghost.style.backgroundPosition = computedStyle.backgroundPosition;
  ghost.style.backgroundRepeat = computedStyle.backgroundRepeat;
  ghost.style.borderRadius = computedStyle.borderRadius;
  ghost.style.border = computedStyle.border;
  ghost.style.overflow = 'hidden';
  ghost.style.left = `${pointerEvent.clientX}px`;
  ghost.style.top = `${pointerEvent.clientY}px`;
  ghost.style.setProperty('--tilt-x', '0deg');
  ghost.style.setProperty('--tilt-y', '0deg');
  ghost.style.setProperty('--card-scale', '1');
  ghost.style.setProperty('--card-lift', '0px');
  ghost.style.setProperty('--card-base-shift', '0px');
  ghost.style.setProperty('--card-base-rotation', '0deg');
  ghost.style.removeProperty('--glow-x');
  ghost.style.removeProperty('--glow-y');
  document.body.appendChild(ghost);

  return ghost;
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

function activateCompatibleDrag(event) {
  if (!compatibleDragState || compatibleDragState.activated) return;

  event.preventDefault();
  hideCardTooltip();
  resetBalatroElement(compatibleDragState.sourceElement);
  compatibleDragState.sourceElement?.classList.add('is-compatible-drag-source');
  compatibleDragState.ghost = createCompatibleDragGhost(compatibleDragState.sourceElement, event);
  compatibleDragState.activated = true;
  compatibleDragState.sourceElement?.classList.add('is-dragging');
}

function getCompatibleDropzone(clientX, clientY) {
  if (!compatibleDragState?.ghost) return null;

  compatibleDragState.ghost.style.display = 'none';
  const elementBelowPointer = document.elementFromPoint(clientX, clientY);
  compatibleDragState.ghost.style.display = '';

  if (!elementBelowPointer) return null;

  const playerArea = elementBelowPointer.closest('.player-area');
  if (playerArea && !playerArea.classList.contains('is-empty')) {
    return playerArea;
  }

  const graveyardDropzone = elementBelowPointer.closest('#graveyardArea');
  if (graveyardDropzone) return graveyardDropzone;

  const deckDropzone = elementBelowPointer.closest('#deck');
  if (deckDropzone) return deckDropzone;

  return null;
}

function updateCompatibleDropHighlight(dropzone) {
  if (compatibleDragState?.dropzone === dropzone) return;

  compatibleDragState?.dropzone?.classList.remove('compatible-drop-hover');
  if (dropzone) dropzone.classList.add('compatible-drop-hover');
  if (compatibleDragState) compatibleDragState.dropzone = dropzone;
}

function finishCompatibleDrag() {
  if (!compatibleDragState) return;

  compatibleDragState.dropzone?.classList.remove('compatible-drop-hover');
  compatibleDragState.sourceElement?.classList.remove('is-dragging');
  compatibleDragState.sourceElement?.classList.remove('is-compatible-drag-source');
  resetBalatroElement(compatibleDragState.sourceElement);
  compatibleDragState.ghost?.remove();
  compatibleDragState = null;

  document.removeEventListener('pointermove', onCompatiblePointerMove);
  document.removeEventListener('pointerup', onCompatiblePointerUp);
  document.removeEventListener('pointercancel', onCompatiblePointerCancel);
}

function handleCompatibleDrop(dragData, dropzone, wasTap) {
  if (!dropzone) return;

  if (dropzone.id === 'deck') {
    if (dragData === 'DECK_DRAW_ACTION') {
      if (wasTap) drawCard();
      return;
    }

    moveCard(dragData, 'deck');
    return;
  }

  if (dropzone.id === 'graveyardArea') {
    if (dragData === 'DECK_DRAW_ACTION') {
      burnTopCard();
      return;
    }

    moveCard(dragData, 'free');
    return;
  }

  if (dropzone.classList.contains('player-area')) {
    const pid = parseInt(dropzone.dataset.player, 10);
    if (!pid) return;

    if (dragData === 'DECK_DRAW_ACTION') {
      drawCard(pid);
      return;
    }

    moveCard(dragData, 'player', pid);
  }
}

function onCompatiblePointerMove(event) {
  if (!compatibleDragState) return;

  const deltaX = event.clientX - compatibleDragState.startX;
  const deltaY = event.clientY - compatibleDragState.startY;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance > 6) {
    compatibleDragState.hasMoved = true;
    activateCompatibleDrag(event);
  }

  if (!compatibleDragState?.activated || !compatibleDragState.ghost) return;

  event.preventDefault();

  compatibleDragState.ghost.style.left = `${event.clientX}px`;
  compatibleDragState.ghost.style.top = `${event.clientY}px`;

  const dropzone = getCompatibleDropzone(event.clientX, event.clientY);
  updateCompatibleDropHighlight(dropzone);
}

function onCompatiblePointerUp(event) {
  if (!compatibleDragState) return;

  const { data, dropzone, activated, hasMoved } = compatibleDragState;
  const finalDropzone = activated ? (dropzone || getCompatibleDropzone(event.clientX, event.clientY)) : null;
  finishCompatibleDrag();

  if (!activated) {
    if (data === 'DECK_DRAW_ACTION' && !hasMoved) drawCard();
    return;
  }

  event.preventDefault();
  handleCompatibleDrop(data, finalDropzone, false);
}

function onCompatiblePointerCancel() {
  finishCompatibleDrag();
}

function startCompatiblePointerDrag(sourceElement, dragData, event) {
  if (
    !isSamsungDragModeEnabled()
    || (event.button !== undefined && event.button !== 0)
    || event.detail > 1
  ) return;

  finishCompatibleDrag();

  compatibleDragState = {
    activated: false,
    data: dragData,
    dropzone: null,
    ghost: null,
    hasMoved: false,
    sourceElement,
    startX: event.clientX,
    startY: event.clientY
  };

  sourceElement.setPointerCapture?.(event.pointerId);
  sourceElement.addEventListener('lostpointercapture', () => {
    sourceElement.classList.remove('is-dragging');
  }, { once: true });

  document.addEventListener('pointermove', onCompatiblePointerMove, { passive: false });
  document.addEventListener('pointerup', onCompatiblePointerUp, { passive: false });
  document.addEventListener('pointercancel', onCompatiblePointerCancel, { passive: false });
}

function attachCompatiblePointerDrag(element, dragData) {
  if (!element || element.dataset.compatibleDragBound === 'true') return;

  element.dataset.compatibleDragBound = 'true';
  element.addEventListener('pointerdown', (event) => {
    startCompatiblePointerDrag(element, dragData, event);
  }, { passive: false });
}

function setupDropzones() {
  // --- CONFIGURAÇÃO DO DECK (BARALHO) ---
  // Inicia a ação de compra ao arrastar o Deck
  deckEl.addEventListener('dragstart', (e) => {
    if (isSamsungDragModeEnabled()) {
      e.preventDefault();
      return;
    }

    hideCardTooltip();
    e.dataTransfer.setData('text/plain', 'DECK_DRAW_ACTION');
  });

  deckEl.ondragover = ev => ev.preventDefault();
  deckEl.ondrop = ev => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/plain');
    // Se soltar uma carta no Deck, ela volta para o baralho
    if (id !== 'DECK_DRAW_ACTION') moveCard(id, 'deck');
  };

  // Clique simples no Deck compra uma carta para o jogador local
  deckEl.onclick = () => {
    if (!isSamsungDragModeEnabled()) drawCard();
  };
  deckEl.onkeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      drawCard();
    }
  };

  // --- CONFIGURAÇÃO DAS ÁREAS DOS JOGADORES ---
  document.querySelectorAll('.player-area').forEach(area => {
    area.ondragover = ev => {
      if (!area.classList.contains('is-empty')) ev.preventDefault();
    };
    area.ondrop = ev => {
      ev.preventDefault();
      if (area.classList.contains('is-empty')) return;

      const data = ev.dataTransfer.getData('text/plain');
      const pid = parseInt(area.dataset.player);

      // Se o dado for a ação do Deck, compra uma carta para aquele jogador específico
      if (data === 'DECK_DRAW_ACTION') {
        drawCard(pid);
      } else {
        // Caso contrário, move a carta arrastada para a mão do jogador
        moveCard(data, 'player', pid);
      }
    };
  });

  // --- CONFIGURAÇÃO DO CEMITÉRIO ---
  graveyardArea.ondragover = ev => ev.preventDefault();
  graveyardArea.ondrop = ev => {
    ev.preventDefault();
    const data = ev.dataTransfer.getData('text/plain');

    // Se arrastar do Deck para o meio, "queima" (revela) a carta do topo
    if (data === 'DECK_DRAW_ACTION') {
      burnTopCard();
    } else {
      // Move a carta arrastada para ficar visível a todos no centro
      moveCard(data, 'free');
    }
  };

  attachCompatiblePointerDrag(deckEl, 'DECK_DRAW_ACTION');
  refreshSamsungDragMode();
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
  getCardFolder,
  shouldShowBack,
  playSound
});

window.CoupDeckPresets?.setup({ playSound });
