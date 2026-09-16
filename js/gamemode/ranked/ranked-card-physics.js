(function initializeRankedCardPhysics(root) {
    // Shared by ranked/personalized: casual spring physics, without drop actions or game-state writes.
    const PHYSICS = { spring: 0.18, damping: 0.86, lag: 0.28, swing: 0.18, tilt: 46 };
    let drag = null;
    let frame = null;
    let lastTime = 0;

    function sourceFor(key) {
        return Array.from(document.querySelectorAll('#rankPlayers [data-rank-drag-key]'))
            .find(card => card.dataset.rankDragKey === key);
    }

    function releasePointer(pointerId) {
        const host = document.documentElement;
        if (host.hasPointerCapture(pointerId)) host.releasePointerCapture(pointerId);
    }

    function finish() {
        const previous = drag;
        drag = null;
        if (frame !== null) root.cancelAnimationFrame(frame);
        frame = null;
        lastTime = 0;
        if (!previous) return;
        previous.source.classList.remove('is-rank-drag-source');
        sourceFor(previous.key)?.classList.remove('is-rank-drag-source');
        previous.ghost?.remove();
        document.body.classList.remove('is-rank-card-dragging');
        releasePointer(previous.pointerId);
    }

    function sync() {
        if (!drag?.ghost) return;
        const source = sourceFor(drag.key);
        // A revealed/replaced card must not leave an outdated copy floating over the table.
        if (!source || source.querySelector('img')?.src !== drag.image
            || source.classList.contains('is-revealed') !== drag.revealed) {
            finish();
            return;
        }
        drag.source = source;
        source.classList.add('is-rank-drag-source');
    }

    function tick(now) {
        frame = null;
        sync();
        if (!drag?.ghost) return;
        const d = drag;
        const delta = lastTime ? Math.min(2.2, (now - lastTime) / 16.667) : 1;
        lastTime = now;
        if (d.returning) {
            const rect = d.source.getBoundingClientRect();
            d.tx = rect.left;
            d.ty = rect.top;
            d.ghost.style.width = `${rect.width}px`;
            d.ghost.style.height = `${rect.height}px`;
        } else {
            d.tx += (d.pointerX - d.offsetX - d.tx) * PHYSICS.lag;
            d.ty += (d.pointerY - d.offsetY - d.lift - d.ty) * PHYSICS.lag;
        }
        const spring = d.returning ? PHYSICS.spring * 0.62 : PHYSICS.spring;
        const damping = d.returning ? 0.72 : PHYSICS.damping;
        d.vx = (d.vx + (d.tx - d.x) * spring) * damping;
        d.vy = (d.vy + (d.ty - d.y) * spring) * damping;
        d.x += d.vx * delta;
        d.y += d.vy * delta;
        const tilt = d.returning ? 0 : Math.max(-PHYSICS.tilt, Math.min(PHYSICS.tilt, d.vx * PHYSICS.swing));
        d.angleVelocity = (d.angleVelocity + (tilt - d.angle) * 0.16) * 0.78;
        d.angle += d.angleVelocity * delta;
        d.ghost.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) rotate(${d.angle}deg)`;
        if (d.returning && ((Math.hypot(d.tx - d.x, d.ty - d.y) < 1.4
            && Math.hypot(d.vx, d.vy) < 0.7 && Math.abs(d.angle) < 0.8)
            || now - d.returnStarted > 1800)) {
            finish();
            return;
        }
        frame = root.requestAnimationFrame(tick);
    }

    function activate() {
        const d = drag;
        if (!d || !d.source.isConnected) { finish(); return; }
        d.source.classList.remove('is-tilting');
        d.source.classList.add('is-rank-drag-source');
        const rect = d.source.getBoundingClientRect();
        const ghost = d.source.cloneNode(true);
        ghost.className = 'rank-card rank-card-drag-ghost';
        ghost.removeAttribute('id');
        ghost.removeAttribute('data-rank-drag-key');
        ghost.removeAttribute('style');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.inert = true;
        Object.assign(ghost.style, { width: `${rect.width}px`, height: `${rect.height}px` });
        if (d.revealed) ghost.classList.add('is-revealed');
        document.body.append(ghost);
        document.body.classList.add('is-rank-card-dragging');
        Object.assign(d, {
            ghost, x: rect.left, y: rect.top, tx: rect.left, ty: rect.top,
            vx: 0, vy: 0, angle: 0, angleVelocity: 0,
            offsetX: Math.max(0, Math.min(rect.width, d.startX - rect.left)),
            offsetY: Math.max(0, Math.min(rect.height, d.startY - rect.top)),
            lift: 36 * rect.width / 150
        });
        ghost.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
        frame = root.requestAnimationFrame(tick);
    }

    function returnToHand() {
        if (!drag) return;
        if (!drag.ghost || root.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
        drag.returning = true;
        drag.returnStarted = root.performance.now();
        releasePointer(drag.pointerId);
    }

    document.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary || drag) return;
        const source = event.target.closest('#rankPlayers .rank-opponent-hand [data-rank-drag-key]');
        if (!source) return;
        drag = {
            source, key: source.dataset.rankDragKey, pointerId: event.pointerId,
            startX: event.clientX, startY: event.clientY,
            pointerX: event.clientX, pointerY: event.clientY,
            image: source.querySelector('img')?.src,
            revealed: source.classList.contains('is-revealed')
        };
        document.documentElement.setPointerCapture(event.pointerId);
    });
    root.addEventListener('pointermove', event => {
        if (!drag || drag.returning || event.pointerId !== drag.pointerId) return;
        drag.pointerX = event.clientX;
        drag.pointerY = event.clientY;
        if (!drag.ghost && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 6) activate();
        if (drag?.ghost) event.preventDefault();
    }, { passive: false });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        root.addEventListener(type, event => {
            if (drag && !drag.returning && event.pointerId === drag.pointerId) returnToHand();
        });
    }
    root.addEventListener('blur', returnToHand);
    root.addEventListener('pagehide', finish);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') returnToHand(); });
    root.CoupRankedCardPhysics = Object.freeze({ sync, cancel: finish });
})(window);
