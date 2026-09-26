const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/treasury-controls.js', 'utf8');
const window = {
  addEventListener() {},
  cancelAnimationFrame() {}
};
const document = {
  addEventListener() {},
  querySelectorAll() { return []; }
};

vm.runInNewContext(source, { window, document });

const { pointInside, findDropTargetFromSlots, getCoinValue, physics } = window.CoupTreasuryControls;
const target = { left: 10, right: 50, top: 20, bottom: 60 };

assert.equal(pointInside(target, 10, 20), true);
assert.equal(pointInside(target, 50, 60), true);
assert.equal(pointInside(target, 9, 20), false);
assert.equal(pointInside(target, 30, 61), false);
const readout = {};
const slots = [{
  dataset: { player: '3' },
  getBoundingClientRect: () => target,
  querySelector: (selector) => selector === '.coin-readout' ? readout : null
}];
const matchedTarget = findDropTargetFromSlots(slots, 30, 40);
assert.equal(matchedTarget.pid, 3);
assert.equal(matchedTarget.slot, slots[0]);
assert.equal(matchedTarget.readout, readout);
assert.equal(findDropTargetFromSlots(slots, 70, 40), null);
assert.equal(getCoinValue({ dataset: { coinValue: '1' } }), 1);
assert.equal(getCoinValue({ dataset: { coinValue: '5' } }), 5);
assert.equal(getCoinValue({ dataset: { coinValue: 'invalid' } }), 1);
assert.ok(physics.invalidReturnSpring < physics.spring);
assert.ok(physics.invalidReturnSpring < physics.validReturnSpring);
assert.ok(physics.invalidReturnDamping > physics.validReturnDamping);
assert.ok(physics.invalidReturnSpring <= 0.035);

console.log('treasury-controls: valores e destino das moedas aprovados');
