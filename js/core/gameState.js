// =======================================================
// === CONFIGURAÇÃO INICIAL E CONEXÃO (gameState.js) ===
// =======================================================

// 1. Extração de parâmetros da URL para identificar a partida
const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('room');

// 2. Recuperação de credenciais do usuário da sessão atual
const currentUser = {
  uid: sessionStorage.getItem('currentUID'),
  name: sessionStorage.getItem('currentName'),
  photo: sessionStorage.getItem('currentPhoto'),
  isAnonymous: sessionStorage.getItem('currentIsAnonymous') === 'true'
};

// 3. Validação de Segurança: Redireciona se os dados obrigatórios estiverem ausentes
if (!roomCode || !currentUser.uid) {
  window.location.href = 'lobby.html';
}

// 4. Referência ao banco de dados em tempo real (Firebase)
const gameStateRef = db.ref(`salas/${roomCode}/gameState`);

// 5. Estado Local e Variáveis de Controle
let localGameState = {};
let myPlayerId = null;
let isDrawingCard = false;
let lastSoundTimestamp = 0;
let pendingKickPid = null;
window.pendingKickPid = null;


// =======================================================
// === SISTEMA DE ESPECTADOR (GHOST MODE) ===
// =======================================================

/**
 * SOLICITAÇÃO DE ESPECTADOR
 * Envia uma notificação via Firebase para um jogador alvo e abre o modal 
 * de espera para quem deseja assistir.
 */
function requestSpectate(targetPid) {
  const targetPlayer = localGameState.players[targetPid];
  if (!targetPlayer || !targetPlayer.uid) return;

  // Registra a solicitação no nó de notificações do alvo
  db.ref(`salas/${roomCode}/notifications/${targetPlayer.uid}`).set({
    fromName: currentUser.name,
    fromPid: myPlayerId,
    type: 'SPECTATE_REQUEST',
    timestamp: Date.now()
  });

  // Interface: Abre o feedback visual de "aguardando resposta"
  const waitModal = document.getElementById('waitSpectateModal');
  if (waitModal) {
    waitModal.style.display = 'flex';
  }

  const closeBtn = document.getElementById('closeWaitModalBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      waitModal.style.display = 'none';
    };
  }
}

/**
 * LISTENER DE NOTIFICAÇÕES
 * Monitora solicitações de entrada e gerencia o modal de confirmação/recusa 
 * para o jogador que está sendo solicitado para ser assistido.
 */
function setupNotificationListener() {
  db.ref(`salas/${roomCode}/notifications/${currentUser.uid}`).on('value', (snapshot) => {
    const data = snapshot.val();
    if (data && data.type === 'SPECTATE_REQUEST') {
      const modal = document.getElementById('spectateRequestModal');
      const text = document.getElementById('spectateRequestText');

      if (modal && text) {
        text.innerText = `${data.fromName} deseja te assistir. Aceitar?`;
        modal.style.display = 'flex';
        playSound('pop'); // Alerta sonoro de solicitação

        // Resposta Positiva: Adiciona o espectador à lista do jogador
        document.getElementById('acceptSpectateBtn').onclick = () => {
          db.ref(`salas/${roomCode}/gameState/players/${myPlayerId}/spectators/${data.fromPid}`).set(data.fromName);
          modal.style.display = 'none';
        };

        // Resposta Negativa: Apenas fecha o modal
        document.getElementById('denySpectateBtn').onclick = () => {
          modal.style.display = 'none';
        };
      }
      // Limpa o registro para evitar repetições indesejadas
      snapshot.ref.remove();
    }
  });
}


// =======================================================
// === ECONOMIA E MECÂNICAS DE MESA ===
// =======================================================

/**
 * SAQUE DO ASILO
 * Coleta todas as moedas acumuladas no Asilo, zera o contador central e 
 * credita o valor ao saldo do jogador local.
 */
