(function initializeRankedCardTransfers(root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.CoupRankedCardTransfers = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createRankedCardTransfers(root) {
    const BACK_IMAGE = 'assets/img/cards/base/back.png';
    const INITIAL_DEAL_TIMING = Object.freeze({ duration: 680, stagger: 120, settle: 240 });
    const STANDARD_TRANSFER_TIMING = Object.freeze({ duration: 575, stagger: 113, settle: 120 });
    const activeGhosts = new Set();

    function cardLocations(state) {
        const locations = new Map();
        (state?.deck || []).forEach((card, index) => {
            if (card?.id) locations.set(card.id, { kind: 'deck', index });
        });
        Object.values(state?.players || {}).forEach((player) => {
            (player?.influences || []).forEach((card, index) => {
                if (card?.id) locations.set(card.id, {
                    kind: 'player',
                    uid: player.uid,
                    seat: Number(player.seat) || 0,
                    index
                });
            });
        });
        (state?.pendingExchange?.options || []).forEach((card, index) => {
            if (card?.id) locations.set(card.id, {
                kind: 'exchange',
                uid: state.pendingExchange.playerUid,
                index
            });
        });
        return locations;
    }

    function sameLocation(left, right) {
        return left?.kind === right?.kind && left?.uid === right?.uid;
    }

    function shouldAnimate(from, to) {
        if (!from || !to || sameLocation(from, to)) return false;
        return from.kind === 'deck'
            || to.kind === 'deck'
            || (from.kind === 'exchange' && to.kind === 'player');
    }

    function planTransfers(previousState, nextState) {
        if (!previousState || !nextState) return [];
        const previous = cardLocations(previousState);
        const next = cardLocations(nextState);
        const initialDeal = previousState.phase === 'starter-draw' && nextState.phase === 'dealing';
        const cardIds = new Set([...previous.keys(), ...next.keys()]);
        return Array.from(cardIds)
            .map((cardId) => {
                const destination = next.get(cardId);
                const source = initialDeal && destination?.kind === 'player'
                    ? { kind: 'deck' }
                    : previous.get(cardId);
                return { cardId, from: source, to: destination, initialDeal };
            })
            .filter((transfer) => shouldAnimate(transfer.from, transfer.to))
            .sort((left, right) => {
                if (initialDeal) {
                    return (left.to?.index - right.to?.index) || (left.to?.seat - right.to?.seat);
                }
                return (left.to?.index || 0) - (right.to?.index || 0);
            });
    }

    function findCardElement(cardId, location) {
        if (!root.document || !cardId || !location) return null;
        const scope = location.kind === 'exchange'
            ? root.document.getElementById('rankInteraction')
            : root.document.getElementById('rankPlayers');
        return Array.from(scope?.querySelectorAll?.('[data-card-id]') || [])
            .find((node) => node.dataset.cardId === cardId) || null;
    }

    function deckElement() {
        return root.document?.querySelector?.('#rankDeckSource img') || null;
    }

    function snapshotElement(element) {
        if (!element?.getBoundingClientRect) return null;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            image: element.matches?.('img') ? element.src : element.querySelector?.('img')?.src
        };
    }

    function prepare(previousState, nextState) {
        const transfers = planTransfers(previousState, nextState);
        if (!transfers.length || !root.document) return null;
        const deckSnapshot = snapshotElement(deckElement());
        return {
            transfers: transfers.map((transfer) => ({
                ...transfer,
                source: transfer.from.kind === 'deck'
                    ? deckSnapshot
                    : snapshotElement(findCardElement(transfer.cardId, transfer.from))
            }))
        };
    }

    function targetFor(transfer) {
        if (transfer.to.kind === 'deck') return deckElement();
        return findCardElement(transfer.cardId, transfer.to);
    }

    function revealTarget(target) {
        target?.classList?.remove('is-card-transfer-pending');
    }

    function animateTransfer(transfer, index, total) {
        const target = targetFor(transfer);
        const destination = snapshotElement(target);
        const source = transfer.source || (transfer.from.kind === 'deck' ? snapshotElement(deckElement()) : null);
        if (!source?.rect || !destination?.rect || !root.document?.body) {
            revealTarget(target);
            return;
        }

        if (transfer.to.kind !== 'deck') target.classList.add('is-card-transfer-pending');
        const ghost = root.document.createElement('img');
        ghost.className = 'rank-card-transfer-ghost';
        ghost.alt = '';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.src = transfer.from.kind === 'deck' ? BACK_IMAGE : (source.image || BACK_IMAGE);
        root.document.body.append(ghost);
        activeGhosts.add(ghost);

        const timing = transfer.initialDeal ? INITIAL_DEAL_TIMING : STANDARD_TRANSFER_TIMING;
        const delay = index * timing.stagger;
        const duration = timing.duration;
        const from = source.rect;
        const to = destination.rect;
        const animation = ghost.animate([
            {
                left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
                transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 0.96
            },
            {
                left: `${(from.left + to.left) / 2}px`, top: `${Math.min(from.top, to.top) - 22}px`,
                width: `${(from.width + to.width) / 2}px`, height: `${(from.height + to.height) / 2}px`,
                transform: `translate3d(0, 0, 0) rotate(${index % 2 ? 4 : -4}deg)`, opacity: 1,
                offset: 0.48
            },
            {
                left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
                transform: 'translate3d(0, 0, 0) rotate(0deg)', opacity: 1
            }
        ], {
            duration,
            delay,
            easing: 'cubic-bezier(0.22, 0.82, 0.24, 1)',
            fill: 'both'
        });
        const finish = () => {
            revealTarget(target);
            ghost.remove();
            activeGhosts.delete(ghost);
        };
        animation.addEventListener('finish', finish, { once: true });
        animation.addEventListener('cancel', finish, { once: true });
        root.setTimeout?.(finish, delay + duration + 120);
        if (index === total - 1) deckElement()?.classList.add('is-dealing');
    }

    function play(batch) {
        if (!batch?.transfers?.length || !root.document) return;
        if (activeGhosts.size) cancel();
        const initialDeal = Boolean(batch.transfers[0]?.initialDeal);
        root.document.body.classList.toggle('is-initial-card-deal', initialDeal);
        const reduceMotion = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const targets = batch.transfers.map(targetFor);
        targets.forEach((target, index) => {
            if (target && batch.transfers[index].to.kind !== 'deck') {
                target.classList.add('is-card-transfer-pending');
            }
        });
        if (reduceMotion || typeof root.Element === 'undefined' || !root.Element.prototype.animate) {
            targets.forEach(revealTarget);
            root.document.body.classList.remove('is-initial-card-deal');
            return;
        }
        batch.transfers.forEach((transfer, index) => animateTransfer(transfer, index, batch.transfers.length));
        const timing = initialDeal ? INITIAL_DEAL_TIMING : STANDARD_TRANSFER_TIMING;
        const lastDelay = (batch.transfers.length - 1) * timing.stagger;
        root.setTimeout?.(() => {
            deckElement()?.classList.remove('is-dealing');
            root.document.body.classList.remove('is-initial-card-deal');
        }, lastDelay + timing.duration + timing.settle);
    }

    function cancel() {
        activeGhosts.forEach((ghost) => ghost.getAnimations?.().forEach((animation) => animation.cancel()));
        activeGhosts.clear();
        root.document?.querySelectorAll?.('.is-card-transfer-pending').forEach(revealTarget);
        root.document?.body?.classList.remove('is-initial-card-deal');
    }

    return Object.freeze({ prepare, play, cancel, planTransfers });
});
