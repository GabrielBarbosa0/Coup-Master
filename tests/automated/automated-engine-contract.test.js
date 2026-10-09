const assert = require('node:assert/strict');

const implementations = [
    {
        name: 'ranqueado',
        Rules: require('../../js/gamemode/ranked/ranked-rules.js'),
        Engine: require('../../js/gamemode/ranked/ranked-engine.js')
    },
    {
        name: 'personalizado',
        Rules: require('../../js/gamemode/personalized/personalized-rules.js'),
        Engine: require('../../js/gamemode/personalized/personalized-engine.js')
    }
];

const COMMON_ENGINE_API = Object.freeze([
    'createState',
    'normalizeState',
    'joinPlayer',
    'addAiPlayer',
    'setConnected',
    'leaveWaitingRoom',
    'toggleReady',
    'restartMatch',
    'maybeStart',
    'completeStarterDraw',
    'completeInitialDeal',
    'calculateMatchPerformance',
    'performAction',
    'passResponse',
    'challengeAction',
    'declareBlock',
    'challengeBlock',
    'revealChallenge',
    'loseInfluence',
    'completeExchange',
    'completeExamine',
    'advanceExpired',
    'getPlayers',
    'getAlivePlayers',
    'getActionTargets',
    'getPlayer',
    'getActiveUid',
    'getResponseUids',
    'getBlockClaimsForPlayer',
    'countInfluences',
    'buildMatchResults'
]);

const COMMON_STATE_KEYS = Object.freeze([
    'schemaVersion',
    'status',
    'phase',
    'createdAt',
    'updatedAt',
    'players',
    'turnOrder',
    'turnIndex',
    'turnNumber',
    'deck',
    'discard',
    'log',
    'deadline',
    'starterDraw',
    'pendingAction',
    'pendingLoss',
    'pendingExchange',
    'pendingExamine',
    'pendingTransition',
    'matchStats',
    'hasPostDealCardDraw',
    'matchId',
    'readyCountdownStartedAt',
    'winnerUid'
]);

const COMMON_MATCH_STATS = Object.freeze([
    'actions',
    'bluffs',
    'provenBluffs',
    'blockedActions',
    'challenges',
    'successfulChallenges',
    'failedChallenges',
    'coups',
    'assassinations',
    'steals',
    'coinsStolen'
]);

function createWaitingState(Engine, playerCount = 3) {
    const state = Engine.createState(1000);
    const users = [
        { uid: 'u1', name: 'Alice', photo: 'alice.png' },
        { uid: 'u2', name: 'Bruno', photo: 'bruno.png' },
        { uid: 'u3', name: 'Celia', photo: 'celia.png' }
    ];
    users.slice(0, playerCount).forEach((user, index) => {
        Engine.joinPlayer(state, user, 1001 + index);
    });
    return state;
}

function createStartedState(implementation, playerCount = 3, exchangeRole = null) {
    const { Engine, Rules } = implementation;
    const state = createWaitingState(Engine, playerCount);

    Engine.getPlayers(state).forEach((player, index) => {
        Engine.toggleReady(state, player.uid, 1010 + index, () => 0);
    });

    let randomCall = 0;
    const random = () => {
        randomCall += 1;
        if (randomCall === 2 && exchangeRole === Rules.ROLES.INQUISITOR) return 0.75;
        return 0;
    };

    assert.equal(Engine.advanceExpired(state, state.deadline + 1, random), true);
    assert.equal(Engine.advanceExpired(state, state.deadline + 1), true);
    assert.equal(Engine.advanceExpired(state, state.deadline + 1), true);

    state.turnOrder = Engine.getPlayers(state).map((player) => player.uid);
    state.turnIndex = 0;
    state.turnNumber = 1;
    state.phase = Rules.PHASES.TURN;
    return state;
}

function settleAnimation(implementation, state) {
    const { Engine, Rules } = implementation;
    if (state.phase === Rules.PHASES.ANIMATING) {
        assert.equal(Engine.advanceExpired(state, state.deadline), true);
    }
}

function beginAction(implementation, state, uid, action, targetUid, now) {
    const { Engine, Rules } = implementation;
    Engine.performAction(state, uid, action, targetUid, now);
    if (state.phase === Rules.PHASES.ANIMATING) {
        assert.equal(Engine.advanceExpired(state, state.deadline), true);
    }
}

