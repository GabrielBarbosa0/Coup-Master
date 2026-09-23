const test = require('node:test');
const assert = require('node:assert/strict');
const Achievements = require('./ranked-achievements.js');

const qualifyingStats = {
    wins: 1, games: 100, honestGames: 1, honestWins: 5, bluffs: 50,
    perfectBluffWins: 1, bestWinStreak: 10, comebackWins: 1,
    finalInfluenceWins: 1, perfectWins: 1, coups: 50, assassinations: 50,
    contestedAssassinsWon: 1, steals: 10, coinsStolen: 25,
    successfulChallenges: 25, challenges: 10, challengeAccuracy: 0.7,
    failedChallenges: 10, doubleContessaWins: 1, condessaBlocks: 10,
    falseCondessaBluffs: 1, ambassadorExchanges: 10, inquisitorInspections: 10,
    actions: 100, rankScore: 500, dukeTaxes: 25, foreignAidBlocks: 10,
    taxBluffs: 10, captainBlocks: 10, ambassadorBlocks: 10, forcedCoups: 5,
    winsAsFirstPlayer: 1, winsAgainstFivePlayers: 1, winsWithNoCoins: 1,
    fastestWins: 1, longestGamesWon: 1, revengeWins: 1,
    flawlessChallenges: 1, allRolesClaimedWins: 1
};

test('todas as conquistas possuem uma condição alcançável', () => {
    const unlocked = Achievements.evaluate(qualifyingStats);
    assert.equal(Achievements.keys.length, 50);
    Achievements.keys.forEach((key) => assert.equal(unlocked[key], true, key));
});

test('desbloqueios permanecem mesmo se uma estatística variável cair', () => {
    const first = Achievements.evaluate({ rankScore: 500, challenges: 10, challengeAccuracy: 0.7 });
    const later = Achievements.evaluate({
        rankScore: 100,
        challenges: 20,
        challengeAccuracy: 0.4,
        unlockedAchievements: first
    });
    assert.equal(later.nobleScore, true);
    assert.equal(later.preciseAccuser, true);
});

test('Santo improvável exige vitórias honestas', () => {
    assert.equal(Achievements.evaluate({ honestGames: 20, honestWins: 4 }).unlikelySaint, undefined);
    assert.equal(Achievements.evaluate({ honestWins: 5 }).unlikelySaint, true);
});
