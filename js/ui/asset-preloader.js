(function setupAssetPreloader(root) {
  const ASSET_GROUPS = Object.freeze({
    casual: [
      'assets/img/guides/clean.png',
      'assets/img/guides/alternative-rules1.png',
      'assets/img/guides/alternative-rules2.png',
      'assets/img/guides/alternative-rules3.png',
      'assets/img/guides/alternative-rules4.png',
      'assets/img/guides/alternative-rules5.png',
      'assets/img/cards/base/assassino.png',
      'assets/img/cards/base/back.png',
      'assets/img/cards/base/capitao.png',
      'assets/img/cards/base/condessa.png',
      'assets/img/cards/base/duque.png',
      'assets/img/cards/base/embaixador.png',
      'assets/img/cards/base/inquisidor.png',
      'assets/img/cards/dlc1/bispo.png',
      'assets/img/cards/dlc1/diplomata.png',
      'assets/img/cards/dlc1/marionetista.png',
      'assets/img/cards/dlc1/mercenario.png',
      'assets/img/cards/dlc1/tesoureiro.png',
      'assets/img/cards/dlc1/vigilante.png',
      'assets/img/cards/dlc2/estrategista.png',
      'assets/img/cards/dlc2/ladrao.png',
      'assets/img/cards/dlc2/magnata.png',
      'assets/img/cards/dlc2/pistoleiro.png',
      'assets/img/cards/dlc2/vigarista.png',
      'assets/img/cards/dlc2/xerife.png',
      'assets/img/cards/promo/benfeitor.png',
      'assets/img/cards/promo/bufao.png',
      'assets/img/cards/promo/burgues.png',
      'assets/img/cards/promo/burocrata.png',
      'assets/img/cards/religion/asilo.png',
      'assets/img/cards/religion/catolico-quadrado.png',
      'assets/img/cards/religion/protestante-quadrado.png',
      'assets/img/perfil-cards/base/assassino.png',
      'assets/img/perfil-cards/base/capitao.png',
      'assets/img/perfil-cards/base/condessa.png',
      'assets/img/perfil-cards/base/duque.png',
      'assets/img/perfil-cards/base/embaixador.png',
      'assets/img/perfil-cards/base/inquisidor.png',
      'assets/img/perfil-cards/dlc1/bispo.png',
      'assets/img/perfil-cards/dlc1/diplomata.png',
      'assets/img/perfil-cards/dlc1/marionetista.png',
      'assets/img/perfil-cards/dlc1/mercenario.png',
      'assets/img/perfil-cards/dlc1/tesoureiro.png',
      'assets/img/perfil-cards/dlc1/vigilante.png',
      'assets/img/perfil-cards/dlc2/estrategista.png',
      'assets/img/perfil-cards/dlc2/ladrao.png',
      'assets/img/perfil-cards/dlc2/magnata.png',
      'assets/img/perfil-cards/dlc2/pistoleiro.png',
      'assets/img/perfil-cards/dlc2/vigarista.png',
      'assets/img/perfil-cards/dlc2/xerife.png',
      'assets/img/perfil-cards/promo/benfeitor.png',
      'assets/img/perfil-cards/promo/bufao.png',
      'assets/img/perfil-cards/promo/burgues.png',
      'assets/img/perfil-cards/promo/burocrata.png'
    ],
    ranked: [
      'assets/img/guides/clean.png',
      'assets/img/cards/base/assassino.png',
      'assets/img/cards/base/back.png',
      'assets/img/cards/base/capitao.png',
      'assets/img/cards/base/condessa.png',
      'assets/img/cards/base/duque.png',
      'assets/img/cards/base/embaixador.png',
      'assets/img/cards/base/inquisidor.png',
      'assets/img/perfil-cards/base/assassino.png',
      'assets/img/perfil-cards/base/capitao.png',
      'assets/img/perfil-cards/base/condessa.png',
      'assets/img/perfil-cards/base/duque.png',
      'assets/img/perfil-cards/base/embaixador.png',
      'assets/img/perfil-cards/base/inquisidor.png'
    ]
  });

  const DEFAULT_TIMEOUT_MS = 9000;

  function unique(paths) {
    return Array.from(new Set(paths.filter(Boolean)));
  }

  function getAssets(mode) {
    return unique(ASSET_GROUPS[mode] || []);
  }

  function getLoadingMessage(mode, completed, total) {
    const current = Math.min(completed, total);
    if (mode === 'ranked') return `Carregando cartas do ranqueado... ${current}/${total}`;
    return `Carregando cartas e guias... ${current}/${total}`;
  }

  function resolveMessageElement(messageElement) {
    if (typeof messageElement === 'string') return document.querySelector(messageElement);
    return messageElement || null;
  }

  function setMessage(messageElement, message) {
    const element = resolveMessageElement(messageElement);
    if (element) element.textContent = message;
  }

  function preloadImage(src, timeoutMs) {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      let timeout = null;

      function finish(ok, reason = '') {
        if (settled) return;
        settled = true;
        if (timeout !== null) root.clearTimeout(timeout);
        resolve({ src, ok, reason });
      }

      image.decoding = 'async';
      image.loading = 'eager';
      image.onload = () => {
        if (typeof image.decode !== 'function') {
          finish(true);
          return;
        }

        image.decode().then(
          () => finish(true),
          () => finish(true)
        );
      };
      image.onerror = () => finish(false, 'error');

      timeout = root.setTimeout(() => finish(false, 'timeout'), timeoutMs);
      image.src = src;

      if (image.complete && image.naturalWidth > 0) {
        finish(true);
      }
    });
  }

  function preload(mode, options = {}) {
    const assets = getAssets(mode);
    const total = assets.length;
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    let completed = 0;
    let loaded = 0;
    let failed = 0;

    function notify(lastAsset = null) {
      const progress = { mode, total, completed, loaded, failed, lastAsset };
      setMessage(options.messageElement, getLoadingMessage(mode, completed, total));
      if (typeof options.onProgress === 'function') options.onProgress(progress);
    }

    if (!total) {
      notify();
      return Promise.resolve({ mode, total, loaded, failed, assets: [] });
    }

    notify();

    return Promise.all(assets.map((src) => (
      preloadImage(src, timeoutMs).then((asset) => {
        completed += 1;
        if (asset.ok) loaded += 1;
        else failed += 1;
        notify(asset);
        return asset;
      })
    ))).then((results) => ({ mode, total, loaded, failed, assets: results }));
  }

  root.CoupAssetPreloader = Object.freeze({
    getAssets,
    preload
  });
})(window);
