import assert from 'node:assert/strict';
import {
  drawCardFromTableState,
  mergeTableStates
} from '../js/firebase/table-state-merge.mjs';

function card(id, owner = null, location = 'deck') {
  return {
    id,
    type: 'duque',
    folder: 'base',
    faceUp: owner !== null,
    location,
    owner
  };
}

function entry(data, x = 0) {
  return {
    data,
    position: { x, y: 0.42, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 }
  };
}

function state(overrides = {}) {
  return {
    version: 1,
    deckConfig: {},
    deck: [card('card-1'), card('card-2'), card('card-3')],
    deckTransform: null,
    objectId: 1,
    stackId: 1,
    players: [
      { id: 1, coinCount: 0, cards: [] },
      { id: 5, coinCount: 0, cards: [] }
    ],
    tableCards: [],
    cards: [],
    objects: [],
    stacks: [],
    ...overrides
  };
}

const base = state({
  deck: [card('card-3')],
  tableCards: [card('card-1', null, 'table'), card('card-2', null, 'table')],
  cards: [
    entry(card('card-1', null, 'table'), -1),
    entry(card('card-2', null, 'table'), 1)
  ]
});
const localMove = state({
  ...base,
  cards: [
    entry(card('card-1', null, 'table'), -2),
    entry(card('card-2', null, 'table'), 1)
  ]
});
const remoteMove = state({
  ...base,
  cards: [
    entry(card('card-1', null, 'table'), -1),
    entry(card('card-2', null, 'table'), 2)
  ]
});
const mergedMoves = mergeTableStates(base, localMove, remoteMove);
assert.equal(mergedMoves.cards.find(item => item.data.id === 'card-1').position.x, -2);
assert.equal(mergedMoves.cards.find(item => item.data.id === 'card-2').position.x, 2);

const mergedCoins = mergeTableStates(
  state(),
  state({ objects: [{ id: 'coin-local', kind: 'gold-coin' }] }),
  state({ objects: [{ id: 'coin-remote', kind: 'silver-coin' }] })
);
assert.deepEqual(mergedCoins.objects.map(item => item.id).sort(), ['coin-local', 'coin-remote']);

const mergedWithoutBase = mergeTableStates(
  null,
  state({ objects: [{ id: 'coin-first-client', kind: 'gold-coin' }] }),
  state({ objects: [{ id: 'coin-second-client', kind: 'silver-coin' }] })
);
assert.deepEqual(
  mergedWithoutBase.objects.map(item => item.id).sort(),
  ['coin-first-client', 'coin-second-client']
);

const firstLocalScene = state({
  objects: [{ id: 'coin-local-a', kind: 'gold-coin' }]
});
const firstCommittedState = state({
  objects: [
    { id: 'coin-local-a', kind: 'gold-coin' },
    { id: 'coin-remote', kind: 'silver-coin' }
  ]
});
const newerLocalScene = state({
  objects: [
    { id: 'coin-local-a', kind: 'gold-coin' },
    { id: 'coin-local-b', kind: 'gold-coin' }
  ]
});
const rebasedLocalState = mergeTableStates(
  firstLocalScene,
  newerLocalScene,
  firstCommittedState
);
assert.deepEqual(
  rebasedLocalState.objects.map(item => item.id).sort(),
  ['coin-local-a', 'coin-local-b', 'coin-remote']
);

const mergedCounters = mergeTableStates(
  state(),
  state({ players: [{ id: 1, coinCount: 1, cards: [] }, { id: 5, coinCount: 0, cards: [] }] }),
  state({ players: [{ id: 1, coinCount: 1, cards: [] }, { id: 5, coinCount: 0, cards: [] }] })
);
assert.equal(mergedCounters.players.find(player => player.id === 1).coinCount, 2);

const drawBase = state();
const localDraw = state({
  deck: [card('card-1'), card('card-2')],
  cards: [entry(card('card-3', 5, 'player-5'), 1)]
});
const remoteDraw = state({
  deck: [card('card-1'), card('card-2')],
  cards: [entry(card('card-3', 1, 'player-1'), -1)]
});
const mergedDraws = mergeTableStates(drawBase, localDraw, remoteDraw);
assert.equal(mergedDraws.deck.length, 1);
assert.equal(mergedDraws.cards.length, 2);
assert.deepEqual(mergedDraws.cards.map(item => item.data.owner).sort(), [1, 5]);
assert.equal(new Set(mergedDraws.cards.map(item => item.data.id)).size, 2);

const firstAtomicDraw = drawCardFromTableState(state(), 1, 'draw-player-1');
const secondAtomicDraw = drawCardFromTableState(firstAtomicDraw.state, 5, 'draw-player-5');
assert.notEqual(firstAtomicDraw.card.id, secondAtomicDraw.card.id);
assert.equal(firstAtomicDraw.card.owner, 1);
assert.equal(secondAtomicDraw.card.owner, 5);
assert.equal(secondAtomicDraw.state.deck.length, 1);
assert.deepEqual(
  secondAtomicDraw.state.cards.map(item => item.data.owner).sort(),
  [1, 5]
);

const repeatedAtomicDraw = drawCardFromTableState(
  secondAtomicDraw.state,
  1,
  'draw-player-1'
);
assert.equal(repeatedAtomicDraw.card.id, firstAtomicDraw.card.id);
assert.equal(repeatedAtomicDraw.state.deck.length, 1);

console.log('table-state-merge: ok');
