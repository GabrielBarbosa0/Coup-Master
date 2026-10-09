const assert = require('node:assert/strict');

const CardsModule = require('../../js/gamemode/shared/automated-cards.js');
const implementations = [
    {
        name: 'ranked',
        Rules: require('../../js/gamemode/ranked/ranked-rules.js'),
        Engine: require('../../js/gamemode/ranked/ranked-engine.js')
    },
    {
        name: 'personalized',
        Rules: require('../../js/gamemode/personalized/personalized-rules.js'),
        Engine: require('../../js/gamemode/personalized/personalized-engine.js')
    }
];

function createStartedState({ Engine, Rules }) {
    const state = Engine.createState(1000);
    ['Alice', 'Bruno', 'Celia'].forEach((name, index) => {
        Engine.joinPlayer(state, { uid: `u${index + 1}`, name }, 1001 + index);
    });
    Engine.getPlayers(state).forEach((player, index) => {
        Engine.toggleReady(state, player.uid, 1010 + index, () => 0);
    });
    Engine.advanceExpired(state, state.deadline + 1, () => 0);
    Engine.advanceExpired(state, state.deadline + 1);
    Engine.advanceExpired(state, state.deadline + 1);
    state.turnOrder = ['u1', 'u2', 'u3'];
    state.turnIndex = 0;
    state.turnNumber = 1;
    state.phase = Rules.PHASES.TURN;
    return state;
}

function settleAnimation({ Engine, Rules }, state) {
    if (state.phase === Rules.PHASES.ANIMATING) {
        Engine.advanceExpired(state, state.deadline);
    }
}

function testChallengeProof(implementation) {
    const { Engine, Rules, name } = implementation;
    const state = createStartedState(implementation);
    const proof = state.players.u1.influences[0];
    proof.role = Rules.ROLES.ASSASSIN;
    state.pendingAction = {
        actorUid: 'u1',
        targetUid: 'u3',
        type: Rules.ACTIONS.ASSASSINATE,
        passes: {},
        challenge: {
            challengerUid: 'u2',
            playerUid: 'u1',
            claim: Rules.ROLES.ASSASSIN,
            isBlock: false,
            revealAfter: 0
        }
    };
    state.phase = Rules.PHASES.CHALLENGE_REVEAL;

    Engine.revealChallenge(state, 'u1', proof.id, 2000);

    assert.equal(state.matchStats.u2.failedChallenges, 1);
    assert.equal(state.pendingAction.claimConfirmed, true);
    assert.equal(state.pendingLoss.playerUid, 'u2');
    assert.equal(state.publicReveals.at(-1).kind, 'proof');
    if (name === 'ranked') {
        assert.equal(state.matchStats.u1.contestedAssassinsWon, 1);
        assert.equal(state.pendingLoss.causedByUid, 'u1');
    } else {
        assert.equal(Object.hasOwn(state.matchStats.u1, 'contestedAssassinsWon'), false);
        assert.equal(Object.hasOwn(state.pendingLoss, 'causedByUid'), false);
    }
}

