(function initializePersonalizedProfile(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupPersonalizedProfile = api;
})(typeof window !== 'undefined' ? window : null, function createPersonalizedProfileModule() {
    function create(Rules, Model, services) {
        if (!Rules || !Model || !services?.normalizeState) {
            throw new Error('Regras, modelo e normalização são obrigatórios para criar o perfil personalizado.');
        }

        const { getPlayers, countInfluences } = Model;
        const { normalizeState } = services;
        const noop = () => {};
        const emptyMetadata = () => ({});

        function createPlayerMatchStats() {
            return {
                actions: 0,
                bluffs: 0,
                provenBluffs: 0,
                blockedActions: 0,
                challenges: 0,
                successfulChallenges: 0,
                failedChallenges: 0,
                coups: 0,
                assassinations: 0,
                steals: 0,
                coinsStolen: 0
            };
        }

        function ensureMatchStats(state, uid) {
            normalizeState(state);
            state.matchStats[uid] = {
                ...createPlayerMatchStats(),
                ...(state.matchStats[uid] || {})
            };
            return state.matchStats[uid];
        }

        function calculateMatchPerformance(state, player) {
            const stats = ensureMatchStats(state, player.uid);
            const hiddenInfluences = countInfluences(player);
            const breakdown = [];
            const add = (label, value) => {
                const points = Number(value || 0);
                if (points) breakdown.push({ label, points });
            };

            add(player.uid === state.winnerUid ? 'Vitória' : 'Derrota', player.uid === state.winnerUid ? 30 : -8);
            add('Ações executadas', stats.actions * 2);
            add('Golpes de Estado', stats.coups * 6);
            add('Assassinatos', stats.assassinations * 7);
            add('Roubos', stats.steals * 4);
            add('Moedas roubadas', stats.coinsStolen);
            add('Bloqueios aceitos', stats.blockedActions * 4);
            add('Desafios vencidos', stats.successfulChallenges * 8);
            add('Desafios perdidos', stats.failedChallenges * -6);
            add('Blefes revelados', stats.provenBluffs * -7);
            add('Influências preservadas', hiddenInfluences * 3);
            add('Eliminação', player.eliminated ? -5 : 0);

            return {
                total: breakdown.reduce((sum, item) => sum + item.points, 0),
                breakdown
            };
        }

        function buildMatchResults(state, now = Date.now()) {
            normalizeState(state);
            const winnerUid = state.winnerUid || null;
            const endedAt = state.finishedAt || now;
            const players = {};

            getPlayers(state).forEach((player) => {
                const stats = ensureMatchStats(state, player.uid);
                const performance = calculateMatchPerformance(state, player);
                players[player.uid] = {
                    uid: player.uid,
                    name: player.name || 'Jogador',
                    photo: player.photo || '',
                    seat: player.seat,
                    won: player.uid === winnerUid,
                    eliminated: Boolean(player.eliminated),
                    matchStats: { ...stats },
                    performanceScore: performance.total,
                    performanceBreakdown: performance.breakdown
                };
            });

            return {
                schemaVersion: 1,
                matchId: Number(state.matchId || 0),
                winnerUid,
                playerCount: Object.keys(players).length,
                startedAt: state.startedAt || state.createdAt || endedAt,
                endedAt,
                turnNumber: state.turnNumber || 0,
                players
            };
        }

        return Object.freeze({
            createPlayerMatchStats,
            ensureMatchStats,
            onActionDeclared: noop,
            createPendingActionMetadata: emptyMetadata,
            onBlockDeclared: noop,
            onBlockAccepted: noop,
            onActionResolved: noop,
            onChallengeProven: noop,
            createChallengeLossMetadata: emptyMetadata,
            createScheduledLossMetadata: emptyMetadata,
            onInfluenceLost: noop,
            onPlayerEliminated: noop,
            onExchangeCompleted: noop,
            onExamineCompleted: noop,
            calculateMatchPerformance,
            buildMatchResults,
            getWinnerMessage: (winner) => `${winner.name} venceu a partida personalizada.`
        });
    }

    return Object.freeze({ create });
});
