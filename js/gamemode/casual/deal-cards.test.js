const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function load() {
  const listeners = {};
  const window = { addEventListener() {} };
  const document = {
    addEventListener: (name, handler) => { listeners[name] = handler; },
    querySelectorAll: () => [],
    querySelector: () => null
  };
  vm.runInNewContext(fs.readFileSync(`${__dirname}/deal-cards.js`, 'utf8'), { window, document });
  return { ...window.CoupCasualDeal, listeners };
}

function fixture(count = 12) {
  return {
    deck: Array.from({ length: count }, (_, id) => ({ id: `deck-${id}`, owner: null, visible: false, location: 'deck' })),
    freeCards: [{ id: 'grave', owner: null, visible: true, location: 'free' }],
    players: {
      1: { uid: 'host', online: true, hand: [] },
      2: { uid: 'bot', online: true, hand: [{ id: 'held', owner: 2, visible: false, location: 'player-2' }] },
      3: { uid: 'full', online: true, hand: [{ id: 'full-1' }, { id: 'full-2' }] },
      4: { uid: null, online: false },
      5: { uid: 'offline', online: false }
    }
  };
}

test('completa apenas maos presentes abaixo de duas, em rodadas', () => {
  const { applyDeal } = load();
  const state = fixture();
  const before = structuredClone(state);
  assert.equal(applyDeal(state, 'deal-1'), state);
  assert.deepEqual(Array.from(state.lastDeal.cards, (card) => card.pid), [1, 2, 1]);
  assert.equal(state.deck.length, 9);
  assert.equal(state.players[1].hand.length, 2);
  assert.equal(state.players[2].hand.length, 2);
  for (const pid of [3, 4, 5]) assert.deepEqual(state.players[pid], before.players[pid]);
  assert.deepEqual(state.freeCards, before.freeCards);
  const cards = [...state.deck, ...state.freeCards, ...Object.values(state.players).flatMap((p) => p.hand || [])];
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  for (const item of state.lastDeal.cards) {
    const card = state.players[item.pid].hand.find((card) => card.id === item.id);
    assert.equal(card.owner, item.pid);
    assert.equal(card.location, `player-${item.pid}`);
    assert.equal(card.visible, false);
  }
});

test('baralho insuficiente distribui so o que existe, sem criar cartas', () => {
  const state = fixture(2);
  load().applyDeal(state, 'short');
  assert.equal(state.deck.length, 0);
  assert.equal(state.players[1].hand.length, 1);
  assert.equal(state.players[2].hand.length, 2);
});

test('repetir comando/transacao nao ultrapassa duas nem altera evento sem distribuicao', () => {
  const { applyDeal } = load();
  const state = fixture();
  applyDeal(state, 'first');
  const before = structuredClone(state);
  assert.equal(applyDeal(state, 'retry'), undefined);
  assert.equal(JSON.stringify(state), JSON.stringify(before));
});

test('nao remove cartas de maos maiores nem atua em estado vazio', () => {
  const { applyDeal } = load();
  assert.equal(applyDeal(null, 'empty'), undefined);
  assert.equal(applyDeal(fixture(0), 'empty'), undefined);
  const state = fixture();
  state.players[1].hand = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  applyDeal(state, 'large');
  assert.equal(state.players[1].hand.length, 3);
});

test('atalho ignora digitacao, repeticao, modificadores e usuarios sem controle', () => {
  const service = load();
  let calls = 0;
  let allowed = true;
  service.setup({ canDeal: () => allowed, deal: () => calls++ });
  const key = (changes = {}) => service.listeners.keydown({ key: 'd', preventDefault() {}, ...changes });
  key();
  assert.equal(calls, 1);
  for (const flag of ['repeat', 'ctrlKey', 'altKey', 'metaKey', 'shiftKey', 'isComposing', 'defaultPrevented']) key({ [flag]: true });
  key({ target: { isContentEditable: true } });
  key({ target: { closest: () => ({}) } });
  key({ key: 'a' });
  allowed = false;
  key();
  assert.equal(calls, 1);
});
