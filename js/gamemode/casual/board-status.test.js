const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }
}

class ElementStub {
  constructor(id = '') {
    this.id = id;
    this.alt = '';
    this.classList = new ClassList();
    this.dataset = {};
    this.listeners = {};
    this.src = '';
    this.style = {};
    this.textContent = '';
    this.title = '';
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  setAttribute() {}
  select() {}
  setSelectionRange() {}
  remove() {}

  get offsetWidth() {
    return 100;
  }
}

function createBoardStatusHarness({ modernClipboard }) {
  const elementIds = [
    'shareRoomCode',
    'shareRoomQr',
    'shareRoomCodeCopy',
    'shareRoomLinkCopy',
    'shareRoomCopyStatus',
    'shareRoomBtn',
    'closeShareRoomBtn',
    'shareRoomModal',
    'roomCodeBtn'
  ];
  const elements = Object.fromEntries(elementIds.map((id) => [id, new ElementStub(id)]));
  const clipboardWrites = [];
  let fallbackCopies = 0;

  const document = {
    body: { appendChild() {} },
    createElement: () => new ElementStub('temporary-copy-field'),
    execCommand(command) {
      if (command === 'copy') fallbackCopies += 1;
      return command === 'copy';
    },
    getElementById: (id) => elements[id] || null
  };
  const navigator = modernClipboard
    ? { clipboard: { writeText: async (value) => clipboardWrites.push(value) } }
    : {};
  const window = {
    clearTimeout,
    CoupLanguage: { t: () => null },
    document,
    location: { href: 'https://coupmaster.com.br/index.html?room=ABCD' },
    navigator,
    setTimeout
  };
  window.window = window;

  const context = vm.createContext({
    clearTimeout,
    console,
    document,
    navigator,
    setTimeout,
    URL,
    URLSearchParams,
    window
  });
  const source = fs.readFileSync(path.join(__dirname, 'board-status.js'), 'utf8');
  vm.runInContext(source, context);
  window.CoupBoardStatus.setup({ getRoomCode: () => 'ABCD' });

  return {
    clipboardWrites,
    elements,
    getFallbackCopies: () => fallbackCopies
  };
}

async function clickCopyTargets(harness) {
  harness.elements.shareRoomCodeCopy.listeners.click();
  harness.elements.shareRoomLinkCopy.listeners.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('copia codigo e link pela Clipboard API', async () => {
  const harness = createBoardStatusHarness({ modernClipboard: true });
  await clickCopyTargets(harness);

  assert.equal(harness.clipboardWrites[0], 'ABCD');
  assert.match(harness.clipboardWrites[1], /room=ABCD/);
  assert.equal(harness.elements.shareRoomCopyStatus.textContent, 'Link copiado!');
});

test('copia codigo e link com fallback sem Clipboard API', async () => {
  const harness = createBoardStatusHarness({ modernClipboard: false });
  await clickCopyTargets(harness);

  assert.equal(harness.getFallbackCopies(), 2);
  assert.equal(harness.elements.shareRoomCopyStatus.textContent, 'Link copiado!');
});
