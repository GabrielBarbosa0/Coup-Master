const assert = require('node:assert/strict');
const Rules = require('./personalized-rules.js');
const Engine = require('./personalized-engine.js');

function createStartedState() {
    const state = Engine.createState(1000);
    Engine.joinPlayer(state, { uid: 'u1', name: 'Alice', photo: '' }, 1001);
    Engine.joinPlayer(state, { uid: 'u2', name: 'Bruno', photo: '' }, 1002);
    Engine.toggleReady(state, 'u1', 1003, () => 0.42);
    Engine.toggleReady(state, 'u2', 1004, () => 0.42);
    Engine.advanceExpired(state, state.deadline + 1, () => 0);
    Engine.advanceExpired(state, state.deadline + 1);
    return state;
}

function createStartedStateWithThree() {
    const state = Engine.createState(1000);
    Engine.joinPlayer(state, { uid: 'u1', name: 'Alice', photo: '' }, 1001);
    Engine.joinPlayer(state, { uid: 'u2', name: 'Bruno', photo: '' }, 1002);
    Engine.joinPlayer(state, { uid: 'u3', name: 'Celia', photo: '' }, 1003);
    Engine.toggleReady(state, 'u1', 1004, () => 0);
    Engine.toggleReady(state, 'u2', 1005, () => 0);
    Engine.toggleReady(state, 'u3', 1006, () => 0);
    Engine.advanceExpired(state, state.deadline + 1, () => 0);
    Engine.advanceExpired(state, state.deadline + 1);
    state.turnOrder = ['u1', 'u2', 'u3'];
    state.turnIndex = 0;
    state.turnNumber = 1;
    state.phase = Rules.PHASES.TURN;
    return state;
}

