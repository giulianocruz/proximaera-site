'use strict';
/* Teste MANUAL de layout local: requer Chromium via Puppeteer.
   Não deve ser executado como parte do CI sem essa dependência. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
let puppeteer;
try { puppeteer=require('puppeteer'); }
catch (_) { puppeteer=require(require.resolve('puppeteer',{paths:[process.cwd()]})); }

async function main(){
  const root=path.resolve(__dirname,'..');
  const pageUrl=pathToFileURL(path.join(root,'aplicativos','index.html')).href;
  const output=path.join(root,'qa','apps-catalog');
  fs.mkdirSync(output,{recursive:true});
  const browser=await puppeteer.launch({headless:true});
  try{
    const page=await browser.newPage();
    for(const width of [375,768,1440]){
      await page.setViewport({width,height:900,deviceScaleFactor:1});
      await page.goto(pageUrl,{waitUntil:'load',timeout:15000});
      const result=await page.evaluate(()=>{
        const el=document.querySelector('.retro-feature');
        const img=el.querySelector('img');
        const r=el.getBoundingClientRect();
        const links=[...el.querySelectorAll('a[href]')].map(a=>({label:a.textContent,href:a.getAttribute('href')}));
        return {
          title:document.title, scrollWidth:document.documentElement.scrollWidth,
          viewportWidth:window.innerWidth, featured:document.querySelectorAll('.featured-grid .card').length,
          development:document.querySelectorAll('.project-grid .project-card').length,
          retroWidth:r.width, retroLeft:r.left, retroRight:r.right,
          columns:getComputedStyle(el).gridTemplateColumns, imageNaturalWidth:img.naturalWidth,
          links
        };
      });
      assert.ok(result.scrollWidth<=result.viewportWidth+1,'Sem overflow '+width+': '+JSON.stringify(result));
      assert.equal(result.featured,3,'Três projetos com páginas de teste');
      assert.equal(result.development,3,'Três projetos ainda em desenvolvimento');
      assert.ok(result.retroRight<=width+1 && result.retroLeft>=-1,'Retro dentro da tela '+width);
      assert.ok(result.links.some(l=>l.href.startsWith('../retro/?utm_source=proximaera&')),'Portal oficial acessível na página');
      assert.ok(result.links.some(l=>l.href==='../retro/status.html'),'Status oficial acessível na página');
      await page.screenshot({path:path.join(output,'catalogo-'+width+'.png'),fullPage:false});
      console.log('PASS '+width+'px: 3 betas, 3 em desenvolvimento; sem rolagem horizontal; destaque Retro visível.');
    }
  }finally{await browser.close()}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
