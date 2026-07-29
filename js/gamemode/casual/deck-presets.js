(function setupCasualDeckPresets(root) {
  const CARD_GROUPS = Object.freeze({
    base: ['assassino', 'capitao', 'condessa', 'duque', 'embaixador', 'inquisidor'],
    promo: ['benfeitor', 'bufao', 'burgues', 'burocrata'],
    dlc1: ['bispo', 'diplomata', 'marionetista', 'mercenario', 'tesoureiro', 'vigilante'],
    dlc2: ['estrategista', 'ladrao', 'magnata', 'pistoleiro', 'vigarista', 'xerife'],
    duelFixed: ['assassino', 'capitao', 'condessa', 'duque']
  });

  let playSoundHandler = null;

  function setup(options = {}) {
    if (typeof options.playSound === 'function') {
      playSoundHandler = options.playSound;
    }
  }

  function getConfigInputs() {
    return Array.from(document.querySelectorAll('.card-config-item input'));
  }

  function play(id) {
    const handler = playSoundHandler || root.playSound;
    if (typeof handler === 'function') handler(id);
  }

  function setInputValue(input, value) {
    input.value = value;
  }

  function isInGroups(card, groups) {
    return groups.some((group) => CARD_GROUPS[group]?.includes(card));
  }

  function applyDeckPreset(presetType) {
    const configInputs = getConfigInputs();
    if (!configInputs.length) return;

    if (presetType === 'duel') {
      play('click');
      root.CoupModal?.open('duelModal');
      root.CoupModal?.close('settingsModal');
      return;
    }

    play('pop');

    configInputs.forEach((input) => {
      const card = input.dataset.card;

      switch (presetType) {
        case 'standard':
          setInputValue(input, isInGroups(card, ['base']) ? 5 : 0);
          break;

        case 'base_promo':
          setInputValue(input, isInGroups(card, ['base', 'promo']) ? 5 : 0);
          break;

        case 'base_dlc1':
          setInputValue(input, isInGroups(card, ['base', 'dlc1']) ? 5 : 0);
          break;

        case 'base_dlc2':
          setInputValue(input, isInGroups(card, ['base', 'dlc2']) ? 5 : 0);
          break;

        case 'caos':
          setInputValue(input, 5);
          break;

        case 'test':
          setInputValue(input, 1);
          break;

        case 'clear':
        default:
          setInputValue(input, 0);
          break;
      }
    });
  }

  function confirmDuelPreset(chosenCard) {
    const configInputs = getConfigInputs();
    if (!configInputs.length) return;

    play('pop');

    configInputs.forEach((input) => {
      const card = input.dataset.card;
      setInputValue(input, CARD_GROUPS.duelFixed.includes(card) || card === chosenCard ? 3 : 0);
    });

    closeDuelModal();
    root.CoupModal?.open('configModal');
  }

  function closeDuelModal() {
    root.CoupModal?.close('duelModal');
  }

  root.CoupDeckPresets = {
    setup,
    applyDeckPreset,
    confirmDuelPreset,
    closeDuelModal
  };

  root.applyDeckPreset = applyDeckPreset;
  root.confirmDuelPreset = confirmDuelPreset;
  root.closeDuelModal = closeDuelModal;
})(window);
