// =======================================================
// === INTERFACE DO USUÁRIO E RENDERIZAÇÃO ===
// =======================================================

// Variáveis DOM
const deckEl = document.getElementById('deck');
const graveyardArea = document.getElementById('graveyardArea');
const graveyardCardsEl = graveyardArea?.querySelector('.graveyard-cards') || graveyardArea;
const resetBtn = document.getElementById('resetBtn');

window.CoupVisualEffects?.setup({
  getGraveyardCardsElement: () => graveyardCardsEl
});


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
    updateHandFanLayout: window.CoupVisualEffects?.updateHandFanLayout,
    toggleReligion,
    openQuickActions: window.CoupQuickActions?.openQuickActions || window.openQuickActions
  });

  window.CoupVisualEffects?.scheduleCardFanLayout();




  // --- 4. RENDERIZAÇÃO DO TABULEIRO CENTRAL (ÁREA LIVRE / DECK) ---
  // Exibe as cartas que estão abertas no cemitério e atualiza contadores.
  state.freeCards?.forEach(card => {
    const el = window.CoupRenderCards?.createCardElement(card);
    if (!el) return;
    el.classList.add('small', 'graveyard-card');
    graveyardCardsEl?.appendChild(el);
  });
  window.CoupVisualEffects?.updateGraveyardFanLayout();

  window.CoupBoardStatus?.renderStatus({
    state,
    roomCode
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
  resetBalatroElement: window.CoupVisualEffects?.resetBalatroElement,
  hideCardTooltip: window.CoupRenderCards?.hideCardTooltip
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


/**
 * INICIALIZAÇÃO DOS COMPONENTES DA INTERFACE
 * Configura listeners de clique, estados iniciais de modais e controles de áudio/vídeo.
 */
function setupUI() {

  // --- 1. MODAIS DE AVISO E SISTEMA ---
  window.CoupChat?.setup({
    getState: () => localGameState,
    getRoomCode: () => roomCode,
    getCurrentUser: () => currentUser,
    getMyPlayerId: () => myPlayerId,
    getDatabase: () => window.db || (typeof db !== 'undefined' ? db : null),
    getFirebase: () => window.firebase || (typeof firebase !== 'undefined' ? firebase : null),
    playSound: (soundId) => {
      if (typeof playSound === 'function') playSound(soundId);
    }
  });

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
  window.CoupVisualEffects?.attachBalatroEffect(deckContainer, true);
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

window.CoupBoardStatus?.setup({
  getRoomCode: () => roomCode,
  playSound: (soundId) => {
    if (typeof playSound === 'function') playSound(soundId);
  }
});

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
