(function initializeRankedCoinTransfers(root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.CoupRankedCoinTransfers = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createRankedCoinTransfers(root) {
    const COIN_IMAGES = Object.freeze({
        silver: 'assets/img/coins/moeda-prata.png',
        gold: 'assets/img/coins/moeda-ouro.png'
    });
    const COIN_TRANSFER_TIMING = Object.freeze({ duration: 850, stagger: 110, settle: 160 });
    const activeGhosts = new Set();

    function playerBalances(state) {
        return new Map(Object.values(state?.players || {}).map((player) => [
            player.uid,
            Math.max(0, Number(player.coins) || 0)
        ]));
    }

    function planTransfers(previousState, nextState) {
        if (!previousState || !nextState) return [];
        const previous = playerBalances(previousState);
        const next = playerBalances(nextState);
        const gains = [];
        const losses = [];

        next.forEach((balance, uid) => {
            if (!previous.has(uid)) return;
            const delta = balance - previous.get(uid);
            if (delta > 0) gains.push({ uid, amount: delta });
            if (delta < 0) losses.push({ uid, amount: -delta });
        });

        const transfers = [];
        losses.forEach((loss) => {
            gains.forEach((gain) => {
                if (!loss.amount || !gain.amount) return;
                const amount = Math.min(loss.amount, gain.amount);
                transfers.push({
                    from: { kind: 'player', uid: loss.uid },
                    to: { kind: 'player', uid: gain.uid },
                    amount
                });
                loss.amount -= amount;
                gain.amount -= amount;
            });
        });

        gains.filter((gain) => gain.amount > 0).forEach((gain) => transfers.push({
            from: { kind: 'treasury' },
            to: { kind: 'player', uid: gain.uid },
            amount: gain.amount
        }));
        losses.filter((loss) => loss.amount > 0).forEach((loss) => {
            const isCoupPayment = nextState.pendingAction?.type === 'coup'
                && nextState.pendingAction.actorUid === loss.uid
                && nextState.pendingAction.id !== previousState.pendingAction?.id;
            transfers.push({
                from: { kind: 'player', uid: loss.uid },
                to: { kind: 'treasury' },
                amount: loss.amount,
                coins: isCoupPayment ? ['silver', 'silver', 'gold'] : Array(loss.amount).fill('silver')
            });
        });
        return transfers;
    }

    function treasuryElement() {
        return root.document?.querySelector?.('#rankTreasurySource img:last-child')
            || root.document?.getElementById?.('rankTreasurySource')
            || null;
    }

    function playerCoinElement(uid) {
        if (!root.document || !uid) return null;
        return Array.from(root.document.querySelectorAll('#rankPlayers [data-player-uid]'))
            .find((slot) => slot.dataset.playerUid === uid)
            ?.querySelector('.rank-coin-icon') || null;
    }

    function elementFor(endpoint) {
        return endpoint?.kind === 'treasury' ? treasuryElement() : playerCoinElement(endpoint?.uid);
    }

    function snapshot(element) {
        if (!element?.getBoundingClientRect) return null;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }

    function prepare(previousState, nextState) {
        const transfers = planTransfers(previousState, nextState);
        if (!transfers.length || !root.document) return null;
        return {
            transfers: transfers.map((transfer) => ({
                ...transfer,
                source: snapshot(elementFor(transfer.from))
            }))
        };
    }

    function cancel() {
        activeGhosts.forEach((ghost) => ghost.getAnimations?.().forEach((animation) => animation.cancel()));
        activeGhosts.clear();
        root.document?.querySelectorAll?.('.is-coin-transfer-target').forEach((node) => {
            node.classList.remove('is-coin-transfer-target');
        });
    }

    function play(batch) {
        if (!batch?.transfers?.length || !root.document) return;
        if (activeGhosts.size) cancel();
        if (root.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            || typeof root.Element === 'undefined' || !root.Element.prototype.animate) return;

        const coins = batch.transfers.flatMap((transfer) => {
            const denominations = transfer.coins || Array(Math.max(0, Math.round(transfer.amount))).fill('silver');
            return denominations.map((denomination, unitIndex) => ({ transfer, denomination, unitIndex }));
        });

        coins.forEach(({ transfer, denomination, unitIndex }, index) => {
            const targetElement = elementFor(transfer.to);
            const destination = snapshot(targetElement);
            const source = transfer.source;
            if (!source || !destination) return;

            targetElement.classList.add('is-coin-transfer-target');
            const ghost = root.document.createElement('img');
            ghost.className = 'rank-coin-transfer-ghost';
            ghost.alt = '';
            ghost.setAttribute('aria-hidden', 'true');
            ghost.src = COIN_IMAGES[denomination] || COIN_IMAGES.silver;
            root.document.body.append(ghost);
            activeGhosts.add(ghost);

            const delay = index * COIN_TRANSFER_TIMING.stagger;
            const duration = COIN_TRANSFER_TIMING.duration;
            const size = Math.max(16, Math.min(26, destination.width));
            const fromLeft = source.left + (source.width - size) / 2;
            const fromTop = source.top + (source.height - size) / 2;
            const toLeft = destination.left + (destination.width - size) / 2;
            const toTop = destination.top + (destination.height - size) / 2;
            const curve = 18 + (unitIndex % 3) * 5;
            const animation = ghost.animate([
                { left: `${fromLeft}px`, top: `${fromTop}px`, width: `${size}px`, height: `${size}px`, transform: 'rotate(0deg) scale(0.88)', opacity: 0.92 },
                { left: `${(fromLeft + toLeft) / 2}px`, top: `${Math.min(fromTop, toTop) - curve}px`, width: `${size}px`, height: `${size}px`, transform: `rotate(${index % 2 ? 150 : -150}deg) scale(1.08)`, opacity: 1, offset: 0.5 },
                { left: `${toLeft}px`, top: `${toTop}px`, width: `${size}px`, height: `${size}px`, transform: 'rotate(300deg) scale(0.92)', opacity: 1 }
            ], {
                duration,
                delay,
                easing: 'cubic-bezier(0.2, 0.78, 0.24, 1)',
                fill: 'both'
            });
            const finish = () => {
                ghost.remove();
                activeGhosts.delete(ghost);
            };
            animation.addEventListener('finish', finish, { once: true });
            animation.addEventListener('cancel', finish, { once: true });
            root.setTimeout?.(finish, delay + duration + 120);
        });

        root.setTimeout?.(() => {
            root.document.querySelectorAll('.is-coin-transfer-target').forEach((node) => {
                node.classList.remove('is-coin-transfer-target');
            });
        }, Math.max(0, coins.length - 1) * COIN_TRANSFER_TIMING.stagger
            + COIN_TRANSFER_TIMING.duration + COIN_TRANSFER_TIMING.settle);
    }

    return Object.freeze({ prepare, play, cancel, planTransfers });
});
