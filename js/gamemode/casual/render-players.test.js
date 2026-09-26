const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/render-players.js', 'utf8');
const window = {};
vm.runInNewContext(source, { window, document: {} });

const layout = window.CoupRenderPlayers.getMobileSeatLayout;
const landscapeLayout = window.CoupRenderPlayers.getLandscapeSeatLayout;
const formatPlayerName = window.CoupRenderPlayers.formatPlayerName;
const formatPlayerCoins = window.CoupRenderPlayers.formatPlayerCoins;
const normalize = (value) => JSON.parse(JSON.stringify(value));
const players = (occupied) => Object.fromEntries(
  occupied.map((pid) => [pid, { uid: `player-${pid}`, online: true }])
);

assert.equal(formatPlayerName('Gabriel Barbosa'), 'Gabriel Barbosa');
assert.equal(formatPlayerName('Gabriel Barbosa1'), 'Gabriel Barbosa...');
assert.equal(formatPlayerCoins(100), 99);
assert.equal(formatPlayerCoins(-1), 0);

assert.deepEqual(normalize(layout(players([1]), 8)), {
  visible: [1],
  hidden: [2, 3, 4, 5, 6, 7, 8],
  columns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(layout(players([1, 2]), 8)), {
  visible: [1, 2],
  hidden: [3, 4, 5, 6, 7, 8],
  columns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(layout(players([1, 2, 3]), 8)), {
  visible: [1, 2, 3],
  hidden: [4, 5, 6, 7, 8],
  columns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(layout(players([1, 2, 3, 4]), 8)), {
  visible: [1, 2, 3, 4],
  hidden: [5, 6, 7, 8],
  columns: 2,
  showBottomRow: false
});
assert.deepEqual(normalize(layout(players([1, 2, 3, 4, 5]), 8)), {
  visible: [1, 2, 3, 4, 5, 6],
  hidden: [7, 8],
  columns: 2,
  showBottomRow: true
});
assert.deepEqual(normalize(layout(players([1, 2, 4]), 8)), {
  visible: [1, 2, 3, 4],
  hidden: [5, 6, 7, 8],
  columns: 2,
  showBottomRow: false
});
assert.deepEqual(normalize(layout(players([1, 2, 4, 6, 8]), 8)), {
  visible: [1, 2, 3, 4, 5, 6, 7, 8],
  hidden: [],
  columns: 2,
  showBottomRow: true
});

assert.deepEqual(normalize(landscapeLayout(players([1]), 8)), {
  visible: [1, 2],
  hidden: [3, 4, 5, 6, 7, 8],
  topColumns: 2,
  bottomColumns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2]), 8)), {
  visible: [1, 2],
  hidden: [3, 4, 5, 6, 7, 8],
  topColumns: 2,
  bottomColumns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2, 3]), 8)), {
  visible: [1, 2, 3],
  hidden: [4, 5, 6, 7, 8],
  topColumns: 3,
  bottomColumns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2, 3, 4]), 8)), {
  visible: [1, 2, 3, 4],
  hidden: [5, 6, 7, 8],
  topColumns: 4,
  bottomColumns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2, 4]), 8)), {
  visible: [1, 2, 3, 4],
  hidden: [5, 6, 7, 8],
  topColumns: 4,
  bottomColumns: 1,
  showBottomRow: false
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2, 3, 4, 5]), 8)), {
  visible: [1, 2, 3, 4, 5, 6],
  hidden: [7, 8],
  topColumns: 4,
  bottomColumns: 2,
  showBottomRow: true
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2, 3, 4, 5, 6, 7]), 8)), {
  visible: [1, 2, 3, 4, 5, 6, 7],
  hidden: [8],
  topColumns: 4,
  bottomColumns: 3,
  showBottomRow: true
});
assert.deepEqual(normalize(landscapeLayout(players([1, 2, 3, 4, 5, 6, 7, 8]), 8)), {
  visible: [1, 2, 3, 4, 5, 6, 7, 8],
  hidden: [],
  topColumns: 4,
  bottomColumns: 4,
  showBottomRow: true
});

console.log('render-players: layout adaptativo de assentos aprovado');
