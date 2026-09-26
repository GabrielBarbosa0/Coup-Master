const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const mode of ['ranked', 'personalized']) {
    const title = mode === 'ranked' ? 'Ranked' : 'Personalized';
    const Rules = require(`./${mode}/${mode}-rules.js`);
    const Engine = require(`./${mode}/${mode}-engine.js`);
    let value = 0.2;
    const root = { [`Coup${title}Rules`]: Rules, [`Coup${title}Engine`]: Engine, location: { search: '?room=TEST' } };
    const source = fs.readFileSync(path.join(__dirname, mode, `${mode}-game.js`), 'utf8')
        .replace('    boot();', '    root.test = { shouldChallengeClaim, chooseBotBlockClaim };');
    vm.runInNewContext(source, {
        window: root, document: { body: { dataset: {} } }, URLSearchParams,
        Math: Object.assign(Object.create(Math), { random: () => value })
    });
    const state = Engine.createState(1000);
    for (const uid of ['a', 'b']) Engine.joinPlayer(state, { uid, name: uid }, 1001);
    state.status = 'active';
    state.phase = Rules.PHASES.RESPONSE;
    state.turnOrder = ['a', 'b'];
    state.turnNumber = state.turnOrder.length + 1;
    state.pendingAction = { type: Rules.ACTIONS.ASSASSINATE, actorUid: 'a', targetUid: 'b', claim: Rules.ROLES.ASSASSIN, passes: {} };
    const bot = state.players.b;
    bot.ai = true;
    bot.personality = { honesty: 0, skepticism: 100, vengefulness: 100 };
    bot.grudges = { a: 999 };
    bot.influences = [Rules.ROLES.DUKE, Rules.ROLES.AMBASSADOR]
        .map((role, index) => ({ id: `b-${index}`, role, revealed: false }));
    const challenge = () => root.test.shouldChallengeClaim(state, bot, Rules.ROLES.ASSASSIN, 'a', true);
    const block = () => root.test.chooseBotBlockClaim(state, bot);
    assert.equal(challenge(), false, 'Skepticism and grudges cannot override survival caution');
    assert.equal(block(), null);
    value = 0.1;
    assert.equal(block(), Rules.ROLES.CONTESSA, 'Bluffing remains possible');
    state.matchStats.a = { challenges: 8 };
    assert.equal(block(), null, 'Frequent challengers discourage a false Contessa');
    value = 0.12;
    assert.equal(challenge(), false);
    state.matchStats.a.provenBluffs = 3;
    assert.equal(challenge(), true, 'Publicly exposed bluffs increase suspicion');
    state.matchStats.a.assassinations = 4;
    assert.equal(challenge(), false, 'Prior successful attacks temper suspicion');
    bot.influences[1].role = Rules.ROLES.CONTESSA;
    value = 0;
    assert.equal(block(), Rules.ROLES.CONTESSA);
    assert.equal(challenge(), false, 'A real Contessa avoids a risky challenge');
    bot.influences[1].role = Rules.ROLES.AMBASSADOR;
    value = 0.5;
    state.discard = Array.from({ length: Rules.SETTINGS.cardsPerRole - 1 }, (_, i) => ({ id: `d-${i}`, role: Rules.ROLES.ASSASSIN }));
    state.players.a.influences = state.discard.map((card) => ({ ...card, revealed: true }));
    assert.equal(challenge(), false, 'Do not double-count the same revealed/discarded card');
    state.discard.push({ id: 'last-assassin', role: Rules.ROLES.ASSASSIN });
    assert.equal(challenge(), true, 'Public certainty still permits challenging');
    state.discard = [];
    state.players.a.influences = [];
    bot.influences.pop();
    assert.equal(block(), Rules.ROLES.CONTESSA, 'Last-influence defense remains aggressive');
    assert.equal(challenge(), true, 'With one influence there is no extra card to preserve');
    console.log(`${mode}: double-loss caution, public opponent history, real Contessa, known-card deduplication and last-influence survival passed`);
}
