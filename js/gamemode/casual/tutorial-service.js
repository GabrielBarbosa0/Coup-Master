(function setupCasualTutorialService(root) {
  const TUTORIAL_SEEN_KEY = 'tutorialSeen';

  function getElement(id) {
    return document.getElementById(id);
  }

  function readSessionFlag(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeSessionFlag(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      // O tutorial nao deve bloquear o jogo se sessionStorage estiver indisponivel.
    }
  }

  function closeTutorial(tutorialModal) {
    root.CoupModal?.close(tutorialModal);
    writeSessionFlag(TUTORIAL_SEEN_KEY, 'true');
  }

  function setup(options = {}) {
    const tutorialModal = getElement(options.modalId || 'tutorialModal');
    const closeBtn = getElement(options.closeButtonId || 'closeTutorialBtn');
    const startBtn = getElement(options.startButtonId || 'startPlayBtn');

    if (!tutorialModal) return;

    if (!readSessionFlag(TUTORIAL_SEEN_KEY)) {
      root.CoupModal?.open(tutorialModal);
    }

    const closeAction = () => closeTutorial(tutorialModal);

    if (closeBtn) closeBtn.onclick = closeAction;
    if (startBtn) startBtn.onclick = closeAction;
  }

  root.CoupTutorial = {
    setup
  };
})(window);
