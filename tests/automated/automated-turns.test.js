const assert = require('node:assert/strict');

const TurnsModule = require('../../js/gamemode/shared/automated-turns.js');
const implementations = [
    {
        name: 'ranked',
        winnerText: 'venceu a partida ranqueada.',
        Rules: require('../../js/gamemode/ranked/ranked-rules.js'),
        Engine: require('../../js/gamemode/ranked/ranked-engine.js')
    },
    {
        name: 'personalized',
        winnerText: 'venceu a partida personalizada.',
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
    state.deadline = 2000;
    return state;
}

function testTurnDeadline(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);
    const initialCoins = state.players.u1.coins;

    assert.equal(Engine.advanceExpired(state, state.deadline - 1), false);
    assert.equal(state.players.u1.coins, initialCoins);

    assert.equal(Engine.advanceExpired(state, state.deadline), true);
    assert.equal(state.players.u1.coins, initialCoins + 1);
    assert.equal(state.phase, Rules.PHASES.ANIMATING);
    assert.equal(state.pendingTransition.type, 'end-turn');

    Engine.advanceExpired(state, state.deadline);
    assert.equal(Engine.getActiveUid(state), 'u2');
    assert.equal(state.turnNumber, 2);
    assert.equal(state.phase, Rules.PHASES.TURN);
    assert.equal(state.deadline > state.updatedAt, true);
}

function testMandatoryCoupDeadline(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);
    state.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;

    Engine.advanceExpired(state, state.deadline);
    assert.equal(state.pendingAction.type, Rules.ACTIONS.COUP);
    assert.equal(state.pendingAction.targetUid, 'u2');
    assert.equal(state.phase, Rules.PHASES.ANIMATING);
    assert.equal(state.pendingTransition.type, 'start-action');

    Engine.advanceExpired(state, state.deadline);
    assert.equal(state.phase, Rules.PHASES.INFLUENCE_LOSS);
    assert.equal(state.pendingLoss.playerUid, 'u2');
}

function testResponseDeadline(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);
    const initialCoins = state.players.u1.coins;
    Engine.performAction(state, 'u1', Rules.ACTIONS.TAX, null, 2100);
    assert.equal(state.phase, Rules.PHASES.RESPONSE);

    Engine.advanceExpired(state, state.deadline);
    assert.equal(state.players.u1.coins, initialCoins + 3);
    assert.equal(state.phase, Rules.PHASES.ANIMATING);
    assert.equal(state.pendingTransition.type, 'end-turn');
}

function testChallengeRevealDeadline(implementation) {
    const { Engine, Rules } = implementation;
    const state = createStartedState(implementation);
    const proof = state.players.u1.influences[1];
    proof.role = Rules.ROLES.DUKE;
    state.players.u1.influences[0].role = Rules.ROLES.CAPTAIN;
    state.pendingAction = {
        actorUid: 'u1',
        type: Rules.ACTIONS.TAX,
        targetUid: null,
        passes: {},
        challenge: {
            challengerUid: 'u2',
            playerUid: 'u1',
            claim: Rules.ROLES.DUKE,
            isBlock: false,
            revealAfter: 0
        }
    };
    state.phase = Rules.PHASES.CHALLENGE_REVEAL;
    state.deadline = 2200;

    Engine.advanceExpired(state, state.deadline);
    assert.equal(state.publicReveals.at(-1).cardId, proof.id);
    assert.equal(state.publicReveals.at(-1).kind, 'proof');
    assert.equal(state.pendingLoss.playerUid, 'u2');
}

function testWinnerTransition(implementation) {
    const { Engine, Rules, winnerText } = implementation;
    const state = createStartedState(implementation);
    ['u2', 'u3'].forEach((uid) => {
        state.players[uid].influences.forEach((card) => { card.revealed = true; });
        state.players[uid].eliminated = true;
    });

    Engine.advanceExpired(state, state.deadline);
    Engine.advanceExpired(state, state.deadline);

    assert.equal(state.status, Rules.PHASES.FINISHED);
    assert.equal(state.winnerUid, 'u1');
    assert.equal(state.deadline, null);
    assert.equal(state.log.at(-1).message.endsWith(winnerText), true);
}

assert.equal(typeof TurnsModule.create, 'function');
implementations.forEach((implementation) => {
    testTurnDeadline(implementation);
    testMandatoryCoupDeadline(implementation);
    testResponseDeadline(implementation);
    testChallengeRevealDeadline(implementation);
    testWinnerTransition(implementation);
});

console.log('automated-turns: prazos, transições, ações automáticas e encerramento aprovados');
