'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const styles=read('fecha-negocio/modelos/vitrine-premium.css');
const action=read('fecha-negocio/modelos/vitrine-premium.js');
const switcher=read('fecha-negocio/preview.js');
const legacy=read('fecha-negocio/modelos/demo.js');
const pages=[
 ['servicos','Ramos Elétrica','ramos'],
 ['consultoria','Vértice Consultoria','vertice'],
];
for(const [slug,brand,theme] of pages){
 test('demonstração completa '+slug+' tem identidade, seções e contato demonstrativo',()=>{
   const html=read('fecha-negocio/modelos/'+slug+'/index.html');
   assert.match(html,/lang="pt-BR"/);
   assert.ok(html.includes('class="'+theme+'"'));
   assert.ok(html.includes(brand));
   assert.match(html,/DEMONSTRAÇÃO FICTÍCIA/);
   assert.match(html,/vitrine-premium\.css/);
   assert.match(html,/vitrine-premium\.js/);
   assert.match(html,/noindex,follow/);
   assert.match(html,/data-demo-convert/);
   assert.match(html,/https:\/\/wa\.me\/5514998193831/);
   for(const id of ['inicio','solucoes','processo','sobre','contato'].map(x=>slug==='consultoria'?(x==='solucoes'?'atuacao':x==='processo'?'metodo':x):x)){
      assert.ok(html.includes('id="'+id+'"'),'seção '+id);
   }
   assert.ok(!/lorem ipsum|5 estrelas|depoimento de cliente/i.test(html));
 });
}
test('as duas identidades têm layouts próprios e responsivos',()=>{
 assert.match(styles,/\.ramos-panel/);
 assert.match(styles,/\.vertice-board/);
 assert.match(styles,/@media\(max-width:780px\)/);
 assert.match(styles,/prefers-reduced-motion/);
 assert.ok(styles.length>7500);
});
test('links da landing e URLs legadas mantêm campanhas',()=>{
 assert.match(switcher,/modelos\/servicos\//);
 assert.match(switcher,/modelos\/consultoria\//);
 assert.match(switcher,/utm_source/);
 assert.match(legacy,/location\.replace/);
 assert.match(legacy,/utm_campaign/);
 assert.match(action,/data-demo-return/);
 assert.match(action,/data-demo-convert/);
 assert.match(action,/wa\.me\/5514998193831/);
});
