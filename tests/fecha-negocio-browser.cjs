'use strict';
// QA em navegador real, sem enviar leads, abrir WhatsApp ou gerar pedidos.
// Requer PUPPETEER_MODULE para uma instalacao local existente do Puppeteer.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const base = process.env.PROXIMAERA_SITE_URL || 'https://proximaera.com.br';
const executablePath = process.env.CHROME_PATH;

async function main() {
  const browser = await puppeteer.launch({
    headless: true, executablePath,
    args: ['--no-first-run', '--no-default-browser-check']
  });
  try {
    for (const width of [390, 1366]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({ width, height: 840, deviceScaleFactor: 1 });
      const url = new URL('/fecha-negocio/?utm_source=meta&utm_campaign=validacao&utm_content=preco', base);
      const response = await page.goto(url.href, {waitUntil: 'domcontentloaded', timeout: 20000});
      assert.equal(response.status(), 200, 'Pagina nao acessivel');
      await page.waitForSelector('.hero-actions .button.primary', {timeout: 8000});
      const initial = await page.evaluate(() => ({
        bodyWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src),
        title: document.querySelector('h1')?.innerText || '',
        heroLink: document.querySelector('.hero-actions .button.primary')?.href || ''
      }));
      assert.ok(initial.bodyWidth <= initial.viewport + 2,
        `Overflow horizontal em ${width}px: ${initial.bodyWidth} > ${initial.viewport}`);
      assert.deepEqual(initial.brokenImages, [], `Imagens quebradas em ${width}px`);
      assert.ok(initial.title.includes('R$ 79,90'), 'Variante UTM de preco nao ativou');
      assert.match(initial.heroLink, /^https:\/\/wa\.me\/5514996428874/);
      await page.click('[data-template="service"]');
      const service = await page.evaluate(() => ({
        theme: document.querySelector('.browser')?.dataset.templateTheme,
        link: document.querySelector('[data-demo-full]')?.href || '',
        pressed: document.querySelector('[data-template="service"]')?.getAttribute('aria-pressed')
      }));
      assert.equal(service.theme, 'service');
      assert.equal(service.pressed, 'true');
      assert.match(service.link, /segment=servicos/);
      assert.match(service.link, /utm_source=meta/);
      await page.click('[data-template="consult"]');
      const consult = await page.evaluate(() => document.querySelector('.browser')?.dataset.templateTheme);
      assert.equal(consult, 'consult');
      assert.deepEqual(errors, [], `Erros JS em ${width}px`);
      console.log(`PASS navegador ${width}px: sem overflow/imagem quebrada/erro JS; CTA, variante, modelos e UTMs corretos`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(err => { console.error('FAIL', err.stack || err); process.exitCode = 1; });