function withdrawAsylumCoins() {
  if (!myPlayerId) return;

  const asylumRef = db.ref(`salas/${roomCode}/gameState/asylumScore`);
  asylumRef.once('value', (snapshot) => {
    const currentAsylumCoins = snapshot.val() || 0;

    if (currentAsylumCoins > 0) {
      asylumRef.set(0); // Limpa o saldo central

      // Atualiza o saldo do jogador (silent=true para evitar spam de som 'coin')
      updateScore(myPlayerId, currentAsylumCoins, true);

      // Emite o efeito sonoro de saque total
      triggerSound('bag-coins');
    }
  });
}


// =======================================================
// === UTILITÁRIOS GLOBAIS DE ÁUDIO E SFX ===
// =======================================================

const DEFAULT_SFX_VOLUME = 1;

function normalizeVolume(value, fallback = DEFAULT_SFX_VOLUME) {
  const volume = Number(value);
  if (!Number.isFinite(volume)) return fallback;
  return Math.max(0, Math.min(1, volume));
}

window.sfxVolume = normalizeVolume(localStorage.getItem('sfxVolume'));

function setSfxVolume(value) {
  const normalizedVolume = normalizeVolume(value);
  window.sfxVolume = normalizedVolume;
  localStorage.setItem('sfxVolume', String(normalizedVolume));

  document.querySelectorAll('audio[id^="audio-"]').forEach((audio) => {
    audio.volume = normalizedVolume;
  });

  return normalizedVolume;
}

/**
 * REPRODUÇÃO LOCAL
 * Executa um arquivo de áudio presente no DOM baseado no ID fornecido.
 */
function playSound(id) {
  const sound = document.getElementById('audio-' + id);
  if (sound) {
    sound.volume = normalizeVolume(window.sfxVolume);
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Erro ao tocar som:", e));
  }
}

/**
 * SINCRONIZAÇÃO GLOBAL DE SOM
 * Registra no Firebase um evento de som para que todos os jogadores 
 * conectados ouçam o efeito simultaneamente.
 */
function triggerSound(soundId) {
  db.ref(`salas/${roomCode}/gameState/lastSFX`).set({
    id: soundId,
    timestamp: Date.now()
  });
}



// =======================================================
// === GERENCIAMENTO DO BARALHO E MESA (DECK & TABLE) ===
// =======================================================

/**
 * RESETAR MESA
 * Reinicia o estado global da partida, limpando cartas e moedas,
 * mas preservando os jogadores que já estão na sala.
 */
function resetTable(newConfig = null) {
  // Bloqueio de segurança: se não for admin, a função é interrompida
  if (!isAdmin) {
    console.error("Ação negada: Apenas o Host pode resetar a mesa.");
    return;
  }

  updateRoomActivity();
  triggerSound('8-bit-start');

  const configToUse = newConfig || localGameState.deckConfig || createDefaultDeckConfig();
  let newDeck = createDeck(configToUse);
  let currentPlayers = localGameState.players || {};
  let newPlayersState = {};

  for (let i = 1; i <= 10; i++) {
    newPlayersState[i] = {
      online: currentPlayers[i]?.online || false,
      uid: currentPlayers[i]?.uid || null,
      name: currentPlayers[i]?.name || null,
      photo: currentPlayers[i]?.photo || null,
      hand: [],
      score: 2,
      religion: (i % 2 === 1) ? 'catolico' : 'protestante'
    };
  }

  let initialState = {
    deck: newDeck,
    grave: [],
    freeCards: [],
    asylumScore: 0,
    deckConfig: configToUse,
    players: newPlayersState
  };

  gameStateRef.set(initialState);
}


/**
 * COMPRAR CARTA
 * Retira a carta do topo do deck e a entrega a um jogador específico.
 */
