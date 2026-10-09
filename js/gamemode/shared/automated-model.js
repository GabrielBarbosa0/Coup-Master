(function initializeAutomatedModel(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupAutomatedModel = api;
})(typeof window !== 'undefined' ? window : null, function createAutomatedModelModule() {
    function create(Rules) {
        if (!Rules) throw new Error('As regras automatizadas são obrigatórias para criar o modelo.');

        const { ACTIONS, PHASES, ROLES, SETTINGS } = Rules;

        function getPlayers(state) {
            return Object.values(state?.players || {}).sort((left, right) => left.seat - right.seat);
        }

        function countInfluences(player) {
            return (player?.influences || []).filter((card) => !card.revealed).length;
        }

        function getAlivePlayers(state) {
            return getPlayers(state).filter((player) => !player.eliminated && countInfluences(player) > 0);
        }

        function getPlayer(state, uid) {
            return state?.players?.[uid] || null;
        }

        function getActiveUid(state) {
            return state?.turnOrder?.[state.turnIndex] || null;
        }

        function nextFreeSeat(state) {
            const occupied = new Set(getPlayers(state).map((player) => player.seat));
            for (let seat = 1; seat <= SETTINGS.maxPlayers; seat += 1) {
                if (!occupied.has(seat)) return seat;
            }
            return null;
        }

        function getActionTargets(state, uid, actionType) {
            return getAlivePlayers(state).filter((player) => player.uid !== uid
                && (actionType !== ACTIONS.STEAL || player.coins >= 2));
        }

        function getBlockClaimsForPlayer(state, uid) {
            const pending = state?.pendingAction;
            const action = pending ? Rules.getAction(pending.type) : null;
            if (!pending || !action || state.phase !== PHASES.RESPONSE || uid === pending.actorUid) return [];
            if (pending.type === ACTIONS.STEAL && pending.targetUid !== uid) {
                return action.blockClaims.includes(ROLES.CAPTAIN) ? [ROLES.CAPTAIN] : [];
            }
            if (action.blockScope === 'target' && pending.targetUid !== uid) return [];
            return action.blockClaims.filter((role) => Rules.isRoleAvailable(state, role));
        }

        function canPlayerRespondToAction(state, uid) {
            const pending = state?.pendingAction;
            const player = getPlayer(state, uid);
            if (!pending || !player || player.eliminated || uid === pending.actorUid || pending.passes?.[uid]) return false;
            const canChallenge = Boolean(pending.claim && !pending.claimConfirmed);
            const canBlock = getBlockClaimsForPlayer(state, uid).length > 0;
            return canChallenge || canBlock;
        }

        function getResponseUids(state) {
            const pending = state?.pendingAction;
            if (!pending || state.phase !== PHASES.RESPONSE) return [];
            return getAlivePlayers(state)
                .filter((player) => canPlayerRespondToAction(state, player.uid))
                .map((player) => player.uid);
        }

        function getWinner(state) {
            const alive = getAlivePlayers(state);
            return alive.length === 1 ? alive[0] : null;
        }

        return Object.freeze({
            getPlayers,
            getAlivePlayers,
            countInfluences,
            getPlayer,
            getActiveUid,
            nextFreeSeat,
            getActionTargets,
            getBlockClaimsForPlayer,
            canPlayerRespondToAction,
            getResponseUids,
            getWinner
        });
    }

    return Object.freeze({ create });
});
