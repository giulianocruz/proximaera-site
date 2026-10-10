const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const product = read('radar/index.html');
const home = read('index.html');
const project = read('projetos/radar.html');
const sitemap = read('sitemap.xml');

for (const label of ['Próxima Era', 'Prospecção comercial B2B', 'Como funciona', 'cadeiras corporativas', 'não significa intenção de compra confirmada']) {
  assert.ok(product.includes(label), 'Product page must include: ' + label);
}
assert.ok(product.includes('https://proximaera.com.br/radar/'), 'Canonical product URL');
assert.ok(product.includes('https://elitewp.com.br/radar'), 'Functional app preserved until cutover');
assert.ok(product.includes('https://elitewp.com.br/radar/buscar?perfil=moveleiro'), 'Sector pilot CTA preserved');
assert.ok(product.includes('name="viewport"'), 'Mobile viewport declared');
assert.ok(product.includes('prefers-reduced-motion'), 'Reduced-motion accessibility');
assert.ok(home.includes('href="radar/"'), 'Home promotes the Próxima Era product page');
assert.ok(!home.includes('href="https://radar.elitewp.com.br"'), 'Home no longer sends visitors directly to legacy brand');
assert.ok(project.includes('href="../radar/"'), 'Old project permalink points to product page');
assert.ok(sitemap.includes('<loc>https://proximaera.com.br/radar/</loc>'), 'New product page is indexed');
assert.ok(!product.includes('R$ 99') && !product.includes('R$ 149'), 'Unlaunched team plans not advertised');
console.log('RADAR_PROXIMAERA_MARKETING=PASS');
