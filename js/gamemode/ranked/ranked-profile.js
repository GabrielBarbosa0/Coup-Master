(function initializeRankedProfile(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupRankedProfile = api;
})(typeof window !== 'undefined' ? window : null, function createRankedProfileModule() {
    function create(Rules, Model, services) {
        if (!Rules || !Model || !services?.normalizeState) {
            throw new Error('Regras, modelo e normalização são obrigatórios para criar o perfil ranqueado.');
        }

        const { ACTIONS, ROLES, SETTINGS } = Rules;
        const { getPlayers, countInfluences } = Model;
        const { normalizeState } = services;

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
                coinsStolen: 0,
                contestedAssassinsWon: 0,
                condessaBlocks: 0,
                falseCondessaBluffs: 0,
                ambassadorExchanges: 0,
                inquisitorInspections: 0,
                dukeTaxes: 0,
                foreignAidBlocks: 0,
                taxBluffs: 0,
                captainBlocks: 0,
                ambassadorBlocks: 0,
                forcedCoups: 0,
                influencesLost: 0,
                claimedRoles: {},
                eliminatedUids: [],
                firstInfluenceLostToUid: null
            };
        }

        function ensureMatchStats(state, uid) {
            normalizeState(state);
            state.matchStats[uid] = {
                ...createPlayerMatchStats(),
                ...(state.matchStats[uid] || {})
            };
            state.matchStats[uid].claimedRoles = state.matchStats[uid].claimedRoles || {};
            state.matchStats[uid].eliminatedUids = Array.isArray(state.matchStats[uid].eliminatedUids)
                ? state.matchStats[uid].eliminatedUids
                : [];
            return state.matchStats[uid];
        }

        function onActionDeclared({ actorStats, action, actionType, isBluff }) {
            if (action.claim) actorStats.claimedRoles[action.claim] = true;
            if (isBluff && actionType === ACTIONS.TAX) actorStats.taxBluffs += 1;
        }

        function createPendingActionMetadata({ actor, action, actionType }) {
            return {
                forcedCoup: actionType === ACTIONS.COUP
                    && actor.coins + action.cost >= SETTINGS.mandatoryCoupCoins
            };
        }

        function onBlockDeclared({ state, blocker, claim }) {
            ensureMatchStats(state, blocker.uid).claimedRoles[claim] = true;
        }

        function onBlockAccepted({ blocker, stats, pending }) {
            const claim = pending.block?.claim;
            if (claim === ROLES.CONTESSA) {
                stats.condessaBlocks += 1;
                const hasClaim = blocker.influences.some((card) => !card.revealed && card.role === claim);
                if (!hasClaim) stats.falseCondessaBluffs += 1;
            }
            if (pending.type === ACTIONS.FOREIGN_AID) stats.foreignAidBlocks += 1;
            if (claim === ROLES.CAPTAIN) stats.captainBlocks += 1;
            if (claim === ROLES.AMBASSADOR) stats.ambassadorBlocks += 1;
        }

        function onActionResolved({ state, actor, pending, stats }) {
            if (pending.type === ACTIONS.TAX) ensureMatchStats(state, actor.uid).dukeTaxes += 1;
            if (pending.type === ACTIONS.COUP && pending.forcedCoup) stats.forcedCoups += 1;
        }

        function onChallengeProven({ state, actor, pending, isBlock }) {
            if (!isBlock && pending.type === ACTIONS.ASSASSINATE) {
                ensureMatchStats(state, actor.uid).contestedAssassinsWon += 1;
            }
        }

        function createChallengeLossMetadata({ challengerUid }) {
            return { causedByUid: challengerUid };
        }

        function createScheduledLossMetadata({ offenderUid }) {
            return { causedByUid: offenderUid || null };
        }

        function onInfluenceLost({ state, player }) {
            const stats = ensureMatchStats(state, player.uid);
            const offenderUid = state.pendingLoss?.causedByUid;
            stats.influencesLost += 1;
            if (!stats.firstInfluenceLostToUid && offenderUid && offenderUid !== player.uid) {
                stats.firstInfluenceLostToUid = offenderUid;
            }
        }

        function onPlayerEliminated({ state, player }) {
            const offenderUid = state.pendingLoss?.causedByUid;
            if (offenderUid && offenderUid !== player.uid) {
                const offenderStats = ensureMatchStats(state, offenderUid);
                offenderStats.eliminatedUids = [...new Set([...offenderStats.eliminatedUids, player.uid])];
            }
        }

        function onExchangeCompleted({ state, uid }) {
            if (state.pendingAction?.type === ACTIONS.EXCHANGE_AMBASSADOR) {
                ensureMatchStats(state, uid).ambassadorExchanges += 1;
            }
        }

        function onExamineCompleted({ state, uid }) {
            ensureMatchStats(state, uid).inquisitorInspections += 1;
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
            add('Golpes de Estado', stats.coups * 6);
            add('Assassinatos', stats.assassinations * 7);
            add('Roubos', stats.steals * 4);
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
            const playerCount = getPlayers(state).length;
            const availableRoles = Object.keys(Rules.ROLE_DEFINITIONS)
                .filter((role) => Rules.isRoleAvailable(state, role));

            getPlayers(state).forEach((player) => {
                const stats = ensureMatchStats(state, player.uid);
                const won = player.uid === winnerUid;
                const hiddenCards = player.influences.filter((card) => !card.revealed);
                const claimedRoles = stats.claimedRoles || {};
                const firstAttacker = stats.firstInfluenceLostToUid;
                const derivedStats = {
                    ...stats,
                    perfectBluffWins: won && stats.bluffs > 0 && stats.provenBluffs === 0 ? 1 : 0,
                    comebackWins: won && stats.influencesLost > 0 ? 1 : 0,
                    finalInfluenceWins: won && hiddenCards.length === 1 ? 1 : 0,
                    perfectWins: won && hiddenCards.length === SETTINGS.startingInfluences ? 1 : 0,
                    doubleContessaWins: won && hiddenCards.length === 2
                        && hiddenCards.every((card) => card.role === ROLES.CONTESSA) ? 1 : 0,
                    winsAsFirstPlayer: won && state.starterDraw?.winnerUid === player.uid ? 1 : 0,
                    winsAgainstFivePlayers: won && playerCount === SETTINGS.maxPlayers ? 1 : 0,
                    winsWithNoCoins: won && player.coins === 0 ? 1 : 0,
                    fastestWins: won && state.turnNumber <= playerCount * 3 ? 1 : 0,
                    longestGamesWon: won && state.turnNumber >= playerCount * 10 ? 1 : 0,
                    revengeWins: won && firstAttacker && stats.eliminatedUids.includes(firstAttacker) ? 1 : 0,
                    flawlessChallenges: won && stats.challenges > 0 && stats.failedChallenges === 0 ? 1 : 0,
                    allRolesClaimedWins: won && availableRoles.every((role) => claimedRoles[role]) ? 1 : 0
                };
                const performance = calculateMatchPerformance(state, player);
                players[player.uid] = {
                    uid: player.uid,
                    name: player.name || 'Jogador',
                    photo: player.photo || '',
                    seat: player.seat,
                    won,
                    eliminated: Boolean(player.eliminated),
                    matchStats: derivedStats,
                    performanceScore: performance.total,
                    performanceBreakdown: performance.breakdown
                };
            });

            return {
                schemaVersion: 1,
                matchId: Number(state.matchId || 0),
                winnerUid,
                playerCount,
                startedAt: state.startedAt || state.createdAt || endedAt,
                endedAt,
                turnNumber: state.turnNumber || 0,
                players
            };
        }

        return Object.freeze({
            createPlayerMatchStats,
            ensureMatchStats,
            onActionDeclared,
            createPendingActionMetadata,
            onBlockDeclared,
            onBlockAccepted,
            onActionResolved,
            onChallengeProven,
            createChallengeLossMetadata,
            createScheduledLossMetadata,
            onInfluenceLost,
            onPlayerEliminated,
            onExchangeCompleted,
            onExamineCompleted,
            calculateMatchPerformance,
            buildMatchResults,
            getWinnerMessage: (winner) => `${winner.name} venceu a partida ranqueada.`
        });
    }

    return Object.freeze({ create });
});
