const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('./ranked-rules.js');
const Engine = require('./ranked-engine.js');
let random = 0;
const root = { CoupRankedRules: Rules, CoupRankedEngine: Engine, location: { search: '?room=TEST' } };
const source = fs.readFileSync(require.resolve('./ranked-game.js'), 'utf8').replace('    boot();', `
    root.test = { applyNextBotDecision, shouldChallengeClaim, chooseBotBlockClaim };
`);
vm.runInNewContext(source, {
    window: root, document: { body: { dataset: {} } }, URLSearchParams,
    Math: Object.assign(Object.create(Math), { random: () => random })
});

function fixture() {
    const state = Engine.createState(1000);
    for (const uid of ['a', 'b', 'c']) Engine.joinPlayer(state, { uid, name: uid }, 1000);
    for (const uid of ['a', 'b', 'c']) Engine.toggleReady(state, uid, 1001, () => 0);
    Engine.advanceExpired(state, state.deadline + 1, () => 0);
    Engine.advanceExpired(state, state.deadline + 1);
    state.turnOrder = ['a', 'b', 'c'];
    state.turnIndex = 0;
    state.players.a.coins = 7;
    state.players.c.ai = true;
    state.players.c.personality = { honesty: 0, skepticism: 100, vengefulness: 100 };
    state.players.c.grudges = { a: 1000, b: 1000 };
    return state;
}

for (const type of [Rules.ACTIONS.ASSASSINATE, Rules.ACTIONS.STEAL, Rules.ACTIONS.EXAMINE]) {
    random = 0.99;
    const state = fixture();
    delete state.exchangeRole;
    Engine.performAction(state, 'a', type, 'b', 2000);
    const claim = state.pendingAction.claim;
    // Maximum hostility does not force third-party intervention.
    state.discard = Array.from({ length: Rules.SETTINGS.cardsPerRole }, (_, i) => ({ id: `discard-${i}`, role: claim }));
    assert.equal(root.test.shouldChallengeClaim(state, state.players.c, claim, 'a'), false);
    assert.equal(root.test.chooseBotBlockClaim(state, state.players.c), null);
    assert.equal(root.test.applyNextBotDecision(state, 2100), true);
    assert.equal(state.pendingAction.passes.c, true);
    assert.equal(state.phase, Rules.PHASES.RESPONSE);
    assert.equal(state.log.at(-1).message, 'c passou.');
}

for (const [type, claim] of [[Rules.ACTIONS.ASSASSINATE, Rules.ROLES.CONTESSA], [Rules.ACTIONS.STEAL, Rules.ROLES.CAPTAIN]]) {
    const state = fixture();
    Engine.performAction(state, 'a', type, 'b', 2000);
    Engine.declareBlock(state, 'b', claim, 2100);
    root.test.applyNextBotDecision(state, 2200);
    assert.equal(state.phase, Rules.PHASES.BLOCK_CHALLENGE);
    assert.equal(state.pendingAction.passes.c, true);

    // The attacking bot still has a direct interest in challenging the block.
    state.players.a.ai = true;
    random = 0;
    root.test.applyNextBotDecision(state, 2300);
    assert.equal(state.phase, Rules.PHASES.CHALLENGE_REVEAL);
    assert.equal(state.pendingAction.challenge.challengerUid, 'a');
}

const defense = fixture();
defense.players.c.influences[0].role = Rules.ROLES.CONTESSA;
Engine.performAction(defense, 'a', Rules.ACTIONS.ASSASSINATE, 'c', 2000);
random = 0.5;
root.test.applyNextBotDecision(defense, 2100);
assert.equal(defense.phase, Rules.PHASES.BLOCK_CHALLENGE);
assert.equal(defense.pendingAction.block.uid, 'c');
random = 0;

const targetedChallenge = fixture();
Engine.performAction(targetedChallenge, 'a', Rules.ACTIONS.ASSASSINATE, 'c', 2000);
assert.equal(root.test.shouldChallengeClaim(targetedChallenge, targetedChallenge.players.c, Rules.ROLES.ASSASSIN, 'a', true), true);

