(function registerPwa() {
  if (!('serviceWorker' in navigator)) return;

  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  window.addEventListener('load', () => {
    if (isLocalhost) {
      clearLocalServiceWorkers();
      return;
    }

    navigator.serviceWorker
      .register('sw.js')
      .catch((error) => {
        console.warn('Service worker nao registrado:', error);
      });
  });

  function clearLocalServiceWorkers() {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(
        registrations.map((registration) => registration.unregister())
      ))
      .catch((error) => {
        console.warn('Service worker local nao removido:', error);
      });

    if (!('caches' in window)) return;

    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch((error) => {
        console.warn('Caches locais nao removidos:', error);
      });
  }
})();
