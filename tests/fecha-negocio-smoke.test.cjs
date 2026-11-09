'use strict';
// Confere a pagina comercial real antes de iniciar campanhas pagas.
// Apenas GET: nao dispara mensagem, pagamento, pixel ou cadastro.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const base = process.env.PROXIMAERA_SITE_URL || 'https://proximaera.com.br';

async function page(path) {
  const url = new URL(path, base);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'ProximaEra-FechaNegocioSmoke/1.0' },
    redirect: 'follow',
  });
  assert.equal(response.status, 200, `${url} respondeu HTTP ${response.status}`);
  assert.equal(response.url, url.href, `${url} redirecionou inesperadamente`);
  return { body: await response.text(), type: response.headers.get('content-type') || '' };
}

test('landing comercial exibe oferta, condicao de pagamento e SEO', async () => {
  const { body, type } = await page('/fecha-negocio/');
  assert.match(type, /text\/html/i);
  for (const marker of [
    'https://proximaera.com.br/fecha-negocio/',
    'R$ 79,90', 'R$ 367', 'PLANO PROFISSIONAL',
    'Prévia antes de pagar', 'após a confirmação do pagamento',
    'id="planos"', 'id="demonstracao"', 'id="duvidas"',
    'name="description"', 'property="og:image"', 'data-demo-full',
  ]) {
    assert.ok(body.includes(marker), `Elemento ausente na landing: ${marker}`);
  }
});

test('todos os CTAs de WhatsApp levam ao numero comercial correto e sao rastreaveis', async () => {
  const { body } = await page('/fecha-negocio/');
  const links = [...body.matchAll(/<a\b[^>]*href="(https:\/\/wa\.me\/[^"]+)"[^>]*>/gi)];
  assert.ok(links.length >= 7, `Esperados >=7 CTAs WhatsApp; encontrados ${links.length}`);
  for (const [, href] of links) {
    const url = new URL(href.replaceAll('&amp;', '&'));
    assert.equal(url.hostname, 'wa.me');
    assert.equal(url.pathname, '/5514996428874');
    assert.ok(url.searchParams.get('text')?.trim(), 'CTA sem mensagem predefinida');
    const tag = links.find(x => x[1] === href)[0];
    assert.match(tag, /data-track="[^"]+"/i, 'CTA sem identificador de conversao');
    if (/target="_blank"/i.test(tag)) {
      assert.match(tag, /rel="[^"]*noopener/i, 'CTA sem protecao noopener');
    }
  }
});

test('modelos demonstrativos respondem para os tres segmentos', async () => {
  for (const segment of ['beleza', 'servicos', 'consultoria']) {
    const { body, type } = await page(`/fecha-negocio/modelos/?segment=${segment}`);
    assert.match(type, /text\/html/i);
    assert.ok(body.includes('data-') || body.includes('WhatsApp'), `Modelo ${segment} sem conteudo`);
  }
});

test('scripts da landing e mensuracao sao entregues sem 404', async () => {
  for (const path of [
    '/fecha-negocio/experiment.js',
    '/fecha-negocio/preview.js',
    '/tracking.js',
  ]) {
    const { body } = await page(path);
    assert.ok(body.length > 100, `${path} esta vazio`);
  }
});
