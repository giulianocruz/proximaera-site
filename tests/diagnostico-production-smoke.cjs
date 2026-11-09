'use strict';
/* Verificação read-only da landing publicada. Não envia leads. */
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const base='https://proximaera.com.br/';
const release='20261109T183008Z';
const files=[
  {path:'diagnostico-gratuito/',sha:'ed48efb3b63a36d195e9c9e8874255f7513511de1ab802fa887b5f290314dad2'},
  {path:'diagnostico-gratuito/style.css',sha:'29e6136be6990ed46162e36c764ef2bdc55f1128487a5cdb0911d47a3f132a13'},
  {path:'diagnostico-gratuito/app.js',sha:'1b5e8b046c1872d3ead661a0493220b12e2add1d8b517a3ab9c99c8f52e94f3c'},
  {path:'tracking.js',sha:'fb2d4ed51e59ac38516c539680b153b3adc051322eb05820194a610cb283fc1d'},
  {path:'sitemap.xml',sha:'2eec9ff666b95b9c8783259bfaa2ca4d2177fd154181a0adc9e941dec878dab1'},
];
async function get(p){
  const url=base+p+'?pe_release='+release;
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'follow',headers:{'cache-control':'no-cache','user-agent':'ProximaEra-Diagnostic-QA/1.0'}});
  assert.equal(response.status,200,p+': HTTP '+response.status);
  assert.equal(response.url,url,p+': redirecionamento inesperado');
  return Buffer.from(await response.arrayBuffer());
}
(async()=>{
  const results=await Promise.all(files.map(async file=>{
    const bytes=await get(file.path);
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash,file.sha,file.path+': drift dos arquivos publicados');
    console.log('LIVE_PASS',file.path,hash.slice(0,12));
    return bytes.toString('utf8');
  }));
  assert.match(results[0],/id="diagnosticForm"/);
  assert.match(results[0],/meta name="description"/);
  assert.match(results[0],/href="\.\.\/privacidade\.html"/);
  assert.match(results[2],/5514998193831/);
  assert.match(results[3],/peIsDiagnostic/);
  assert.match(results[4],/diagnostico-gratuito/);
  const logo=await get('assets/logo-horizontal.svg');
  assert.ok(logo.length>100);
  console.log('DIAGNOSTIC_LIVE_PASS=6/6, integridade confirmada');
})().catch(err=>{console.error('DIAGNOSTIC_LIVE_FAIL:',err.message);process.exitCode=1});
