const assert = require('node:assert/strict');

const implementations = [
    {
        name: 'ranked',
        Rules: require('../../js/gamemode/ranked/ranked-rules.js'),
        Engine: require('../../js/gamemode/ranked/ranked-engine.js')
    },
    {
        name: 'personalized',
        Rules: require('../../js/gamemode/personalized/personalized-rules.js'),
        Engine: require('../../js/gamemode/personalized/personalized-engine.js')
    }
];

function createStartedState({ Engine, Rules }) {
    const state = Engine.createState(1000);
    ['Alice', 'Bruno', 'Celia'].forEach((name, index) => {
        Engine.joinPlayer(state, { uid: `u${index + 1}`, name }, 1001 + index);
    });
    Engine.getPlayers(state).forEach((player, index) => {
        Engine.toggleReady(state, player.uid, 1010 + index, () => 0);
    });
    Engine.advanceExpired(state, state.deadline + 1, () => 0);
    Engine.advanceExpired(state, state.deadline + 1);
    Engine.advanceExpired(state, state.deadline + 1);
    state.turnOrder = ['u1', 'u2', 'u3'];
    state.turnIndex = 0;
    state.turnNumber = 1;
    state.phase = Rules.PHASES.TURN;
    return state;
}

function settleStartAnimation({ Engine, Rules }, state) {
    if (state.phase === Rules.PHASES.ANIMATING) {
        Engine.advanceExpired(state, state.deadline);
    }
}

function passAll(implementation, state, uids) {
    uids.forEach((uid) => implementation.Engine.passResponse(state, uid, state.updatedAt + 1));
}

implementations.forEach((implementation) => {
    const { Engine, Rules, name } = implementation;

    const tax = createStartedState(implementation);
    tax.players.u1.influences.forEach((card) => { card.role = Rules.ROLES.CAPTAIN; });
    Engine.performAction(tax, 'u1', Rules.ACTIONS.TAX, null, 2000);
    assert.equal(Object.hasOwn(tax.pendingAction, 'forcedCoup'), name === 'ranked');
    passAll(implementation, tax, ['u2', 'u3']);
    assert.equal(tax.players.u1.coins, 5);
    assert.equal(tax.matchStats.u1.actions, 1);
    assert.equal(tax.matchStats.u1.bluffs, 1);
    if (name === 'ranked') {
        assert.equal(tax.matchStats.u1.claimedRoles[Rules.ROLES.DUKE], true);
        assert.equal(tax.matchStats.u1.taxBluffs, 1);
        assert.equal(tax.matchStats.u1.dukeTaxes, 1);
    } else {
        assert.equal(Object.hasOwn(tax.matchStats.u1, 'claimedRoles'), false);
    }

    const coup = createStartedState(implementation);
    coup.players.u1.coins = Rules.SETTINGS.mandatoryCoupCoins;
    Engine.performAction(coup, 'u1', Rules.ACTIONS.COUP, 'u2', 3000);
    assert.equal(Object.hasOwn(coup.pendingAction, 'forcedCoup'), name === 'ranked');
    if (name === 'ranked') assert.equal(coup.pendingAction.forcedCoup, true);
    settleStartAnimation(implementation, coup);
    assert.equal(coup.matchStats.u1.coups, 1);
    if (name === 'ranked') assert.equal(coup.matchStats.u1.forcedCoups, 1);

    const block = createStartedState(implementation);
    Engine.performAction(block, 'u1', Rules.ACTIONS.FOREIGN_AID, null, 4000);
    Engine.declareBlock(block, 'u2', Rules.ROLES.DUKE, 4100);
    passAll(implementation, block, ['u1', 'u3']);
    assert.equal(block.players.u1.coins, Rules.SETTINGS.startingCoins);
    assert.equal(block.matchStats.u2.blockedActions, 1);
    if (name === 'ranked') {
        assert.equal(block.matchStats.u2.claimedRoles[Rules.ROLES.DUKE], true);
        assert.equal(block.matchStats.u2.foreignAidBlocks, 1);
    }
});

console.log('automated-actions: ações, custos, bloqueios e telemetria por perfil aprovados');
