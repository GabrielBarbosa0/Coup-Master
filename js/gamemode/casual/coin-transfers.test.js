const assert = require('node:assert/strict');
const test = require('node:test');
const Transfers = require('./coin-transfers.js');

test('decompoe pagamentos do golpe em ouro e prata', () => {
  assert.deepEqual(Transfers.coinsForAction('coup', 7), ['gold', 'silver', 'silver']);
  assert.deepEqual(Transfers.coinsForAction('coup', 10), ['gold', 'gold']);
});

test('mantem assassinato e taxa inteiramente em prata', () => {
  assert.deepEqual(Transfers.coinsForAction('assassinate', 3), ['silver', 'silver', 'silver']);
  assert.deepEqual(Transfers.coinsForAction('tax', 3), ['silver', 'silver', 'silver']);
});

test('planeja os sentidos das acoes rapidas', () => {
  assert.deepEqual(Transfers.planQuickAction('coup', 1, 2, 10), {
    from: { kind: 'player', pid: 1 }, to: { kind: 'treasury' },
    coins: ['gold', 'gold']
  });
  assert.deepEqual(Transfers.planQuickAction('assassinate', 1, 2), {
    from: { kind: 'player', pid: 1 }, to: { kind: 'treasury' },
    coins: ['silver', 'silver', 'silver']
  });
  assert.deepEqual(Transfers.planQuickAction('tax', 1, 1), {
    from: { kind: 'treasury' }, to: { kind: 'player', pid: 1 },
    coins: ['silver', 'silver', 'silver']
  });
  assert.deepEqual(Transfers.planQuickAction('steal', 1, 2), {
    from: { kind: 'player', pid: 2 }, to: { kind: 'player', pid: 1 },
    coins: ['silver', 'silver']
  });
});
