(function initializeAutomatedTurns(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupAutomatedTurns = api;
})(typeof window !== 'undefined' ? window : null, function createAutomatedTurnsModule() {
    function create(Rules, Model, services) {
        if (!Rules || !Model || !services) {
            throw new Error('Regras, modelo e serviços são obrigatórios para criar o fluxo de turnos.');
        }

        const { ACTIONS, PHASES, SETTINGS } = Rules;
        const {
            getAlivePlayers,
            countInfluences,
            getPlayer,
            getActiveUid,
            getWinner
        } = Model;
        const {
            normalizeState,
            addLog,
            maybeStart,
            completeStarterDraw,
            completeInitialDeal,
            getActionFlow,
            getCards
        } = services;
        const getWinnerMessage = services.getWinnerMessage
            || ((winner) => `${winner.name} venceu a partida.`);

        function beginAnimationTransition(state, transition, now = Date.now()) {
            state.pendingTransition = transition;
            state.phase = PHASES.ANIMATING;
            state.deadline = now + SETTINGS.transitionAnimationMs;
            state.updatedAt = now;
            return state;
        }

        function resumeAnimationTransition(state, now = Date.now()) {
            const transition = state.pendingTransition;
            state.pendingTransition = null;
            if (!transition) return false;
            if (transition.type === 'start-action') {
                getActionFlow().continuePendingAction(state, now);
            } else if (transition.type === 'resume-phase') {
                state.phase = transition.phase;
                state.deadline = now + transition.timeoutMs;
                state.updatedAt = now;
            } else if (transition.type === 'end-turn') {
                completeEndTurn(state, now);
            }
            return true;
        }

        function endTurn(state, now = Date.now()) {
            state.pendingAction = null;
            state.pendingLoss = null;
            state.pendingExchange = null;
            state.pendingExamine = null;
            return beginAnimationTransition(state, { type: 'end-turn' }, now);
        }

        function completeEndTurn(state, now = Date.now()) {
            if (finishIfWinner(state, now)) return state;

            let nextIndex = state.turnIndex;
            for (let attempts = 0; attempts < state.turnOrder.length; attempts += 1) {
                nextIndex = (nextIndex + 1) % state.turnOrder.length;
                const candidate = getPlayer(state, state.turnOrder[nextIndex]);
                if (candidate && !candidate.eliminated && countInfluences(candidate) > 0) break;
            }
            state.turnIndex = nextIndex;
            state.turnNumber += 1;
            state.phase = PHASES.TURN;
            state.deadline = now + SETTINGS.turnSeconds * 1000;
            state.updatedAt = now;
            addLog(state, `Turno de ${getPlayer(state, getActiveUid(state)).name}.`, 'turn', now);
            return state;
        }

        function finishIfWinner(state, now = Date.now()) {
            if (state.status !== 'active') return state.status === PHASES.FINISHED;
            const winner = getWinner(state);
            if (!winner) return false;
            state.status = PHASES.FINISHED;
            state.phase = PHASES.FINISHED;
            state.winnerUid = winner.uid;
            state.finishedAt = now;
            state.deadline = null;
            state.pendingAction = null;
            state.pendingLoss = null;
            state.pendingExchange = null;
            state.pendingExamine = null;
            state.pendingTransition = null;
            addLog(state, getWinnerMessage(winner, state), 'winner', now);
            state.updatedAt = now;
            return true;
        }

        function advanceExpired(state, now = Date.now(), random = Math.random) {
            normalizeState(state);
            if (!state.deadline || now < state.deadline || ![PHASES.WAITING, 'active'].includes(state.status)) {
                return false;
            }

            if (state.status === PHASES.WAITING) {
                return maybeStart(state, now, random);
            }

            if (state.phase === PHASES.STARTER_DRAW) {
                return completeStarterDraw(state, now);
            }

            if (state.phase === PHASES.DEALING) {
                return completeInitialDeal(state, now);
            }

            if (state.phase === PHASES.ANIMATING) {
                return resumeAnimationTransition(state, now);
            }

            const actionFlow = getActionFlow();
            const cards = getCards();
            if (state.phase === PHASES.TURN) {
                const activeUid = getActiveUid(state);
                const activePlayer = getPlayer(state, activeUid);
                if (activePlayer.coins >= SETTINGS.mandatoryCoupCoins) {
                    const target = getAlivePlayers(state).find((player) => player.uid !== activeUid);
                    actionFlow.performAction(state, activeUid, ACTIONS.COUP, target.uid, now);
                } else {
                    actionFlow.performAction(state, activeUid, ACTIONS.INCOME, null, now);
                }
            } else if (state.phase === PHASES.RESPONSE) {
                actionFlow.executePendingAction(state, now);
            } else if (state.phase === PHASES.BLOCK_CHALLENGE) {
                actionFlow.acceptBlock(state, now);
            } else if (state.phase === PHASES.CHALLENGE_REVEAL) {
                const challenge = state.pendingAction.challenge;
                const player = getPlayer(state, challenge.playerUid);
                const hidden = player.influences.filter((card) => !card.revealed);
                const card = hidden.find((item) => item.role === challenge.claim) || hidden[0];
                if (card) cards.revealChallenge(state, player.uid, card.id, now);
                else endTurn(state, now);
            } else if (state.phase === PHASES.INFLUENCE_LOSS) {
                const player = getPlayer(state, state.pendingLoss?.playerUid);
                const card = player?.influences?.find((influence) => !influence.revealed);
                if (card) cards.loseInfluence(state, player.uid, card.id, now);
                else endTurn(state, now);
            } else if (state.phase === PHASES.EXCHANGE) {
                cards.completeExchange(
                    state,
                    state.pendingExchange.playerUid,
                    state.pendingExchange.options.slice(0, state.pendingExchange.keepCount).map((card) => card.id),
                    now
                );
            } else if (state.phase === PHASES.EXAMINE) {
                cards.completeExamine(state, state.pendingExamine.actorUid, false, now);
            }
            return true;
        }

        return Object.freeze({
            beginAnimationTransition,
            resumeAnimationTransition,
            endTurn,
            completeEndTurn,
            finishIfWinner,
            advanceExpired
        });
    }

    return Object.freeze({ create });
});
