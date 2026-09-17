const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function fixture(mode) {
    let now = 10000;
    let frames = [];
    const title = mode === 'ranked' ? 'Ranked' : 'Personalized';
    const folder = path.join(__dirname, '..', mode);
    const root = {
        [`Coup${title}Rules`]: require(path.join(folder, `${mode}-rules.js`)),
        [`Coup${title}Engine`]: require(path.join(folder, `${mode}-engine.js`)),
        addEventListener() {}, matchMedia: () => ({ matches: false }),
        requestAnimationFrame(fn) { frames.push(fn); }
    };
    const body = { children: [], append(node) { this.children.push(node); } };
    const node = () => ({
        inert: false, setAttribute() {}, replaceChildren() {}, focus() {},
        animate: () => ({ pause() {}, cancel() {}, currentTime: 0 }),
        remove() { body.children = body.children.filter((child) => child !== this); }
    });
    body.children.push(node());
    const context = vm.createContext({
        window: root, document: { body, createElement: node, activeElement: null },
        Date: { now: () => now }, Image: function () {}, console
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'ranked-reveal.js'), 'utf8'), context);
    const renderer = fs.readFileSync(path.join(folder, `${mode}-renderer.js`), 'utf8').replace('})(window);', `
        playStateSfx = updateRankPlayerCallouts = renderPhase = renderStarterDrawOverlay =
            renderMatchResultsModal = renderLog = updateClock = hideLoading = syncSideStackHeight = () => {};
        renderPlayers = () => { root.visible = JSON.parse(JSON.stringify(state)); };
        root.redraw = renderPlayers;
    })(window);`);
    vm.runInContext(renderer, context);
    async function advance(ms) {
        now += ms;
        const pending = frames;
        frames = [];
        pending.forEach((fn) => fn());
        for (let i = 0; i < 8; i++) await Promise.resolve();
    }
    const render = root[`Coup${title}Renderer`].render;
    const state = { matchId: 1, revealSequence: 0, players: { a: { influences: [{ id: 'a', role: 'duque', revealed: false }] } } };
    render(state);
    state.players.a.influences[0].revealed = true;
    root.redraw();
    assert.equal(root.visible.players.a.influences[0].revealed, false, 'Redraw must use an isolated visual snapshot');
    state.revealSequence = 1;
    state.publicReveals = [{ sequence: 1, playerUid: 'a', role: 'duque', cardId: 'a', kind: 'challengeLoss' }];
    state.revealPresentation = { id: '1:1', endsAt: now - 500, events: state.publicReveals };
    render(state);
    assert.equal(body.children.length, 2, 'An expired timestamp must not skip a fresh reveal');
    root.redraw();
    assert.equal(root.visible.players.a.influences[0].revealed, false);
    await advance(1000);
    render(JSON.parse(JSON.stringify(state)));
    root.redraw();
    assert.equal(root.visible.players.a.influences[0].revealed, false, 'Presence updates cannot expose the card');
    await advance(1420);
    assert.equal(body.children.length, 1);
    assert.equal(root.visible.players.a.influences[0].revealed, true);
    render(state);
    assert.equal(body.children.length, 1, 'Duplicate events cannot replay the animation');
    const queued = JSON.parse(JSON.stringify(state));
    queued.revealSequence = 2;
    queued.publicReveals.push({ ...queued.publicReveals[0], sequence: 2 });
    queued.revealPresentation = { id: '1:2', events: [queued.publicReveals[1]], endsAt: now - 1 };
    render(queued);
    await advance(1000);
    queued.revealSequence = 3;
    queued.publicReveals.push({ ...queued.publicReveals[0], sequence: 3 });
    queued.revealPresentation = { id: '1:3', events: [queued.publicReveals[2]], endsAt: now - 1 };
    render(queued);
    await advance(1420);
    assert.equal(root.visible.revealSequence, 1, 'Buffered updates must wait for all unseen reveals');
    assert.equal(body.children.length, 2);
    await advance(2420);
    assert.equal(root.visible.revealSequence, 3);
    assert.equal(body.children.length, 1);
    console.log(`${mode}: isolated snapshot, late reveal, redraws, presence and deduplication passed`);
}

(async () => { await fixture('ranked'); await fixture('personalized'); })()
    .catch((error) => { console.error(error); process.exitCode = 1; });
