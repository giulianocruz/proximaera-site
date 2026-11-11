'use strict';
/* node --test tests/fecha-negocio-premium-v2.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('fecha-negocio/index.html');
const css=read('assets/premium/fecha-v2.css');
const js=read('fecha-negocio/preview.js');
const names=['hero','processo','planos','beneficios','conversao'];
const dynamicNames=['servicos'];

test('assets premium WebP válidos e referenciados pela landing',()=>{
  for(const name of names){
    const rel='assets/premium/fecha-'+name+'-v2.webp';
    const b=fs.readFileSync(path.join(root,rel));
    assert.ok(b.length>20000&&b.length<400000,'peso esperado: '+name);
    assert.equal(b.toString('ascii',0,4),'RIFF',name);
    assert.equal(b.toString('ascii',8,12),'WEBP',name);
    assert.match(html,new RegExp('fecha-'+name+'-v2\\.webp'));
  }
  for(const name of dynamicNames){
    const rel='assets/premium/fecha-'+name+'-v2.webp';
    const b=fs.readFileSync(path.join(root,rel));
    assert.ok(b.length>20000&&b.length<400000,name);
    assert.equal(b.toString('ascii',0,4),'RIFF');
    assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.ok(js.includes('fecha-'+name+'-v2.webp'),name+' dinâmico');
  }
});

test('CTA de contato e valores continuam disponíveis como HTML real',()=>{
  assert.match(html,/R\$ 79,90/);
  assert.match(html,/R\$ 367/);
  assert.match(html,/data-track="whatsapp-hero-profissional"/);
  assert.match(html,/wa\.me\/5514998193831/);
  assert.match(html,/data-demo-full/);
  assert.match(html,/data-showcase="beauty"/);
  assert.ok((html.match(/wa\.me\/5514998193831/g)||[]).length>=10);
});

test('alternância preserva os outros modelos e os parâmetros UTM',()=>{
  assert.match(js,/target\.dataset\.showcase=name/);
  assert.match(js,/data-template/);
  assert.match(js,/utm_source/);
  assert.match(css,/data-showcase="beauty"/);
  assert.match(css,/not\(\[data-showcase="beauty"\]\)/);
});