const tax = fixture();
Engine.performAction(tax, 'a', Rules.ACTIONS.TAX, null, 2000);
root.test.applyNextBotDecision(tax, 2100);
assert.equal(tax.phase, Rules.PHASES.CHALLENGE_REVEAL);

const aid = fixture();
aid.players.c.influences[0].role = Rules.ROLES.DUKE;
Engine.performAction(aid, 'a', Rules.ACTIONS.FOREIGN_AID, null, 2000);
random = 0.5;
root.test.applyNextBotDecision(aid, 2100);
assert.equal(aid.pendingAction.block.uid, 'c');

const coup = fixture();
Engine.performAction(coup, 'a', Rules.ACTIONS.COUP, 'b', 2000);
assert.equal(coup.phase, Rules.PHASES.INFLUENCE_LOSS);
assert.equal(root.test.applyNextBotDecision(coup, 2100), false);
const ally = fixture();
ally.players.c.influences[0].role = Rules.ROLES.CAPTAIN;
Engine.performAction(ally, 'a', Rules.ACTIONS.STEAL, 'b', 2000);
random = 0.2;
assert.equal(root.test.chooseBotBlockClaim(ally, ally.players.c), null);
ally.players.c.favors = { b: 1 };
assert.equal(root.test.chooseBotBlockClaim(ally, ally.players.c), Rules.ROLES.CAPTAIN);
random = 0.9;
assert.equal(root.test.chooseBotBlockClaim(ally, ally.players.c), null);
ally.players.c.influences[1].revealed = true;
random = 0.2;
assert.equal(root.test.chooseBotBlockClaim(ally, ally.players.c), null);
random = 0.01;
assert.equal(root.test.chooseBotBlockClaim(ally, ally.players.c), Rules.ROLES.CAPTAIN);

const memory = fixture();
Engine.performAction(memory, 'a', Rules.ACTIONS.STEAL, 'c', 2000);
Engine.declareBlock(memory, 'b', Rules.ROLES.CAPTAIN, 2100);
assert.equal(memory.players.c.favors.b, undefined);
Engine.advanceExpired(memory, memory.deadline);
assert.equal(memory.players.c.favors.b, 1);
const restored = JSON.parse(JSON.stringify(memory));
Engine.normalizeState(restored);
assert.equal(restored.players.c.favors.b, 1);
restored.turnIndex = 0;
restored.players.c.influences[0].role = Rules.ROLES.CAPTAIN;
Engine.performAction(restored, 'a', Rules.ACTIONS.STEAL, 'b', 25000);
random = 0.2;
root.test.applyNextBotDecision(restored, 25100);
assert.equal(restored.pendingAction.block.uid, 'c');
assert.equal(restored.players.c.favors.b, 1);
Engine.advanceExpired(restored, restored.deadline);
assert.equal(restored.players.c.favors.b, 0);

const failed = fixture();
failed.players.b.influences.forEach(card => { card.role = Rules.ROLES.DUKE; });
Engine.performAction(failed, 'a', Rules.ACTIONS.STEAL, 'c', 2000);
Engine.declareBlock(failed, 'b', Rules.ROLES.CAPTAIN, 2100);
Engine.challengeBlock(failed, 'a', 2200);
Engine.revealChallenge(failed, 'b', failed.players.b.influences[0].id, 2300);
assert.equal(failed.players.c.favors.b, undefined);
assert.equal(failed.players.c.coins, 0);

const proven = fixture();
proven.players.b.influences[0].role = Rules.ROLES.CAPTAIN;
Engine.performAction(proven, 'a', Rules.ACTIONS.STEAL, 'c', 2000);
Engine.declareBlock(proven, 'b', Rules.ROLES.CAPTAIN, 2100);
Engine.challengeBlock(proven, 'a', 2200);
Engine.revealChallenge(proven, 'b', proven.players.b.influences[0].id, 2300);
Engine.loseInfluence(proven, 'a', proven.players.a.influences[0].id, 2400);
assert.equal(proven.players.c.favors.b, 1);
assert.equal(proven.players.c.coins, 2);

console.log('ranked-bots: self-preservation, probabilistic aid, gratitude, repayment, failed/proven blocks and reconnection passed');
