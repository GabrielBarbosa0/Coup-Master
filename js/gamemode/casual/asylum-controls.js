(function setupCasualAsylumControls(root) {
  let config = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function callHandler(name, ...args) {
    const handler = config[name] || root[name];
    if (typeof handler === 'function') return handler(...args);
    return null;
  }

  function attachTooltip(element, text) {
    const handler = config.attachElementTooltip || root.attachElementTooltip;
    if (typeof handler === 'function') handler(element, text);
  }

  function bindAsylumImage() {
    const asylumArea = getElement('asylumArea');
    if (!asylumArea) return;

    const asylumImageWrapper = asylumArea.querySelector('.asylum-image-wrapper');
    const asylumImage = asylumArea.querySelector('.asylum-image-wrapper img');

    if (asylumImageWrapper) {
      attachTooltip(asylumImageWrapper, 'Asilo');
    }

    if (asylumImage) {
      asylumImage.ondblclick = () => {
        callHandler('withdrawAsylumCoins');
      };
    }
  }

  function bindScoreButtons() {
    const asylumPlusButton = getElement('asylum-plus');
    const asylumMinusButton = getElement('asylum-minus');

    if (asylumPlusButton) {
      asylumPlusButton.onclick = () => callHandler('updateAsylumScore', 1);
    }

    if (asylumMinusButton) {
      asylumMinusButton.onclick = () => callHandler('updateAsylumScore', -1);
    }
  }

  function setup(options = {}) {
    config = options;
    bindAsylumImage();
    bindScoreButtons();
  }

  root.CoupAsylumControls = {
    setup
  };
})(window);
