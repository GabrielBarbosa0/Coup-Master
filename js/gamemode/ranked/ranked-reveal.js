(function initializeRankedReveal(root) {
    const Rules = root.CoupPersonalizedRules || root.CoupRankedRules;
    let initialized = false;
    let lastId = null;
    let latest = null;
    let busy = false;
    let generation = 0;
    let overlay = null;
    let locked = [];
    let previousFocus = null;

    function eventTitle(event, role) {
        const name = event.playerName || latest?.players?.[event.playerUid]?.name || '';
        const roleName = root.CoupLanguage?.t?.(`ranked.roles.${event.role}`) || role.label;
        const templates = {
            proof: '{name} provou ter {role}',
            coup: '{name} tomou Golpe de Estado',
            assassination: '{name} sofreu um assassinato',
            concession: '{name} cedeu à contestação',
            challengeLoss: '{name} perdeu a contestação',
            loss: '{name} perdeu uma influência'
        };
        const kind = Object.hasOwn(templates, event.kind) ? event.kind : 'loss';
        const key = `rankedReveal.${kind}`;
        const translated = root.CoupLanguage?.t?.(key, { name, role: roleName });
        return translated && translated !== key ? translated
            : templates[kind].replace('{name}', name).replace('{role}', roleName);
    }

    function unlock() {
        overlay?.remove();
        overlay = null;
        locked.forEach(([node, inert]) => { node.inert = inert; });
        locked = [];
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        previousFocus = null;
    }

    async function animate(event, token, startsAt, timing) {
        const { durationMs: duration, holdMs: hold, fadeInMs: fadeIn, fadeOutMs: fadeOut } = timing;
        const total = fadeIn + duration + hold + fadeOut;
        const role = Rules.getRole(event.role);
        if (!role) return;
        const card = document.createElement('img');
        card.className = 'rank-reveal-card';
        card.src = 'assets/img/cards/base/back.png';
        card.alt = '';
        card.draggable = false;
        const title = document.createElement('h2');
        title.className = 'rank-reveal-title';
        title.id = 'rankRevealTitle';
        title.textContent = eventTitle(event, role);
        overlay.setAttribute('aria-labelledby', title.id);
        overlay.replaceChildren(title, card);
        const front = new Image();
        front.src = role.image;
        const reduced = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fade = overlay.animate([
            { opacity: 0, offset: 0 },
            { opacity: 1, offset: fadeIn / total },
            { opacity: 1, offset: (total - fadeOut) / total },
            { opacity: 0, offset: 1 }
        ], { duration: total, fill: 'both', easing: 'linear' });
        fade.pause();
        fade.currentTime = Math.max(0, Date.now() - startsAt);
        const transforms = [
            [0, 'translateY(0) rotateY(0deg) rotateZ(0deg) scale(1)'],
            [.18, 'translateY(-22px) rotateY(0deg) rotateZ(-1.5deg) scale(1.08)'],
            [.46, 'translateY(-42px) rotateY(90deg) rotateZ(1deg) scale(1.08)'],
            [.66, 'translateY(-30px) rotateY(10deg) rotateZ(.8deg) scale(1.08)'],
            [.82, 'translateY(-6px) rotateY(0deg) rotateZ(-.3deg) scale(1.02)'],
            [1, 'translateY(-4px) rotateY(0deg) rotateZ(0deg) scale(1)']
        ];
        const animation = reduced ? null : card.animate(transforms.map(([offset, transform]) => ({
            offset, transform, easing: 'cubic-bezier(.42, 0, .58, 1)'
        })), { duration, delay: fadeIn, fill: 'both' });
        animation?.pause();
        await new Promise((resolve) => {
            function frame() {
                if (token !== generation) { animation?.cancel(); fade.cancel(); resolve(); return; }
                const elapsed = Date.now() - startsAt;
                // Use the shared presentation clock, including delayed browser starts.
                fade.currentTime = Math.max(0, elapsed);
                if (animation) animation.currentTime = Math.max(0, elapsed);
                if (elapsed >= (reduced ? 0 : fadeIn + duration * .46)) {
                    card.src = role.image;
                    card.alt = root.CoupLanguage?.t?.(`ranked.roles.${event.role}`) || role.label;
                }
                if (elapsed >= total) { fade.cancel(); resolve(); }
                else root.requestAnimationFrame(frame);
            }
            frame();
        });
    }

    async function present(nextState, commit) {
        latest = nextState;
        const presentation = nextState?.revealPresentation;
        if (!initialized) {
            initialized = true;
            lastId = presentation?.id;
            commit(nextState);
            return;
        }
        if (busy) return;
        if (!presentation || presentation.id === lastId || presentation.endsAt <= Date.now()) {
            lastId = presentation?.id;
            commit(nextState);
            return;
        }
        lastId = presentation.id;
        busy = true;
        const token = ++generation;
        previousFocus = document.activeElement;
        locked = [...document.body.children].map((node) => [node, node.inert]);
        locked.forEach(([node]) => { node.inert = true; });
        overlay = document.createElement('div');
        overlay.className = 'rank-reveal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', root.CoupLanguage?.t?.('ranked.revealCard') || 'Revele uma carta');
        overlay.tabIndex = -1;
        document.body.append(overlay);
        overlay.focus({ preventScroll: true });
        try {
            const events = presentation.events || [];
            // Older in-flight presentations keep their original shared deadline.
            const timing = presentation.timing || { durationMs: 1200, holdMs: 420, fadeInMs: 0, fadeOutMs: 0 };
            const total = timing.durationMs + timing.holdMs + timing.fadeInMs + timing.fadeOutMs;
            const startsAt = presentation.endsAt - events.length * total;
            for (const [index, event] of events.entries()) {
                if (token !== generation) break;
                if (Date.now() >= startsAt + (index + 1) * total) continue;
                await animate(event, token, startsAt + index * total, timing);
            }
        } finally {
            unlock();
            busy = false;
            if (token === generation) present(latest, commit);
        }
    }

    root.addEventListener('pagehide', () => { generation++; unlock(); });
    root.CoupRankedReveal = Object.freeze({ present });
})(window);
