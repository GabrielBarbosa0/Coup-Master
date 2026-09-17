const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../..');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (url.hostname === 'coup.test' && file.startsWith(root + path.sep) && fs.existsSync(file)) {
        await route.fulfill({ path: file });
      } else await route.abort();
    });
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace('<head>', '<head><base href="http://coup.test/">');
    await page.setContent(html);
    await page.addStyleTag({ content: fs.readFileSync(path.join(root, 'css/casual-mode.css'), 'utf8') });
    await page.evaluate(() => {
      document.getElementById('loadingOverlay')?.remove();
      window.testState = { players: {} };
      window.testAdmin = true;
      window.testFail = false;
      window.testWrites = [];
      window.CoupModal = {
        open: (value) => { (typeof value === 'string' ? document.getElementById(value) : value).style.display = 'flex'; },
        close: (value) => { (typeof value === 'string' ? document.getElementById(value) : value).style.display = 'none'; }
      };
    });
    await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'rules-guides.js'), 'utf8') });
    await page.evaluate(() => {
      window.CoupRulesGuides.setup({
        isAdmin: () => window.testAdmin,
        getState: () => window.testState,
        getRoomCode: () => 'TEST',
        getDatabase: () => ({ ref: () => ({ update: async (data) => {
          if (window.testFail) throw Error('offline');
          window.testWrites.push(data);
          window.testState.alternativeRuleDraw = data['gameState/alternativeRuleDraw'];
          window.CoupRulesGuides.renderAlternativeRuleDraw({ state: window.testState });
        } }) })
      });
      window.CoupRulesGuides.renderAlternativeRuleDraw({ state: window.testState });
      document.getElementById('ruleDrawBtn').click();
    });
    assert.equal(await page.locator('.alternative-rules-back').count(), 0);
    assert.equal(await page.locator('.rule-draw-count-btn.is-selected').textContent(), '5');
    await page.locator('[data-rule-count="5"]').click();
    const pins = page.locator('[data-pin-rule]');
    const firstId = await pins.nth(0).getAttribute('data-pin-rule');
    const secondId = await pins.nth(1).getAttribute('data-pin-rule');
    await pins.nth(0).check();
    await pins.nth(1).check();
    assert(await page.locator('[data-rule-count="1"]').isDisabled());
    await page.locator('#startRuleDrawBtn').click();
    await page.waitForFunction(() => document.getElementById('ruleSelectionStatus').textContent.includes('aplicadas'));
    const data = await page.evaluate(() => window.testState.alternativeRuleDraw);
    assert.equal(new Set(data.ruleIds).size, 5);
    assert(data.ruleIds.includes(firstId) && data.ruleIds.includes(secondId));
    assert.equal(await page.locator('#altRulesFlipCard .alternative-rule-entry').count(), 5);
    assert.equal(await page.locator('.alternative-rules-back').count(), 1);
    await page.locator('#startRuleDrawBtn').click();
    assert.deepEqual(await page.evaluate(() => window.testState.alternativeRuleDraw.pinnedRuleIds), [firstId, secondId]);
    await page.locator('[data-rule-count="2"]').click();
    await page.locator('#applyRuleSelectionBtn').click();
    assert.deepEqual(await page.evaluate(() => window.testState.alternativeRuleDraw.ruleIds), [firstId, secondId]);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      assert(await page.locator('.rule-draw-scroll').evaluate((e) => e.scrollWidth <= e.clientWidth));
      await page.screenshot({ path: path.join(require('node:os').tmpdir(), `coup-rule-selection-${width}.png`) });
    }
    await page.evaluate(() => {
      window.CoupModal.close('ruleDrawModal');
      document.getElementById('altRulesBtn').click();
    });
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      const proportions = await page.locator('#altRulesFlipCard .is-room-selection').evaluate((card) => {
        const width = card.getBoundingClientRect().width;
        const list = card.querySelector('.alternative-rule-list');
        return {
          title: parseFloat(getComputedStyle(card.querySelector('h2')).fontSize) / width,
          text: parseFloat(getComputedStyle(card.querySelector('.alternative-rule-entry')).fontSize) / width,
          fits: list.scrollWidth <= list.clientWidth
        };
      });
      assert(Math.abs(proportions.title - 0.09) < 0.001);
      assert(Math.abs(proportions.text - 0.0452) < 0.001);
      assert(proportions.fits);
      await page.screenshot({ path: path.join(require('node:os').tmpdir(), `coup-rule-card-${viewport.width}.png`) });
    }
    await page.locator('#altRulesFlipCard').click();
    assert(await page.locator('#altRulesFlipCard').evaluate((e) => e.classList.contains('is-flipped')));
    assert(await page.locator('.alternative-rules-back').evaluate((e) => e.complete && e.naturalWidth > 0));
    await page.evaluate(() => {
      window.CoupModal.close('altRulesModal');
      document.getElementById('ruleDrawBtn').click();
      window.testFail = true;
    });
    await page.locator('#resetRuleSelectionBtn').click();
    assert.equal(await page.evaluate(() => window.testState.alternativeRuleDraw.ruleIds.length), 2);
    assert((await page.locator('#ruleSelectionStatus').textContent()).includes('Tente novamente'));
    await page.evaluate(() => { window.testFail = false; });
    await page.locator('#resetRuleSelectionBtn').click();
    assert.equal(await page.evaluate(() => window.testState.alternativeRuleDraw), null);
    assert.equal(await page.locator('.rule-draw-count-btn.is-selected').textContent(), '5');
    assert.equal(await page.locator('.alternative-rules-back').count(), 0);
    await page.evaluate(() => {
      window.testAdmin = false;
      window.CoupModal.close('ruleDrawModal');
      window.CoupRulesGuides.renderAlternativeRuleDraw({ state: { alternativeRuleDraw: { id: 'remote', ruleIds: ['chantagem'] } } });
    });
    assert(!(await page.locator('#ruleDrawModal').isVisible()));
    assert(!(await page.locator('#ruleDrawBtn').isVisible()));
    assert.equal(await page.locator('#altRulesFlipCard .alternative-rule-entry').count(), 1);
    await page.evaluate(() => {
      document.documentElement.lang = 'en';
      window.testAdmin = true;
      document.getElementById('ruleDrawBtn').click();
    });
    assert.equal(await page.locator('#applyRuleSelectionBtn').textContent(), 'Apply selection');
    assert.equal(await page.locator('#resetRuleSelectionBtn').textContent(), 'Restore default rules');
    assert((await page.locator('#ruleSelectionCount').textContent()).includes('selected'));
    for (const language of ['pt', 'en']) {
      const longest = await page.evaluate((language) => {
        document.documentElement.lang = language;
        document.getElementById('ruleDrawBtn').click();
        const ids = Array.from(document.querySelectorAll('[data-select-rule]'))
          .sort((a, b) => b.closest('label').textContent.length - a.closest('label').textContent.length)
          .slice(0, 5).map((e) => e.dataset.selectRule);
        window.CoupModal.close('ruleDrawModal');
        window.testState.alternativeRuleDraw = { id: language, ruleIds: ids };
        window.CoupRulesGuides.renderAlternativeRuleDraw({ state: window.testState });
        document.getElementById('altRulesBtn').click();
        return ids;
      }, language);
      for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(150);
        const metrics = await page.locator('.is-room-selection').evaluate((card) => {
          const list = card.querySelector('.alternative-rule-list');
          return { compact: card.classList.contains('is-compact'), overflow: list.scrollHeight - list.clientHeight,
            ratio: parseFloat(getComputedStyle(list.querySelector('p')).fontSize) / card.clientWidth };
        });
        assert(Math.abs(metrics.ratio - 0.0452 * (metrics.compact ? 0.9 : 1)) < 0.001);
        assert(metrics.overflow <= 1, 'Longest rules must fit without scrolling');
        console.log(language, viewport.width, longest, metrics);
        await page.screenshot({ path: path.join(require('node:os').tmpdir(), `coup-long-rules-${language}-${viewport.width}.png`) });
      }
    }
    console.log('PASS: manual/random selection, pinning, limits, reset, failed save, sync, card back and responsive layout.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
