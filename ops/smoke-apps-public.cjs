'use strict';
/*
 * Auditoria pública read-only do catálogo da Próxima Era.
 * Uso: node ops/smoke-apps-public.cjs --before|--after|--audit
 * --before valida o snapshot público pré-release.
 * --after comprova que os 3 arquivos publicados correspondem ao commit aprovado.
 * --audit confere disponibilidade e links críticos sem fixar conteúdo do catálogo.
 * NÃO altera a produção, não cria pedidos, não contata clientes e não executa deploy.
 */
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const BASE = 'https://proximaera.com.br';
const mode = process.argv[2] || '--audit';
if (!['--before','--after','--audit'].includes(mode) || process.argv.length > 3) {
  console.error('Uso: node ops/smoke-apps-public.cjs --before|--after|--audit');
  process.exit(2);
}
const hashes = {
  before: {
    '/aplicativos/':'8ea6e783b1e85a06a9be78168f0ecce9b9e55ed480c5e9fd76c44fb907b66967',
    '/aplicativos/apps.css':'9412358ddbc7d7676c597378706b133fc4e0022d1aeaab0eeb9934f93fbba55d'
  },
  after: {
    '/aplicativos/':'347a29c974819f9db066b394845f3d28ccd2f390d1f49309ec7c01e6c8f7e938',
    '/aplicativos/apps.css':'434844e84acc078521e6a812b35cb1e00fb1cb527b6ffa560428cb78e5734d8c',
    '/aplicativos/apps-hub.js':'535272e8a4c9418d828c84ea7c8f5cddfdde91c84bf7545593835a9c5e814512'
  }
};
const routes=[
  ['/','text/html'],
  ['/fecha-negocio/','text/html'],
  ['/contato.html','text/html'],
  ['/aplicativos/','text/html'],
  ['/aplicativos/apps.css','text/css'],
  ['/aplicativos/boleto-rush/privacidade.html','text/html'],
  ['/apps/cronicas-do-abismo/','text/html'],
  ['/apps/cronicas-do-abismo/privacidade/','text/html'],
  ['/retro/','text/html'],
  ['/retro/status.html','text/html'],
  ['/retro/privacidade.html','text/html'],
  ['/retro/assets/biblioteca-demo.jpg','image/jpeg'],
  ['/retro/version.json','application/json']
];
if (mode==='--after') routes.push(['/aplicativos/apps-hub.js','javascript']);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function get(route,expectedType){
  const response=await fetch(BASE+route,{
    redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(14000),
    headers:{'Accept':'*/*','Cache-Control':'no-cache'}
  });
  assert.equal(response.status,200,route+' retornou HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  assert.ok(type.includes(expectedType),route+' MIME inesperado: '+type);
  const final=new URL(response.url);
  assert.equal(final.origin,BASE,route+' redirecionou para origem externa');
  return Buffer.from(await response.arrayBuffer());
}
async function main(){
  let count=0;
  const data=new Map();
  for(const [route,mime] of routes){
    const bytes=await get(route,mime);
    data.set(route,bytes);
    console.log('OK '+route+' HTTP 200; '+bytes.length+' bytes');
    count++;
  }
  const h=data.get('/aplicativos/').toString('utf8');
  const c=data.get('/aplicativos/apps.css').toString('utf8');
  assert.match(h,/Boleto Rush!/);
  assert.match(h,/Próxima Era Retro/);
  assert.ok(h.includes('../retro/'),'Catálogo sem link para o portal Retro');
  assert.ok(c.length>500,'CSS do catálogo vazio');
  count+=4;
  const version=JSON.parse(data.get('/retro/version.json').toString('utf8'));
  assert.ok(/^\d+\.\d+\.\d+$/.test(version.version),'Versão Retro inválida');
  assert.equal(version.channel,'beta','Canal Retro inesperado');
  count+=2;
  if(mode==='--after'){
    for(const title of ['Crônicas do Abismo','República dos Malandros','Brasil em Apuros!','MyEggs']){
      assert.ok(h.includes(title),'Falta projeto: '+title); count++;
    }
    assert.ok(h.includes('apps-hub.js'),'HTML não referencia consulta da versão');
    assert.ok(h.includes('utm_campaign=retro_beta'),'URL de download não preserva UTMs');
    const js=data.get('/aplicativos/apps-hub.js').toString('utf8');
    assert.ok(js.includes('../retro/version.json'),'JS não consulta manifesto de versões');
    count+=3;
  }
  const expected=mode==='--before'?hashes.before:mode==='--after'?hashes.after:null;
  if(expected){
    for(const [route,hash] of Object.entries(expected)){
      const actual=sha(data.get(route));
      assert.equal(actual,hash,route+' mudou. STOP: investigar atualização concorrente');
      console.log('HASH OK '+route);count++;
    }
  }
  console.log('PASS '+mode+' · '+count+' verificações · sem escrita em produção');
}
main().catch(e=>{console.error('FAIL '+mode+': '+e.message);process.exitCode=1});
