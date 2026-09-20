const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

test('regras alternativas resolvem efeitos de baralho e economia', () => {
  const window = { CoupLanguage: { getLanguage: () => 'pt-BR' } };
  vm.runInNewContext(fs.readFileSync(`${__dirname}/rules-guides.js`, 'utf8'), { window });
  const rules = window.CoupRulesGuides;
  const draw = { ruleIds: ['falso-duque', 'justica-lenta'] };

  assert.deepEqual(JSON.parse(JSON.stringify(rules.getAlternativeRuleEffects(draw))), {
    coupCost: 10,
    mandatoryCoupCoins: 15,
    deckOverrides: { duque: 1 }
  });
  assert.deepEqual(JSON.parse(JSON.stringify(rules.applyAlternativeDeckRules({ duque: 5, capitao: 4 }, draw))), {
    duque: 1,
    capitao: 4
  });
  assert.deepEqual(JSON.parse(JSON.stringify(rules.applyAlternativeDeckRules({ duque: 5 }, null))), {
    duque: 5
  });
});

for (const language of ['pt-BR', 'en-US']) {
  test(`${language}: Manobra concede uma moeda e permite escolher e trocar a carta`, () => {
    const window = { CoupLanguage: { getLanguage: () => language } };
    vm.runInNewContext(fs.readFileSync(`${__dirname}/rules-guides.js`, 'utf8'), { window });
    const pages = window.CoupRulesGuides.buildDynamicGuidePages({ estrategista: 5 });
    const strategist = pages.flatMap((page) => page.entries || [])
      .find((entry) => entry.cardType === 'estrategista').text;
    assert.match(strategist, /Receba 1 moeda|Receive 1 coin/);
    assert.match(strategist, /Escolha e olhe|Choose and look/);
    assert.match(strategist, /Voc\u00ea pode troc\u00e1-la|You may exchange/);
    assert.doesNotMatch(strategist, /2 moedas|2 coins/);
  });
  for (const condessa of [0, 5]) {
    for (const diplomata of [0, 5]) {
      test(`${language}: bloqueio de Assassinato com Condessa=${condessa}, Diplomata=${diplomata}`, () => {
        const window = { CoupLanguage: { getLanguage: () => language } };
        vm.runInNewContext(fs.readFileSync(`${__dirname}/rules-guides.js`, 'utf8'), { window });
        const pages = window.CoupRulesGuides.buildDynamicGuidePages({ assassino: 5, condessa, diplomata, mercenario: 5 });
        const entries = pages.flatMap((page) => page.entries || []);
        const assassin = entries.find((entry) => entry.cardType === 'assassino').text;
        assert.doesNotMatch(assassin, /Diplomat/i);
        if (condessa) assert.match(assassin, /Condessa|Contessa/);
        else assert.match(assassin, /Sem bloqueios ativos|No active blockers/);
        assert.match(entries.find((entry) => entry.cardType === 'mercenario').text, /Diplomat/i);
        if (diplomata) {
          const diplomat = entries.find((entry) => entry.cardType === 'diplomata').text;
          assert.match(diplomat, /Execução Bruta|Brutal Execution/);
          assert.doesNotMatch(diplomat, /Assassin/i);
        }
      });
    }
  }
}
