'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'fecha-negocio','index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'fecha-negocio','conversion.css'),'utf8');
test('hero destaca interação e preserva prévia comercial navegável',()=>{
  assert.match(html,/class="hero-contact-art"/);
  assert.match(html,/class="hero-contact-art-caption"/);
  assert.match(html,/Apresente. Encante. Converse./);
  assert.match(html,/class="first-contact"/);
  assert.match(html,/data-track="primeiro-contato-diagnostico"/);
  assert.match(html,/class="hero-demo" id="demonstracao"/);
  const hero=html.indexOf('class="hero-contact-art"'),preview=html.indexOf('class="hero-demo" id="demonstracao"');
  assert.ok(hero>0&&preview>hero,'demonstração deve seguir a primeira interação');
});
test('arte otimizada já existente fica no projeto, com layout responsivo',()=>{
 const asset=path.join(root,'assets','premium','fecha-conversao.webp');
 assert.ok(fs.statSync(asset).size>10000);
 assert.match(html,/src="\.\.\/assets\/premium\/fecha-conversao\.webp"/);
 assert.match(html,/fetchpriority="high"/);
 assert.match(css,/@media\(max-width:1000px\)/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/\.hero-demo\{grid-column:1\/-1;grid-row:2/);
 assert.doesNotMatch(html,/\+500\b/);
});