const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('./ranked-rules.js');
const Engine = require('./ranked-engine.js');

(async () => {
    let now = 10000;
    let state = Engine.createState(now);
    state.deadline = 30000;
    const window = {
        CoupRankedRules: Rules, CoupRankedEngine: Engine,
        CoupRankedRenderer: { showError() {} }, location: { search: '?room=TEST' }
    };
    const source = fs.readFileSync(`${__dirname}/ranked-game.js`, 'utf8').replace('    boot();', `
        root.testTransaction = transaction;
        root.setTestRef = (ref) => { rankedStateRef = ref; };
    `);
    vm.runInNewContext(source, {
        window, URLSearchParams, document: { body: { dataset: {} } },
        Date: { now: () => now },
        db: { ref: () => ({ set: async () => {} }) }
    });
    window.setTestRef({ transaction: async (mutate, unused, optimistic) => {
        assert.equal(optimistic, false, 'Only committed snapshots may start the animation');
        const next = mutate(structuredClone(state));
        if (next) state = next;
        return { committed: Boolean(next) };
    } });
    await window.testTransaction((next) => {
        next.revealSequence = 2;
        next.publicReveals = [1, 2].map((sequence) => ({ sequence, role: 'duque', playerUid: 'a' }));
    });
    assert.equal(state.revealPresentation.events.length, 2);
    assert.equal(state.revealPresentation.timing.fadeInMs, 350);
    assert.equal(state.revealPresentation.timing.fadeOutMs, 450);
    assert.equal(state.revealPresentation.endsAt, now + 4840);
    assert.equal(state.deadline, 34840);
    await assert.rejects(window.testTransaction(() => { throw Error('Should not run'); }, { silent: true }));
    now += 4840;
    await window.testTransaction((next) => { next.updatedAt = now; });
    assert.equal(state.deadline, 34840, 'Do not extend deadlines twice for presence/duplicate snapshots');
    assert.equal(state.revealPresentation.endsAt, now);
    console.log('ranked-reveal: transaction pause, multiple cards, deadline and committed snapshots passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