function drawCard(targetPid = null) {
  const playerToReceive = targetPid || myPlayerId;
  if (!playerToReceive) return;

  if (isDrawingCard) return;
  isDrawingCard = true;
  triggerSound('card-slide');

  updateRoomActivity();

  gameStateRef.transaction((currentState) => {
    if (!currentState || !currentState.deck || currentState.deck.length === 0) {
      isDrawingCard = false;
      return;
    }

    const card = currentState.deck.pop(); // Remove do topo
    card.owner = playerToReceive;
    card.location = 'player-' + playerToReceive;
    card.visible = false;

    if (!currentState.players[playerToReceive].hand) {
      currentState.players[playerToReceive].hand = [];
    }
    currentState.players[playerToReceive].hand.push(card);

    return currentState;
  }, (error, committed) => {
    isDrawingCard = false;
  });
}

/**
 * DEVOLVER CARTA AO DECK
 * Remove uma carta de sua localização atual, devolve ao baralho e o embaralha.
 */
function returnCardToDeck(cardId) {
  triggerSound('shuffle');
  gameStateRef.transaction((currentState) => {
    if (!currentState) return currentState;
    const card = findCardById(currentState, cardId);
    if (!card) return currentState;

    removeCardFromLocation(currentState, cardId);
    card.owner = null;
    card.location = 'deck';
    card.visible = false;

    if (!currentState.deck) currentState.deck = [];
    currentState.deck.push(card);
    shuffle(currentState.deck); // Embaralhamento automático após devolução
    return currentState;
  });
}

/**
 * MOVIMENTAÇÃO DE CARTAS
 * Função genérica para mover cartas entre mãos de jogadores, deck ou área livre (cemitério).
 */
function moveCard(cardId, targetLocation, targetPlayerId = null) {
  updateRoomActivity();

  // Feedback sonoro baseado no destino
  if (targetLocation === 'player') triggerSound('card-slide');
  if (targetLocation === 'free') triggerSound('knife');
  if (targetLocation === 'deck') triggerSound('shuffle');

  gameStateRef.transaction((currentState) => {
    if (!currentState) return currentState;
    const card = findCardById(currentState, cardId);
    if (!card) return currentState;

    // Lógica para mover para a mão de um jogador
    if (targetLocation === 'player') {
      removeCardFromLocation(currentState, cardId);
      card.owner = targetPlayerId;
      card.location = 'player-' + targetPlayerId;
      card.visible = false;
      if (!currentState.players[targetPlayerId].hand) currentState.players[targetPlayerId].hand = [];
      currentState.players[targetPlayerId].hand.push(card);
    }
    // Lógica para mover para o cemitério (aberta para todos)
    else if (targetLocation === 'free') {
      removeCardFromLocation(currentState, cardId);
      card.owner = null;
      card.location = 'free';
      card.visible = true;
      if (!currentState.freeCards) currentState.freeCards = [];
      currentState.freeCards.push(card);
    }
    // Lógica para devolver ao baralho
    else if (targetLocation === 'deck') {
      removeCardFromLocation(currentState, cardId);
      card.owner = null;
      card.location = 'deck';
      card.visible = false;
      if (!currentState.deck) currentState.deck = [];
      currentState.deck.push(card);
      shuffle(currentState.deck);
    }
    return currentState;
  });
}

/**
 * REVELAR CARTA DO TOPO (BURN)
 * Retira a carta do topo do deck e a move diretamente para a área livre, revelando-a.
 */
function burnTopCard() {
  triggerSound('card-slide');
  gameStateRef.transaction((currentState) => {
    if (!currentState || !currentState.deck || currentState.deck.length === 0) return;
    const card = currentState.deck.pop();
    card.owner = null;
    card.location = 'free';
    card.visible = true;
    if (!currentState.freeCards) currentState.freeCards = [];
    currentState.freeCards.push(card);
    return currentState;
  });
}



// =======================================================
// === GESTÃO DE PONTUAÇÃO E RELIGIÃO ===
// =======================================================

/**
 * ATUALIZA MOEDAS DO JOGADOR
 * Adiciona ou remove moedas de um jogador específico no Firebase.
 * @param {string} pid - ID do jogador.
 * @param {number} amount - Quantidade a somar (pode ser negativa).
 * @param {boolean} silent - Se true, não dispara o som de moeda.
 */
