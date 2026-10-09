(function initializeAutomatedController(factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window !== 'undefined') window.CoupAutomatedController = api;
})(function createAutomatedControllerFactory() {
    function create(Rules, Engine, runtime = globalThis) {
        if (!Rules || !Engine) throw new Error('O controlador automatizado requer regras e motor.');

        function hasPendingBotDecision(state, now = Date.now()) {
            if (!state || state.status !== 'active') return false;
            if (now < (state.revealPresentation?.endsAt || 0)) return false;
            if (state.phase === Rules.PHASES.TURN) return Boolean(Engine.getPlayer(state, Engine.getActiveUid(state))?.ai);
            if (state.phase === Rules.PHASES.RESPONSE) {
                const responseUids = Engine.getResponseUids(state);
                return Engine.getAlivePlayers(state).some((player) => player.ai && responseUids.includes(player.uid));
            }
            if (state.phase === Rules.PHASES.BLOCK_CHALLENGE) {
                const blockerUid = state.pendingAction?.block?.uid;
                return Engine.getAlivePlayers(state).some((player) => (
                    player.ai && player.uid !== blockerUid && !state.pendingAction?.passes?.[player.uid]
                ));
            }
            if (state.phase === Rules.PHASES.CHALLENGE_REVEAL) return Boolean(Engine.getPlayer(state, state.pendingAction?.challenge?.playerUid)?.ai);
            if (state.phase === Rules.PHASES.INFLUENCE_LOSS) return Boolean(Engine.getPlayer(state, state.pendingLoss?.playerUid)?.ai);
            if (state.phase === Rules.PHASES.EXCHANGE) return Boolean(Engine.getPlayer(state, state.pendingExchange?.playerUid)?.ai);
            if (state.phase === Rules.PHASES.EXAMINE) return Boolean(Engine.getPlayer(state, state.pendingExamine?.actorUid)?.ai);
            return false;
        }

        function startBotDriver(options) {
            let pending = false;
            return runtime.setInterval(() => {
                const snapshot = options.getState();
                if (!hasPendingBotDecision(snapshot) || pending) return;
                pending = true;
                runtime.setTimeout(() => {
                    options.transaction((state) => {
                        if (!options.applyDecision(state, Date.now())) throw new Error(options.noDecisionMessage());
                        return state;
                    }, { silent: true }).catch(() => null).finally(() => { pending = false; });
                }, options.getDelay(snapshot));
            }, options.pollMs || 900);
        }

        function startDeadlineDriver(options) {
            let pending = false;
            return runtime.setInterval(() => {
                const now = Date.now();
                const snapshot = options.getState();
                options.updateClock(now);
                if (!snapshot?.deadline || now < snapshot.deadline || pending) return;
                pending = true;
                options.transaction((state) => options.advanceExpired(state, Date.now()), { silent: true })
                    .catch(() => null)
                    .finally(() => { pending = false; });
            }, options.pollMs || 500);
        }

        return Object.freeze({ hasPendingBotDecision, startBotDriver, startDeadlineDriver });
    }

    return Object.freeze({ create });
});
