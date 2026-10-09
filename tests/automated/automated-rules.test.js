const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '../..');
const sharedPath = path.join(root, 'js/gamemode/shared/automated-rules.js');
const adapters = [
    {
        mode: 'ranked',
        globalName: 'CoupRankedRules',
        path: path.join(root, 'js/gamemode/ranked/ranked-rules.js'),
        pages: ['ranked/ranked.html', 'ranked/ranked-waiting.html']
    },
    {
        mode: 'personalized',
        globalName: 'CoupPersonalizedRules',
        path: path.join(root, 'js/gamemode/personalized/personalized-rules.js'),
        pages: ['personalized/personalized.html', 'personalized/personalized-waiting.html']
    }
];

const SharedRules = require(sharedPath);

assert.equal(Object.isFrozen(SharedRules), true);
assert.equal(SharedRules.createDeck(() => 0).length, 30);
assert.equal(SharedRules.createDeck(() => 0, SharedRules.ROLES.AMBASSADOR).length, 25);
assert.equal(SharedRules.createDeck(() => 0, SharedRules.ROLES.INQUISITOR).length, 25);

adapters.forEach((adapter) => {
    const AdapterRules = require(adapter.path);
    assert.equal(
        AdapterRules,
        SharedRules,
        `O adaptador ${adapter.mode} deve reutilizar a mesma instância das regras compartilhadas.`
    );

    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(sharedPath, 'utf8'), context);
    vm.runInContext(fs.readFileSync(adapter.path, 'utf8'), context);
    assert.equal(context.window[adapter.globalName], context.window.CoupAutomatedRules);

    adapter.pages.forEach((relativePage) => {
        const html = fs.readFileSync(path.join(root, relativePage), 'utf8');
        const sharedIndex = html.indexOf('js/gamemode/shared/automated-rules.js');
        const adapterIndex = html.indexOf(`js/gamemode/${adapter.mode}/${adapter.mode}-rules.js`);
        assert.ok(sharedIndex >= 0, `${relativePage} não carrega as regras compartilhadas.`);
        assert.ok(adapterIndex > sharedIndex, `${relativePage} carrega o adaptador antes das regras compartilhadas.`);
    });
});

console.log('automated-rules: núcleo, adaptadores e ordem de carregamento aprovados');