function updateScore(pid, amount, silent = false) {
  if (!silent) triggerSound('coin');

  updateRoomActivity();
  const scoreRef = db.ref(`salas/${roomCode}/gameState/players/${pid}/score`);
  scoreRef.once('value', (snapshot) => {
    let newScore = (snapshot.val() || 0) + amount;
    if (newScore < 0) newScore = 0; // Impede saldo negativo
    scoreRef.set(newScore);
  });
}

/**
 * ATUALIZA MOEDAS DO ASILO
 * Gerencia o saldo acumulado no centro do tabuleiro (Asilo).
 */
function updateAsylumScore(amount) {
  triggerSound('coin');
  updateRoomActivity();
  const scoreRef = db.ref(`salas/${roomCode}/gameState/asylumScore`);
  scoreRef.once('value', (snapshot) => {
    let newScore = (snapshot.val() || 0) + amount;
    if (newScore < 0) newScore = 0;
    scoreRef.set(newScore);
  });
}

/**
 * ALTERNAR RELIGIÃO
 * Troca a afiliação do jogador entre Católico e Protestante via transação atômica.
 */
function toggleReligion(pid) {
  triggerSound('paper');
  const religionRef = db.ref(`salas/${roomCode}/gameState/players/${pid}/religion`);
  religionRef.transaction((currentReligion) => {
    return (currentReligion === 'catolico') ? 'protestante' : 'catolico';
  });
}

// =======================================================
// === SISTEMA DE INTELIGÊNCIA ARTIFICIAL (BOTS) ===
// =======================================================

/**
 * ADICIONAR BOT
 * Procura um slot vazio na sala e insere um jogador controlado por IA.
 * Caso a sala esteja cheia, exibe um modal de aviso.
 */
function addBot() {
  playSound('click');
  let botSlot = null;

  // Percorre os 10 slots para encontrar um espaço disponível
  for (let i = 1; i <= 10; i++) {
    const p = localGameState.players[i];
    if (!p.uid && !p.online) {
      botSlot = i;
      break;
    }
  }

  if (botSlot) {
    // Define o nome sequencial (BOT 1, BOT 2, etc.)
    let botCount = 0;
    for (let i = 1; i <= 10; i++) {
      if (localGameState.players[i].name && localGameState.players[i].name.startsWith('BOT')) {
        botCount++;
      }
    }
    const botName = `BOT ${botCount + 1}`;

    db.ref(`salas/${roomCode}/gameState/players/${botSlot}`).update({
      online: true,
      uid: 'bot-' + Date.now(),
      name: botName,
      photo: 'assets/img/icons/robot.svg',
      hand: [],
      score: 2,
      religion: (botSlot % 2 === 1) ? 'catolico' : 'protestante'
    });
  } else {
    // Feedback visual para sala lotada
    const fullRoomModal = document.getElementById('fullRoomModal');
    if (fullRoomModal) {
      fullRoomModal.style.display = 'flex';
    }
  }
}



/**
 * CONFIRMAR EXPULSÃO
 * Devolve cartas ao deck e limpa o slot do jogador em uma única transação.
 */
function confirmKickAction() {
  const pid = window.pendingKickPid; // Usa a variável global
  if (!pid) return;

  // 1. Toca o som de impacto localmente
  if (typeof playSound === 'function') playSound('impact');

  // 2. Executa a Transação Atômica no Firebase
  gameStateRef.transaction((state) => {
    if (!state || !state.players || !state.players[pid]) return state;

    const player = state.players[pid];
    const hand = player.hand || [];


    // --- DEVOLVER CARTAS AO DECK ---
    if (hand.length > 0) {
      if (!state.deck) state.deck = [];

      hand.forEach(card => {
        // Reseta as propriedades da carta para o estado de "no baralho"
        card.owner = null;
        card.location = 'deck';
        card.visible = false;
        state.deck.push(card);
      });

      // Embaralha o deck usando a função do rules.js
      if (typeof shuffle === 'function') shuffle(state.deck);
    }

    // --- RESETAR O SLOT DO JOGADOR ---
    state.players[pid] = {
      online: false,
      uid: null,
      name: null,
      photo: null,
      hand: [],
      score: 2,
      religion: (pid % 2 === 1) ? 'catolico' : 'protestante'
    };

    return state;
  }, (error, committed) => {
    if (committed) {
      console.log(`Jogador ${pid} removido e cartas devolvidas.`);
    }
    window.pendingKickPid = null; // Reseta a variável de controle
  });
}



