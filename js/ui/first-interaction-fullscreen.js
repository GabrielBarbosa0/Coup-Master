(function setupFirstInteractionFullscreen() {
  const page = document.documentElement;
  if (typeof page.requestFullscreen !== 'function' || document.fullscreenEnabled === false) return;

  function stopListening() {
    document.removeEventListener('click', onFirstInteraction, true);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  }

  function onFullscreenChange() {
    if (document.fullscreenElement) stopListening();
  }

  function onFirstInteraction(event) {
    if (!event.isTrusted) return;
    stopListening();

    // Let the existing fullscreen button handle its own first click.
    if (event.target.closest?.('#fullscreenBtn, #rankFullscreenBtn')) return;
    if (document.fullscreenElement || window.matchMedia('(display-mode: fullscreen)').matches) return;

    try {
      const request = page.requestFullscreen();
      request?.catch(() => {});
    } catch {
      // Unsupported or denied fullscreen must not interrupt the player's action.
    }
  }

  document.addEventListener('click', onFirstInteraction, true);
  document.addEventListener('fullscreenchange', onFullscreenChange);
})();
