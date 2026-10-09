(function initializeRankedEngine(root, factory) {
    const rules = root?.CoupRankedRules
        || (typeof require === 'function' ? require('./ranked-rules.js') : null);
    const modelModule = root?.CoupAutomatedModel
        || (typeof require === 'function' ? require('../shared/automated-model.js') : null);
    const actionsModule = root?.CoupAutomatedActions
        || (typeof require === 'function' ? require('../shared/automated-actions.js') : null);
    const cardsModule = root?.CoupAutomatedCards
        || (typeof require === 'function' ? require('../shared/automated-cards.js') : null);
    const turnsModule = root?.CoupAutomatedTurns
        || (typeof require === 'function' ? require('../shared/automated-turns.js') : null);
    const lifecycleModule = root?.CoupAutomatedLifecycle
        || (typeof require === 'function' ? require('../shared/automated-lifecycle.js') : null);
    const profileModule = root?.CoupRankedProfile
        || (typeof require === 'function' ? require('./ranked-profile.js') : null);
    const api = factory(rules, modelModule, actionsModule, cardsModule, turnsModule, lifecycleModule, profileModule);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupRankedEngine = api;
})(typeof window !== 'undefined' ? window : null, function createRankedEngine(
    Rules,
    AutomatedModel,
    AutomatedActions,
    AutomatedCards,
    AutomatedTurns,
    AutomatedLifecycle,
    ProfileModule
) {
    if (!Rules) throw new Error('CoupRankedRules precisa ser carregado antes do motor ranqueado.');
    if (!AutomatedModel) throw new Error('CoupAutomatedModel precisa ser carregado antes do motor ranqueado.');
    if (!AutomatedActions) throw new Error('CoupAutomatedActions precisa ser carregado antes do motor ranqueado.');
    if (!AutomatedCards) throw new Error('CoupAutomatedCards precisa ser carregado antes do motor ranqueado.');
    if (!AutomatedTurns) throw new Error('CoupAutomatedTurns precisa ser carregado antes do motor ranqueado.');
    if (!AutomatedLifecycle) throw new Error('CoupAutomatedLifecycle precisa ser carregado antes do motor ranqueado.');
    if (!ProfileModule) throw new Error('CoupRankedProfile precisa ser carregado antes do motor ranqueado.');

    const { ACTIONS, PHASES, ROLES, SETTINGS } = Rules;
    const Model = AutomatedModel.create(Rules);
    const {
        getPlayers,
        getAlivePlayers,
        countInfluences,
        getPlayer,
        getActiveUid,
        nextFreeSeat,
        getActionTargets,
        getResponseUids,
        getBlockClaimsForPlayer
    } = Model;
    let Lifecycle = null;
    function normalizeState(state) {
        return Lifecycle.normalizeState(state);
    }
    const Profile = ProfileModule.create(Rules, Model, { normalizeState });
    const {
        createPlayerMatchStats,
        ensureMatchStats,
        calculateMatchPerformance,
        buildMatchResults
    } = Profile;
    Lifecycle = AutomatedLifecycle.create(Rules, Model, Profile, {
        modeLabel: 'ranqueada',
        startMessage: 'A partida ranqueada começou. Sorteando quem joga primeiro.',
        normalizeStateExtension: normalizeRankedLifecycleState,
        getRequiredPlayerCount: getRankedRequiredPlayerCount,
        prepareRestart: prepareRankedRestart,
        resetPlayerForRestart: resetRankedPlayerForRestart,
        completeRestart: completeRankedRestart
    });
    const {
        createState,
        createRandomBotPersonality,
        normalizeBotPersonality,
        addLog,
        playerHasHiddenRole,
        joinPlayer,
        addAiPlayer,
        setConnected,
        leaveWaitingRoom,
        toggleReady,
        updateReadyCountdown,
        maybeStart,
        restartMatch,
        completeStarterDraw,
        completeInitialDeal,
        bumpGrudge
    } = Lifecycle;
    let ActionFlow = null;
    let Cards = null;
    const Turns = AutomatedTurns.create(Rules, Model, {
        normalizeState,
        addLog,
        maybeStart,
        completeStarterDraw,
        completeInitialDeal,
        getActionFlow: () => ActionFlow,
        getCards: () => Cards,
        getWinnerMessage: Profile.getWinnerMessage
    });
    const {
        beginAnimationTransition,
        endTurn,
        finishIfWinner,
        advanceExpired
    } = Turns;
    Cards = AutomatedCards.create(Rules, Model, {
        normalizeState,
        ensureMatchStats,
        bumpGrudge,
        addLog,
        beginAnimationTransition,
        endTurn,
        finishIfWinner,
        getActionFlow: () => ActionFlow,
        onChallengeProven: Profile.onChallengeProven,
        onInfluenceLost: Profile.onInfluenceLost,
        onPlayerEliminated: Profile.onPlayerEliminated,
        onExchangeCompleted: Profile.onExchangeCompleted,
        onExamineCompleted: Profile.onExamineCompleted,
        createChallengeLossMetadata: Profile.createChallengeLossMetadata,
        createScheduledLossMetadata: Profile.createScheduledLossMetadata
    });
    const {
        revealChallenge,
        scheduleLoss,
        loseInfluence,
        beginExchange,
        completeExchange,
        beginExamine,
        completeExamine,
        canPendingActionContinue
    } = Cards;
    ActionFlow = AutomatedActions.create(Rules, Model, {
        normalizeState,
        ensureMatchStats,
        playerHasHiddenRole,
        bumpGrudge,
        addLog,
        beginAnimationTransition,
        endTurn,
        scheduleLoss,
        beginExchange,
        beginExamine,
        canPendingActionContinue,
        onActionDeclared: Profile.onActionDeclared,
        onBlockDeclared: Profile.onBlockDeclared,
        onBlockAccepted: Profile.onBlockAccepted,
        onActionResolved: Profile.onActionResolved,
        createPendingActionMetadata: Profile.createPendingActionMetadata
    });
    const {
        performAction,
        passResponse,
        challengeAction,
        declareBlock,
        challengeBlock
    } = ActionFlow;
    const MATCHMAKING_BOT_JOIN_MIN_MS = 720;
    const MATCHMAKING_BOT_JOIN_SPAN_MS = 720;
    const MATCHMAKING_READY_MIN_MS = 1000;
    const MATCHMAKING_READY_SPAN_MS = 1000;
    const MATCHMAKING_BOT_NAMES = Object.freeze([
        'Augusto', 'Berenice', 'Cassandra', 'Dario', 'Eloisa', 'Fausto',
        'Gael', 'Helena', 'Icaro', 'Dama do Véu', 'Barão Âmbar', 'Mauro',
        'Nadia', 'Otavio', 'Pilar', 'Quintino', 'Rafaela', 'Silas',
        'Véu Carmesim', 'Ulisses', 'Valentina', 'Xavier', 'Lady Lótus', 'Zeca',
        'Duque Cinzento', 'Capitão Falso', 'Condessa Fria', 'Inquisidor Mudo',
        'Baronesa Vesper', 'Lorde Sombra', 'Dama Fortuna', 'Arauto Azul',
        'Marquês Oculto', 'Visconde Sete', 'Oráculo da Corte', 'Máscara Rubra',
        'Corvo Real', 'Duelista Nobre', 'Escriba Cego', 'General de Seda'
    ]);

    function randomDelay(random, min, span) {
        return min + Math.floor(random() * span);
    }

    function randomItem(items, random = Math.random) {
        if (!items.length) return null;
        return items[Math.floor(random() * items.length)] || items[0];
    }

    function ensureMatchmaking(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (!state.matchmaking) {
            state.matchmaking = {
                enabled: true,
                targetPlayers: SETTINGS.maxPlayers,
                startedAt: now,
                nextBotAt: null,
                nextReadyAt: null,
                botReadyAt: {},
                filledAt: null
            };
        }
        state.matchmaking.enabled = true;
        state.matchmaking.targetPlayers = Math.max(
            SETTINGS.minPlayers,
            Math.min(SETTINGS.maxPlayers, Number(state.matchmaking.targetPlayers) || SETTINGS.maxPlayers)
        );
        state.matchmaking.startedAt = state.matchmaking.startedAt || now;
        return state.matchmaking;
    }

    function pickMatchmakingBotName(state, random = Math.random) {
        const usedNames = new Set(getPlayers(state).map((player) => (
            String(player.name || '').toLocaleLowerCase('pt-BR')
        )));
        (Array.isArray(state.previousBotNames) ? state.previousBotNames : []).forEach((name) => {
            usedNames.add(String(name).toLocaleLowerCase('pt-BR'));
        });
        const available = MATCHMAKING_BOT_NAMES.filter((name) => !usedNames.has(name.toLocaleLowerCase('pt-BR')));
        const names = available.length ? available : MATCHMAKING_BOT_NAMES;
        return names[Math.floor(random() * names.length)] || `Bot ${getPlayers(state).length + 1}`;
    }

    function scheduleBotReady(matchmaking, uid, now = Date.now(), random = Math.random) {
        matchmaking.botReadyAt = matchmaking.botReadyAt && typeof matchmaking.botReadyAt === 'object'
            ? matchmaking.botReadyAt
            : {};
        if (!matchmaking.botReadyAt[uid]) {
            matchmaking.botReadyAt[uid] = now + randomDelay(random, MATCHMAKING_READY_MIN_MS, MATCHMAKING_READY_SPAN_MS);
            return true;
        }
        return false;
    }

    function syncBotReadySchedule(state, matchmaking, now = Date.now(), random = Math.random) {
        let changed = false;
        const playersByUid = state.players || {};
        matchmaking.botReadyAt = matchmaking.botReadyAt && typeof matchmaking.botReadyAt === 'object'
            ? matchmaking.botReadyAt
            : {};

        Object.keys(matchmaking.botReadyAt).forEach((uid) => {
            const player = playersByUid[uid];
            if (!player || !player.ai || player.ready) {
                delete matchmaking.botReadyAt[uid];
                changed = true;
            }
        });

        getPlayers(state).forEach((player) => {
            if (player.ai && !player.ready && scheduleBotReady(matchmaking, player.uid, now, random)) {
                changed = true;
            }
        });

        return changed;
    }

    function pickDueReadyBot(state, matchmaking, now = Date.now(), random = Math.random) {
        const dueBots = getPlayers(state).filter((player) => (
            player.ai && !player.ready && Number(matchmaking.botReadyAt?.[player.uid] || 0) <= now
        ));
        return randomItem(dueBots, random);
    }

    function normalizeRankedLifecycleState(state) {
        state.matchmaking = state.matchmaking && typeof state.matchmaking === 'object' ? state.matchmaking : null;
        if (!state.matchmaking) return;
        const targetPlayers = Number(state.matchmaking.targetPlayers);
        state.matchmaking.enabled = state.matchmaking.enabled !== false;
        state.matchmaking.targetPlayers = Number.isFinite(targetPlayers)
            ? Math.max(SETTINGS.minPlayers, Math.min(SETTINGS.maxPlayers, Math.round(targetPlayers)))
            : SETTINGS.maxPlayers;
        state.matchmaking.startedAt = Number(state.matchmaking.startedAt) || state.createdAt || Date.now();
        state.matchmaking.nextBotAt = state.matchmaking.nextBotAt || null;
        state.matchmaking.nextReadyAt = state.matchmaking.nextReadyAt || null;
        state.matchmaking.botReadyAt = state.matchmaking.botReadyAt
            && typeof state.matchmaking.botReadyAt === 'object' ? state.matchmaking.botReadyAt : {};
        state.matchmaking.filledAt = state.matchmaking.filledAt || null;
    }

    function getRankedRequiredPlayerCount(state) {
        const matchmaking = state.matchmaking?.enabled ? state.matchmaking : null;
        return matchmaking
            ? Math.max(
                SETTINGS.minPlayers,
                Math.min(SETTINGS.maxPlayers, Number(matchmaking.targetPlayers) || SETTINGS.maxPlayers)
            )
            : SETTINGS.minPlayers;
    }

    function prepareRankedRestart(state, now, helpers) {
        state.previousBotNames = helpers.getPlayers(state)
            .filter((player) => player.ai)
            .map((player) => player.name);
        helpers.getPlayers(state).filter((player) => player.ai).forEach((player) => {
            delete state.players[player.uid];
        });
        state.matchmaking = null;
    }

    function resetRankedPlayerForRestart(player) {
        player.connected = player.connected !== false;
        player.ready = false;
        player.coins = SETTINGS.startingCoins;
        player.influences = [];
        player.eliminated = false;
    }

    function completeRankedRestart(state, now) {
        ensureMatchmaking(state, now);
    }

    function advanceMatchmaking(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING) return false;

        const players = getPlayers(state);
        const humanPlayers = players.filter((player) => !player.ai);
        if (!humanPlayers.length) return false;

        const matchmaking = ensureMatchmaking(state, now, random);
        if (!matchmaking.enabled) return false;

        const scheduleChanged = syncBotReadySchedule(state, matchmaking, now, random);
        const readyBot = pickDueReadyBot(state, matchmaking, now, random);
        if (readyBot) {
            readyBot.ready = true;
            delete matchmaking.botReadyAt[readyBot.uid];
            addLog(state, `${readyBot.name} confirmou prontidão.`, 'system', now);
            updateReadyCountdown(state, now);
            state.updatedAt = now;
            return true;
        }

        if (players.length < matchmaking.targetPlayers) {
            if (!matchmaking.nextBotAt) {
                matchmaking.nextBotAt = now + randomDelay(random, MATCHMAKING_BOT_JOIN_MIN_MS, MATCHMAKING_BOT_JOIN_SPAN_MS);
                state.updatedAt = now;
                return true;
            }
            if (now < matchmaking.nextBotAt) return false;

            const name = pickMatchmakingBotName(state, random);
            addAiPlayer(state, {
                name,
                ready: false,
                personality: createRandomBotPersonality(random)
            }, now, random);
            const bot = getPlayers(state).find((player) => player.name === name && player.ai && !player.ready);
            if (bot) scheduleBotReady(matchmaking, bot.uid, now, random);

            const filled = getPlayers(state).length >= matchmaking.targetPlayers;
            matchmaking.nextBotAt = filled
                ? null
                : now + randomDelay(random, MATCHMAKING_BOT_JOIN_MIN_MS, MATCHMAKING_BOT_JOIN_SPAN_MS);
            matchmaking.filledAt = filled ? now : null;
            addLog(state, `Matchmaking encontrou ${name}.`, 'system', now);
            updateReadyCountdown(state, now);
            state.updatedAt = now;
            return true;
        }

        matchmaking.filledAt = matchmaking.filledAt || now;
        matchmaking.nextBotAt = null;

        if (scheduleChanged) {
            state.updatedAt = now;
            return true;
        }

        const previousCountdown = state.readyCountdownStartedAt;
        const previousDeadline = state.deadline;
        updateReadyCountdown(state, now);
        if (previousCountdown !== state.readyCountdownStartedAt || previousDeadline !== state.deadline) {
            state.updatedAt = now;
            return true;
        }
        return false;
    }

    return Object.freeze({
        createState,
        normalizeState,
        joinPlayer,
        addAiPlayer,
        advanceMatchmaking,
        setConnected,
        leaveWaitingRoom,
        toggleReady,
        restartMatch,
        maybeStart,
        completeStarterDraw,
        completeInitialDeal,
        calculateMatchPerformance,
        performAction,
        passResponse,
        challengeAction,
        declareBlock,
        challengeBlock,
        revealChallenge,
        loseInfluence,
        completeExchange,
        completeExamine,
        advanceExpired,
        getPlayers,
        getAlivePlayers,
        getActionTargets,
        getPlayer,
        getActiveUid,
        getResponseUids,
        getBlockClaimsForPlayer,
        countInfluences,
        buildMatchResults
    });
});


