(function setupCasualAsylumControls(root) {
  let config = {};
  let languageListenerBound = false;

  function getElement(id) {
    return document.getElementById(id);
  }

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
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

  function refreshLabels() {
    const asylumArea = getElement('asylumArea');
    if (!asylumArea) return;

    const asylumImageWrapper = asylumArea.querySelector('.asylum-image-wrapper');
    const asylumImage = asylumArea.querySelector('.asylum-image-wrapper img');
    const asylumMinusButton = getElement('asylum-minus');
    const asylumPlusButton = getElement('asylum-plus');

    if (asylumImageWrapper) {
      attachTooltip(asylumImageWrapper, t('casual.asylum', {}, 'Asilo'));
    }

    if (asylumImage) {
      asylumImage.alt = t('casual.asylum', {}, 'Asilo');
      asylumImage.title = t('casual.asylumTooltip', {}, 'Clique duplo para sacar tudo');
    }

    if (asylumMinusButton) {
      asylumMinusButton.title = t('casual.removeAsylumCoin', {}, 'Remover Moeda do Asilo');
    }

    if (asylumPlusButton) {
      asylumPlusButton.title = t('casual.addAsylumCoin', {}, 'Adicionar Moeda ao Asilo');
    }
  }

  function bindAsylumImage() {
    const asylumArea = getElement('asylumArea');
    if (!asylumArea) return;

    const asylumImage = asylumArea.querySelector('.asylum-image-wrapper img');

    refreshLabels();

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

    if (!languageListenerBound) {
      languageListenerBound = true;
      root.addEventListener?.('coup:languagechange', refreshLabels);
    }
  }

  root.CoupAsylumControls = {
    setup,
    refreshLabels
  };
})(window);
