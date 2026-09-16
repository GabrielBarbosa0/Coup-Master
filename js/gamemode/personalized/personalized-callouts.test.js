const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('./personalized-rules.js');
const Engine = require('./personalized-engine.js');

function fixture() {
    let now = 1000;
    let timerId = 0;
    const timers = new Map();
    const root = {
        CoupPersonalizedRules: Rules,
        CoupPersonalizedEngine: Engine,
        setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
        clearTimeout(id) { timers.delete(id); }
    };
    const source = fs.readFileSync(require.resolve('./personalized-renderer.js'), 'utf8').replace('})(window);', `
        renderPlayers = () => {};
        root.test = {
            update(next) { const previous = state; state = next; updateRankPlayerCallouts(previous, next); },
            active() { return Array.from(rankPlayerCallouts.values()); },
            clear: clearAllRankPlayerCallouts
        };
    })(window);`);
    vm.runInNewContext(source, { window: root, Date: { now: () => now }, console });
    const state = Engine.createState(1000);
    Engine.joinPlayer(state, { uid: 'a', name: 'Lorde Sombra' }, 1000);
    Engine.joinPlayer(state, { uid: 'b', name: 'Augusto' }, 1000);
    state.status = 'active';
    Object.values(state.players).forEach(player => { player.influences = [{ id: player.uid, role: Rules.ROLES.DUKE, revealed: false }]; });
    state.log = [];
    root.test.update(state);
    function runUntil(target, throttled = false) {
        if (throttled) now = target;
        while (true) {
            const next = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            timers.delete(next[0]);
            if (!throttled) now = next[1].at;
            next[1].fn();
        }
        now = target;
    }
    return { test: root.test, state, runUntil, timers };
}

const challenge = { id: 'challenge', type: 'challenge', message: 'Lorde Sombra contestou Augusto.' };
const proof = { id: 'proof', type: 'challenge-result', message: 'Augusto provou ter Duque.' };
const concession = { id: 'concession', type: 'challenge-result', message: 'Augusto cedeu à contestação.' };

for (const answer of [proof, concession]) {
    const f = fixture();
    f.test.update({ ...f.state, log: [challenge, answer] });
    f.runUntil(1300);
    const first = f.test.active()[0];
    assert.equal(first.kind, 'challenge');
    f.runUntil(first.expiresAt + 349);
    assert.equal(f.test.active().length, 0);
    f.runUntil(first.expiresAt + 350);
    assert.equal(f.test.active()[0].uid, 'b');
    f.test.clear();
    assert.equal(f.timers.size, 0);
}

// Separate snapshots and a suspended tab must preserve the actual reading interval.
const f = fixture();
f.test.update({ ...f.state, log: [challenge] });
f.runUntil(1300);
f.test.update({ ...f.state, log: [challenge, proof] });
f.runUntil(2000);
assert.equal(f.test.active().length, 1);
assert.equal(f.test.active()[0].kind, 'challenge');

const suspended = fixture();
suspended.test.update({ ...suspended.state, log: [challenge, proof] });
suspended.runUntil(10000, true);
assert.equal(suspended.test.active().length, 1);
assert.equal(suspended.test.active()[0].kind, 'challenge');
suspended.runUntil(14149);
assert.equal(suspended.test.active().length, 0);
suspended.runUntil(14150);
assert.equal(suspended.test.active()[0].kind, 'proof');
console.log('personalized-callouts: batched/separate events, concession, suspended tab and cleanup passed');
