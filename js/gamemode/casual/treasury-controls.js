(function setupCasualTreasuryControls(root) {
  const DRAG_THRESHOLD = 5;
  const REFERENCE_CARD_WIDTH = 150;
  const PHYSICS = Object.freeze({
    spring: 0.18,
    damping: 0.86,
    lag: 0.28,
    swing: 0.18,
    tilt: 46,
    lift: 36,
    invalidReturnSpring: 0.035,
    validReturnSpring: 0.068,
    invalidReturnDamping: 0.86,
    validReturnDamping: 0.82,
    maxReturnMs: 1800
  });
  let config = {};
  let drag = null;
  let frame = null;
  let lastTime = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function scaledPhysics(rect) {
    const scale = clamp((rect?.width || REFERENCE_CARD_WIDTH) / REFERENCE_CARD_WIDTH, 0.32, 1);
    const angularScale = clamp(0.48 + scale * 0.52, 0.55, 1);
    return {
      ...PHYSICS,
      lift: PHYSICS.lift * scale,
      swing: PHYSICS.swing * angularScale,
      tilt: PHYSICS.tilt * angularScale
    };
  }

  function now() {
    return root.performance?.now?.() ?? Date.now();
  }

  function getCoins() {
    return Array.from(document.querySelectorAll('#treasurySource [data-coin-value]'));
  }

  function getPlayerSlots() {
    return Array.from(document.querySelectorAll('.player-area[data-player]:not(.is-empty)'))
      .filter((slot) => slot.getClientRects?.().length !== 0);
  }

  function findDropTargetFromSlots(slots, x, y) {
    const slot = slots.find((candidate) => pointInside(candidate.getBoundingClientRect(), x, y));
    if (!slot) return null;

    const pid = Number(slot.dataset.player);
    const readout = slot.querySelector('.coin-readout');
    return Number.isInteger(pid) && pid > 0 && readout ? { pid, slot, readout } : null;
  }

  function getDropTarget(x, y) {
    return findDropTargetFromSlots(getPlayerSlots(), x, y);
  }

  function clearTargetClasses(target) {
    target?.readout?.classList.remove(
      'is-treasury-drop-target',
      'is-treasury-drop-valid',
      'is-treasury-drop-hover'
    );
  }

  function setDragTarget(target, isHover = false) {
    if (!drag || drag.target?.slot === target?.slot) {
      drag?.target?.readout?.classList.toggle('is-treasury-drop-hover', Boolean(target && isHover));
      return;
    }

    clearTargetClasses(drag.target);
    drag.target = target;
    target?.readout?.classList.add('is-treasury-drop-target');
    target?.readout?.classList.toggle('is-treasury-drop-hover', isHover);
  }

  function resetTilt(coin) {
    coin.classList.remove('is-tilting');
    coin.style.removeProperty('--treasury-tilt-x');
    coin.style.removeProperty('--treasury-tilt-y');
    coin.style.removeProperty('--treasury-glow-x');
    coin.style.removeProperty('--treasury-glow-y');
  }

  function finish(credit = false) {
    const completed = drag;
    drag = null;
    if (frame !== null) root.cancelAnimationFrame(frame);
    frame = null;
    lastTime = 0;
    completed?.ghost?.remove();
    if (credit) respawnSourceCoin(completed?.source);
    completed?.source?.classList.remove('is-treasury-drag-source');
    clearTargetClasses(completed?.target);
    document.body.classList.remove('is-treasury-coin-dragging');

    if (credit && completed) {
      const pid = completed.target?.pid;
      if (pid && typeof config.updateScore === 'function') {
        config.updateScore(pid, completed.value);
      }
    }
  }

  function tick(timestamp) {
    frame = null;
    if (!drag?.ghost) return;

    const d = drag;
    const delta = lastTime ? Math.min(2.2, (timestamp - lastTime) / 16.667) : 1;
    lastTime = timestamp;

    if (d.returning) {
      const destination = d.credit
        ? d.target?.readout?.getBoundingClientRect()
        : d.source.getBoundingClientRect();
      if (destination) {
        d.tx = destination.left + (destination.width - d.width) / 2;
        d.ty = destination.top + (destination.height - d.height) / 2;
      }
    } else {
      d.tx += (d.pointerX - d.offsetX - d.tx) * d.physics.lag;
      d.ty += (d.pointerY - d.offsetY - d.lift - d.ty) * d.physics.lag;
    }

    const spring = d.returning
      ? (d.credit ? d.physics.validReturnSpring : d.physics.invalidReturnSpring)
      : d.physics.spring;
    const damping = d.returning
      ? (d.credit ? d.physics.validReturnDamping : d.physics.invalidReturnDamping)
      : d.physics.damping;
    d.vx = (d.vx + (d.tx - d.x) * spring) * damping;
    d.vy = (d.vy + (d.ty - d.y) * spring) * damping;
    d.x += d.vx * delta;
    d.y += d.vy * delta;

    const targetAngle = d.returning ? 0 : clamp(d.vx * d.physics.swing, -d.physics.tilt, d.physics.tilt);
    d.angleVelocity = (d.angleVelocity + (targetAngle - d.angle) * 0.16) * 0.78;
    d.angle += d.angleVelocity * delta;
    const depositVisual = d.returning && d.credit
      ? getDepositVisual(Math.hypot(d.tx - d.x, d.ty - d.y), d.returnDistance)
      : { opacity: 1, scale: 1 };
    d.ghost.style.opacity = depositVisual.opacity.toFixed(3);
    d.ghost.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) rotate(${d.angle}deg) scale(${depositVisual.scale.toFixed(3)})`;

    const settled = Math.hypot(d.tx - d.x, d.ty - d.y) < 1.2
      && Math.hypot(d.vx, d.vy) < 0.55
      && Math.abs(d.angle) < 0.8;
    if (d.returning && (settled || timestamp - d.returnStarted > d.physics.maxReturnMs)) {
      finish(d.credit);
      return;
    }
    frame = root.requestAnimationFrame(tick);
  }

  function activate() {
    if (!drag || drag.active) return;
    const rect = drag.source.getBoundingClientRect();
    const physics = scaledPhysics(rect);
    const ghost = drag.source.cloneNode(true);
    ghost.className = 'treasury-coin-drag-ghost';
    ghost.removeAttribute('data-coin-value');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` });
    document.body.appendChild(ghost);

    Object.assign(drag, {
      active: true,
      ghost,
      x: rect.left,
      y: rect.top,
      tx: rect.left,
      ty: rect.top,
      vx: 0,
      vy: 0,
      angle: 0,
      angleVelocity: 0,
      offsetX: drag.startX - rect.left,
      offsetY: drag.startY - rect.top,
      pointerX: drag.startX,
      pointerY: drag.startY,
      lift: physics.lift,
      width: rect.width,
      height: rect.height,
      physics,
      sourceRect: rect,
      target: null
    });
    drag.source.classList.add('is-treasury-drag-source');
    document.body.classList.add('is-treasury-coin-dragging');
    ghost.style.transform = `translate3d(${drag.x}px, ${drag.y}px, 0)`;
    frame = root.requestAnimationFrame(tick);
  }

  function pointInside(rect, x, y) {
    return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function getCoinValue(coin) {
    return Math.max(1, Number(coin?.dataset?.coinValue) || 1);
  }

  function getDepositVisual(distance, totalDistance) {
    const progress = clamp(1 - distance / Math.max(1, totalDistance), 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    return {
      opacity: 1 - eased * 0.92,
      scale: 1 - eased * 0.38
    };
  }

  function respawnSourceCoin(coin) {
    if (!coin?.isConnected) return;
    const respawnId = String(now());
    coin.dataset.treasuryRespawnId = respawnId;
    coin.classList.remove('is-treasury-respawning');
    void coin.offsetWidth;
    coin.classList.add('is-treasury-respawning');
    const clearRespawn = () => {
      if (coin.dataset.treasuryRespawnId !== respawnId) return;
      coin.classList.remove('is-treasury-respawning');
      delete coin.dataset.treasuryRespawnId;
    };
    coin.addEventListener('animationend', clearRespawn, { once: true });
    root.setTimeout?.(clearRespawn, 560);
  }

  function release(event) {
    if (!drag || drag.returning || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      finish(false);
      return;
    }

    setDragTarget(getDropTarget(event.clientX, event.clientY), true);
    const targetRect = drag.target?.readout?.getBoundingClientRect();
    const credit = Boolean(drag.target);
    const destination = credit && targetRect ? targetRect : drag.source.getBoundingClientRect();
    drag.credit = credit;
    drag.returning = true;
    drag.returnStarted = now();
    const releaseVelocityRetention = credit ? 0.5 : 0.25;
    drag.vx *= releaseVelocityRetention;
    drag.vy *= releaseVelocityRetention;
    drag.tx = destination.left + (destination.width - drag.width) / 2;
    drag.ty = destination.top + (destination.height - drag.height) / 2;
    drag.returnDistance = Math.max(1, Math.hypot(drag.tx - drag.x, drag.ty - drag.y));
    drag.target?.readout?.classList.toggle('is-treasury-drop-valid', credit);
  }

  function bindCoin(coin) {
    if (coin.dataset.treasuryBound === 'true') return;
    coin.dataset.treasuryBound = 'true';

    coin.addEventListener('pointermove', (event) => {
      if (drag || event.pointerType === 'touch') return;
      const rect = coin.getBoundingClientRect();
      const x = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
      const y = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
      coin.style.setProperty('--treasury-tilt-x', `${(-y * 14).toFixed(2)}deg`);
      coin.style.setProperty('--treasury-tilt-y', `${(x * 14).toFixed(2)}deg`);
      coin.style.setProperty('--treasury-glow-x', `${(-x * 6).toFixed(2)}px`);
      coin.style.setProperty('--treasury-glow-y', `${(-y * 6).toFixed(2)}px`);
      coin.classList.add('is-tilting');
    });
    coin.addEventListener('pointerleave', () => resetTilt(coin));
    coin.addEventListener('pointercancel', () => resetTilt(coin));
    coin.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !event.isPrimary || drag || getPlayerSlots().length === 0) return;
      event.preventDefault();
      coin.classList.remove('is-treasury-respawning');
      resetTilt(coin);
      drag = {
        source: coin,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        pointerX: event.clientX,
        pointerY: event.clientY,
        value: getCoinValue(coin),
        active: false,
        returning: false
      };
      coin.setPointerCapture?.(event.pointerId);
    });
  }

  function onPointerMove(event) {
    if (!drag || drag.returning || event.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD) {
      activate();
    }
    if (!drag?.active) return;
    drag.pointerX = event.clientX;
    drag.pointerY = event.clientY;
    const target = getDropTarget(event.clientX, event.clientY);
    drag.canDrop = Boolean(target);
    setDragTarget(target, drag.canDrop);
    event.preventDefault();
  }

  function refreshLabels() {
    const title = root.CoupLanguage?.t?.('casual.treasury') || 'Tesouro Central';
    document.getElementById('treasuryArea')?.setAttribute('title', title);
  }

  function setup(options = {}) {
    config = options;
    getCoins().forEach(bindCoin);
    refreshLabels();
  }

  root.addEventListener('pointermove', onPointerMove, { passive: false });
  root.addEventListener('pointerup', release);
  root.addEventListener('pointercancel', release);
  root.addEventListener('blur', () => finish(false));
  root.addEventListener('pagehide', () => finish(false));
  root.addEventListener('coup:languagechange', refreshLabels);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish(false);
  });

  root.CoupTreasuryControls = Object.freeze({
    setup,
    refresh: () => getCoins().forEach(bindCoin),
    cancel: finish,
    pointInside,
    findDropTargetFromSlots,
    getCoinValue,
    getDepositVisual,
    physics: PHYSICS
  });
})(window);
