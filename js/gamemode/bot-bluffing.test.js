const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const mode of ['ranked', 'personalized']) {
    const title = mode === 'ranked' ? 'Ranked' : 'Personalized';
    const Rules = require(`./${mode}/${mode}-rules.js`);
    const Engine = require(`./${mode}/${mode}-engine.js`);
    let seed = 17;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const root = { [`Coup${title}Rules`]: Rules, [`Coup${title}Engine`]: Engine, location: { search: '?room=TEST' } };
    const source = fs.readFileSync(path.join(__dirname, mode, `${mode}-game.js`), 'utf8')
        .replace('    boot();', '    root.test = { chooseBotAction, chooseBotBlockClaim };');
    vm.runInNewContext(source, {
        window: root, document: { body: { dataset: {} } }, URLSearchParams,
        Math: Object.assign(Object.create(Math), { random })
    });
    function fixture(honesty) {
        const state = Engine.createState(1000);
        for (const uid of ['a', 'b', 'c']) Engine.joinPlayer(state, { uid, name: uid }, 1001);
        state.status = 'active';
        state.phase = Rules.PHASES.TURN;
        state.turnOrder = ['a', 'b', 'c'];
        state.exchangeRole = Rules.ROLES.AMBASSADOR;
        Object.values(state.players).forEach((player) => {
            player.coins = 3;
            player.influences = [Rules.ROLES.DUKE, Rules.ROLES.CONTESSA]
                .map((role, i) => ({ id: `${player.uid}-${i}`, role, revealed: false }));
        });
        state.players.a.ai = true;
        state.players.a.personality = { honesty, skepticism: 50, vengefulness: 50 };
        return state;
    }
    const rates = [];
    for (const honesty of [0, 50, 100]) {
        seed = 17;
        const state = fixture(honesty);
        let bluffs = 0;
        for (let i = 0; i < 5000; i++) {
            const action = root.test.chooseBotAction(state, state.players.a);
            const claim = Rules.getAction(action.type).claim;
            if (claim && !state.players.a.influences.some((card) => !card.revealed && card.role === claim)) bluffs++;
            assert.ok(Rules.isActionAvailable(state, action.type));
            if (action.targetUid) assert.notEqual(action.targetUid, 'a');
        }
        rates.push(bluffs / 5000);
    }
    assert.ok(rates[0] > 0.6 && rates[0] < 0.85);
    assert.ok(rates[1] > 0.3 && rates[1] < rates[0]);
    assert.equal(rates[2], 0);

    const poor = fixture(0);
    poor.players.a.coins = 2;
    poor.players.b.coins = poor.players.c.coins = 0;
    for (let i = 0; i < 500; i++) {
        const action = root.test.chooseBotAction(poor, poor.players.a);
        assert.notEqual(action.type, Rules.ACTIONS.STEAL);
        assert.notEqual(action.type, Rules.ACTIONS.ASSASSINATE);
    }
    poor.players.a.coins = 10;
    for (let i = 0; i < 100; i++) assert.equal(root.test.chooseBotAction(poor, poor.players.a).type, Rules.ACTIONS.COUP);

    const defenseRates = [];
    for (const honesty of [0, 50, 100]) {
        seed = 17;
        const state = fixture(honesty);
        state.players.a.influences = [{ id: 'last', role: Rules.ROLES.DUKE, revealed: false }];
        state.phase = Rules.PHASES.RESPONSE;
        state.pendingAction = { type: Rules.ACTIONS.ASSASSINATE, actorUid: 'b', targetUid: 'a', passes: {} };
        let blocks = 0;
        for (let i = 0; i < 2000; i++) if (root.test.chooseBotBlockClaim(state, state.players.a)) blocks++;
        defenseRates.push(blocks / 2000);
    }
    assert.ok(defenseRates[0] > 0.85);
    assert.ok(defenseRates[1] > 0.4 && defenseRates[1] < defenseRates[0]);
    assert.equal(defenseRates[2], 0);

    const state = fixture(0);
    seed = 123;
    const before = Array.from({ length: 200 }, () => JSON.stringify(root.test.chooseBotAction(state, state.players.a)));
    state.players.b.influences.forEach((card) => { card.role = Rules.ROLES.ASSASSIN; });
    seed = 123;
    const after = Array.from({ length: 200 }, () => JSON.stringify(root.test.chooseBotAction(state, state.players.a)));
    assert.deepEqual(after, before, 'Enemy hidden roles must not influence decisions');
    console.log(`${mode}: offensive bluff rates (honesty 0/50/100): ${rates.map((rate) => (rate * 100).toFixed(1) + '%').join(', ')}; defense, legal costs/targets and no hidden-card peeking passed`);
}
