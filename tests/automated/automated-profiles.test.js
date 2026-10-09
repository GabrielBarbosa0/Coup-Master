const assert = require('node:assert/strict');

const ModelModule = require('../../js/gamemode/shared/automated-model.js');
const definitions = [
    {
        name: 'ranked',
        Rules: require('../../js/gamemode/ranked/ranked-rules.js'),
        ProfileModule: require('../../js/gamemode/ranked/ranked-profile.js')
    },
    {
        name: 'personalized',
        Rules: require('../../js/gamemode/personalized/personalized-rules.js'),
        ProfileModule: require('../../js/gamemode/personalized/personalized-profile.js')
    }
];

function normalizeState(state) {
    state.players = state.players || {};
    state.turnOrder = Array.isArray(state.turnOrder) ? state.turnOrder : [];
    state.matchStats = state.matchStats && typeof state.matchStats === 'object' ? state.matchStats : {};
    return state;
}

function createProfile(definition) {
    const Model = ModelModule.create(definition.Rules);
    return {
        ...definition,
        Model,
        Profile: definition.ProfileModule.create(definition.Rules, Model, { normalizeState })
    };
}

function createResultState(Rules) {
    return {
        status: Rules.PHASES.FINISHED,
        phase: Rules.PHASES.FINISHED,
        winnerUid: 'u1',
        matchId: 7,
        startedAt: 1000,
        finishedAt: 5000,
        turnNumber: 8,
        exchangeRole: Rules.ROLES.INQUISITOR,
        players: {
            u1: {
                uid: 'u1',
                name: 'Alice',
                photo: '',
                seat: 1,
                coins: 0,
                eliminated: false,
                influences: [
                    { id: 'c1', role: Rules.ROLES.CONTESSA, revealed: false },
                    { id: 'c2', role: Rules.ROLES.CONTESSA, revealed: false }
                ]
            },
            u2: {
                uid: 'u2',
                name: 'Bruno',
                photo: '',
                seat: 2,
                coins: 2,
                eliminated: true,
                influences: [
                    { id: 'c3', role: Rules.ROLES.DUKE, revealed: true },
                    { id: 'c4', role: Rules.ROLES.CAPTAIN, revealed: true }
                ]
            }
        },
        turnOrder: ['u1', 'u2'],
        matchStats: {
            u1: { actions: 3, bluffs: 1 },
            u2: {}
        }
    };
}

const profiles = definitions.map(createProfile);
assert.deepEqual(
    Object.keys(profiles[0].Profile).sort(),
    Object.keys(profiles[1].Profile).sort(),
    'Os perfis devem implementar o mesmo contrato.'
);

profiles.forEach(({ name, Rules, Profile }) => {
    const state = createResultState(Rules);
    const stats = Profile.ensureMatchStats(state, 'u1');
    assert.equal(stats.actions, 3);
    assert.equal(Object.hasOwn(stats, 'claimedRoles'), name === 'ranked');
    assert.equal(Object.hasOwn(stats, 'influencesLost'), name === 'ranked');

    const action = Rules.getAction(Rules.ACTIONS.TAX);
    Profile.onActionDeclared({ actorStats: stats, action, actionType: Rules.ACTIONS.TAX, isBluff: true });
    const metadata = Profile.createPendingActionMetadata({
        actor: { coins: Rules.SETTINGS.mandatoryCoupCoins - Rules.getAction(Rules.ACTIONS.COUP).cost },
        action: Rules.getAction(Rules.ACTIONS.COUP),
        actionType: Rules.ACTIONS.COUP
    });
    const challengeMetadata = Profile.createChallengeLossMetadata({ challengerUid: 'u2' });

    if (name === 'ranked') {
        assert.equal(stats.claimedRoles[Rules.ROLES.DUKE], true);
        assert.equal(stats.taxBluffs, 1);
        assert.equal(metadata.forcedCoup, true);
        assert.equal(challengeMetadata.causedByUid, 'u2');
    } else {
        assert.deepEqual(metadata, {});
        assert.deepEqual(challengeMetadata, {});
        assert.equal(Object.hasOwn(stats, 'taxBluffs'), false);
    }

    const results = Profile.buildMatchResults(state, 5000);
    assert.equal(results.winnerUid, 'u1');
    assert.equal(results.playerCount, 2);
    assert.equal(results.players.u1.performanceScore, Profile.calculateMatchPerformance(state, state.players.u1).total);
    assert.equal(Object.hasOwn(results.players.u1.matchStats, 'perfectWins'), name === 'ranked');
    assert.equal(Profile.getWinnerMessage(state.players.u1).includes(name === 'ranked' ? 'ranqueada' : 'personalizada'), true);
});

console.log('automated-profiles: contratos, estatísticas, metadados e resultados por modo aprovados');
