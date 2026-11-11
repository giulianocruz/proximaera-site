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
      const r=await page.goto(base+'/fecha-negocio/?utm_source=meta&utm_campaign=validacao&utm_content=preco',{waitUntil:'domcontentloaded',timeout:20000});
      assert.equal(r.status(),200);
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
      await page.click('[data-template="service"]');
      await page.waitForFunction(()=>{
        const v=document.querySelector('.premium-showcase-image');
        return v.complete && v.naturalWidth>0 && v.currentSrc.includes('fecha-servicos-v2.webp');
      },{timeout:15000});
      const service=await page.evaluate(()=>({
        theme:document.querySelector('.hero-demo').dataset.showcase,
        pressed:document.querySelector('[data-template="service"]').getAttribute('aria-pressed'),
        link:document.querySelector('[data-demo-full]').href
      }));
      assert.equal(service.theme,'service');
      assert.equal(service.pressed,'true');
      assert.match(service.link,/segment=servicos/);
      assert.match(service.link,/utm_source=meta/);
      await page.click('[data-template="consult"]');
      const consult=await page.evaluate(()=>({
        theme:document.querySelector('.hero-demo').dataset.showcase,
        fallback:getComputedStyle(document.querySelector('.hero-demo .browser')).display,
        premium:getComputedStyle(document.querySelector('.premium-showcase')).display
      }));
      assert.equal(consult.theme,'consult');
      assert.notEqual(consult.fallback,'none');
      assert.equal(consult.premium,'none');
      assert.deepEqual(errors,[],`Erros JS no viewport ${width}`);
      console.log(`OK navegador ${width}px: imagens, alternancia, UTMs, CTA e layout`);
      await page.close();
    }
  } finally {
    if(browser)await browser.close();
    server.kill();
  }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
