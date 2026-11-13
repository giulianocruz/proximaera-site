'use strict';
// Contrato visual vigente: Fecha Negócio V2 (sem alterar a página de vendas).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html');
const landing=read('fecha-negocio/index.html');
const css=read('assets/premium/premium.css');
const v2css=read('assets/premium/fecha-v2.css');
const assets=[
  'assets/premium/proximaera-hero.webp',
  'assets/premium/fecha-hero-v2.webp',
  'assets/premium/fecha-servicos-v2.webp',
  'assets/premium/fecha-processo-v2.webp',
  'assets/premium/fecha-planos-v2.webp',
  'assets/premium/fecha-beneficios-v2.webp',
  'assets/premium/fecha-conversao-v2.webp'
];
for(const file of assets){
  const data=fs.readFileSync(path.join(root,file));
  assert.equal(data.toString('ascii',0,4),'RIFF',file+' has a RIFF header');
  assert.equal(data.toString('ascii',8,12),'WEBP',file+' has a WebP signature');
  assert.ok(data.length<250000,file+' is optimized for web delivery');
}
assert.match(home,/assets\/premium\/premium\.css/);
assert.match(home,/assets\/premium\/proximaera-hero\.webp/);
assert.match(home,/fetchpriority="high" decoding="async"/);
assert.match(home,/data-track="whatsapp-hero"/);
assert.match(landing,/assets\/premium\/fecha-hero-v2\.webp/);
assert.match(landing,/assets\/premium\/fecha-processo-v2\.webp/);
assert.match(landing,/assets\/premium\/fecha-conversao-v2\.webp/);
assert.match(landing,/assets\/premium\/fecha-v2\.css/);
assert.match(landing,/assets\/premium\/premium\.css/);
assert.match(landing,/id="demonstracao"/);
assert.match(landing,/data-demo-full/);
assert.match(landing,/class="mobile-buy"/);
assert.match(landing,/data-track="whatsapp-cta-final"/);
assert.match(landing,/R\$ 79,90/);
assert.ok(!home.includes('47%')&&!landing.includes('47%'),'no unsupported conversion uplift');
assert.match(css,/@media\(max-width:740px\)/);
assert.ok(v2css.length>1000,'V2 CSS is present and nontrivial');
console.log('PASS: 7 WebP assets, homepage, Fecha Negócio V2, primary CTA, demo and responsive layout');