// =======================================================
// === SISTEMA DE CONEXÃO E INICIALIZAÇÃO ===
// =======================================================

/**
 * TRATAMENTO DE DESCONEXÃO
 * Garante que o status 'online' mude para false se o jogador fechar o navegador.
 */
function setupDisconnectHandler(pid) {
  db.ref(`salas/${roomCode}/gameState/players/${pid}/online`).onDisconnect().set(false);
}



/**
 * ENTRAR NA PARTIDA
 * Gerencia a entrada do usuário em um slot vago ou a reentrada em um slot já ocupado por ele.
 */

function getNextVisitorName(players) {
  const usedNumbers = new Set();

  Object.values(players || {}).forEach((player) => {
    const match = String(player?.name || '').match(/^Visitante\s+(\d+)$/);
    if (match) usedNumbers.add(Number(match[1]));
  });

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `Visitante ${nextNumber}`;
}

function getPlayerDisplayName(players, existingPlayer = null) {
  if (!currentUser.isAnonymous) return currentUser.name;

  if (existingPlayer?.name && /^Visitante\s+\d+$/.test(existingPlayer.name)) {
    return existingPlayer.name;
  }

  return getNextVisitorName(players);
}

function joinGame() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.style.display = 'flex';
  let assignedPlayerName = currentUser.name;

  gameStateRef.transaction((currentState) => {
    // Inicialização de sala nova
    if (!currentState || !currentState.players) {
      const defaultConfig = createDefaultDeckConfig();
      let newDeck = createDeck(defaultConfig);

      let initialState = {
        deck: newDeck,
        grave: [],
        freeCards: [],
        asylumScore: 0,
        deckConfig: defaultConfig,
        players: {}
      };

      for (let i = 1; i <= 10; i++) {
        initialState.players[i] = {
          online: false, hand: [], score: 2,
          religion: (i % 2 === 1) ? 'catolico' : 'protestante',
          uid: null, name: null, photo: null
        };
      }

      // O criador da sala ocupa sempre o Slot 1 inicialmente
      assignedPlayerName = getPlayerDisplayName(initialState.players);
      initialState.players[1].uid = currentUser.uid;
      initialState.players[1].name = assignedPlayerName;
      initialState.players[1].photo = currentUser.photo;
      initialState.players[1].online = true;

      myPlayerId = 1;
      return initialState;
    }

    // Lógica de reentrada
    for (let i = 1; i <= 10; i++) {
      if (currentState.players[i] && currentState.players[i].uid === currentUser.uid) {
        assignedPlayerName = getPlayerDisplayName(currentState.players, currentState.players[i]);
        currentState.players[i].online = true;
        currentState.players[i].name = assignedPlayerName;
        currentState.players[i].photo = currentUser.photo;
        myPlayerId = i;
        return currentState;
      }
    }

    // Ocupação de novo slot disponível
    for (let i = 1; i <= 10; i++) {
      if (!currentState.players[i].uid) {
        assignedPlayerName = getPlayerDisplayName(currentState.players);
        currentState.players[i].uid = currentUser.uid;
        currentState.players[i].name = assignedPlayerName;
        currentState.players[i].photo = currentUser.photo;
        currentState.players[i].online = true;
        currentState.players[i].hand = [];
        currentState.players[i].score = 2;
        myPlayerId = i;
        return currentState;
      }
    }

    return; // Sala cheia

  }, (error, committed) => {
    // 1. Sempre remove a tela de carregamento, independente do resultado
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    if (committed && myPlayerId) {
      currentUser.name = assignedPlayerName;
      sessionStorage.setItem('currentName', assignedPlayerName);
      console.log(`✅ Conectado no Slot ${myPlayerId}`);

      // 2. Aciona o som global de entrada para todos os jogadores na sala
      triggerSound('player-online');

      // 3. Garante que o status 'online' mude para false se o navegador fechar
      setupDisconnectHandler(myPlayerId);

      /**
       * NOTA: A função setupKickListener foi removida/comentada 
       * para evitar o erro "ReferenceError: setupKickListener is not defined"
       */
      // setupKickListener(myPlayerId); 

    } else if (error) {
      console.error("Erro crítico na transação:", error);
      // Em caso de erro crítico de rede, tenta recarregar a página
      window.location.reload();
    } else {
      // Se a transação falhar (ex: sala cheia ou slot ocupado), volta para o lobby
      window.location.href = 'lobby.html';
    }
  });
}


