const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

for (const language of ['pt-BR', 'en-US']) {
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
