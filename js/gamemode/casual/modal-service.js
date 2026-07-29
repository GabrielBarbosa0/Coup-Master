(function setupCasualModalService(root) {
  const DEFAULT_DISPLAY = 'flex';

  function getElement(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.getElementById(target);
    return target;
  }

  function open(target, options = {}) {
    const modal = getElement(target);
    if (!modal) return null;

    modal.hidden = false;
    modal.style.display = options.display || DEFAULT_DISPLAY;
    return modal;
  }

  function close(target) {
    const modal = getElement(target);
    if (!modal) return null;

    modal.style.display = 'none';
    return modal;
  }

  function isVisible(target) {
    const modal = getElement(target);
    if (!modal || modal.hidden) return false;
    return window.getComputedStyle(modal).display !== 'none';
  }

  function bindClose(buttonTarget, modalTarget, options = {}) {
    const button = getElement(buttonTarget);
    if (!button) return;

    button.onclick = () => {
      if (typeof options.beforeClose === 'function') options.beforeClose();
      if (options.sound && typeof root.playSound === 'function') root.playSound(options.sound);
      close(modalTarget);
      if (typeof options.afterClose === 'function') options.afterClose();
    };
  }

  function bindOpen(buttonTarget, modalTarget, options = {}) {
    const button = getElement(buttonTarget);
    if (!button) return;

    button.onclick = () => {
      if (typeof options.beforeOpen === 'function' && options.beforeOpen() === false) return;
      if (options.sound && typeof root.playSound === 'function') root.playSound(options.sound);
      open(modalTarget, options);
      if (typeof options.afterOpen === 'function') options.afterOpen();
    };
  }

  function setText(target, text) {
    const element = getElement(target);
    if (element) element.innerText = text;
  }

  root.CoupModal = {
    getElement,
    open,
    close,
    isVisible,
    bindClose,
    bindOpen,
    setText
  };
})(window);