function firstHiddenCard(state, uid) {
    return state.players[uid].influences.find((card) => !card.revealed);
}

function testRulesContract() {
    const ranked = implementations[0].Rules;
    const personalized = implementations[1].Rules;
    const sharedValues = [
        'ROLES',
        'ROLE_DEFINITIONS',
        'ACTIONS',
        'ACTION_DEFINITIONS',
        'PHASES',
        'SETTINGS'
    ];

    sharedValues.forEach((key) => {
        assert.deepEqual(
            personalized[key],
            ranked[key],
            `As regras comuns divergiram em ${key}.`
        );
    });

    ['getAction', 'getRole', 'isRoleAvailable', 'isActionAvailable', 'createDeck', 'shuffle']
        .forEach((method) => {
            assert.equal(typeof ranked[method], 'function');
            assert.equal(typeof personalized[method], 'function');
        });
}

function testPublicApiContract({ name, Engine }) {
    COMMON_ENGINE_API.forEach((method) => {
        assert.equal(typeof Engine[method], 'function', `${name} não implementa ${method}().`);
    });
}

function testStateAndNormalizationContract({ name, Engine, Rules }) {
    const state = Engine.createState(1000);
    COMMON_STATE_KEYS.forEach((key) => {
        assert.ok(Object.hasOwn(state, key), `${name} não inicializa state.${key}.`);
    });
    assert.equal(state.status, Rules.PHASES.WAITING);
    assert.equal(state.phase, Rules.PHASES.WAITING);
    assert.equal(state.createdAt, 1000);

    const legacy = {
        players: {
            u1: {
                uid: 'u1',
                coins: '4',
                influences: null,
                investigationExposure: null
            }
        },
        turnOrder: null,
        deck: null,
        discard: null,
        log: null,
        matchStats: null
    };
    assert.equal(Engine.normalizeState(legacy), legacy);
    assert.deepEqual(legacy.turnOrder, []);
    assert.deepEqual(legacy.deck, []);
    assert.deepEqual(legacy.discard, []);
    assert.deepEqual(legacy.log, []);
    assert.deepEqual(legacy.matchStats, {});
    assert.deepEqual(legacy.players.u1.influences, []);
    assert.deepEqual(legacy.players.u1.investigationExposure, {});
    assert.equal(legacy.players.u1.coins, 4);
}

function testWaitingAndStartContract(implementation) {
    const { Engine, Rules } = implementation;
    const state = createWaitingState(Engine, 2);

    assert.deepEqual(Engine.getPlayers(state).map((player) => player.seat), [1, 2]);
    Engine.setConnected(state, 'u2', false, 1100);
    assert.equal(state.players.u2.connected, false);
    Engine.joinPlayer(state, { uid: 'u2', name: 'Bruno Novo', photo: 'new.png' }, 1200);
    assert.equal(state.players.u2.seat, 2);
    assert.equal(state.players.u2.name, 'Bruno Novo');
    assert.equal(state.players.u2.connected, true);

    Engine.toggleReady(state, 'u1', 2000, () => 0);
    assert.equal(state.deadline, null);
    Engine.toggleReady(state, 'u2', 2100, () => 0);
    assert.equal(state.deadline, 2100 + Rules.SETTINGS.readyCountdownSeconds * 1000);
    assert.equal(Engine.advanceExpired(state, state.deadline - 1, () => 0), false);
    assert.equal(Engine.advanceExpired(state, state.deadline, () => 0), true);
    assert.equal(state.status, 'active');
    assert.equal(state.phase, Rules.PHASES.STARTER_DRAW);
    assert.equal(state.starterDraw.winnerUid, 'u1');
    assert.equal(state.exchangeRole, Rules.ROLES.AMBASSADOR);
    assert.equal(Engine.getPlayers(state).every((player) => player.influences.length === 2), true);
    assert.equal(
        Engine.getPlayers(state).flatMap((player) => player.influences)
            .every((card) => card.role !== Rules.ROLES.AMBASSADOR),
        true
    );

    assert.equal(Engine.completeStarterDraw(state, state.deadline), true);
    assert.equal(state.phase, Rules.PHASES.DEALING);
    assert.equal(Engine.completeInitialDeal(state, state.deadline), true);
    assert.equal(state.phase, Rules.PHASES.TURN);
    assert.equal(state.turnNumber, 1);
}

