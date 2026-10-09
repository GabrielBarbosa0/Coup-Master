const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const LifecycleModule = require('../../js/gamemode/shared/automated-lifecycle.js');
const RankedRules = require('../../js/gamemode/ranked/ranked-rules.js');
const RankedEngine = require('../../js/gamemode/ranked/ranked-engine.js');
const PersonalizedRules = require('../../js/gamemode/personalized/personalized-rules.js');
const PersonalizedEngine = require('../../js/gamemode/personalized/personalized-engine.js');

const commonFunctionNames = [
    'createState',
    'joinPlayer',
    'addAiPlayer',
    'setConnected',
    'leaveWaitingRoom',
    'toggleReady',
    'updateReadyCountdown',
    'maybeStart',
    'restartMatch',
    'completeStarterDraw',
    'completeInitialDeal',
    'bumpGrudge'
];

function readEngine(mode) {
    return fs.readFileSync(path.join(root, `js/gamemode/${mode}/${mode}-engine.js`), 'utf8');
}

function testAdaptersDoNotReimplementLifecycle() {
    ['ranked', 'personalized'].forEach((mode) => {
        const source = readEngine(mode);
        commonFunctionNames.forEach((functionName) => {
            assert.equal(
                source.includes(`function ${functionName}(`),
                false,
                `${mode}-engine.js voltou a implementar ${functionName}.`
            );
        });
        assert.equal(source.includes('AutomatedLifecycle.create('), true);
    });

    assert.equal(readEngine('ranked').includes('function advanceMatchmaking('), true);
    assert.equal(readEngine('personalized').includes('function removeWaitingPlayer('), true);
}

function testRendererAdaptersStayThin() {
    ['ranked', 'personalized'].forEach((mode) => {
        const source = fs.readFileSync(path.join(root, `js/gamemode/${mode}/${mode}-renderer.js`), 'utf8');
        assert.equal(source.includes('CoupAutomatedRenderer.create('), true);
        assert.equal(source.split(/\r?\n/).length <= 10, true, `${mode}-renderer.js deixou de ser um adaptador fino.`);
    });
}

function testAiReadinessAdapters() {
    const ranked = RankedEngine.createState(1000);
    RankedEngine.joinPlayer(ranked, { uid: 'human-r', name: 'Humano' }, 1001);
    RankedEngine.addAiPlayer(ranked, { uid: 'bot-r', name: 'Bot R', ready: false }, 1002, () => 0);
    assert.equal(ranked.players['bot-r'].ready, false);

    const personalized = PersonalizedEngine.createState(1000);
    PersonalizedEngine.joinPlayer(personalized, { uid: 'human-p', name: 'Humano' }, 1001);
    PersonalizedEngine.addAiPlayer(
        personalized,
        { uid: 'bot-p', name: 'Bot P', ready: false },
        1002,
        () => 0
    );
    assert.equal(personalized.players['bot-p'].ready, true);
}

function testRestartAdapters() {
    const ranked = RankedEngine.createState(1000);
    RankedEngine.joinPlayer(ranked, { uid: 'human-r', name: 'Humano' }, 1001);
    RankedEngine.addAiPlayer(ranked, { uid: 'bot-r', name: 'Bot R' }, 1002, () => 0);
    ranked.status = RankedRules.PHASES.FINISHED;
    ranked.phase = RankedRules.PHASES.FINISHED;
    RankedEngine.restartMatch(ranked, 2000);
    assert.equal(Boolean(ranked.players['bot-r']), false);
    assert.deepEqual(ranked.previousBotNames, ['Bot R']);
    assert.equal(ranked.players['human-r'].ready, false);
    assert.equal(ranked.matchmaking.enabled, true);

    const personalized = PersonalizedEngine.createState(1000);
    PersonalizedEngine.joinPlayer(personalized, { uid: 'human-p', name: 'Humano' }, 1001);
    PersonalizedEngine.addAiPlayer(personalized, { uid: 'bot-p', name: 'Bot P' }, 1002, () => 0);
    personalized.players['bot-p'].grudges = { 'human-p': 2 };
    personalized.status = PersonalizedRules.PHASES.FINISHED;
    personalized.phase = PersonalizedRules.PHASES.FINISHED;
    PersonalizedEngine.restartMatch(personalized, 2000);
    assert.equal(Boolean(personalized.players['bot-p']), true);
    assert.equal(personalized.players['bot-p'].ready, true);
    assert.deepEqual(personalized.players['bot-p'].grudges, {});
}

assert.equal(typeof LifecycleModule.create, 'function');
testAdaptersDoNotReimplementLifecycle();
testRendererAdaptersStayThin();
testAiReadinessAdapters();
testRestartAdapters();

console.log('automated-adapters: ciclo compartilhado e diferenças finais dos modos aprovados');
