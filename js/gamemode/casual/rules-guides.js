(function setupCasualRulesGuides(root) {
  const PROMO_CARDS = ['bufao', 'benfeitor', 'burgues', 'burocrata'];
  const REVOLUTION_CARDS = ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'];
  const SHADOWS_CARDS = ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife'];
  const RULE_DRAW_MIN = 1;
  const RULE_DRAW_MAX = 5;
  const RULE_DRAW_BUTTON_ENABLED = false;
  const RULE_DRAW_ANIMATION_MS = 1700;
  const RULE_DRAW_TICK_MS = 95;

  const ALT_RULE_IMAGES = [
    'assets/img/guides/alternative-rules1.png',
    'assets/img/guides/alternative-rules2.png',
    'assets/img/guides/alternative-rules3.png',
    'assets/img/guides/alternative-rules4.png',
    'assets/img/guides/alternative-rules5.png'
  ];

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
  }

  const ALTERNATIVE_RULES = [
    {
      id: 'justica-lenta',
      title: 'Justiça Lenta',
      description: 'Golpes de Estado só podem ser dados com 10 moedas, em vez de 7. O Golpe de Estado passa a ser obrigatório com 15 moedas.'
    },
    {
      id: 'falso-duque',
      title: 'Falso Duque',
      description: 'Haverá apenas 1 Duque no baralho.'
    },
    {
      id: 'assassino-declarado',
      title: 'Assassino Declarado',
      description: 'Para o Assassinato ter sucesso, o Assassino deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'
    },
    {
      id: 'sangue-frio',
      title: 'Sangue Frio',
      description: 'Após um Assassinato bem-sucedido, o Assassino ganha 2 moedas de recompensa.'
    },
    {
      id: 'ladrao-de-tumulos',
      title: 'Ladrão de Túmulos',
      description: 'Você pode pagar 4 moedas para trocar uma carta da mão com uma carta revelada na mesa.'
    },
    {
      id: 'ultima-palavra',
      title: 'Última Palavra',
      description: 'Quando for eliminado, você pode escolher um jogador para perder 2 moedas imediatamente.'
    },
    {
      id: 'recompensa',
      title: 'Recompensa',
      description: 'Elimine um jogador com mais de 7 moedas e ganhe 2 moedas de recompensa. Vale para Golpe de Estado, contestação, Assassinato ou Execução Bruta.'
    },
    {
      id: 'espolio',
      title: 'Espólio',
      description: 'Quando alguém é eliminado, suas moedas são divididas entre os jogadores restantes em partes iguais. Se sobrar, a sobra volta para o banco.'
    },
    {
      id: 'votos-do-senado',
      title: 'Votos do Senado',
      description: 'Golpes de Estado precisam de aprovação da maioria dos jogadores vivos.'
    },
    {
      id: 'mercado-negro',
      title: 'Mercado Negro',
      description: 'Você pode pagar 2 moedas para trocar uma carta da mão com uma carta do baralho.'
    },
    {
      id: 'golpe-magno',
      title: 'Golpe Magno',
      description: 'Quando um jogador atingir 15 moedas, todos perdem 1 influência.'
    },
    {
      id: 'soberania-absoluta',
      title: 'Soberania Absoluta',
      description: 'Se possuir 2 Condessas, você pode bloquear qualquer ação contra si. Pode blefar, mas se for contestado e mentir, será eliminado. Se provar, deve trocar ambas as cartas.'
    },
    {
      id: 'contrabando',
      title: 'Contrabando',
      description: 'Você pode sacrificar uma influência sua para ganhar 10 moedas automaticamente.'
    },
    {
      id: 'panico-economico',
      title: 'Pânico Econômico',
      description: 'Quando alguém acumular mais de 8 moedas, todos os jogadores recebem 1 moeda automaticamente.'
    },
    {
      id: 'camara',
      title: 'Câmara',
      description: 'Todos recebem 4 influências. Cada jogador escolhe 2 influências para ficar e devolve 2 para o baralho.'
    },
    {
      id: 'corrupcao',
      title: 'Corrupção',
      description: 'No início do jogo, receba 2 cartas e selecione 1 para manter e 1 para descartar. Em seguida, sua segunda carta será sorteada aleatoriamente.'
    },
    {
      id: 'o-trio-falso',
      title: 'O Trio Falso',
      description: 'Em vez de começar com 2 cartas, cada jogador começa com 3 cartas, porém continua tendo apenas 2 vidas.'
    },
    {
      id: 'figura-publica',
      title: 'Figura Pública',
      description: 'Um personagem é revelado na mesa. Só existirá esse personagem no jogo, e o uso dele é público: todos podem usar.'
    },
    {
      id: 'chantagem',
      title: 'Chantagem',
      description: 'Ao gastar 7 moedas, você pode roubar uma influência de outro jogador e ficar com ela. Você deve entregar uma de suas cartas para esse jogador. Pode ser bloqueada por Embaixador, Inquisidor ou Bufão.'
    },
    {
      id: 'imprensa',
      title: 'Imprensa',
      description: 'Gaste 4 moedas para revelar a todos uma carta de outro jogador à sua escolha. O jogador afetado ganha 2 moedas.'
    },
    {
      id: 'favor-da-coroa',
      title: 'Favor da Coroa',
      description: 'Quando for alvo de uma ação, você pode pagar 3 moedas para bloqueá-la. Não bloqueia Golpe de Estado.'
    },
    {
      id: 'inversao-de-poder',
      title: 'Inversão de Poder',
      description: 'Pague 3 moedas e mude a direção dos turnos.'
    },
    {
      id: 'espionagem',
      title: 'Espionagem',
      description: 'Uma vez por turno, você pode pagar 2 moedas para olhar secretamente uma influência de qualquer jogador.'
    },
    {
      id: 'sorte-do-destino',
      title: 'Sorte do Destino',
      description: 'Sempre que um jogador perder uma influência, ele compra uma carta do topo do baralho. Pode ficar com ela ou devolvê-la ao fundo do baralho.'
    },
    {
      id: 'conselho-de-emergencia',
      title: 'Conselho de Emergência',
      description: 'Quando um jogador atingir 10 moedas, todos os jogadores vivos recebem 2 moedas.'
    },
    {
      id: 'herdeiro-do-trono',
      title: 'Herdeiro do Trono',
      description: 'Quando um jogador for eliminado, o responsável pela eliminação recebe imediatamente 3 moedas.'
    },
    {
      id: 'golpe-declarado',
      title: 'Golpe Declarado',
      description: 'Para o Golpe de Estado ter sucesso, o jogador deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'
    }
  ];

  let config = {};
  let currentRuleImages = [];
  let currentRuleIndex = 0;
  let currentAltIndex = 0;
  let selectedRuleDrawCount = 1;
  let lastRenderedDrawId = null;
  let ruleDrawAnimationTimer = null;
  let ruleDrawTickTimer = null;

  function getElement(id) {
    return document.getElementById(id);
  }

  function getDeckConfig() {
    return config.getDeckConfig?.() || {};
  }

  function getState() {
    return config.getState?.() || {};
  }

  function getRoomCode() {
    return config.getRoomCode?.() || root.roomCode || null;
  }

  function getDatabase() {
    return config.getDatabase?.() || root.db || null;
  }

  function getIsAdmin() {
    return Boolean(config.isAdmin?.());
  }

  function isRankedMode() {
    return Boolean(config.isRankedMode?.());
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function showError(message) {
    const handler = config.showError || root.showError;
    if (typeof handler === 'function') {
      handler(message);
      return;
    }

    alert(message);
  }

  function clampRuleCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return RULE_DRAW_MIN;
    return Math.max(RULE_DRAW_MIN, Math.min(RULE_DRAW_MAX, Math.round(number)));
  }

  function getRuleById(ruleId) {
    return ALTERNATIVE_RULES.find((rule) => rule.id === ruleId) || null;
  }

  function pickRandomRules(count) {
    const availableRules = [...ALTERNATIVE_RULES];
    const selectedRules = [];
    const targetCount = clampRuleCount(count);

    while (selectedRules.length < targetCount && availableRules.length > 0) {
      const index = Math.floor(Math.random() * availableRules.length);
      selectedRules.push(availableRules.splice(index, 1)[0]);
    }

    return selectedRules;
  }

  function hasAnyConfiguredCard(deckConfig, cardTypes) {
    return cardTypes.some((card) => (deckConfig[card] || 0) > 0);
  }

  function calculateRuleImages(deckConfig = getDeckConfig()) {
    const images = [];
    const hasPromo = hasAnyConfiguredCard(deckConfig, PROMO_CARDS);
    const hasRevolution = hasAnyConfiguredCard(deckConfig, REVOLUTION_CARDS);
    const hasShadows = hasAnyConfiguredCard(deckConfig, SHADOWS_CARDS);

    images.push(hasRevolution
      ? 'assets/img/guides/front-actions-alternative.png'
      : 'assets/img/guides/front-actions.png');

    if (hasPromo) images.push('assets/img/guides/dlc-actions.png');
    if (hasRevolution) images.push('assets/img/guides/dlc2-actions.png');
    if (hasShadows) images.push('assets/img/guides/dlc3-actions.png');

    images.push('assets/img/guides/back-actions.png');

    return images;
  }

  function getFlipImages(flipCard) {
    return {
      frontImg: flipCard?.querySelector('.flip-card-front img') || null,
      backImg: flipCard?.querySelector('.flip-card-back img') || null
    };
  }

  function resetFlipCard(flipCard, images) {
    if (!flipCard || images.length === 0) return;

    const { frontImg, backImg } = getFlipImages(flipCard);

    flipCard.classList.remove('is-flipped');
    if (frontImg) frontImg.src = images[0];
    if (backImg) backImg.src = images.length > 1 ? images[1] : images[0];
  }

  function advanceFlipCard(flipCard, images, currentIndex, onIndexChange) {
    if (!flipCard || images.length === 0) return;

    playSound('card-slide');
    flipCard.classList.toggle('is-flipped');

    const nextCurrentIndex = (currentIndex + 1) % images.length;
    onIndexChange(nextCurrentIndex);

    setTimeout(() => {
      const { frontImg, backImg } = getFlipImages(flipCard);
      const nextImageIndex = (nextCurrentIndex + 1) % images.length;

      if (flipCard.classList.contains('is-flipped')) {
        if (frontImg) frontImg.src = images[nextImageIndex];
      } else if (backImg) {
        backImg.src = images[nextImageIndex];
      }
    }, 500);
  }

  function getCharacterFlipCard(infoModal) {
    return infoModal?.querySelector('.flip-card') || document.querySelector('.flip-card');
  }

  function bindCharacterGuides() {
    const characterActionsBtn = getElement('characterActionsBtn') || getElement('infoBtn');
    const infoModal = getElement('infoModal');
    const closeInfoBtn = getElement('closeModalBtn');

    if (!characterActionsBtn || !infoModal) return;

    characterActionsBtn.onclick = () => {
      const flipCard = getCharacterFlipCard(infoModal);

      playSound('click');
      currentRuleImages = calculateRuleImages();
      currentRuleIndex = 0;
      root.CoupModal?.open(infoModal);
      resetFlipCard(flipCard, currentRuleImages);
    };

    if (closeInfoBtn) {
      closeInfoBtn.onclick = () => {
        playSound('click');
        root.CoupModal?.close(infoModal);
      };
    }

    const flipCard = getCharacterFlipCard(infoModal);
    if (flipCard) {
      flipCard.onclick = () => {
        if (currentRuleImages.length === 0) {
          currentRuleImages = calculateRuleImages();
        }

        advanceFlipCard(flipCard, currentRuleImages, currentRuleIndex, (nextIndex) => {
          currentRuleIndex = nextIndex;
        });
      };
    }
  }

  function stopRuleDrawAnimation() {
    if (ruleDrawAnimationTimer) {
      clearTimeout(ruleDrawAnimationTimer);
      ruleDrawAnimationTimer = null;
    }

    if (ruleDrawTickTimer) {
      clearInterval(ruleDrawTickTimer);
      ruleDrawTickTimer = null;
    }
  }

  function getRuleDrawElements() {
    return {
      button: getElement('ruleDrawBtn'),
      modal: getElement('ruleDrawModal'),
      closeButton: getElement('closeRuleDrawBtn'),
      setup: getElement('ruleDrawSetup'),
      intro: getElement('ruleDrawIntro'),
      startButton: getElement('startRuleDrawBtn'),
      animation: getElement('ruleDrawAnimation'),
      rollingTitle: getElement('ruleDrawRollingTitle'),
      results: getElement('ruleDrawResults'),
      countButtons: Array.from(document.querySelectorAll('.rule-draw-count-btn'))
    };
  }

  function setSelectedRuleDrawCount(count) {
    selectedRuleDrawCount = clampRuleCount(count);
    getRuleDrawElements().countButtons.forEach((button) => {
      const isSelected = Number(button.dataset.ruleCount) === selectedRuleDrawCount;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function createRuleResultCard(rule, index) {
    const card = document.createElement('article');
    card.className = 'rule-draw-result-card';

    const number = document.createElement('span');
    number.className = 'rule-draw-result-number';
    number.textContent = String(index + 1).padStart(2, '0');

    const title = document.createElement('h3');
    title.textContent = rule.title;

    const description = document.createElement('p');
    description.textContent = rule.description;

    card.append(number, title, description);
    return card;
  }

  function renderRuleDrawResults(drawData) {
    const { results, animation } = getRuleDrawElements();
    if (!results) return;

    if (animation) {
      animation.hidden = true;
      animation.classList.remove('is-spinning');
    }

    results.innerHTML = '';
    const ruleIds = Array.isArray(drawData?.ruleIds) ? drawData.ruleIds : [];
    const rules = ruleIds.map(getRuleById).filter(Boolean);

    if (rules.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rule-draw-empty';
      empty.textContent = 'Nenhum sorteio realizado nesta sala.';
      results.appendChild(empty);
      return;
    }

    const heading = document.createElement('p');
    heading.className = 'rule-draw-result-heading';
    heading.textContent = 'Regras sorteadas para esta partida';
    results.appendChild(heading);

    rules.forEach((rule, index) => {
      results.appendChild(createRuleResultCard(rule, index));
    });
  }

  function runRuleDrawAnimation(drawData) {
    const { modal, animation, rollingTitle, results } = getRuleDrawElements();
    const rules = Array.isArray(drawData?.ruleIds)
      ? drawData.ruleIds.map(getRuleById).filter(Boolean)
      : [];

    stopRuleDrawAnimation();
    if (!modal || !animation || !rollingTitle || rules.length === 0) {
      renderRuleDrawResults(drawData);
      return;
    }

    playSound('challenge-suspensful');
    root.CoupModal?.open(modal);
    animation.hidden = false;
    animation.classList.add('is-spinning');
    if (results) results.innerHTML = '';

    let tick = 0;
    ruleDrawTickTimer = setInterval(() => {
      const rollingRule = ALTERNATIVE_RULES[tick % ALTERNATIVE_RULES.length];
      rollingTitle.textContent = rollingRule.title;
      tick += 1;
    }, RULE_DRAW_TICK_MS);

    ruleDrawAnimationTimer = setTimeout(() => {
      stopRuleDrawAnimation();
      playSound('conquest');
      renderRuleDrawResults(drawData);
    }, RULE_DRAW_ANIMATION_MS);
  }

  function publishRuleDraw() {
    if (!getIsAdmin()) {
      showError('Apenas o Host pode sortear regras alternativas.');
      return;
    }

    if (isRankedMode()) {
      showError('O sorteador de regras alternativas fica disponivel apenas no modo casual.');
      return;
    }

    const db = getDatabase();
    const roomCode = getRoomCode();
    if (!db || !roomCode) {
      showError('Nao foi possivel sincronizar o sorteio da sala.');
      return;
    }

    const selectedRules = pickRandomRules(selectedRuleDrawCount);
    const timestamp = Date.now();
    const drawData = {
      id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
      ruleIds: selectedRules.map((rule) => rule.id),
      count: selectedRules.length,
      by: config.getCurrentUser?.()?.name || 'Host',
      timestamp
    };

    playSound('pop');
    db.ref(`salas/${roomCode}/lastActivity`).set(timestamp);
    db.ref(`salas/${roomCode}/gameState/alternativeRuleDraw`).set(drawData)
      .catch((error) => {
        console.error('Erro ao sortear regras alternativas:', error);
        showError('Nao foi possivel sortear regras alternativas.');
      });
  }

  function openRuleDrawModal() {
    const { modal } = getRuleDrawElements();
    if (!modal) return;

    playSound('click');
    renderRuleDrawControls();
    renderRuleDrawResults(getState().alternativeRuleDraw);
    root.CoupModal?.open(modal);
  }

  function closeRuleDrawModal() {
    stopRuleDrawAnimation();
    playSound('click');
    root.CoupModal?.close('ruleDrawModal');
  }

  function renderRuleDrawControls() {
    const { button, setup, intro, startButton } = getRuleDrawElements();
    const canDraw = getIsAdmin() && !isRankedMode();

    if (button) button.style.display = canDraw && RULE_DRAW_BUTTON_ENABLED ? 'inline-flex' : 'none';
    if (setup) setup.style.display = canDraw ? 'grid' : 'none';
    if (startButton) startButton.disabled = !canDraw;
    if (intro) {
      intro.textContent = canDraw
        ? t('casual.ruleDrawIntro', {}, 'Escolha até 5 regras alternativas para uma partida mais imprevisível. O resultado aparece para todos os jogadores.')
        : t('casual.hostCanDrawRules', {}, 'O Host pode sortear regras alternativas para diversificar a partida.');
    }
  }

  function renderAlternativeRuleDraw(options = {}) {
    if (typeof options.isAdmin === 'boolean') {
      config.isAdmin = () => options.isAdmin;
    }

    renderRuleDrawControls();

    const drawData = options.state?.alternativeRuleDraw || getState().alternativeRuleDraw;
    if (!drawData?.id || drawData.id === lastRenderedDrawId) return;

    lastRenderedDrawId = drawData.id;
    runRuleDrawAnimation(drawData);
  }

  function bindRuleDraw() {
    const {
      button,
      closeButton,
      startButton,
      countButtons
    } = getRuleDrawElements();

    if (button && button.dataset.ruleDrawBound !== 'true') {
      button.dataset.ruleDrawBound = 'true';
      button.addEventListener('click', openRuleDrawModal);
    }

    if (closeButton && closeButton.dataset.ruleDrawBound !== 'true') {
      closeButton.dataset.ruleDrawBound = 'true';
      closeButton.addEventListener('click', closeRuleDrawModal);
    }

    if (startButton && startButton.dataset.ruleDrawBound !== 'true') {
      startButton.dataset.ruleDrawBound = 'true';
      startButton.addEventListener('click', publishRuleDraw);
    }

    countButtons.forEach((button) => {
      if (button.dataset.ruleDrawBound === 'true') return;
      button.dataset.ruleDrawBound = 'true';
      button.addEventListener('click', () => {
        playSound('pop');
        setSelectedRuleDrawCount(button.dataset.ruleCount);
      });
    });

    setSelectedRuleDrawCount(selectedRuleDrawCount);
    renderRuleDrawControls();
  }

  function bindAlternativeRules() {
    const altRulesBtn = getElement('altRulesBtn');
    const altRulesModal = getElement('altRulesModal');
    const closeAltRulesBtn = getElement('closeAltRulesBtn');
    const altFlipCard = getElement('altRulesFlipCard');

    if (!altRulesBtn || !altRulesModal) return;

    altRulesBtn.onclick = () => {
      playSound('click');
      currentAltIndex = 0;
      root.CoupModal?.open(altRulesModal);
      resetFlipCard(altFlipCard, ALT_RULE_IMAGES);
    };

    if (closeAltRulesBtn) {
      closeAltRulesBtn.onclick = () => {
        playSound('click');
        root.CoupModal?.close(altRulesModal);
      };
    }

    if (altFlipCard) {
      altFlipCard.onclick = () => {
        advanceFlipCard(altFlipCard, ALT_RULE_IMAGES, currentAltIndex, (nextIndex) => {
          currentAltIndex = nextIndex;
        });
      };
    }
  }

  function setup(options = {}) {
    config = options;
    bindCharacterGuides();
    bindAlternativeRules();
    bindRuleDraw();
  }

  root.CoupRulesGuides = {
    setup,
    calculateRuleImages,
    renderAlternativeRuleDraw
  };
})(window);