function testActionsAndTargetsContract(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);

    state.players.u2.coins = 1;
    state.players.u3.coins = 2;
    assert.deepEqual(
        Engine.getActionTargets(state, 'u1', Rules.ACTIONS.STEAL).map((player) => player.uid),
        ['u3']
    );

    beginAction(implementation, state, 'u1', Rules.ACTIONS.INCOME, null, 2000);
    assert.equal(state.players.u1.coins, Rules.SETTINGS.startingCoins + 1);
    assert.equal(state.phase, Rules.PHASES.TURN);
    assert.equal(Engine.getActiveUid(state), 'u2');

    const mandatory = createStartedState(implementation);
    mandatory.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;
    assert.throws(
        () => Engine.performAction(mandatory, 'u1', Rules.ACTIONS.INCOME, null, 3000),
        /Golpe de Estado é obrigatório/
    );
}

function testChallengeContract(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);
    state.players.u1.influences[0].role = Rules.ROLES.DUKE;

    beginAction(implementation, state, 'u1', Rules.ACTIONS.TAX, null, 2000);
    assert.equal(state.phase, Rules.PHASES.RESPONSE);
    Engine.challengeAction(state, 'u2', 2100);
    assert.equal(state.phase, Rules.PHASES.CHALLENGE_REVEAL);

    const proof = state.players.u1.influences.find((card) => card.role === Rules.ROLES.DUKE);
    Engine.revealChallenge(state, 'u1', proof.id, state.pendingAction.challenge.revealAfter);
    assert.equal(state.pendingLoss.playerUid, 'u2');
    assert.equal(state.pendingLoss.reason, 'Contestação incorreta.');
    assert.equal(state.publicReveals.at(-1).kind, 'proof');

    Engine.loseInfluence(state, 'u2', firstHiddenCard(state, 'u2').id, state.updatedAt + 1);
    assert.equal(Engine.countInfluences(state.players.u2), 1);
    settleAnimation(implementation, state);
    assert.equal(state.players.u1.coins, Rules.SETTINGS.startingCoins + 3);
}

function testBlockContract(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);
    state.players.u2.influences[0].role = Rules.ROLES.DUKE;

    beginAction(implementation, state, 'u1', Rules.ACTIONS.FOREIGN_AID, null, 2000);
    assert.ok(Engine.getBlockClaimsForPlayer(state, 'u2').includes(Rules.ROLES.DUKE));
    Engine.declareBlock(state, 'u2', Rules.ROLES.DUKE, 2100);
    assert.equal(state.pendingAction.block.uid, 'u2');
    assert.equal(state.phase, Rules.PHASES.BLOCK_CHALLENGE);

    Engine.passResponse(state, 'u1', 2200);
    Engine.passResponse(state, 'u3', 2300);
    settleAnimation(implementation, state);
    assert.equal(state.players.u1.coins, Rules.SETTINGS.startingCoins);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testResultsContract(implementation) {
    const { Engine } = implementation;
    const state = createStartedState(implementation, 2);
    state.players.u2.influences.forEach((card) => {
        card.revealed = true;
    });
    state.players.u2.eliminated = true;
    state.status = 'finished';
    state.phase = 'finished';
    state.winnerUid = 'u1';
    state.finishedAt = 5000;

    const results = Engine.buildMatchResults(state, 5100);
    assert.equal(results.winnerUid, 'u1');
    assert.ok(results.players.u1);
    assert.ok(results.players.u2);
    assert.equal(results.players.u1.uid, 'u1');
    assert.equal(results.players.u2.uid, 'u2');
    COMMON_MATCH_STATS.forEach((key) => {
        assert.ok(Object.hasOwn(results.players.u1.matchStats, key), `Resultado sem matchStats.${key}.`);
    });
    assert.ok(Number.isFinite(results.players.u1.performanceScore));
    assert.ok(Array.isArray(results.players.u1.performanceBreakdown));
}

testRulesContract();

implementations.forEach((implementation) => {
    testPublicApiContract(implementation);
    testStateAndNormalizationContract(implementation);
    testWaitingAndStartContract(implementation);
    testActionsAndTargetsContract(implementation);
    testChallengeContract(implementation);
    testBlockContract(implementation);
    testResultsContract(implementation);
});

console.log('automated-engine-contract: 15 contratos aprovados');
