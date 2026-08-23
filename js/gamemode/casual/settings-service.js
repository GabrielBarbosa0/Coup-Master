(function setupCasualSettings(root) {
  const SAMSUNG_DRAG_STORAGE_KEY = 'coupMasterSamsungDragEnabled';
  const HIDE_RELIGION_STORAGE_KEY = 'hideReligion';

  let samsungDragEnabled = readLocalBoolean(SAMSUNG_DRAG_STORAGE_KEY, true);

  function readLocalBoolean(key, defaultValue = false) {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue === null) return defaultValue;
      return storedValue === 'true';
    } catch (error) {
      return defaultValue;
    }
  }

  function writeLocalBoolean(key, value) {
    try {
      localStorage.setItem(key, value ? 'true' : 'false');
    } catch (error) {
      // Preferimos falhar de forma silenciosa para nao bloquear o jogo.
    }
  }

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
  }

  function isSamsungDragModeEnabled() {
    return samsungDragEnabled;
  }

  function updateSamsungDragButton() {
    const button = document.getElementById('toggleSamsungDragBtn');
    if (!button) return;

    button.setAttribute('aria-pressed', samsungDragEnabled ? 'true' : 'false');
    button.classList.toggle('is-active', samsungDragEnabled);
    button.title = samsungDragEnabled
      ? t('casual.disableCompatibility', {}, 'Desativar arraste compatível com Samsung Internet')
      : t('casual.enableCompatibility', {}, 'Ativar arraste compatível com Samsung Internet');

    const label = button.querySelector('span');
    if (label) label.textContent = samsungDragEnabled ? t('casual.active', {}, 'Ativo') : t('casual.inactive', {}, 'Inativo');
  }

  function refreshSamsungDragMode() {
    document.body?.classList.toggle('samsung-drag-enabled', samsungDragEnabled);

    document.querySelectorAll('.game-table .card').forEach((cardElement) => {
      cardElement.draggable = !samsungDragEnabled;
    });

    const deckElement = document.getElementById('deck');
    if (deckElement) deckElement.draggable = !samsungDragEnabled;
    updateSamsungDragButton();
  }

  function setSamsungDragMode(enabled) {
    samsungDragEnabled = Boolean(enabled);
    writeLocalBoolean(SAMSUNG_DRAG_STORAGE_KEY, samsungDragEnabled);
    refreshSamsungDragMode();
  }

  function applyReligionVisibility(shouldHide) {
    const body = document.body;
    const toggleReligionButton = document.getElementById('toggleReligionBtn');

    body.classList.toggle('hide-religion', Boolean(shouldHide));

    const label = toggleReligionButton?.querySelector('span');
    if (label) label.textContent = shouldHide ? t('casual.invisible', {}, 'Invisível') : t('casual.visible', {}, 'Visível');

    writeLocalBoolean(HIDE_RELIGION_STORAGE_KEY, shouldHide);
  }

  function setupReligionVisibilityPreference(options = {}) {
    const toggleReligionButton = document.getElementById(options.buttonId || 'toggleReligionBtn');
    const storedReligionSetting = readLocalBoolean(HIDE_RELIGION_STORAGE_KEY, true);

    applyReligionVisibility(storedReligionSetting);
    root.addEventListener?.('coup:languagechange', () => {
      applyReligionVisibility(document.body.classList.contains('hide-religion'));
    });
    if (!toggleReligionButton) return;

    toggleReligionButton.onclick = () => {
      const playSound = options.playSound || root.playSound;
      if (typeof playSound === 'function') playSound('click');

      const isCurrentlyHidden = document.body.classList.contains('hide-religion');
      applyReligionVisibility(!isCurrentlyHidden);
    };
  }

  function setupSamsungDragPreference(options = {}) {
    const toggleSamsungDragButton = document.getElementById(options.buttonId || 'toggleSamsungDragBtn');
    updateSamsungDragButton();
    root.addEventListener?.('coup:languagechange', updateSamsungDragButton);

    if (!toggleSamsungDragButton) return;
    toggleSamsungDragButton.onclick = () => {
      const playSound = options.playSound || root.playSound;
      if (typeof playSound === 'function') playSound('click');
      setSamsungDragMode(!isSamsungDragModeEnabled());
    };
  }

  root.CoupCasualSettings = {
    readLocalBoolean,
    writeLocalBoolean,
    isSamsungDragModeEnabled,
    updateSamsungDragButton,
    refreshSamsungDragMode,
    setSamsungDragMode,
    applyReligionVisibility,
    setupReligionVisibilityPreference,
    setupSamsungDragPreference
  };

  root.isSamsungDragModeEnabled = isSamsungDragModeEnabled;
  root.updateSamsungDragButton = updateSamsungDragButton;
  root.refreshSamsungDragMode = refreshSamsungDragMode;
  root.setSamsungDragMode = setSamsungDragMode;
})(window);
