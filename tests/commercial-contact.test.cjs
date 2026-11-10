'use strict';
// Regra de regressao: telefone comercial novo em paginas e scripts do site.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['.git', 'assets', 'tests', 'ops', '.github']);

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return excluded.has(entry.name) ? [] : collect(path.join(dir, entry.name));
    return /\.(?:html|js)$/.test(entry.name) ? [path.join(dir, entry.name)] : [];
  });
}

test('nenhuma pagina comercial volta ao WhatsApp pessoal antigo', () => {
  const stale = [];
  for (const file of collect(root)) {
    const source = fs.readFileSync(file, 'utf8');
    if (/5514920077743|\+55 14 92007-7743|5514996428874|99642-8874/.test(source)) {
      stale.push(path.relative(root, file));
    }
  }
  assert.deepEqual(stale, [], 'Arquivos com WhatsApp antigo');
});

test('landing principal e pagina de contato usam numero comercial atual', () => {
  for (const relative of ['index.html', 'fecha-negocio/index.html', 'diagnostico-gratuito/index.html', 'contato.html', 'vender/app.js']) {
    const content = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.ok(content.includes('5514998193831'), `Telefone comercial ausente em ${relative}`);
  }
});