/**
 * VIGIA DE EXPULSÃO
 * Monitora o próprio slot do jogador no Firebase. Se o UID for removido (ficando null),
 * o jogador é forçado a sair da página da sala.
 */
function setupKickListener(pid) {
  if (!pid) return;

  // Escuta mudanças específicas no UID do slot do jogador
  db.ref(`salas/${roomCode}/gameState/players/${pid}/uid`).on('value', (snapshot) => {
    // Se o valor for null e o jogo estiver rodando, o jogador foi expulso
    if (snapshot.val() === null) {
      console.log("Você foi removido da sala pelo administrador.");
      window.location.href = 'lobby.html';
    }
  });
}



/**
 * INICIALIZAÇÃO GLOBAL DO JOGO
 * Configura os listeners do Firebase e ativa os sistemas de interface e áudio.
 */
let hostUID = null;
let isAdmin = false;

function initializeGame() {
  // 1. Identifica o Administrador via UID fixo no banco
  db.ref(`salas/${roomCode}/hostUID`).on('value', (snapshot) => {
    hostUID = snapshot.val();
    isAdmin = (currentUser.uid === hostUID);
    console.log("Admin Status:", isAdmin);
    if (typeof renderAll === "function") renderAll();
  });


  // 2. Sincroniza o estado do jogo e monitora expulsões
  gameStateRef.on('value', (snapshot) => {
    const state = snapshot.val();
    if (state) {
      // SINCRONIZAÇÃO DE SONS
      if (state.lastSFX && state.lastSFX.timestamp > lastSoundTimestamp) {
        lastSoundTimestamp = state.lastSFX.timestamp;
        playSound(state.lastSFX.id);
      }

      /**
       * VERIFICAÇÃO DE EXPULSÃO (KICK CHECK)
       * Se você já ocupou um slot e agora seu UID não está mais lá,
       * redireciona você para o lobby imediatamente.
       */
      if (myPlayerId && state.players && state.players[myPlayerId]) {
        const slotUID = state.players[myPlayerId].uid;
        if (slotUID !== currentUser.uid) {
          console.warn("Expulsão confirmada. Redirecionando para o lobby...");
          window.location.href = 'lobby.html';
          return; // Para a execução para evitar erros de renderização
        }
      }

      localGameState = state;
      if (typeof renderAll === "function") renderAll();
    }
  });

  joinGame();

  setupNotificationListener();

  if (typeof setupUI === "function") setupUI();
  if (typeof setupDropzones === "function") setupDropzones();
  if (typeof setupAutoScroll === "function") setupAutoScroll();
}

/**
 * LISTENER DE AUTENTICAÇÃO
 * Ponto de entrada do script após a validação do login.
 */
auth.onAuthStateChanged((user) => {
  if (user) {
    initializeGame();
  } else {
    window.location.href = 'lobby.html';
  }
});

/**
 * SISTEMA DE ATIVIDADE
 * Registra interações para evitar que a sala seja considerada inativa.
 */
function updateRoomActivity() {
  if (roomCode) {
    db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
  }
}