function createWaitingState() {
    const state = Engine.createState(1000);
    Engine.joinPlayer(state, { uid: 'u1', name: 'Alice', photo: '' }, 1001);
    Engine.joinPlayer(state, { uid: 'u2', name: 'Bruno', photo: '' }, 1002);
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

function testReadyCountdownDelaysStart() {
    const state = createWaitingState();
    Engine.toggleReady(state, 'u1', 2000);
    assert.equal(state.status, Rules.PHASES.WAITING);
    assert.equal(state.deadline, null);

    Engine.toggleReady(state, 'u2', 2100);
    assert.equal(state.status, Rules.PHASES.WAITING);
    assert.equal(state.deadline, 2100 + Rules.SETTINGS.readyCountdownSeconds * 1000);
    assert.equal(Engine.advanceExpired(state, state.deadline - 1), false);
    assert.equal(state.status, Rules.PHASES.WAITING);

    assert.equal(Engine.advanceExpired(state, state.deadline + 1, () => 0.75), true);
    assert.equal(state.status, 'active');
    assert.equal(state.phase, Rules.PHASES.STARTER_DRAW);
    assert.equal(state.starterDraw.winnerUid, 'u2');
    assert.equal(Engine.getActiveUid(state), 'u2');

    assert.equal(Engine.advanceExpired(state, state.deadline + 1), true);
    assert.equal(state.phase, Rules.PHASES.TURN);
    assert.equal(state.turnNumber, 1);
    assert.equal(Engine.getActiveUid(state), 'u2');
}

function testInitialDealSkipsAmbassador() {
    const state = createStartedState();
    const initialHands = Engine.getPlayers(state).flatMap((player) => player.influences);
    assert.ok(initialHands.every((card) => card.role !== Rules.ROLES.AMBASSADOR));
    assert.ok(state.deck.some((card) => card.role === Rules.ROLES.AMBASSADOR));
}

function testAddAiPlayerToWaitingRoom() {
    const state = createWaitingState();
    Engine.addAiPlayer(state, {
        name: 'Dama Fortuna',
        personality: {
            vengefulness: 88,
            honesty: 21,
            skepticism: 63
        }
    }, 2000, () => 0.5);

    const bot = Engine.getPlayers(state).find((player) => player.ai);
    assert.ok(bot);
    assert.equal(bot.name, 'Dama Fortuna');
    assert.equal(bot.ready, true);
    assert.equal(bot.connected, true);
    assert.equal(bot.personality.vengefulness, 88);
    assert.equal(bot.personality.honesty, 21);
    assert.equal(bot.personality.skepticism, 63);
    assert.equal(bot.personalityHidden, false);
    assert.throws(
        () => Engine.addAiPlayer(state, { name: 'Dama Fortuna' }, 2001),
        /Já existe um jogador/
    );
}

function testHostRemovesWaitingPlayer() {
    const state = Engine.createState(1000);
    Engine.joinPlayer(state, { uid: 'host', name: 'Host', photo: '' }, 1001);
    Engine.joinPlayer(state, { uid: 'guest', name: 'Visitante', photo: '' }, 1002);
    Engine.addAiPlayer(state, { uid: 'bot-1', name: 'Bot Um' }, 1003, () => 0.5);

    assert.throws(
        () => Engine.removeWaitingPlayer(state, 'guest', 'bot-1', { hostUid: 'host' }, 1004),
        /criador/
    );

    Engine.removeWaitingPlayer(state, 'host', 'bot-1', { hostUid: 'host' }, 1005);
    assert.equal(Engine.getPlayer(state, 'bot-1'), null);

    Engine.removeWaitingPlayer(state, 'host', 'guest', { hostUid: 'host' }, 1006);
    assert.equal(Engine.getPlayer(state, 'guest'), null);
}

function testRestartMatchPreservesRoomParticipants() {
    const state = createWaitingState();
    Engine.addAiPlayer(state, {
        name: 'Duelista Nobre',
        personality: {
            vengefulness: 70,
            honesty: 30,
            skepticism: 80
        }
    }, 2000, () => 0.5);
    Engine.toggleReady(state, 'u1', 2100);
    Engine.toggleReady(state, 'u2', 2200);
    Engine.advanceExpired(state, state.deadline + 1, () => 0);
    Engine.advanceExpired(state, state.deadline + 1);

    const bot = Engine.getPlayers(state).find((player) => player.ai);
    state.status = Rules.PHASES.FINISHED;
    state.phase = Rules.PHASES.FINISHED;
    state.winnerUid = 'u1';
    state.finishedAt = 3000;
    state.players.u1.coins = 9;
    bot.eliminated = true;
    bot.influences = [{ id: 'bot-card', role: Rules.ROLES.DUKE, revealed: true }];
    bot.grudges = { u1: 2 };

    Engine.restartMatch(state, 4000);

    assert.equal(state.status, Rules.PHASES.WAITING);
    assert.equal(state.phase, Rules.PHASES.WAITING);
    assert.equal(Engine.getPlayers(state).length, 3);
    assert.equal(state.players.u1.ready, false);
    assert.equal(state.players.u1.coins, Rules.SETTINGS.startingCoins);
    assert.deepEqual(state.players.u1.influences, []);
    assert.equal(bot.ready, true);
    assert.equal(bot.connected, true);
    assert.equal(bot.eliminated, false);
    assert.deepEqual(bot.influences, []);
    assert.deepEqual(bot.grudges, {});
    assert.equal(state.deck.length, 0);
    assert.equal(state.winnerUid, null);
    assert.equal(state.log[state.log.length - 1].message, 'Sala reiniciada para uma nova partida.');
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

function testExamineEndsIfChallengerTargetIsEliminated() {
    const state = createStartedStateWithThree();
    state.players.u1.influences[0].role = Rules.ROLES.INQUISITOR;
    state.players.u2.influences = [
        { id: 'u2-final', role: Rules.ROLES.CONTESSA, revealed: false },
        { id: 'u2-dead', role: Rules.ROLES.DUKE, revealed: true }
    ];

    Engine.performAction(state, 'u1', Rules.ACTIONS.EXAMINE, 'u2', 2000);
    Engine.challengeAction(state, 'u2', 2100);
    Engine.loseInfluence(state, 'u2', 'u2-final', 2200);

    assert.equal(state.players.u2.eliminated, true);
    assert.equal(state.pendingAction, null);
    assert.equal(state.pendingExamine, null);
    assert.equal(state.phase, Rules.PHASES.TURN);
    assert.equal(Engine.getActiveUid(state), 'u3');
}

function testMandatoryCoup() {
    const state = createStartedState();
    state.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;
    assert.throws(
        () => Engine.performAction(state, 'u1', Rules.ACTIONS.INCOME, null, 2000),
        /Golpe de Estado é obrigatório/
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
    assert.equal(state.pendingLoss.reason, 'Vítima de assassinato.');
}

function testTurnTimeoutUsesMandatoryCoup() {
    const state = createStartedState();
    state.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;
    const deadline = state.deadline;
    Engine.advanceExpired(state, deadline + 1);
    assert.equal(state.players.u1.coins, 3);
    assert.equal(state.pendingLoss.playerUid, 'u2');
    assert.equal(state.pendingLoss.reason, 'Vítima de Golpe de Estado.');
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

function testMatchStatsTrackActionsAndChallenges() {
    const state = createStartedState();
    state.players.u1.influences.forEach((card) => { card.role = Rules.ROLES.CAPTAIN; });
    Engine.performAction(state, 'u1', Rules.ACTIONS.TAX, null, 2000);
    Engine.challengeAction(state, 'u2', 2100);
    const challengeResult = Engine.buildMatchResults(state, 2200);
    assert.equal(challengeResult.players.u1.matchStats.actions, 1);
    assert.equal(challengeResult.players.u1.matchStats.bluffs, 1);
    assert.equal(challengeResult.players.u1.matchStats.provenBluffs, 1);
    assert.ok(Number.isFinite(challengeResult.players.u1.performanceScore));
    assert.ok(challengeResult.players.u1.performanceBreakdown.some((item) => item.label === 'Blefes revelados'));
    assert.equal(challengeResult.players.u2.matchStats.challenges, 1);
    assert.equal(challengeResult.players.u2.matchStats.successfulChallenges, 1);

    const stealState = createStartedState();
    stealState.players.u1.influences[0].role = Rules.ROLES.CAPTAIN;
    Engine.performAction(stealState, 'u1', Rules.ACTIONS.STEAL, 'u2', 3000);
    Engine.passResponse(stealState, 'u2', 3100);
    const stealResult = Engine.buildMatchResults(stealState, 3200);
    assert.equal(stealResult.players.u1.matchStats.steals, 1);
    assert.equal(stealResult.players.u1.matchStats.coinsStolen, 2);
}

testImmediateIncome();
testReadyCountdownDelaysStart();
testInitialDealSkipsAmbassador();
testAddAiPlayerToWaitingRoom();
testHostRemovesWaitingPlayer();
testRestartMatchPreservesRoomParticipants();
testSuccessfulChallengeCancelsBluff();
testFailedChallengeResumesAction();
testTruthfulBlockCancelsAssassination();
testTurnTimeoutUsesIncome();
testExchangeSelection();
testInquisitorExamine();
testExamineEndsIfChallengerTargetIsEliminated();
testMandatoryCoup();
testBluffedBlockLetsActionContinue();
testTurnTimeoutUsesMandatoryCoup();
testInfluenceLossTimeoutNormalizesOldState();
testMatchStatsTrackActionsAndChallenges();

console.log('personalized-engine: 18 testes aprovados');


