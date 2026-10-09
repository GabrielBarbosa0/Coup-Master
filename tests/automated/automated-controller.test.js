const assert = require('node:assert/strict');
const Controller = require('../../js/gamemode/shared/automated-controller.js');
const RankedRules = require('../../js/gamemode/ranked/ranked-rules.js');
const RankedEngine = require('../../js/gamemode/ranked/ranked-engine.js');

const runtime = { setInterval: (callback, delay) => ({ callback, delay }), setTimeout: (callback, delay) => ({ callback, delay }) };
const controller = Controller.create(RankedRules, RankedEngine, runtime);
const state = RankedEngine.createState(1000);
RankedEngine.joinPlayer(state, { uid: 'human', name: 'Humano' }, 1000);
RankedEngine.addAiPlayer(state, { uid: 'bot', name: 'Bot' }, 1001, () => 0);
state.status = 'active';
state.phase = RankedRules.PHASES.TURN;
state.turnOrder = ['human', 'bot'];
state.turnIndex = 1;

assert.equal(controller.hasPendingBotDecision(state, 2000), true);
state.players.bot.ai = false;
assert.equal(controller.hasPendingBotDecision(state, 2000), false);

const botTimer = controller.startBotDriver({
    getState: () => state,
    transaction: async () => {},
    applyDecision: () => true,
    getDelay: () => 100,
    noDecisionMessage: () => 'sem decisão'
});
const deadlineTimer = controller.startDeadlineDriver({
    getState: () => state,
    updateClock() {},
    transaction: async () => {},
    advanceExpired: (next) => next
});
assert.equal(botTimer.delay, 900);
assert.equal(deadlineTimer.delay, 500);

console.log('automated-controller: decisões pendentes e drivers compartilhados aprovados');
