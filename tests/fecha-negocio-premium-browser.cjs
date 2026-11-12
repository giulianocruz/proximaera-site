'use strict';
// Smoke visual local. Sem WhatsApp, formularios reais ou trafego pago.
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const base = 'http://127.0.0.1:8876';

async function ready() {
  for (let i=0;i<30;i++) {
    try { const r=await fetch(base+'/fecha-negocio/'); if(r.ok)return; } catch {}
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error('Servidor estatico nao iniciou');
}

async function main() {
  const server = spawn('python3',['-m','http.server','8876','--bind','127.0.0.1'],{stdio:'ignore'});
  let browser;
  try {
    await ready();
    browser = await puppeteer.launch({
      headless:true,
      executablePath:process.env.CHROME_PATH || '/usr/bin/chromium',
      args:['--no-sandbox','--disable-setuid-sandbox','--no-first-run']
    });
    for(const width of [390,1366]) {
      const page=await browser.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.setViewport({width,height:850,deviceScaleFactor:1});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.setCacheEnabled(false);
      const r=await page.goto(base+'/fecha-negocio/?utm_source=meta&utm_campaign=validacao&utm_content=preco',{waitUntil:'domcontentloaded',timeout:20000});
      assert.ok([200,304].includes(r.status()),'HTTP inesperado: '+r.status());
      await page.waitForFunction(()=>{
        const img=document.querySelector('.premium-showcase-image');
        return img && img.complete && img.naturalWidth>0;
      },{timeout:15000});
      const initial=await page.evaluate(()=>{
        const visual=document.querySelector('.premium-showcase-image');
        return {
          viewport:document.documentElement.clientWidth,
          total:document.documentElement.scrollWidth,
          showcase:document.querySelector('.hero-demo').dataset.showcase,
          image:visual.currentSrc,
          fallbackDisplay:getComputedStyle(document.querySelector('.hero-demo .browser')).display,
          checkout:document.querySelector('[data-track="whatsapp-hero-profissional"]').href,
          planText:document.querySelector('#planos').innerText
        };
      });
      assert.ok(initial.total<=initial.viewport+2,`Overflow em ${width}: ${initial.total} > ${initial.viewport}`);
      assert.equal(initial.showcase,'beauty');
      assert.ok(initial.image.includes('fecha-hero-v2.webp'));
      assert.equal(initial.fallbackDisplay,'none','fallback antigo nao deve sobrepor arte premium');
      assert.ok(initial.checkout.startsWith('https://wa.me/5514998193831'));
      assert.match(initial.planText,/79,90/);
      assert.match(initial.planText,/367/);
      for(const [type,route,headline] of [
        ['service','/modelos/servicos/','Energia segura'],
        ['consult','/modelos/consultoria/','Toda boa decisão']
      ]){
        await page.click('[data-template="'+type+'"]');
        await page.waitForFunction(name=>document.querySelector('.hero-demo')?.dataset.showcase===name,{timeout:15000},type);
        const state=await page.evaluate(()=>({
          theme:document.querySelector('.hero-demo').dataset.showcase,
          active:document.querySelector('[data-template].is-active')?.dataset.template,
          frame:document.querySelector('.demo-live-site-frame')?.getAttribute('src'),
          sandbox:document.querySelector('.demo-live-site-frame')?.getAttribute('sandbox'),
          width:document.querySelector('.demo-live-site-stage')?.clientWidth,
          height:document.querySelector('.demo-live-site-stage')?.clientHeight,
          visible:getComputedStyle(document.querySelector('.demo-live-site')).display,
          browser:getComputedStyle(document.querySelector('.hero-demo .browser')).display,
          link:document.querySelector('[data-demo-full]').href,
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
        }));
        assert.equal(state.theme,type);
        assert.equal(state.active,type);
        assert.ok(state.frame.includes(route));
        assert.equal(state.sandbox,'','previsões não devem executar scripts/rastreio em duplicidade');
        assert.notEqual(state.visible,'none');
        assert.equal(state.browser,'none','mockup antigo não pode sobrepor modelo real');
        assert.ok(state.width>200 && state.height>200,'prévia não ocupa área visível');
        assert.ok(state.overflow<=2,'overflow ao selecionar '+type+' no viewport '+width);
        assert.ok(state.link.includes(route));
        assert.match(state.link,/utm_source=meta/);
        const frameElement=await page.$('.demo-live-site-frame');
        const child=await frameElement.contentFrame();
        assert.ok(child,'iframe do modelo não foi anexado');
        await child.waitForSelector('.v-hero h1',{timeout:15000});
        assert.match(await child.$eval('.v-hero h1',el=>el.textContent),new RegExp(headline));
      }
      await page.click('[data-template="beauty"]');
      const back=await page.evaluate(()=>({
        beauty:document.querySelector('.hero-demo').dataset.showcase,
        art:getComputedStyle(document.querySelector('.premium-showcase')).display,
        frame:getComputedStyle(document.querySelector('.demo-live-site')).display
      }));
      assert.equal(back.beauty,'beauty');
      assert.notEqual(back.art,'none');
      assert.equal(back.frame,'none');
      for(const model of ['service','consult']){
        await page.click('[data-preview="'+model+'"]');
        await page.waitForFunction(name=>document.querySelector('.hero-demo')?.dataset.showcase===name,{timeout:15000},model);
        await page.waitForFunction(()=>{
          const node=document.getElementById('demonstracao');
          const header=document.querySelector('.site-header');
          if(!node||!header)return false;
          const top=node.getBoundingClientRect().top;
          const y=header.getBoundingClientRect().height;
          return top>=y-20&&top<=y+125;
        },{timeout:15000});
        const landing=await page.evaluate(()=>({
          top:Math.round(document.getElementById('demonstracao').getBoundingClientRect().top),
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          frame:document.querySelector('.demo-live-site-frame')?.getAttribute('src')
        }));
        assert.ok(landing.overflow<=2,'Overflow clicando no cartão de '+model);
        assert.match(landing.frame,new RegExp(model==='service'?'modelos/servicos/':'modelos/consultoria/'));
      }
      assert.deepEqual(errors,[],`Erros JS no viewport ${width}`);
      console.log(`OK navegador ${width}px: 3 previews visuais, modelos reais, UTMs, CTA e layout`);
      await page.close();
      for(const [slug,brand] of [['servicos','Ramos'],['consultoria','Vértice']]){
        const sample=await browser.newPage();
        const demoErrors=[];
        sample.on('pageerror',e=>demoErrors.push(e.message));
        await sample.setViewport({width,height:850});
        await sample.setCacheEnabled(false);
        const response=await sample.goto(base+'/fecha-negocio/modelos/'+slug+'/?utm_source=meta',{waitUntil:'networkidle0'});
        assert.ok([200,304].includes(response.status()),'HTTP da demonstração: '+response.status());
        const info=await sample.evaluate(()=>({
          viewport:document.documentElement.clientWidth,
          width:document.documentElement.scrollWidth,
          title:document.title,
          cta:document.querySelector('[data-demo-convert]')?.href,
          back:document.querySelector('[data-demo-return]')?.href,
          sections:document.querySelectorAll('main section[id]').length
        }));
        assert.ok(info.width<=info.viewport+2,'Overflow em '+slug+': '+info.width);
        assert.ok(info.title.includes(brand));
        assert.ok(info.sections>=5);
        assert.ok(info.cta.startsWith('https://wa.me/5514998193831'));
        assert.match(info.back,/utm_source=meta/);
        assert.deepEqual(demoErrors,[]);
        console.log('OK demo',slug,width,'px');
        await sample.close();
      }
    }
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
