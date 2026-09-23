(function initializeRankedAchievements(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.CoupRankedAchievements = api;
})(typeof window !== 'undefined' ? window : null, function createRankedAchievements() {
    const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const requirements = Object.freeze({
        firstWin: (s) => number(s.wins) >= 1,
        courtEntry: (s) => number(s.games) >= 1,
        knownName: (s) => number(s.games) >= 5,
        intrigueVeteran: (s) => number(s.games) >= 25,
        tableLegend: (s) => number(s.games) >= 100,
        honestPlayer: (s) => number(s.honestGames) >= 1,
        unlikelySaint: (s) => number(s.honestWins) >= 5,
        cleverLiar: (s) => number(s.bluffs) >= 10,
        lieGod: (s) => number(s.bluffs) >= 50,
        perfectBluff: (s) => number(s.perfectBluffWins) >= 1,
        royalStreak: (s) => number(s.bestWinStreak) >= 3,
        marchingDynasty: (s) => number(s.bestWinStreak) >= 5,
        undefeatedCrown: (s) => number(s.bestWinStreak) >= 10,
        comeback: (s) => number(s.comebackWins) >= 1,
        lastInfluence: (s) => number(s.finalInfluenceWins) >= 1,
        flawlessWin: (s) => number(s.perfectWins) >= 1,
        heavyHand: (s) => number(s.coups) >= 10,
        takenThrone: (s) => number(s.coups) >= 25,
        officialRegicide: (s) => number(s.coups) >= 50,
        courtShadow: (s) => number(s.assassinations) >= 10,
        ruthlessAssassin: (s) => number(s.assassinations) >= 25,
        noWitnesses: (s) => number(s.assassinations) >= 50,
        contestedBlade: (s) => number(s.contestedAssassinsWon) >= 1,
        portlessCaptain: (s) => number(s.steals) >= 10,
        lootedTreasury: (s) => number(s.coinsStolen) >= 25,
        bluffHunterAchievement: (s) => number(s.successfulChallenges) >= 10,
        inquisitorEyes: (s) => number(s.successfulChallenges) >= 25,
        preciseAccuser: (s) => number(s.challenges) >= 10 && number(s.challengeAccuracy) >= 0.7,
        falseProphet: (s) => number(s.failedChallenges) >= 10,
        twoContessas: (s) => number(s.doubleContessaWins) >= 1,
        contessaWall: (s) => number(s.condessaBlocks) >= 10,
        fakeContessa: (s) => number(s.falseCondessaBluffs) >= 1,
        tirelessAmbassador: (s) => number(s.ambassadorExchanges) >= 10,
        attentiveInquisitor: (s) => number(s.inquisitorInspections) >= 10,
        movingCourt: (s) => number(s.actions) >= 100,
        nobleScore: (s) => number(s.rankScore) >= 500,
        declaredDuke: (s) => number(s.dukeTaxes) >= 25,
        closedGates: (s) => number(s.foreignAidBlocks) >= 10,
        imaginaryDuke: (s) => number(s.taxBluffs) >= 10,
        captainPatrol: (s) => number(s.captainBlocks) >= 10,
        alertDiplomat: (s) => number(s.ambassadorBlocks) >= 10,
        heavySevenCoins: (s) => number(s.forcedCoups) >= 5,
        firstVoice: (s) => number(s.winsAsFirstPlayer) >= 1,
        fullTableThrone: (s) => number(s.winsAgainstFivePlayers) >= 1,
        noCoinsNoFear: (s) => number(s.winsWithNoCoins) >= 1,
        lightningCoup: (s) => number(s.fastestWins) >= 1,
        courtMarathon: (s) => number(s.longestGamesWon) >= 1,
        coldRevenge: (s) => number(s.revengeWins) >= 1,
        perfectJudgment: (s) => number(s.flawlessChallenges) >= 1,
        courtMasks: (s) => number(s.allRolesClaimedWins) >= 1
    });

    function evaluate(stats = {}) {
        const unlocked = { ...(stats.unlockedAchievements || {}) };
        Object.entries(requirements).forEach(([key, requirement]) => {
            if (unlocked[key] || requirement(stats)) unlocked[key] = true;
        });
        return unlocked;
    }

    return Object.freeze({ keys: Object.freeze(Object.keys(requirements)), requirements, evaluate });
});
