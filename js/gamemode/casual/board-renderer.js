// =======================================================
// === INTERFACE DO USUÁRIO E RENDERIZAÇÃO ===
// =======================================================

// Variáveis DOM
const deckCountEl = document.getElementById('deck-count');
const graveCountEl = document.getElementById('grave-count');
const deckEl = document.getElementById('deck');
const freeArea = document.getElementById('freeArea');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');
const asylumScoreEl = document.getElementById('asylum-score');
const asylumPlusBtn = document.getElementById('asylum-plus');
const asylumMinusBtn = document.getElementById('asylum-minus');


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

  // Remove cartas espalhadas na área livre (cemitério)
  freeArea.querySelectorAll('.card').forEach(n => n.remove());

  // Remove slots vazios remanescentes
  document.querySelectorAll('.slot').forEach(n => n.remove());

  // Remove a marcação visual de "jogador local" para reatribuição
  document.querySelectorAll('.player-area.local-player')
    .forEach(el => el.classList.remove('local-player'));
}



// Lógica das Ações Rápidas

let quickActionTargetPid = null;

window.openQuickActions = (pid) => {
  quickActionTargetPid = pid;
  const modal = document.getElementById('quickActionsModal');
  const title = document.getElementById('quickActionsTitle');
  const player = localGameState.players[pid];

  if (modal && title && player) {
    title.innerText = `Ação contra ${player.name || 'Jogador ' + pid}`;
    if (typeof playSound === 'function') playSound('click');
    modal.style.display = 'flex';
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
  const modal = document.getElementById('quickActionsModal');
  if (modal) modal.style.display = 'none';
};



/**
 * LÓGICA DE VISIBILIDADE DE CARTAS
 * Determina se uma carta deve exibir o seu verso (back) ou a sua face frontal.
 * Leva em conta a localização da carta e permissões de espectador (Ghost Mode).
 */
function shouldShowBack(card) {
  // Cartas no deck sempre mostram o verso
  if (card.location === 'deck') return true;

  // Cartas na área livre (reveladas) sempre mostram a frente
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
  const dlc1 = ['bispo', 'camaleao', 'diplomata', 'marionetista', 'mercenario', 'tesoureiro', 'vigilante'];
  const dlc2 = ['estrategista', 'ladrao', 'magnata', 'pistoleiro', 'vigarista', 'xerife'];
  const promo = ['benfeitor', 'bufao', 'burgues', 'burocrata'];

  if (base.includes(t)) return 'base';
  if (dlc1.includes(t)) return 'dlc1';
  if (dlc2.includes(t)) return 'dlc2';
  if (promo.includes(t)) return 'promo';

  return 'base'; // Fallback padrão
}


/**
 * CRIAÇÃO DE ELEMENTO DE CARTA (ATUALIZADA PARA NOVAS PASTAS)
 */
function createCardElement(card) {

  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
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
  });

  // --- INTERAÇÕES ADICIONAIS ---
  el.addEventListener('dblclick', () => {
    returnCardToDeck(card.id);
  });

  attachBalatroEffect(el);

  return el;
}



/**
 * FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
 * Sincroniza o estado do Firebase com a interface e aplica permissões de Host (isAdmin).
 */

