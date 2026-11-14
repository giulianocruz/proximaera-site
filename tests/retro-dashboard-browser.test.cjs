'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'ops', 'retro-dashboard-private.py'), 'utf8');
const jsMatch = source.match(/<script>\s*(\(function\(\)\{[\s\S]*?\}\)\(\);)\s*<\/script>/);
assert.ok(jsMatch, 'O JS do dashboard deve estar presente no template Python');
const script = jsMatch[1];

function element(tag) {
  return {
    tag, children: [], attributes: {}, dataset: {}, style: {}, handlers: {}, textContent: '',
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    click() { this.clicked = true; this.handlers.click?.(); },
  };
}

function runDashboard() {
  const ids = {};
  for (const id of ['data-json','complete','started','android','windows','table-period','versions','daily-chart','chart-note','csv','sources']) ids[id] = element(id);
  const dayButtons = [7,30,90].map(d => Object.assign(element('button'), {dataset:{days:String(d)}}));
  const platformButtons = ['all','android','windows'].map(p => Object.assign(element('button'), {dataset:{platform:p}}));
  const unsafeVersion = '=HYPERLINK("x;y","z")';
  const records = [
    ['0.3.9','android',1], ['0.3.21','windows',2], ['0.3.100','android',3], [unsafeVersion,'windows',0],
  ].map(([version,platform,complete])=>({day:'2026-11-14',version,platform,started:complete,complete,partial:0,bytes:complete*1024}));
  ids['data-json'].textContent = JSON.stringify({period:{last_calendar_day:'2026-11-14'},versions:records,sources:{home:{complete:0},apps:{complete:0},other:{complete:6}}});
  const doc = {
    getElementById(id) { return ids[id]; },
    querySelectorAll(query) { return query === '[data-days]' ? dayButtons : query === '[data-platform]' ? platformButtons : []; },
    createElement: element,
  };
  const blobs = [];
  class FakeBlob { constructor(parts, options) { this.parts = parts; this.options = options; } }
  const url = {
    createObjectURL(blob) { blobs.push(blob); return 'blob:private-test'; },
    revokeObjectURL() {},
  };
  vm.runInNewContext(script, {document:doc, URL:url, Blob:FakeBlob, Intl, setTimeout() {}}, {timeout:1500});
  return {ids,dayButtons,platformButtons,blobs,unsafeVersion};
}

test('JS do template compila e preserva os escapes CSV no Python', () => {
  assert.match(source, /PAGE = r"""<!doctype html>/);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.ok(script.includes("lines.join('\\r\\n')"));
  assert.ok(script.includes('function csvField(value)'));
});

test('versões numéricas e filtros Android/Windows atualizam barras e tabela', () => {
  const v = runDashboard();
  assert.deepEqual(v.ids.versions.children.slice(0,3).map(row=>row.children[0].textContent), ['0.3.100','0.3.21','0.3.9']);
  assert.equal(v.ids['daily-chart'].children.length, 7);
  v.platformButtons[2].click();
  assert.equal(v.ids.android.textContent, '0');
  assert.equal(v.ids.windows.textContent, '2');
  const latest = v.ids['daily-chart'].children.at(-1);
  assert.deepEqual(latest.children[0].children[0].children.map(x => x.className), ['windows-segment']);
  v.dayButtons[1].click();
  assert.equal(v.ids['daily-chart'].children.length,30);
  assert.equal(v.ids['daily-chart'].children[0].children[0].children[0].style.height,'0%');
});

test('CSV segue filtro, preserva pontuação e neutraliza fórmula perigosa', () => {
  const v = runDashboard();
  v.platformButtons[2].click();
  v.ids.csv.click();
  assert.equal(v.blobs.length,1);
  const csv = v.blobs[0].parts.join('');
  assert.ok(csv.startsWith('\ufeff'));
  assert.ok(csv.includes('\r\n'));
  assert.ok(csv.includes('"0.3.21"'));
  assert.ok(!csv.includes('"0.3.100"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x;y"",""z"")"'));
  assert.match(v.blobs[0].options.type,/text\/csv/);
});
