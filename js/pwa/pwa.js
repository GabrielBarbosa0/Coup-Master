(function registerPwa() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .catch((error) => {
        console.warn('Service worker nao registrado:', error);
      });
  });
})();
