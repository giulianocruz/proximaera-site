'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html');
const landing=read('fecha-negocio/index.html');
const css=read('assets/premium/premium.css');
const assets=[
  'assets/premium/proximaera-hero.webp',
  'assets/premium/fecha-processo-v2.webp',
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
assert.match(landing,/assets\/premium\/fecha-processo-v2\.webp/);
assert.match(landing,/assets\/premium\/fecha-conversao-v2\.webp/);
assert.match(landing,/assets\/premium\/premium\.css/);
assert.match(landing,/id="demonstracao"/);
assert.match(landing,/data-demo-full/);
assert.match(landing,/whatsapp-mobile-sticky/);
assert.match(landing,/R\$ 79,90/);
assert.ok(!home.includes('47%')&&!landing.includes('47%'),'no unsupported conversion uplift');
assert.match(css,/@media\(max-width:740px\)/);
console.log('PASS: 3 WebP assets, homepage, landing, primary CTA, demo and responsive layout');
