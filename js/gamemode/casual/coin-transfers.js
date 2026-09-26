(function setupCasualCoinTransfers(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CoupCasualCoinTransfers = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCasualCoinTransfers(root) {
  const COIN_IMAGES = Object.freeze({
    silver: 'assets/img/coins/moeda-prata.png',
    gold: 'assets/img/coins/moeda-ouro.png'
  });
  const TIMING = Object.freeze({ duration: 850, stagger: 110, cleanup: 160 });
  const activeGhosts = new Set();
  let batchId = 0;

  function coinsForAction(type, amount) {
    const value = Math.max(0, Math.round(Number(amount) || 0));
    if (type !== 'coup') return Array(value).fill('silver');
    return [
      ...Array(Math.floor(value / 5)).fill('gold'),
      ...Array(value % 5).fill('silver')
    ];
  }

  function planQuickAction(type, actorPid, targetPid, coupCost = 7) {
    switch (type) {
      case 'coup':
        return {
          from: { kind: 'player', pid: actorPid },
          to: { kind: 'treasury' },
          coins: coinsForAction(type, coupCost)
        };
      case 'assassinate':
        return {
          from: { kind: 'player', pid: actorPid },
          to: { kind: 'treasury' },
          coins: coinsForAction(type, 3)
        };
      case 'tax':
        return {
          from: { kind: 'treasury' },
          to: { kind: 'player', pid: actorPid },
          coins: coinsForAction(type, 3)
        };
      case 'steal':
        return {
          from: { kind: 'player', pid: targetPid },
          to: { kind: 'player', pid: actorPid },
          coins: coinsForAction(type, 2)
        };
      default:
        return null;
    }
  }

  function playerCoinElement(pid) {
    return root.document?.querySelector?.(`#player-${pid} .coin-readout img`) || null;
  }

  function treasuryCoinElement(denomination, unitIndex = 0) {
    if (!root.document) return null;
    const selector = denomination === 'gold'
      ? '#treasurySource [data-coin-value="5"]'
      : '#treasurySource [data-coin-value="1"]';
    const coins = Array.from(root.document.querySelectorAll(selector));
    return coins.length ? coins[unitIndex % coins.length] : root.document.getElementById('treasurySource');
  }

  function elementFor(endpoint, denomination, unitIndex) {
    return endpoint?.kind === 'treasury'
      ? treasuryCoinElement(denomination, unitIndex)
      : playerCoinElement(endpoint?.pid);
  }

  function snapshot(element) {
    if (!element?.getBoundingClientRect) return null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function cancel() {
    batchId += 1;
    activeGhosts.forEach((ghost) => {
      ghost.getAnimations?.().forEach((animation) => animation.cancel());
      ghost.remove();
    });
    activeGhosts.clear();
    root.document?.querySelectorAll?.('.is-casual-coin-transfer-target').forEach((node) => {
      node.classList.remove('is-casual-coin-transfer-target');
    });
  }

  function play(transfer) {
    if (!transfer?.coins?.length || !root.document) return;
    cancel();
    const currentBatchId = batchId;
    if (root.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || typeof root.Element === 'undefined' || !root.Element.prototype.animate) return;

    const targetReadout = transfer.to?.kind === 'player'
      ? root.document.querySelector(`#player-${transfer.to.pid} .coin-readout`)
      : root.document.getElementById('treasurySource');
    targetReadout?.classList.add('is-casual-coin-transfer-target');

    transfer.coins.forEach((denomination, index) => {
      const source = snapshot(elementFor(transfer.from, denomination, index));
      const destination = snapshot(elementFor(transfer.to, denomination, index));
      if (!source || !destination) return;

      const ghost = root.document.createElement('img');
      ghost.className = `casual-coin-transfer-ghost is-${denomination}`;
      ghost.alt = '';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.src = COIN_IMAGES[denomination] || COIN_IMAGES.silver;
      root.document.body.appendChild(ghost);
      activeGhosts.add(ghost);

      const delay = index * TIMING.stagger;
      const duration = TIMING.duration;
      const size = Math.max(16, Math.min(26, destination.width));
      const fromLeft = source.left + (source.width - size) / 2;
      const fromTop = source.top + (source.height - size) / 2;
      const toLeft = destination.left + (destination.width - size) / 2;
      const toTop = destination.top + (destination.height - size) / 2;
      const arc = 18 + (index % 3) * 5;
      const animation = ghost.animate([
        {
          left: `${fromLeft}px`, top: `${fromTop}px`, width: `${size}px`, height: `${size}px`,
          transform: 'rotate(0deg) scale(0.88)', opacity: 0.92
        },
        {
          left: `${(fromLeft + toLeft) / 2}px`, top: `${Math.min(fromTop, toTop) - arc}px`,
          width: `${size}px`, height: `${size}px`,
          transform: `rotate(${index % 2 ? 150 : -150}deg) scale(1.08)`, opacity: 1, offset: 0.5
        },
        {
          left: `${toLeft}px`, top: `${toTop}px`, width: `${size}px`, height: `${size}px`,
          transform: 'rotate(300deg) scale(0.92)', opacity: 1
        }
      ], {
        duration,
        delay,
        easing: 'cubic-bezier(0.2, 0.78, 0.24, 1)',
        fill: 'both'
      });

      let removed = false;
      const finish = () => {
        if (removed) return;
        removed = true;
        ghost.remove();
        activeGhosts.delete(ghost);
      };
      animation.addEventListener('finish', finish, { once: true });
      animation.addEventListener('cancel', finish, { once: true });
      root.setTimeout?.(finish, delay + duration + 120);
    });

    const total = Math.max(0, transfer.coins.length - 1) * TIMING.stagger + TIMING.duration;
    root.setTimeout?.(() => {
      if (currentBatchId !== batchId) return;
      targetReadout?.classList.remove('is-casual-coin-transfer-target');
    }, total + TIMING.cleanup);
  }

  return Object.freeze({ coinsForAction, planQuickAction, play, cancel });
});
