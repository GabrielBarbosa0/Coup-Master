const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '../..');
const Rules = require('../../js/gamemode/shared/automated-rules.js');
const ModelModule = require('../../js/gamemode/shared/automated-model.js');
const Model = ModelModule.create(Rules);

function influence(id, role = Rules.ROLES.DUKE, revealed = false) {
    return { id, role, revealed };
}

function createState() {
    return {
        phase: Rules.PHASES.TURN,
        players: {
            u3: { uid: 'u3', seat: 3, coins: 4, eliminated: false, influences: [influence('c3')] },
            u1: { uid: 'u1', seat: 1, coins: 2, eliminated: false, influences: [influence('c1')] },
            u2: { uid: 'u2', seat: 2, coins: 1, eliminated: false, influences: [influence('c2')] }
        },
        turnOrder: ['u1', 'u2', 'u3'],
        turnIndex: 0,
        pendingAction: null,
        exchangeRole: Rules.ROLES.INQUISITOR
    };
}

function testBasicQueriesArePure() {
    const state = createState();
    const before = JSON.stringify(state);

    assert.deepEqual(Model.getPlayers(state).map((player) => player.uid), ['u1', 'u2', 'u3']);
    assert.deepEqual(Model.getAlivePlayers(state).map((player) => player.uid), ['u1', 'u2', 'u3']);
    assert.equal(Model.getPlayer(state, 'u2').uid, 'u2');
    assert.equal(Model.getPlayer(state, 'missing'), null);
    assert.equal(Model.getActiveUid(state), 'u1');
    assert.equal(Model.nextFreeSeat(state), 4);
    assert.equal(Model.countInfluences(state.players.u1), 1);
    assert.deepEqual(Model.getActionTargets(state, 'u1', Rules.ACTIONS.STEAL).map((player) => player.uid), ['u3']);
    assert.deepEqual(Model.getActionTargets(state, 'u1', Rules.ACTIONS.COUP).map((player) => player.uid), ['u2', 'u3']);
    assert.equal(JSON.stringify(state), before, 'As consultas não devem alterar o estado.');
}

function testAlivePlayersAndWinner() {
    const state = createState();
    assert.equal(Model.getWinner(state), null);

    state.players.u2.eliminated = true;
    state.players.u3.influences[0].revealed = true;
    assert.deepEqual(Model.getAlivePlayers(state).map((player) => player.uid), ['u1']);
    assert.equal(Model.getWinner(state).uid, 'u1');
}

function testResponsesAndVariantBlocks() {
    const state = createState();
    state.phase = Rules.PHASES.RESPONSE;
    state.pendingAction = {
        type: Rules.ACTIONS.STEAL,
        actorUid: 'u1',
        targetUid: 'u2',
        claim: Rules.ROLES.CAPTAIN,
        claimConfirmed: false,
        passes: {}
    };

    assert.deepEqual(
        Model.getBlockClaimsForPlayer(state, 'u2'),
        [Rules.ROLES.CAPTAIN, Rules.ROLES.INQUISITOR]
    );
    assert.deepEqual(Model.getBlockClaimsForPlayer(state, 'u3'), [Rules.ROLES.CAPTAIN]);
    assert.deepEqual(Model.getResponseUids(state), ['u2', 'u3']);

    state.pendingAction.passes.u3 = true;
    assert.equal(Model.canPlayerRespondToAction(state, 'u3'), false);
    assert.deepEqual(Model.getResponseUids(state), ['u2']);
}

function testBrowserLoadingOrder() {
    const sharedRulesPath = path.join(root, 'js/gamemode/shared/automated-rules.js');
    const modelPath = path.join(root, 'js/gamemode/shared/automated-model.js');
    const actionsPath = path.join(root, 'js/gamemode/shared/automated-actions.js');
    const cardsPath = path.join(root, 'js/gamemode/shared/automated-cards.js');
    const turnsPath = path.join(root, 'js/gamemode/shared/automated-turns.js');
    const lifecyclePath = path.join(root, 'js/gamemode/shared/automated-lifecycle.js');
    const modes = [
        { name: 'ranked', globalName: 'CoupRankedEngine', pages: ['ranked/ranked.html', 'ranked/ranked-waiting.html'] },
        { name: 'personalized', globalName: 'CoupPersonalizedEngine', pages: ['personalized/personalized.html', 'personalized/personalized-waiting.html'] }
    ];

    modes.forEach((mode) => {
        const rulesPath = path.join(root, `js/gamemode/${mode.name}/${mode.name}-rules.js`);
        const profilePath = path.join(root, `js/gamemode/${mode.name}/${mode.name}-profile.js`);
        const enginePath = path.join(root, `js/gamemode/${mode.name}/${mode.name}-engine.js`);
        const context = vm.createContext({ window: {} });
        [
            sharedRulesPath,
            rulesPath,
            modelPath,
            actionsPath,
            cardsPath,
            turnsPath,
            lifecyclePath,
            profilePath,
            enginePath
        ].forEach((file) => {
            vm.runInContext(fs.readFileSync(file, 'utf8'), context);
        });
        assert.ok(context.window[mode.globalName]);

        mode.pages.forEach((relativePage) => {
            const html = fs.readFileSync(path.join(root, relativePage), 'utf8');
            const rulesIndex = html.indexOf(`js/gamemode/${mode.name}/${mode.name}-rules.js`);
            const modelIndex = html.indexOf('js/gamemode/shared/automated-model.js');
            const actionsIndex = html.indexOf('js/gamemode/shared/automated-actions.js');
            const cardsIndex = html.indexOf('js/gamemode/shared/automated-cards.js');
            const turnsIndex = html.indexOf('js/gamemode/shared/automated-turns.js');
            const lifecycleIndex = html.indexOf('js/gamemode/shared/automated-lifecycle.js');
            const profileIndex = html.indexOf(`js/gamemode/${mode.name}/${mode.name}-profile.js`);
            const engineIndex = html.indexOf(`js/gamemode/${mode.name}/${mode.name}-engine.js`);
            assert.ok(rulesIndex >= 0 && modelIndex > rulesIndex && actionsIndex > modelIndex
                && cardsIndex > actionsIndex && turnsIndex > cardsIndex
                && lifecycleIndex > turnsIndex && profileIndex > lifecycleIndex && engineIndex > profileIndex,
            `${relativePage} não respeita a ordem regras -> modelo -> ações -> cartas -> turnos -> ciclo -> perfil -> motor.`);
        });
    });
}

testBasicQueriesArePure();
testAlivePlayersAndWinner();
testResponsesAndVariantBlocks();
testBrowserLoadingOrder();

console.log('automated-model: consultas puras, alvos, respostas e carregamento aprovados');
