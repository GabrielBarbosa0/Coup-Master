(function setupCasualDeal(root) {
  const DURATION = 680;
  const STAGGER = 120;
  const active = new Map();
  let initialized = false;
  let lastEventId = null;
  let bound = false;
  let config = {};

  // Pure transaction updater: retries always re-evaluate the current hands.
  function applyDeal(state, eventId) {
    if (!state?.players || !Array.isArray(state.deck) || !state.deck.length) return;
    const recipients = Object.keys(state.players).filter((pid) => {
      const player = state.players[pid];
      // The slot stays occupied across transient disconnects; online can be stale.
      return player?.uid && Number(pid) >= 1 && Number(pid) <= 8;
    }).sort((a, b) => Number(a) - Number(b));
    const cards = [];
    for (let round = 0; round < 2; round++) {
      for (const pid of recipients) {
        const player = state.players[pid];
        if ((player.hand || []).length >= 2 || !state.deck.length) continue;
        const card = state.deck.pop();
        card.owner = Number(pid);
        card.location = `player-${pid}`;
        card.visible = false;
        if (!player.hand) player.hand = [];
        player.hand.push(card);
        cards.push({ id: card.id, pid: Number(pid) });
      }
    }
    if (!cards.length) return;
    state.lastDeal = { id: eventId, cards };
    return state;
  }

  function applySingleDraw(state, eventId, targetPid) {
    const pid = Number(targetPid);
    const player = state?.players?.[pid];
    if (!player?.uid || !Array.isArray(state.deck) || !state.deck.length) return;
    const card = state.deck.pop();
    card.owner = pid;
    card.location = `player-${pid}`;
    card.visible = false;
    if (!player.hand) player.hand = [];
    player.hand.push(card);
    state.lastDeal = { id: eventId, cards: [{ id: card.id, pid }] };
    return state;
  }

  function findElement(id) {
    return Array.from(document.querySelectorAll('[data-hand] [data-card-id]'))
      .find((element) => element.dataset.cardId === String(id));
  }

  function finish(id) {
    const entry = active.get(id);
    if (!entry) return;
    active.delete(id);
    entry.animation?.cancel();
    entry.ghost?.remove();
    const element = findElement(id);
    element?.style.removeProperty('visibility');
  }

  function cancelAll() {
    Array.from(active.keys()).forEach(finish);
  }

  function fly(id, index) {
    const entry = active.get(id);
    if (!entry || entry.animation) return;
    const element = findElement(id);
    const source = document.getElementById('deck')?.getBoundingClientRect();
    const target = element?.getBoundingClientRect();
    if (!source?.width || !target?.width || typeof element.animate !== 'function') {
      finish(id);
      return;
    }
    const style = root.getComputedStyle(element);
    const ghost = document.createElement('div');
    ghost.className = 'card-return-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      left: `${target.left}px`, top: `${target.top}px`,
      width: `${target.width}px`, height: `${target.height}px`,
      border: style.border, borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      backgroundImage: "url('./assets/img/cards/base/back.png')",
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      backgroundRepeat: 'no-repeat'
    });
    document.body.appendChild(ghost);
    entry.ghost = ghost;
    const x = source.left + source.width / 2 - target.left - target.width / 2;
    const y = source.top + source.height / 2 - target.top - target.height / 2;
    const scale = source.width / target.width;
    const direction = x < 0 ? -1 : 1;
    entry.animation = ghost.animate([
      { transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(0deg)`, opacity: 1, offset: 0.03 },
      { transform: `translate(${x * 1.035}px, ${y * 1.035}px) scale(${scale}) rotate(${direction * -5}deg)`, offset: 0.12 },
      { transform: `translate(${-x * 0.035}px, ${-y * 0.035}px) scale(1) rotate(${direction * 3}deg)`, offset: 0.72 },
      { transform: `translate(${x * 0.012}px, ${y * 0.012}px) scale(1) rotate(${direction * -1}deg)`, offset: 0.88 },
      { transform: 'translate(0, 0) scale(1) rotate(0deg)' }
    ], {
      duration: DURATION, delay: index * STAGGER,
      easing: 'ease-in-out', fill: 'both'
    });
    const finishFlight = () => {
      if (active.get(id) === entry) finish(id);
    };
    entry.animation.finished.then(finishFlight, finishFlight);
  }

  function render(state) {
    const event = state.lastDeal;
    if (!initialized) {
      initialized = true;
      lastEventId = event?.id || null;
      return;
    }
    if ((event?.id || null) !== lastEventId) {
      cancelAll();
      lastEventId = event?.id || null;
      if (event && !document.hidden && !root.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        (event.cards || []).forEach((card) => active.set(String(card.id), { pid: card.pid }));
        // Fan layout is scheduled by the renderer before these destination measurements.
        root.requestAnimationFrame(() => Array.from(active.keys()).forEach(fly));
      }
    }
    for (const [id, entry] of active) {
      const element = findElement(id);
      if (!element || !element.closest(`#player-${entry.pid}`)) finish(id);
      else element.style.visibility = 'hidden';
    }
  }

  function onKeyDown(event) {
    if (event.key?.toLowerCase() !== 'd' || event.repeat || event.defaultPrevented
      || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.isComposing) return;
    if (event.target?.isContentEditable
      || event.target?.closest?.('input, textarea, select, [role="textbox"]')) return;
    const hasModal = Array.from(document.querySelectorAll('.modal-overlay, [role="dialog"], #loadingOverlay'))
      .some((element) => !element.hidden && element.getClientRects().length
        && root.getComputedStyle(element).visibility !== 'hidden');
    if (hasModal || active.size || document.querySelector('.is-dragging, .is-compatible-drag-source')
      || !config.canDeal?.()) return;
    event.preventDefault();
    config.deal?.();
  }

  function setup(options) {
    config = options;
    if (bound) return;
    bound = true;
    document.addEventListener('keydown', onKeyDown);
    root.addEventListener('resize', cancelAll);
    root.addEventListener('scroll', cancelAll, true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAll();
    });
  }

  root.CoupCasualDeal = { applyDeal, applySingleDraw, setup, render };
})(window);
