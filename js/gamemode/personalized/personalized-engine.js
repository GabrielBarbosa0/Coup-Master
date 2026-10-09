(function initializePersonalizedEngine(root, factory) {
    const rules = root?.CoupPersonalizedRules
        || (typeof require === 'function' ? require('./personalized-rules.js') : null);
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
    const profileModule = root?.CoupPersonalizedProfile
        || (typeof require === 'function' ? require('./personalized-profile.js') : null);
    const api = factory(rules, modelModule, actionsModule, cardsModule, turnsModule, lifecycleModule, profileModule);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupPersonalizedEngine = api;
})(typeof window !== 'undefined' ? window : null, function createPersonalizedEngine(
    Rules,
    AutomatedModel,
    AutomatedActions,
    AutomatedCards,
    AutomatedTurns,
    AutomatedLifecycle,
    ProfileModule
) {
    if (!Rules) throw new Error('CoupPersonalizedRules precisa ser carregado antes do motor personalizado.');
    if (!AutomatedModel) throw new Error('CoupAutomatedModel precisa ser carregado antes do motor personalizado.');
    if (!AutomatedActions) throw new Error('CoupAutomatedActions precisa ser carregado antes do motor personalizado.');
    if (!AutomatedCards) throw new Error('CoupAutomatedCards precisa ser carregado antes do motor personalizado.');
    if (!AutomatedTurns) throw new Error('CoupAutomatedTurns precisa ser carregado antes do motor personalizado.');
    if (!AutomatedLifecycle) throw new Error('CoupAutomatedLifecycle precisa ser carregado antes do motor personalizado.');
    if (!ProfileModule) throw new Error('CoupPersonalizedProfile precisa ser carregado antes do motor personalizado.');

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
        modeLabel: 'personalizada',
        startMessage: 'A partida personalizada começou. Sorteando quem joga primeiro.',
        allowAiReadyOverride: false
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

    function removeWaitingPlayer(state, actorUid, targetUid, options = {}, now = Date.now()) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING) throw new Error('A partida personalizada ja comecou.');
        if (!actorUid || actorUid !== options.hostUid) throw new Error('Apenas o criador da sala pode remover jogadores.');
        if (!targetUid || targetUid === actorUid) throw new Error('Use o botao de sair para deixar a sala.');
        if (!state.players?.[targetUid]) throw new Error('Jogador nao encontrado.');

        const name = state.players[targetUid].name;
        delete state.players[targetUid];
        addLog(state, `${name} foi removido da sala pelo criador.`, 'system', now);
        updateReadyCountdown(state, now);
        state.updatedAt = now;
        return state;
    }
    return Object.freeze({
        createState,
        normalizeState,
        joinPlayer,
        addAiPlayer,
        setConnected,
        leaveWaitingRoom,
        removeWaitingPlayer,
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


