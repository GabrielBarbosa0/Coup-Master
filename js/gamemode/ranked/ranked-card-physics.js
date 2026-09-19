(function initializeRankedCardPhysics(root) {
    // Shared by ranked/personalized: casual spring physics, without drop actions or game-state writes.
    const PHYSICS = {
        spring: 0.18,
        damping: 0.86,
        lag: 0.28,
        swing: 0.18,
        tilt: 46,
        lift: 36,
        repelForce: 72,
        repelRadius: 178,
        friction: 0.88
    };
    const REFERENCE_CARD_WIDTH = 150;
    let drag = null;
    let frame = null;
    let lastTime = 0;

    function sourceFor(key) {
        return Array.from(document.querySelectorAll('#rankPlayers [data-rank-drag-key]'))
            .find(card => card.dataset.rankDragKey === key);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function scaledPhysics(rect) {
        const scale = clamp((rect?.width || REFERENCE_CARD_WIDTH) / REFERENCE_CARD_WIDTH, 0.32, 1);
        const angularScale = clamp(0.48 + scale * 0.52, 0.55, 1);
        return {
            ...PHYSICS,
            lift: PHYSICS.lift * scale,
            repelForce: PHYSICS.repelForce * scale,
            repelRadius: PHYSICS.repelRadius * scale,
            swing: PHYSICS.swing * angularScale,
            tilt: PHYSICS.tilt * angularScale
        };
    }

    function median(values) {
        if (!values.length) return null;
        const sorted = values.slice().sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }

    function resetTargets(targets = []) {
        targets.forEach(target => {
            target.element.classList.remove('is-rank-physics-target');
            target.element.style.removeProperty('--rank-repel-x');
            target.element.style.removeProperty('--rank-repel-y');
            target.element.style.removeProperty('--rank-repel-rotation');
        });
    }

    function createTargets(source, physics) {
        const hand = source.closest('.rank-opponent-hand');
        if (!hand) return { targets: [], repelRadius: physics.repelRadius };
        const cards = Array.from(hand.querySelectorAll('[data-rank-drag-key]'))
            .filter(card => card.offsetParent !== null);
        const centers = cards.map(card => {
            const rect = card.getBoundingClientRect();
            return rect.left + rect.width / 2;
        }).sort((a, b) => a - b);
        const centerGap = median(centers.slice(1).map((center, index) => center - centers[index]).filter(gap => gap > 1));
        const repelRadius = centerGap ? Math.min(physics.repelRadius, centerGap * 2.15) : physics.repelRadius;
        const targets = cards.filter(card => card !== source).map(element => ({
            element,
            baseRect: element.getBoundingClientRect(),
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            pushX: 0,
            pushY: 0,
            angle: 0,
            angleVelocity: 0,
            isRepelled: false
        }));
        return { targets, repelRadius };
    }

    function applyRepulsion(d, delta) {
        const targets = d.targets || [];
        if (!targets.length) return;
        const centerX = d.x + d.width / 2;
        const centerY = d.y + d.height / 2;
        targets.forEach(target => {
            const targetX = target.baseRect.left + target.x + target.baseRect.width / 2;
            const targetY = target.baseRect.top + target.y + target.baseRect.height / 2;
            const dx = targetX - centerX;
            const dy = targetY - centerY;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const overlap = Math.max(0, d.physics.repelRadius - distance);
            const strength = overlap > 0 ? (overlap / d.physics.repelRadius) * d.physics.repelForce : 0;
            target.isRepelled = overlap > 0;
            target.pushX = strength ? (dx / distance) * strength : 0;
            target.pushY = strength ? (dy / distance + (dy < 0 ? -0.38 : 0.38)) * strength * 0.55 : 0;
            target.vx = (target.vx + (target.pushX - target.x) * d.physics.spring)
                * d.physics.damping * d.physics.friction;
            target.vy = (target.vy + (target.pushY - target.y) * d.physics.spring)
                * d.physics.damping * d.physics.friction;
            target.x += target.vx * delta;
            target.y += target.vy * delta;
            const targetAngle = clamp(target.vx * d.physics.swing, -d.physics.tilt, d.physics.tilt)
                + target.pushX * 0.035;
            target.angleVelocity = (target.angleVelocity + (targetAngle - target.angle) * 0.16) * 0.78;
            target.angle += target.angleVelocity * delta;
            const active = target.isRepelled || Math.abs(target.x) > 0.25 || Math.abs(target.y) > 0.25
                || Math.abs(target.vx) > 0.2 || Math.abs(target.vy) > 0.2;
            target.element.classList.toggle('is-rank-physics-target', active);
            target.element.style.setProperty('--rank-repel-x', `${target.x.toFixed(2)}px`);
            target.element.style.setProperty('--rank-repel-y', `${target.y.toFixed(2)}px`);
            target.element.style.setProperty('--rank-repel-rotation', `${target.angle.toFixed(2)}deg`);
        });
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
        resetTargets(previous.targets);
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
        const spring = d.returning ? d.physics.spring * 0.62 : d.physics.spring;
        const damping = d.returning ? 0.72 : d.physics.damping;
        d.vx = (d.vx + (d.tx - d.x) * spring) * damping;
        d.vy = (d.vy + (d.ty - d.y) * spring) * damping;
        d.x += d.vx * delta;
        d.y += d.vy * delta;
        const tilt = d.returning ? 0 : clamp(d.vx * d.physics.swing, -d.physics.tilt, d.physics.tilt);
        d.angleVelocity = (d.angleVelocity + (tilt - d.angle) * 0.16) * 0.78;
        d.angle += d.angleVelocity * delta;
        d.ghost.style.transform = `translate3d(${d.x}px, ${d.y}px, 0) rotate(${d.angle}deg)`;
        if (!d.returning) applyRepulsion(d, delta);
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
        const physics = scaledPhysics(rect);
        const physicsSetup = createTargets(d.source, physics);
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
            lift: physics.lift,
            width: rect.width,
            height: rect.height,
            physics: { ...physics, repelRadius: physicsSetup.repelRadius },
            targets: physicsSetup.targets
        });
        ghost.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
        frame = root.requestAnimationFrame(tick);
    }

    function returnToHand() {
        if (!drag) return;
        if (!drag.ghost || root.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
        drag.returning = true;
        drag.returnStarted = root.performance.now();
        resetTargets(drag.targets);
        drag.targets = [];
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
        activate();
    });
    root.addEventListener('pointermove', event => {
        if (!drag || drag.returning || event.pointerId !== drag.pointerId) return;
        drag.pointerX = event.clientX;
        drag.pointerY = event.clientY;
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