function testChallengeConcessionMetadata(implementation) {
    const { Engine, Rules, name } = implementation;
    const state = createStartedState(implementation);
    const concession = state.players.u1.influences[0];
    concession.role = Rules.ROLES.DUKE;
    state.players.u1.influences[1].role = Rules.ROLES.CAPTAIN;
    state.players.u1.influences.push({ id: 'extra-u1', role: Rules.ROLES.CAPTAIN, revealed: false });
    state.pendingAction = {
        actorUid: 'u3',
        targetUid: 'u1',
        type: Rules.ACTIONS.ASSASSINATE,
        passes: {},
        block: { playerUid: 'u1', claim: Rules.ROLES.CONTESSA },
        challenge: {
            challengerUid: 'u2',
            playerUid: 'u1',
            claim: Rules.ROLES.CONTESSA,
            isBlock: true,
            revealAfter: 0
        }
    };
    state.phase = Rules.PHASES.CHALLENGE_REVEAL;

    Engine.revealChallenge(state, 'u1', concession.id, 2100);

    assert.equal(state.pendingLoss.playerUid, 'u1');
    assert.equal(state.pendingLoss.count, 1);
    assert.equal(state.pendingLoss.doubleAssassination, true);
    if (name === 'ranked') {
        assert.equal(state.pendingLoss.causedByUid, 'u2');
        assert.equal(state.matchStats.u1.influencesLost, 1);
        assert.equal(state.matchStats.u1.firstInfluenceLostToUid, 'u2');
    } else {
        assert.equal(Object.hasOwn(state.pendingLoss, 'causedByUid'), false);
        assert.equal(Object.hasOwn(state.matchStats.u1, 'influencesLost'), false);
    }
}

function testEliminationTelemetry(implementation) {
    const { Engine, Rules, name } = implementation;
    const state = createStartedState(implementation);
    state.players.u1.coins = Rules.getAction(Rules.ACTIONS.COUP).cost;
    state.players.u2.influences[0].revealed = true;

    Engine.performAction(state, 'u1', Rules.ACTIONS.COUP, 'u2', 3000);
    settleAnimation(implementation, state);

    assert.equal(state.players.u2.eliminated, true);
    assert.equal(state.publicReveals.at(-1).kind, 'coup');
    if (name === 'ranked') {
        assert.equal(state.matchStats.u2.influencesLost, 1);
        assert.deepEqual(state.matchStats.u1.eliminatedUids, ['u2']);
    } else {
        assert.equal(Object.hasOwn(state.matchStats.u2, 'influencesLost'), false);
        assert.equal(Object.hasOwn(state.matchStats.u1, 'eliminatedUids'), false);
    }
}

function testExchangeAndExamineTelemetry(implementation) {
    const { Engine, Rules, name } = implementation;
    const exchange = createStartedState(implementation);
    const original = exchange.players.u1.influences.map((card) => ({ ...card }));
    exchange.pendingAction = { actorUid: 'u1', type: Rules.ACTIONS.EXCHANGE_AMBASSADOR };
    exchange.pendingExchange = { playerUid: 'u1', keepCount: 2, options: original };
    exchange.players.u1.influences = [];
    exchange.phase = Rules.PHASES.EXCHANGE;
    Engine.completeExchange(exchange, 'u1', original.map((card) => card.id), 4000);

    const examine = createStartedState(implementation);
    const examined = examine.players.u2.influences[0];
    examine.pendingAction = { actorUid: 'u1', type: Rules.ACTIONS.EXAMINE, targetUid: 'u2' };
    examine.pendingExamine = {
        actorUid: 'u1',
        targetUid: 'u2',
        cardId: examined.id,
        role: examined.role
    };
    examine.phase = Rules.PHASES.EXAMINE;
    Engine.completeExamine(examine, 'u1', false, 4100);

    assert.equal(examine.players.u2.investigationExposure.u1[examined.id], examined.role);
    if (name === 'ranked') {
        assert.equal(exchange.matchStats.u1.ambassadorExchanges, 1);
        assert.equal(examine.matchStats.u1.inquisitorInspections, 1);
    } else {
        assert.equal(Object.hasOwn(exchange.matchStats.u1, 'ambassadorExchanges'), false);
        assert.equal(Object.hasOwn(examine.matchStats.u1, 'inquisitorInspections'), false);
    }
}

assert.equal(typeof CardsModule.create, 'function');
implementations.forEach((implementation) => {
    testChallengeProof(implementation);
    testChallengeConcessionMetadata(implementation);
    testEliminationTelemetry(implementation);
    testExchangeAndExamineTelemetry(implementation);
});

console.log('automated-cards: provas, perdas, trocas, investigações e telemetria por perfil aprovadas');
