'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'fecha-negocio','index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'fecha-negocio','conversion.css'),'utf8');
test('hero oferece tres opcoes claras e rastreaveis para primeiro contato',()=>{
  assert.match(html,/class="first-contact"/);
  for(const track of ['primeiro-contato-site','primeiro-contato-clientes','primeiro-contato-diagnostico']){
    assert.match(html,new RegExp('data-track="'+track+'"'));
  }
  const block=html.split('class="first-contact"')[1].split('class="hero-price"')[0];
  const links=[...block.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)];
  assert.equal(links.length,3);
  for(const match of links.slice(0,2)){
    const target=match[1].replaceAll('&amp;','&');
    const url=new URL(target);
    assert.equal(url.hostname,'wa.me');
    assert.equal(url.pathname,'/5514998193831');
    assert.ok(url.searchParams.get('text'));
    assert.match(match[0],/rel="noopener noreferrer"/);
  }
  assert.match(links[2][1],/\.\.\/diagnostico-gratuito\/\?/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/prefers-reduced-motion/);
});