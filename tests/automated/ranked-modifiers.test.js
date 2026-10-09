const assert = require('node:assert/strict');
const test = require('node:test');
const Modifiers = require('../../js/gamemode/shared/ranked-modifiers.js');

test('catalogo inicial possui as 12 regras aprovadas para o MVP', () => {
    assert.deepEqual(Modifiers.RULE_IDS.slice().sort(), [
        'assassino-declarado',
        'conselho-de-emergencia',
        'espolio',
        'falso-duque',
        'favor-da-coroa',
        'golpe-declarado',
        'herdeiro-do-trono',
        'justica-lenta',
        'panico-economico',
        'recompensa',
        'sangue-frio',
        'ultima-palavra'
    ]);
});

test('cada sorteio gera cinco regras unicas e compativeis', () => {
    for (let seed = 0; seed < 2000; seed += 1) {
        const draw = Modifiers.createRuleDraw({ seed });
        assert.equal(draw.version, 1);
        assert.equal(draw.ruleIds.length, 5);
        assert.equal(new Set(draw.ruleIds).size, 5);
        assert.equal(Modifiers.isValidSelection(draw.ruleIds), true, `seed ${seed}`);
    }
});

test('a mesma seed sempre produz o mesmo conjunto e ordem', () => {
    const first = Modifiers.createRuleDraw({ seed: 'room-B9V2-match-14' });
    const second = Modifiers.createRuleDraw({ seed: 'room-B9V2-match-14' });
    assert.deepEqual(first, second);
});

test('todos os modificadores aparecem na amostra de sorteios', () => {
    const seen = new Set();
    for (let seed = 0; seed < 500; seed += 1) {
        Modifiers.drawRuleIds({ seed }).forEach((ruleId) => seen.add(ruleId));
    }
    assert.deepEqual([...seen].sort(), Modifiers.RULE_IDS.slice().sort());
});

test('sorteio nao favorece de forma extrema nenhuma regra do catalogo', () => {
    const appearances = Object.fromEntries(Modifiers.RULE_IDS.map((ruleId) => [ruleId, 0]));
    const samples = 4000;
    for (let seed = 0; seed < samples; seed += 1) {
        Modifiers.drawRuleIds({ seed }).forEach((ruleId) => { appearances[ruleId] += 1; });
    }

    const rates = Object.values(appearances).map((count) => count / samples);
    assert.ok(Math.min(...rates) > 0.2, `minimum rate ${Math.min(...rates)}`);
    assert.ok(Math.max(...rates) < 0.7, `maximum rate ${Math.max(...rates)}`);
});

test('finalizadores declarados nunca aparecem juntos', () => {
    const ids = ['golpe-declarado', 'assassino-declarado'];
    const issues = Modifiers.getSelectionIssues(ids, { expectedCount: null });
    assert.ok(issues.some((issue) => issue.groupId === 'declared-finisher'));
});

test('gatilhos economicos de limite nunca aparecem juntos', () => {
    const ids = ['panico-economico', 'conselho-de-emergencia'];
    const issues = Modifiers.getSelectionIssues(ids, { expectedCount: null });
    assert.ok(issues.some((issue) => issue.groupId === 'economic-threshold'));
});

test('recompensas diretas por eliminacao sao mutuamente exclusivas', () => {
    for (const ids of [
        ['sangue-frio', 'recompensa'],
        ['sangue-frio', 'herdeiro-do-trono'],
        ['recompensa', 'herdeiro-do-trono']
    ]) {
        const issues = Modifiers.getSelectionIssues(ids, { expectedCount: null });
        assert.ok(issues.some((issue) => issue.groupId === 'elimination-reward'));
    }
});

test('uma partida aceita no maximo duas regras ligadas a eliminacao', () => {
    const valid = ['sangue-frio', 'espolio'];
    const invalid = ['sangue-frio', 'espolio', 'ultima-palavra'];
    assert.equal(Modifiers.isValidSelection(valid, { expectedCount: null }), true);
    assert.ok(Modifiers.getSelectionIssues(invalid, { expectedCount: null })
        .some((issue) => issue.code === 'elimination-limit'));
});

test('falha claramente quando o pool nao permite completar o sorteio', () => {
    assert.throws(() => Modifiers.drawRuleIds({
        seed: 10,
        count: 2,
        poolIds: ['golpe-declarado', 'assassino-declarado']
    }), /Unable to draw 2 compatible ranked modifiers/);
});
