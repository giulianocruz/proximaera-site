'use strict';
// Testa consentimento sem enviar POST ou requisicoes reais a Google/Meta.
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const base = process.env.PROXIMAERA_SITE_URL || 'https://proximaera.com.br';

async function browserPage(browser) {
  const page = await browser.newPage();
  const marketing = [];
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {get: () => false});
    // Cada cenario representa um novo visitante, sem preferencia anterior.
    try { localStorage.removeItem('pe_marketing_consent'); } catch {}
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (/googletagmanager\.com|google-analytics\.com|facebook\.net|facebook\.com\/tr/i.test(url)) {
      marketing.push(url);
      return request.abort();
    }
    if (request.method() !== 'GET') return request.abort();
    request.continue();
  });
  return {page, marketing};
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ['--no-first-run', '--no-default-browser-check']
  });
  try {
    {
      const {page, marketing} = await browserPage(browser);
      await page.goto(new URL('/fecha-negocio/', base).href, {waitUntil:'domcontentloaded', timeout:20000});
      await page.waitForSelector('[data-pe-marketing-consent]', {timeout:10000});
      assert.equal(marketing.length, 0, 'Marketing carregado antes de consentimento');
      await page.evaluate(() => document.querySelector('[data-pe-marketing-consent] button:nth-child(2)'));
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-pe-marketing-consent] button')];
        buttons.find(b => b.textContent.includes('Agora não')).click();
      });
      const denied = await page.evaluate(() => localStorage.getItem('pe_marketing_consent'));
      assert.equal(denied, 'denied');
      assert.equal(marketing.length, 0, 'Tags disparadas apos recusa');
      console.log('PASS consentimento recusado: sem tags de terceiros');
      await page.close();
    }
    {
      const {page, marketing} = await browserPage(browser);
      await page.goto(new URL('/fecha-negocio/', base).href, {waitUntil:'domcontentloaded', timeout:20000});
      await page.waitForSelector('[data-pe-marketing-consent]', {timeout:10000});
      assert.equal(marketing.length, 0, 'Tags carregadas antes de consentimento');
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-pe-marketing-consent] button')];
        buttons.find(b => b.textContent.includes('Aceitar marketing')).click();
      });
      await page.waitForFunction(() => typeof window.fbq === 'function' && typeof window.gtag === 'function',
        {timeout:10000});
      const granted = await page.evaluate(() => localStorage.getItem('pe_marketing_consent'));
      assert.equal(granted, 'granted');
      assert.ok(marketing.some(url => url.includes('googletagmanager.com')), 'GA4 nao inicializou apos aceite');
      assert.ok(marketing.some(url => url.includes('facebook.net')), 'Meta Pixel nao inicializou apos aceite');
      console.log('PASS consentimento aceito: GA4 e Meta ativados somente apos aceite (requisicoes bloqueadas no teste)');
      await page.close();
    }
  } finally { await browser.close(); }
}
run().catch(err=>{console.error('FAIL',err.stack||err); process.exitCode=1});
