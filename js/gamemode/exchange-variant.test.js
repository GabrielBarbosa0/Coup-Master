const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const mode of ['ranked', 'personalized']) {
    const Rules = require(`./${mode}/${mode}-rules.js`);
    const Engine = require(`./${mode}/${mode}-engine.js`);
    const prefix = mode === 'ranked' ? 'CoupRanked' : 'CoupPersonalized';
    const context = vm.createContext({
        window: { location: { search: '' }, [prefix + 'Rules']: Rules, [prefix + 'Engine']: Engine },
        document: { body: { dataset: {} }, documentElement: { lang: 'pt-BR' } },
        URLSearchParams,
        URL
    });
    // Expose the existing bot selector without starting Firebase or timers.
    const gameSource = fs.readFileSync(path.join(__dirname, mode, `${mode}-game.js`), 'utf8');
    assert.ok(gameSource.includes('    boot();'));
    vm.runInContext(gameSource.replace('    boot();', '    root.chooseBotAction = chooseBotAction;'), context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'casual/rules-guides.js'), 'utf8'), context);
    const rendererSource = fs.readFileSync(path.join(__dirname, mode, `${mode}-renderer.js`), 'utf8');
    const rendererExport = `    root.${prefix}Renderer = Object.freeze({`;
    assert.ok(rendererSource.includes(rendererExport));
    vm.runInContext(rendererSource.replace(rendererExport, `
        root.inspectVariant = (nextState) => {
            state = nextState;
            return getActionsGuidePages();
        };
        root.translateVariantLog = translateLogMessage;
    ` + rendererExport), context);

    function start(state, randomValue) {
        for (const player of Engine.getPlayers(state)) {
            if (!player.ready) Engine.toggleReady(state, player.uid, 2000);
        }
        Engine.advanceExpired(state, state.deadline + 1, () => randomValue);
        Engine.advanceExpired(state, state.deadline + 1);
        return state;
    }

    function createMatch(randomValue, count = 6) {
        const state = Engine.createState(1000);
        for (let index = 1; index <= count; index += 1) {
            Engine.joinPlayer(state, { uid: `u${index}`, name: `Player ${index}` }, 1000 + index);
        }
        return start(state, randomValue);
    }

    for (const [randomValue, role, absent] of [
        [0.49, Rules.ROLES.AMBASSADOR, Rules.ROLES.INQUISITOR],
        [0.5, Rules.ROLES.INQUISITOR, Rules.ROLES.AMBASSADOR]
    ]) {
        const state = createMatch(randomValue);
        assert.equal(state.exchangeRole, role);
        const cards = [...state.deck, ...Engine.getPlayers(state).flatMap((player) => player.influences)];
        assert.equal(cards.length, 25);
        assert.equal(new Set(cards.map((card) => card.id)).size, 25);
        assert.equal(cards.filter((card) => card.role === role).length, 5);
        assert.ok(cards.every((card) => card.role !== absent));
        assert.ok(state.log.some((entry) => entry.message.includes(Rules.getRole(role).label)));
        for (const language of ['pt-BR', 'en-US']) {
            context.document.documentElement.lang = language;
            const translations = JSON.parse(fs.readFileSync(path.join(__dirname, '../../lang', language + '.json'), 'utf8'));
            context.window.CoupLanguage = {
                t(key, params = {}) {
                    const value = key.split('.').reduce((node, part) => node?.[part], translations);
                    return typeof value === 'string'
                        ? value.replace(/[{](\w+)[}]/g, (_, name) => params[name] ?? '') : key;
                }
            };
            const pages = context.window.inspectVariant(state);
            const entries = pages.find((page) => page.type === 'characters').entries;
            assert.equal(entries.length, 6);
            assert.equal(entries.filter((entry) => entry.muted).length, 1);
            const guideHtml = context.window.CoupRulesGuides.renderDynamicGuidePage(pages[0]);
            assert.equal((guideHtml.match(/class="guide-entry/g) || []).length, 5);
            assert.ok(!guideHtml.includes('is-muted'));
            assert.ok(guideHtml.includes('removed-layout-centered'));
            const casualPage = { ...pages[0] };
            delete casualPage.showRemovedCards;
            assert.ok(context.window.CoupRulesGuides.renderDynamicGuidePage(casualPage).includes('is-muted'));
            assert.equal(entries.find((entry) => entry.muted).name, Rules.getRole(absent).label === 'Embaixador'
                ? (language === 'en-US' ? 'Ambassador' : 'Embaixador')
                : (language === 'en-US' ? 'Inquisitor' : 'Inquisidor'));
            const log = context.window.translateVariantLog(`Personagem desta partida: ${Rules.getRole(role).label}.`);
            assert.ok(log.startsWith(language === 'en-US' ? 'Character for this match:' : 'Personagem desta partida:'));
        }

        const restored = JSON.parse(JSON.stringify(state));
        Engine.normalizeState(restored);
        Engine.setConnected(restored, 'u1', false, 3000);
        Engine.setConnected(restored, 'u1', true, 3001);
        assert.equal(restored.exchangeRole, role);
        assert.deepEqual(restored.deck, state.deck);

        const actor = Engine.getActiveUid(state);
        const target = Engine.getPlayers(state).find((player) => player.uid !== actor).uid;
        const excluded = Object.values(Rules.ACTIONS).filter((type) => Rules.getAction(type).claim === absent);
        for (const type of excluded) {
            assert.throws(() => Engine.performAction(state, actor, type, target, 4000), /Personagem ausente/);
        }
        Engine.performAction(state, actor, Rules.ACTIONS.STEAL, target, 4000);
        assert.deepEqual(Engine.getBlockClaimsForPlayer(state, target), [Rules.ROLES.CAPTAIN, role]);
        assert.throws(() => Engine.declareBlock(state, target, absent, 4100));
        Engine.declareBlock(state, target, role, 4100);
        assert.equal(state.phase, Rules.PHASES.BLOCK_CHALLENGE);

        const botState = createMatch(randomValue, 2);
        const bot = Engine.getPlayer(botState, Engine.getActiveUid(botState));
        bot.personality = { honesty: 0, skepticism: 50, vengefulness: 50 };
        for (let index = 0; index < 1000; index += 1) {
            const action = context.window.chooseBotAction(botState, bot);
            assert.ok(Rules.isActionAvailable(botState, action.type));
        }

        state.status = Rules.PHASES.FINISHED;
        Engine.restartMatch(state, 5000);
        assert.equal(state.exchangeRole, null);
        start(state, randomValue < 0.5 ? 0.5 : 0.49);
        assert.equal(state.exchangeRole, absent);
    }

    const legacy = createMatch(0.49, 2);
    delete legacy.exchangeRole;
    Engine.normalizeState(legacy);
    assert.ok(Object.values(Rules.ACTIONS).every((type) => Rules.isActionAvailable(legacy, type)));
    assert.equal(Rules.createDeck(() => 0).length, 30);
    console.log(`${mode}: variantes, baralho, bloqueios, reconexao, revanche e IA aprovados`);
}