function renderAll() {
  const state = localGameState;
  if (!state || !state.players) return;

  // --- LÓGICA DE GRADE DINÂMICA (APENAS DESKTOP) ---
  const container = document.querySelector('.player-hands-container');
  if (container) {
    // Conta jogadores ativos (online ou bots)
    let activeCount = 0;
    for (let i = 1; i <= 10; i++) {
      const p = state.players[i];
      if (p && (p.online || p.uid)) activeCount++;
    }

    // Verifica se é Desktop (>= 1200px)
    if (window.innerWidth >= 769) {
      let cols = 5; // Padrão

      if (activeCount === 1) cols = 1;
      else if (activeCount === 2) cols = 2;
      else if (activeCount === 3) cols = 3;
      else if (activeCount === 4) cols = 2;
      else if (activeCount === 5 || activeCount === 6) cols = 3;
      else if (activeCount === 7 || activeCount === 8) cols = 4;
      else cols = 5;

      // Aplica a grade dinâmica no Desktop
      container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    } else {
      // No Mobile/Tablet, remove o estilo inline para usar as regras do CSS (@media)
      container.style.gridTemplateColumns = '';
    }
  }


  // --- 1. TRAVAS DE ADMINISTRADOR (HOST) ---
  // Referências aos elementos de controle global
  const resetBtn = document.getElementById('resetBtn');
  const addBotBtn = document.getElementById('addBotBtn');
  const applyDeckBtn = document.getElementById('applyDeckConfigBtn');
  const configInputs = document.querySelectorAll('.card-config-item input');

  // NOVO: Esconde ou mostra o botão de Reset baseado no status de Admin
  if (resetBtn) {
    resetBtn.style.display = isAdmin ? 'flex' : 'none';
  }

  // Visibilidade dos botões Reset e Adicionar Bot
  if (addBotBtn) {
    const botRow = addBotBtn.closest('.setting-row');
    if (botRow) botRow.style.display = isAdmin ? 'flex' : 'none';
  }

  // Habilita ou desabilita os campos de texto do baralho em tempo real
  configInputs.forEach(input => {
    input.disabled = !isAdmin;
  });

  // Configuração visual e funcional do botão de aplicar baralho
  if (applyDeckBtn) {
    if (!isAdmin) {
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
  const closeSpectatorModalBtn = document.getElementById('closeSpectatorModalBtn');

  if (spectatorBtn && spectatorModal) {
    const myHand = state.players[myPlayerId]?.hand || [];

    // Exibe botão de modo espectador
    spectatorBtn.style.setProperty('display', 'flex', 'important');

    // Abertura do Modal e Listagem de Alvos
    spectatorBtn.onclick = () => {
      playSound('click');
      spectatorList.innerHTML = '';

      for (let i = 1; i <= 10; i++) {
        const p = state.players[i];
        // Só lista jogadores que possuem UID e não são o próprio usuário
        if (p && p.uid && i !== myPlayerId) {
          const btn = document.createElement('div');
          btn.className = 'spectator-target-btn';
          btn.innerHTML = `
          <img src="${p.photo || 'img/coup.png'}" alt="">
          <span>${p.name || 'Jogador ' + i}</span>
        `;
          btn.onclick = () => {
            playSound('pop');
            requestSpectate(i); // Solicita permissão via Firebase
            spectatorModal.style.display = 'none';
          };
          spectatorList.appendChild(btn);
        }
      }

      if (spectatorList.innerHTML === '') {
        spectatorList.innerHTML = '<p class="muted">Nenhum outro jogador disponível.</p>';
      }
      spectatorModal.style.display = 'flex';
    };

    // Botão de Fechamento do Modal
    if (closeSpectatorModalBtn) {
      closeSpectatorModalBtn.onclick = () => {
        playSound('click');
        spectatorModal.style.display = 'none';
      };
    }
  }

  // Limpa o tabuleiro antes de desenhar o novo estado.
  clearDOM();




  // --- 2. RENDERIZAÇÃO DOS SLOTS DE JOGADORES (1 a 10) ---


  for (let pid = 1; pid <= 10; pid++) {
    const playerEl = document.getElementById(`player-${pid}`);
    if (!playerEl) continue;

    const player = state.players[pid] || { online: false, hand: [], score: 0, religion: 'catolico', uid: null };

    // Define se o slot do jogador deve estar visível ou oculto
    if (player.online || player.uid) {
      playerEl.style.display = 'flex';
    } else {
      playerEl.style.display = 'none';
      continue;
    }

    // --- 2.1 IDENTIFICAÇÃO E CONTROLE DE MODERAÇÃO ---
    if (pid === myPlayerId) {
      playerEl.classList.add('local-player');
    }

    // Controle de Moderação: Botão de expulsar (X) visível apenas para o Host
    const removeBtn = playerEl.querySelector('.remove-player');
    if (removeBtn) {
      // Mostra o botão apenas se for Admin E não for o seu próprio slot
      removeBtn.style.display = (isAdmin && pid !== myPlayerId) ? 'block' : 'none';
    }

    // --- 2.2 CABEÇALHO DO JOGADOR (AVATAR E NOME) ---
    let headerEl = playerEl.querySelector('.player-header');
    if (!headerEl) {
      const titleDiv = playerEl.querySelector('.player-title');
      headerEl = document.createElement('div');
      headerEl.className = 'player-header';

      const img = document.createElement('img');
      img.className = 'player-avatar';

      // Injeta o cabeçalho antes do título e reorganiza o DOM
      playerEl.insertBefore(headerEl, titleDiv);
      headerEl.appendChild(img);
      headerEl.appendChild(titleDiv);
    }

    const avatarImg = headerEl.querySelector('.player-avatar');
    const nameTxt = headerEl.querySelector('.player-title');

    if (avatarImg) avatarImg.src = player.photo || 'img/coup.png';

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


  const closeQuickActionsBtn = document.getElementById('closeQuickActionsBtn');
  if (closeQuickActionsBtn) {
    closeQuickActionsBtn.onclick = () => {
      document.getElementById('quickActionsModal').style.display = 'none';
    };
  }




  // --- 4. RENDERIZAÇÃO DO TABULEIRO CENTRAL (ÁREA LIVRE / DECK) ---
  // Exibe as cartas que estão abertas no cemitério e atualiza contadores.
  state.freeCards?.forEach(card => {
    const el = createCardElement(card);
    el.classList.add('small');
    freeArea.appendChild(el);
  });

  if (deckCountEl) deckCountEl.textContent = state.deck?.length || 0;
  if (asylumScoreEl) asylumScoreEl.textContent = state.asylumScore || 0;
}


// =======================================================
// === CONFIGURAÇÃO DE INTERAÇÕES (DRAG & DROP) ===
// =======================================================

/**
 * CONFIGURAÇÃO DE ZONAS DE DEPÓSITO (DROPZONES)
 * Define como o Deck, as Áreas de Jogadores e o Cemitério (Free Area) reagem ao 
 * arrasto e soltura de cartas ou ações de compra.
 */
function setupDropzones() {
  // --- CONFIGURAÇÃO DO DECK (BARALHO) ---
  // Inicia a ação de compra ao arrastar o Deck
  deckEl.addEventListener('dragstart', (e) => {
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
  deckEl.onclick = () => drawCard();

  // --- CONFIGURAÇÃO DAS ÁREAS DOS JOGADORES ---
  document.querySelectorAll('.player-area').forEach(area => {
    area.ondragover = ev => ev.preventDefault();
    area.ondrop = ev => {
      ev.preventDefault();
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

  // --- CONFIGURAÇÃO DA ÁREA LIVRE (CEMITÉRIO/TABULEIRO) ---
  freeArea.ondragover = ev => ev.preventDefault();
  freeArea.ondrop = ev => {
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
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Sensibilidade da inclinação
    const sensitivity = 2; // Aumente para suavizar, diminua para intensificar
    const rotateX = -(y - centerY) / sensitivity;
    const rotateY = (x - centerX) / sensitivity;

    // A mágica: perspective + rotação
    element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.3)`;

    // Brilho azul neon para as cartas e deck
    element.style.boxShadow = `${-rotateY * 0.5}px ${rotateX * 0.5}px 40px rgba(0, 191, 255, 0.4)`;
  });

  element.addEventListener('mouseleave', () => {
    // Ao sair, remove o estilo inline para o CSS reassumir a flutuação
    element.style.removeProperty('transform');
    element.style.removeProperty('box-shadow');
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




/**
 * INICIALIZAÇÃO DOS COMPONENTES DA INTERFACE
 * Configura listeners de clique, estados iniciais de modais e controles de áudio/vídeo.
 */
function setupUI() {

  // --- 1. MODAIS DE AVISO E SISTEMA ---

  // Gerenciamento do Modal de Sala Cheia (Aviso de limite de Bots)
  const fullRoomModal = document.getElementById('fullRoomModal');
  const closeFullRoomBtn = document.getElementById('closeFullRoomBtn');

  if (closeFullRoomBtn && fullRoomModal) {
    closeFullRoomBtn.onclick = () => {
      playSound('click');
      fullRoomModal.style.display = 'none';
    };
  }


  // Feedback Modal
  const feedbackModal = document.getElementById('feedbackModal');
  const openFeedbackBtn = document.getElementById('openFeedbackBtn');
  const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');

  if (openFeedbackBtn && feedbackModal) {
    openFeedbackBtn.onclick = () => {
      if (typeof playSound === 'function') playSound('click');
      feedbackModal.style.display = 'flex';
      // Opcional: fecha o modal de configurações ao abrir o de feedback
      document.getElementById('settingsModal').style.display = 'none';
    };
  }

  if (closeFeedbackBtn) {
    closeFeedbackBtn.onclick = () => {
      if (typeof playSound === 'function') playSound('click');
      feedbackModal.style.display = 'none';
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

  // Configuração de Áudio (BGM e Volume)
  const musicBtn = document.getElementById('musicBtn');
  const bgmAudio = document.getElementById('bgmAudio');
  const volumeSlider = document.getElementById('volumeSlider');
  const effectsVolumeSlider = document.getElementById('effectsVolumeSlider');

  if (bgmAudio) bgmAudio.volume = 0.1;

  if (musicBtn && bgmAudio) {
    bgmAudio.play()
      .then(() => musicBtn.classList.remove('muted'))
      .catch(() => musicBtn.classList.add('muted'));

    musicBtn.onclick = () => {
      if (bgmAudio.paused) {
        bgmAudio.play().then(() => musicBtn.classList.remove('muted'));
      } else {
        bgmAudio.pause();
        musicBtn.classList.add('muted');
      }
    };
  }

  if (volumeSlider && bgmAudio) {
    volumeSlider.value = bgmAudio.volume;
    volumeSlider.addEventListener('input', (e) => {
      bgmAudio.volume = e.target.value;
    });
  }

  if (effectsVolumeSlider && typeof setSfxVolume === 'function') {
    const currentSfxVolume = setSfxVolume(window.sfxVolume);
    effectsVolumeSlider.value = currentSfxVolume;

    effectsVolumeSlider.addEventListener('input', (e) => {
      setSfxVolume(e.target.value);
    });
  }


  // --- 3. INTERAÇÕES DE JOGO (ASILO, KICK, BOTS) ---

  // Atalho de Gesto: Saque rápido do Asilo via clique duplo na imagem
  const asylumArea = document.getElementById('asylumArea');
  if (asylumArea) {
    const asylumImage = asylumArea.querySelector('.asylum-image-wrapper img');
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
   * Função global chamada ao clicar no botão 'X' do jogador.
   * Define quem será expulso e abre o modal de confirmação.
   */
  window.kickPlayer = (pid) => {
    // Sincroniza com a variável global 'pendingKickPid' do gameState.js
    window.pendingKickPid = pid;

    const modal = document.getElementById('kickPlayerModal');
    const text = document.getElementById('kickPlayerText');

    // Busca o nome do jogador no estado local para o texto de confirmação
    const player = localGameState.players ? localGameState.players[pid] : null;

    if (text && player) {
      // Texto simplificado e direto
      text.innerText = `Remover ${player.name || 'o Jogador ' + pid}?`;
    }

    if (modal) {
      if (typeof playSound === 'function') playSound('click');
      modal.style.display = 'flex';
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
      if (kickModal) kickModal.style.display = 'none';
    };
  }

  if (cancelKickBtn) {
    cancelKickBtn.onclick = () => {
      if (kickModal) kickModal.style.display = 'none';
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
      resetModal.style.display = 'flex'; // Abre a janelinha de confirmação
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (isAdmin) { // Checagem dupla de segurança
        resetTable();
        if (resetModal) resetModal.style.display = 'none';
      } else {
        if (resetModal) resetModal.style.display = 'none';
        showError("Apenas o Host pode realizar esta ação.");
      }
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      if (resetModal) resetModal.style.display = 'none';
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
      settingsModal.style.display = 'flex';
    };
    if (closeSettingsBtn) {
      closeSettingsBtn.onclick = () => {
        playSound('click');
        settingsModal.style.display = 'none';
      };
    }
  }

  // Controle de Visibilidade do Header (Código da Sala)
  const toggleHeaderBtn = document.getElementById('toggleHeaderBtn');
  if (toggleHeaderBtn) {
    const header = document.querySelector('header');
    const spanText = toggleHeaderBtn.querySelector('span');

    toggleHeaderBtn.onclick = () => {
      playSound('click');
      if (header.style.display !== 'none') {
        header.style.display = 'none';
        toggleHeaderBtn.querySelector('img').src = 'assets/img/icons/visibility_off.svg';
        toggleHeaderBtn.style.opacity = '0.6';
        if (spanText) spanText.textContent = "Oculto";
      } else {
        header.style.display = 'block';
        toggleHeaderBtn.querySelector('img').src = 'assets/img/icons/eye.svg';
        toggleHeaderBtn.style.opacity = '1';
        if (spanText) spanText.textContent = "Visível";
      }
    };
  }

  // Configuração de Efeitos Balatro no Deck Central
  const deckContainer = document.getElementById('deck');
  attachBalatroEffect(deckContainer, true);


  // --- 5. CONFIGURAÇÃO DE BARALHO (HOST APENAS) ---

  const configModal = document.getElementById('configModal');
  const openDeckConfigBtn = document.getElementById('openDeckConfigBtn');
  const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
  const applyDeckConfigBtn = document.getElementById('applyDeckConfigBtn');
  const configInputs = document.querySelectorAll('.card-config-item input');

  // Navegação para o Modal de Baralho
  if (openDeckConfigBtn && configModal) {
    openDeckConfigBtn.onclick = () => {
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
      if (settingsModal) settingsModal.style.display = 'none';
      configModal.style.display = 'flex';
    };

    if (closeConfigModalBtn) {
      closeConfigModalBtn.onclick = () => {
        playSound('click');
        configModal.style.display = 'none';
        settingsModal.style.display = 'flex';
      };
    }
  }

  // Lógica de Permissão e Aplicação da Configuração (Apenas para o Host)
  configInputs.forEach(input => {
    input.disabled = !isAdmin;
  });

  if (applyDeckConfigBtn) {
    applyDeckConfigBtn.onclick = () => {
      // Verificação extra de segurança
      if (!isAdmin) return;

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
      if (configModal) configModal.style.display = 'none';
    };
  }


  // --- 6. MODAL DE INFORMAÇÕES E REGRAS ---

  const infoBtn = document.getElementById('infoBtn');
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
      if (tutorialModal) tutorialModal.style.display = 'flex';
    }

    const closeAction = () => {
      if (tutorialModal) tutorialModal.style.display = 'none';
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


  if (infoBtn && infoModal) {
    infoBtn.onclick = () => {
      playSound('click');
      currentRuleImages = calculateRuleImages();
      infoModal.style.display = 'flex';

      if (flipCard) {
        currentRuleIndex = 0;
        flipCard.classList.remove('is-flipped');
        frontImg.src = currentRuleImages[0];
        backImg.src = currentRuleImages.length > 1 ? currentRuleImages[1] : currentRuleImages[0];
      }
    };

    if (closeInfoBtn) closeInfoBtn.onclick = () => {
      playSound('click');
      infoModal.style.display = 'none';
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
      altRulesModal.style.display = 'flex';

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
        altRulesModal.style.display = 'none';
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
    const removeBtn = area.querySelector('.remove-player');
    if (removeBtn) removeBtn.addEventListener('click', () => kickPlayer(pid));
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
const roomCodeDisplay = document.getElementById('roomCodeDisplay');

// Define o código da sala se o elemento e a variável existirem
if (roomCodeDisplay && typeof roomCode !== 'undefined' && roomCode) {
  roomCodeDisplay.textContent = roomCode;
}

// Configura o evento de clique para copiar o código da sala
if (roomHeader) {
  roomHeader.onclick = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      playSound('pop'); // Som de confirmação
      roomHeader.classList.add('copied');

      const originalText = roomHeader.querySelector('p').textContent;
      roomHeader.querySelector('p').textContent = "CÓDIGO COPIADO!";

      // Reseta o estado visual do botão após 1.2 segundos
      setTimeout(() => {
        roomHeader.classList.remove('copied');
        roomHeader.querySelector('p').textContent = originalText;
      }, 1200);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      // Fallback em caso de falha na API de clipboard
      alert("Código da sala: " + roomCode);
    });
  };
}

// =======================================================
// === SISTEMA DE VISIBILIDADE DE RELIGIÃO ===
// =======================================================

const toggleReligionBtn = document.getElementById('toggleReligionBtn');

/**
 * APLICA A VISIBILIDADE DA RELIGIÃO
 * Controla as classes do body, textos do botão e ícones para ocultar ou 
 * mostrar as afiliações religiosas (Católico/Protestante) no tabuleiro.
 */
const applyReligionVisibility = (shouldHide) => {
  const body = document.body;

  if (toggleReligionBtn) {
    const img = toggleReligionBtn.querySelector('img');
    const span = toggleReligionBtn.querySelector('span');

    if (shouldHide) {
      // Estado OCULTO
      body.classList.add('hide-religion');
      if (span) span.textContent = "Oculto";
      toggleReligionBtn.style.opacity = '0.6';
      if (img) img.src = 'assets/img/icons/visibility_off.svg';
    } else {
      // Estado VISÍVEL
      body.classList.remove('hide-religion');
      if (span) span.textContent = "Visível";
      toggleReligionBtn.style.opacity = '1';
      if (img) img.src = 'assets/img/icons/eye.svg';
    }
  } else {
    // Fallback caso o botão não exista mas a configuração precise ser aplicada
    if (shouldHide) body.classList.add('hide-religion');
    else body.classList.remove('hide-religion');
  }

  // Persiste a preferência do usuário localmente
  localStorage.setItem('hideReligion', shouldHide);
};

/**
 * INICIALIZAÇÃO E LISTENER DE VISIBILIDADE
 * Carrega a preferência salva no navegador e configura o botão de alternância.
 */
if (toggleReligionBtn) {
  // Busca valor salvo ou define como 'true' (oculto) por padrão
  const storedValue = localStorage.getItem('hideReligion');
  const storedReligionSetting = storedValue === null ? true : (storedValue === 'true');

  applyReligionVisibility(storedReligionSetting);

  // Alterna o estado ao clicar no botão
  toggleReligionBtn.onclick = () => {
    playSound('click');
    const isCurrentlyHidden = document.body.classList.contains('hide-religion');
    applyReligionVisibility(!isCurrentlyHidden);
  };
}

// --- BOTÃO SAIR DA SALA ---
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
if (leaveRoomBtn) {
  leaveRoomBtn.onclick = () => {
    if (typeof playSound === 'function') playSound('click');
    window.location.href = 'lobby.html'; // Retorna ao lobby
  };
}


// =======================================================
// === SISTEMA DE PREVIEW 3D (BOTÃO DIREITO) ===
// =======================================================

/**
 * BLOQUEIO DO MENU DE CONTEXTO E GATILHO DO PREVIEW
 * Captura o clique com o botão direito em qualquer lugar do documento.
 * Se o alvo for uma carta válida, abre o modal de visualização detalhada.
 */
document.addEventListener('contextmenu', (e) => {
  // Se o evento foi disparado por um toque (tablet/mobile), ignoramos
  // e deixamos o navegador seguir com o fluxo normal de drag.
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    return;
  }

  e.preventDefault();
  const cardEl = e.target.closest('.card');

  if (cardEl) {
    const cardId = cardEl.dataset.cardId;
    const cardData = findCardById(localGameState, cardId);

    if (cardData && !shouldShowBack(cardData)) {
      openCardPreviewModal(cardData);
    }
  }
});

/**
 * GERENCIADOR DE ABERTURA DO MODAL DE PREVIEW
 * Configura a imagem frontal da carta baseada na sua pasta de origem (base, dlc, etc).
 */
function openCardPreviewModal(card) {
  const modal = document.getElementById('cardPreviewModal');
  const front = document.getElementById('previewFront');
  const flipInner = document.querySelector('#previewFlipCard .flip-card-inner');

  // Localiza a pasta correta (base, promo, dlc1, dlc2)
  const folder = getCardFolder(card.type);
  const imageUrl = `./assets/img/cards/${folder}/${card.type.toLowerCase()}.png`;

  front.style.backgroundImage = `url('${imageUrl}')`;

  // Reseta a rotação para a face frontal ao abrir
  if (flipInner) flipInner.style.transform = 'rotateY(0deg)';

  if (modal) modal.style.display = 'flex';

  // Executa som de deslize de carta
  // if (typeof playSound === 'function') playSound('card-slide');
}

/**
 * CONTROLES DE INTERAÇÃO DO PREVIEW (FECHAR E ROTACIONAR)
 */
// Botão de fechar (X)
document.getElementById('closePreviewBtn').onclick = () => {
  const modal = document.getElementById('cardPreviewModal');
  if (modal) modal.style.display = 'none';
};

// Clique na carta para girar entre frente e verso (back.png)
document.getElementById('previewFlipCard').onclick = function () {
  const inner = this.querySelector('.flip-card-inner');
  if (!inner) return;

  // Alterna entre 0 e 180 graus para exibir o verso padrão
  const isFlipped = inner.style.transform === 'rotateY(180deg)';
  inner.style.transform = isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)';

  if (typeof playSound === 'function') playSound('card-slide');
};

/**
 * APLICA UM PRESET DE CONFIGURAÇÃO DE BARALHO NOS INPUTS DO MODAL
 * Configura as cartas em lote separando por Jogo Base e suas respectivas DLCs.
 */
window.applyDeckPreset = (presetType) => {
  const configInputs = document.querySelectorAll('.card-config-item input');
  if (!configInputs.length) return;

  // Separação exata alinhada com as regras oficiais do Coup
  const baseChars = ['assassino', 'capitao', 'condessa', 'duque', 'embaixador', 'inquisidor'];
  const promoChars = ['benfeitor', 'bufao', 'burgues', 'burocrata'];
  const dlc1Chars = ['bispo', 'diplomata', 'marionetista', 'mercenario', 'tesoureiro', 'vigilante'];
  const dlc2Chars = ['estrategista', 'ladrao', 'magnata', 'pistoleiro', 'vigarista', 'xerife'];

  if (typeof playSound === 'function') playSound('pop');

  configInputs.forEach(input => {
    const card = input.dataset.card;

    switch (presetType) {
      case 'standard':
        // Define 5 cartas apenas para o Jogo Base e zera o resto
        if (baseChars.includes(card)) {
          input.value = 5;
        } else {
          input.value = 0;
        }
        break;

      case 'base_promo':
        // CORRIGIDO: Ativa Jogo Base + Cartas Promo (5 de cada)
        if (baseChars.includes(card) || promoChars.includes(card)) {
          input.value = 5;
        } else {
          input.value = 0;
        }
        break;

      case 'base_dlc1':
        // CORRIGIDO: Ativa Jogo Base + Cartas da DLC 1 (5 de cada)
        if (baseChars.includes(card) || dlc1Chars.includes(card)) {
          input.value = 5;
        } else {
          input.value = 0;
        }
        break;

      case 'base_dlc2':
        // CORRIGIDO: Ativa Jogo Base + Cartas da DLC 2 (5 de cada)
        if (baseChars.includes(card) || dlc2Chars.includes(card)) {
          input.value = 5;
        } else {
          input.value = 0;
        }
        break;

      case 'caos':
        // Coloca 5 em absolutamente todas as cartas do jogo
        input.value = 5;
        break;

      case 'duel':
        // Em vez de preencher direto, abre o modal de escolha e interrompe o loop
        if (typeof playSound === 'function') playSound('click');
        const dModal = document.getElementById('duelModal');
        if (dModal) dModal.style.display = 'flex';

        // Fecha o modal de configurações de fundo para não poluir a tela
        const sModal = document.getElementById('settingsModal');
        if (sModal) sModal.style.display = 'none';
        return;

      case 'test':
        // === NOVO PRESET DE DESENVOLVIMENTO ===
        // Força exatamente 1 cópia de absolutamente todas as influências do jogo
        input.value = 1;
        break;

      case 'clear':
        // Zera todos os campos para configuração manual do zero
        input.value = 0;
        break;

      default:
        input.value = 0;
    }
  });
};



/**
 * CONFIRMA E APLICA O PRESET DE DUELO COM A ESCOLHA DO JOGADOR
 * Adiciona 3 cópias de cada carta base + 3 da escolhida (Total: 15 cartas)
 */
window.confirmDuelPreset = (chosenCard) => {
  const configInputs = document.querySelectorAll('.card-config-item input');
  if (!configInputs.length) return;

  // Lista das cartas base fixas (sem embaixador e inquisidor)
  const fixedBaseChars = ['assassino', 'capitao', 'condessa', 'duque'];

  if (typeof playSound === 'function') playSound('pop');

  configInputs.forEach(input => {
    const card = input.dataset.card;

    if (fixedBaseChars.includes(card) || card === chosenCard) {
      // Aplica 3 cópias para as fixas e para a carta escolhida
      input.value = 3;
    } else {
      // Zera todo o resto, garantindo que o rival direto fique em 0
      input.value = 0;
    }
  });

  // Fecha o modal de duelo e reabre o de configuração com os novos dados na tela
  closeDuelModal();
  const configModal = document.getElementById('configModal');
  if (configModal) configModal.style.display = 'flex';
};

/**
 * FECHA O MODAL DE DUELO
 */
window.closeDuelModal = () => {
  const dModal = document.getElementById('duelModal');
  if (dModal) dModal.style.display = 'none';
};
