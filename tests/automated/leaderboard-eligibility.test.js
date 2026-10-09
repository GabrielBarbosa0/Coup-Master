const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../../js/lobby/lobby-manager.js'), 'utf8');
const helper = source.match(/function isLeaderboardEligible\(entry\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(helper, 'O lobby deve declarar o criterio de elegibilidade da classificacao.');

const context = {};
vm.runInNewContext(`${helper}; result = [
    isLeaderboardEligible({ wins: 0, games: 12, rankScore: 100 }),
    isLeaderboardEligible({ wins: 1, games: 1, rankScore: 0 }),
    isLeaderboardEligible({ wins: '2' }),
    isLeaderboardEligible(null)
];`, context);

assert.deepEqual(Array.from(context.result), [false, true, true, false]);
console.log('leaderboard-eligibility: classificacao exige ao menos uma vitoria');
