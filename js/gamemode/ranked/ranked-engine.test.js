const assert = require('node:assert/strict');
const Rules = require('./ranked-rules.js');
const Engine = require('./ranked-engine.js');

function createStartedState() {
    const state = Engine.createState(1000);
    Engine.joinPlayer(state, { uid: 'u1', name: 'Alice', photo: '' }, 1001);
    Engine.joinPlayer(state, { uid: 'u2', name: 'Bruno', photo: '' }, 1002);
    Engine.toggleReady(state, 'u1', 1003, () => 0.42);
    Engine.toggleReady(state, 'u2', 1004, () => 0.42);
    return state;
}

function firstHiddenCard(state, uid) {
    return state.players[uid].influences.find((card) => !card.revealed);
}

function testImmediateIncome() {
    const state = createStartedState();
    Engine.performAction(state, 'u1', Rules.ACTIONS.INCOME, null, 2000);
    assert.equal(state.players.u1.coins, 3);
    assert.equal(Engine.getActiveUid(state), 'u2');
    assert.equal(state.phase, Rules.PHASES.TURN);
}

function testSuccessfulChallengeCancelsBluff() {
    const state = createStartedState();
    state.players.u1.influences.forEach((card) => { card.role = Rules.ROLES.CAPTAIN; });
    Engine.performAction(state, 'u1', Rules.ACTIONS.TAX, null, 2000);
    Engine.challengeAction(state, 'u2', 2100);
    assert.equal(state.pendingLoss.playerUid, 'u1');
    Engine.loseInfluence(state, 'u1', firstHiddenCard(state, 'u1').id, 2200);
    assert.equal(Engine.getActiveUid(state), 'u2');
    assert.equal(state.players.u1.coins, 2);
}

function testFailedChallengeResumesAction() {
    const state = createStartedState();
    state.players.u1.influences[0].role = Rules.ROLES.DUKE;
    Engine.performAction(state, 'u1', Rules.ACTIONS.TAX, null, 2000);
    Engine.challengeAction(state, 'u2', 2100);
    assert.equal(state.pendingLoss.playerUid, 'u2');
    Engine.loseInfluence(state, 'u2', firstHiddenCard(state, 'u2').id, 2200);
    assert.equal(state.phase, Rules.PHASES.RESPONSE);
    assert.equal(state.pendingAction.claimConfirmed, true);
    Engine.passResponse(state, 'u2', 2300);
    assert.equal(state.players.u1.coins, 5);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testTruthfulBlockCancelsAssassination() {
    const state = createStartedState();
    state.players.u1.coins = 3;
    state.players.u2.influences[0].role = Rules.ROLES.CONTESSA;
    Engine.performAction(state, 'u1', Rules.ACTIONS.ASSASSINATE, 'u2', 2000);
    Engine.declareBlock(state, 'u2', Rules.ROLES.CONTESSA, 2100);
    Engine.challengeBlock(state, 'u1', 2200);
    assert.equal(state.pendingLoss.playerUid, 'u1');
    Engine.loseInfluence(state, 'u1', firstHiddenCard(state, 'u1').id, 2300);
    assert.equal(Engine.countInfluences(state.players.u2), 2);
    assert.equal(state.players.u1.coins, 0);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testTurnTimeoutUsesIncome() {
    const state = createStartedState();
    const deadline = state.deadline;
    assert.equal(Engine.advanceExpired(state, deadline + 1), true);
    assert.equal(state.players.u1.coins, 3);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testExchangeSelection() {
    const state = createStartedState();
    Engine.performAction(state, 'u1', Rules.ACTIONS.EXCHANGE_AMBASSADOR, null, 2000);
    Engine.passResponse(state, 'u2', 2100);
    assert.equal(state.phase, Rules.PHASES.EXCHANGE);
    assert.equal(state.pendingExchange.options.length, 4);
    const keepIds = state.pendingExchange.options.slice(0, 2).map((card) => card.id);
    Engine.completeExchange(state, 'u1', keepIds, 2200);
    assert.equal(Engine.countInfluences(state.players.u1), 2);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testInquisitorExamine() {
    const state = createStartedState();
    Engine.performAction(state, 'u1', Rules.ACTIONS.EXAMINE, 'u2', 2000);
    Engine.passResponse(state, 'u2', 2100);
    assert.equal(state.phase, Rules.PHASES.EXAMINE);
    assert.ok(state.pendingExamine.role);
    Engine.completeExamine(state, 'u1', false, 2200);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testMandatoryCoup() {
    const state = createStartedState();
    state.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;
    assert.throws(
        () => Engine.performAction(state, 'u1', Rules.ACTIONS.INCOME, null, 2000),
        /Golpe de Estado e obrigatorio/
    );
}

function testBluffedBlockLetsActionContinue() {
    const state = createStartedState();
    state.players.u1.coins = 3;
    state.players.u2.influences.forEach((card) => { card.role = Rules.ROLES.DUKE; });
    Engine.performAction(state, 'u1', Rules.ACTIONS.ASSASSINATE, 'u2', 2000);
    Engine.declareBlock(state, 'u2', Rules.ROLES.CONTESSA, 2100);
    Engine.challengeBlock(state, 'u1', 2200);
    Engine.loseInfluence(state, 'u2', firstHiddenCard(state, 'u2').id, 2300);
    assert.equal(state.phase, Rules.PHASES.INFLUENCE_LOSS);
    assert.equal(state.pendingLoss.playerUid, 'u2');
    assert.equal(state.pendingLoss.reason, 'Vitima de assassinato.');
}

function testTurnTimeoutUsesMandatoryCoup() {
    const state = createStartedState();
    state.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;
    const deadline = state.deadline;
    Engine.advanceExpired(state, deadline + 1);
    assert.equal(state.players.u1.coins, 3);
    assert.equal(state.pendingLoss.playerUid, 'u2');
    assert.equal(state.pendingLoss.reason, 'Vitima de Golpe de Estado.');
}

function testInfluenceLossTimeoutNormalizesOldState() {
    const state = createStartedState();
    delete state.discard;
    state.players.u1.influences.forEach((card) => { card.role = Rules.ROLES.CAPTAIN; });
    Engine.performAction(state, 'u1', Rules.ACTIONS.TAX, null, 2000);
    Engine.challengeAction(state, 'u2', 2100);
    const deadline = state.deadline;
    assert.equal(Engine.advanceExpired(state, deadline + 1), true);
    assert.ok(Array.isArray(state.discard));
    assert.equal(state.discard.length, 1);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

testImmediateIncome();
testSuccessfulChallengeCancelsBluff();
testFailedChallengeResumesAction();
testTruthfulBlockCancelsAssassination();
testTurnTimeoutUsesIncome();
testExchangeSelection();
testInquisitorExamine();
testMandatoryCoup();
testBluffedBlockLetsActionContinue();
testTurnTimeoutUsesMandatoryCoup();
testInfluenceLossTimeoutNormalizesOldState();

console.log('ranked-engine: 11 testes aprovados');


