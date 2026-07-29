(function setupCasualRulesGuides(root) {
  const PROMO_CARDS = ['bufao', 'benfeitor', 'burgues', 'burocrata'];
  const REVOLUTION_CARDS = ['marionetista', 'diplomata', 'mercenario', 'bispo', 'tesoureiro', 'vigilante'];
  const SHADOWS_CARDS = ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife'];

  const ALT_RULE_IMAGES = [
    'assets/img/guides/alternative-rules1.png',
    'assets/img/guides/alternative-rules2.png',
    'assets/img/guides/alternative-rules3.png',
    'assets/img/guides/alternative-rules4.png',
    'assets/img/guides/alternative-rules5.png'
  ];

  let config = {};
  let currentRuleImages = [];
  let currentRuleIndex = 0;
  let currentAltIndex = 0;

  function getElement(id) {
    return document.getElementById(id);
  }

  function getDeckConfig() {
    return config.getDeckConfig?.() || {};
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
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
  }

  root.CoupRulesGuides = {
    setup,
    calculateRuleImages
  };
})(window);
