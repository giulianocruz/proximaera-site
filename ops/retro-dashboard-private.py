#!/usr/bin/env python3
"""Generate a standalone, private, offline dashboard from Retro's existing SQLite.

Never starts a web server, fetches external assets, or modifies counters.
HTML is a private artifact, NOT a public /retro page.
"""
import argparse
import datetime as dt
import html
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

HERE = Path(__file__).resolve().parent
DEFAULT_PRIVATE = Path('/opt/proximaera/tools/private-reports')
REPORT_SOURCE = HERE / 'retro-download-report.py'

PAGE = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>Próxima Era Retro · Painel privado</title>
<style>
:root{color-scheme:dark;--bg:#07121b;--panel:#10232d;--panel2:#122a33;--line:#29434b;--ink:#e9f7f6;--muted:#9ab6bb;--teal:#70e3c3;--violet:#aa96ff;--amber:#f8cc8d}
*{box-sizing:border-box}
html{background:var(--bg);scroll-behavior:smooth}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);background:radial-gradient(ellipse at 5% 0%,#163b48 0%,transparent 43%),radial-gradient(ellipse at 95% 6%,#1d2544 0%,transparent 35%),var(--bg);min-height:100vh;line-height:1.55}
.wrap{max-width:1260px;margin:0 auto;padding:28px clamp(16px,4vw,56px) 72px}
.top{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:12px;letter-spacing:.12em;font-size:12px;font-weight:800;text-transform:uppercase}
.mark{width:40px;height:40px;border:1px solid #3e908e;display:grid;place-items:center;border-radius:12px;background:#173a3d;color:var(--teal);font-size:23px}
.privacy{border:1px solid var(--line);background:#142934;padding:8px 12px;border-radius:100px;color:var(--muted);font-size:12px}
h1{font-size:clamp(30px,4.5vw,57px);line-height:1.1;letter-spacing:-.045em;margin:32px 0 12px}
h1 em{font-style:normal;color:var(--teal)}
.lead{color:var(--muted);max-width:760px;margin:0 0 24px}
.toolbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;margin:28px 0 22px}
.options{display:flex;gap:5px;padding:5px;background:#142630;border:1px solid var(--line);border-radius:12px}
button{font:inherit;cursor:pointer;border:0;color:#b8cdd0;background:transparent;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:700}
button[aria-pressed=true]{background:#285454;color:#eafff8;box-shadow:inset 0 0 0 1px #4a9286}
button:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
button.download{border:1px solid #4a8083;padding:12px 16px;border-radius:12px;color:#d6fff5}
button:hover{filter:brightness(1.18)}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.card{background:linear-gradient(145deg,#17313a,#10222e);border:1px solid var(--line);border-radius:18px;padding:22px;min-width:0}
.card .eyebrow{color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.04em}
.card .value{display:block;font-size:clamp(30px,3.4vw,46px);font-weight:800;line-height:1.3;letter-spacing:-.05em;margin:8px 0}
.card .desc{color:var(--muted);font-size:12px}
.card.tone-android .value{color:var(--teal)}
.card.tone-windows .value{color:var(--violet)}
section{margin:26px 0}
.section-title{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:14px;margin-bottom:12px}
h2{font-size:20px;letter-spacing:-.02em;margin:0}
.small{font-size:12px;color:var(--muted)}
.panel{background:#10232e;border:1px solid var(--line);padding:24px;border-radius:18px}
.chart{height:240px;display:flex;gap:5px;align-items:flex-end;overflow-x:auto;border-bottom:1px solid #426069;padding:20px 0 0}
.chart-day{min-width:9px;flex:1;display:flex;flex-direction:column;justify-content:end;height:100%;align-items:stretch;position:relative}
.track{height:calc(100% - 31px);display:flex;align-items:flex-end;justify-content:center;position:relative}
.stack{width:clamp(7px,100%,24px);display:flex;flex-direction:column-reverse;border-radius:5px 5px 0 0;min-height:2px;overflow:hidden}
.android-segment{background:linear-gradient(#91f4d5,#37a999)}
.windows-segment{background:linear-gradient(#bcb0ff,#7963d0)}
.chart-label{font-size:10px;color:#8faab1;text-align:center;white-space:nowrap;height:25px;padding-top:8px}
.legend{display:flex;gap:18px;font-size:12px;color:var(--muted);align-items:center}
.dot{width:10px;height:10px;display:inline-block;border-radius:2px;margin-right:6px;background:var(--teal)}
.dot.windows{background:var(--violet)}
.columns{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr);gap:18px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #27414a}
th{font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
td .platform{border:1px solid #31565d;border-radius:7px;padding:3px 7px;font-size:11px}
.scroll{overflow:auto}
.attribution{display:grid;gap:12px}
.attribution-line{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #27414a;padding:9px 0}
.warn{border:1px solid #5e583d;background:#2a2a25;padding:14px 17px;color:#efd7a9;border-radius:14px;font-size:13px}
footer{border-top:1px solid var(--line);margin-top:36px;padding-top:18px;color:var(--muted);font-size:12px}
.muted{color:var(--muted)}
.empty{color:var(--muted);padding:24px;text-align:center}
@media(max-width:900px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.columns{grid-template-columns:1fr}}
@media(max-width:480px){.cards{grid-template-columns:1fr 1fr;gap:9px}.card{padding:15px}.panel{padding:14px}.chart{height:190px}.options button{padding:8px 10px}.wrap{padding:18px 12px 42px}th,td{padding:9px 5px;font-size:11px}}
@media print{body{background:white!important;color:black}.privacy{color:black}.toolbar,.download{display:none!important}.card,.panel{border:1px solid #999;background:white;color:black}.card .value{color:black!important}}
</style>
</head>
<body>
<div class="wrap">
<header class="top"><div class="brand"><span class="mark">✦</span><span>Próxima Era<br>Retro Analytics</span></div><span class="privacy">● Relatório administrativo offline · Sem dados pessoais</span></header>
<main>
<h1>O pulso dos <em>downloads.</em></h1>
<p class="lead">Acompanhe a distribuição da versão beta com números extraídos do SQLite persistente. Requisições HTTP completas não representam instalações ou usuários únicos.</p>
<div class="toolbar" aria-label="Filtros do relatório">
  <div class="options" role="group" aria-label="Período"><button type="button" data-days="7" aria-pressed="true">7 dias</button><button type="button" data-days="30" aria-pressed="false">30 dias</button><button type="button" data-days="90" aria-pressed="false">90 dias</button></div>
  <div class="options" role="group" aria-label="Plataforma"><button type="button" data-platform="all" aria-pressed="true">Todas</button><button type="button" data-platform="android" aria-pressed="false">Android</button><button type="button" data-platform="windows" aria-pressed="false">Windows</button></div>
  <button type="button" class="download" id="csv">Exportar CSV do filtro</button>
</div>
<div class="cards">
<div class="card"><span class="eyebrow">Transferências completas prováveis</span><strong class="value" id="complete">__STATIC_COMPLETE__</strong><span class="desc">GET 200 e bytes de corpo suficientes</span></div>
<div class="card"><span class="eyebrow">Requisições iniciadas</span><strong class="value" id="started">__STATIC_STARTED__</strong><span class="desc">Não são pessoas ou instalações</span></div>
<div class="card tone-android"><span class="eyebrow">Android · completos</span><strong class="value" id="android">__STATIC_ANDROID__</strong><span class="desc">APK beta do Retro</span></div>
<div class="card tone-windows"><span class="eyebrow">Windows · completos</span><strong class="value" id="windows">__STATIC_WINDOWS__</strong><span class="desc">ZIP portable</span></div>
</div>
<section aria-labelledby="daily-title"><div class="section-title"><h2 id="daily-title">Transferências por dia</h2><span class="legend"><span><i class="dot"></i>Android</span><span><i class="dot windows"></i>Windows</span></span></div><div class="panel"><div class="chart" id="daily-chart" role="img" aria-label="Barras de transferências completas por dia e plataforma"></div><p class="small" id="chart-note">Dados por dia-calendário, horário de São Paulo.</p></div></section>
<div class="columns">
<section aria-labelledby="versions-title"><div class="section-title"><h2 id="versions-title">Versões distribuídas</h2><span class="small" id="table-period">Janela selecionada</span></div><div class="panel scroll"><table><thead><tr><th>Versão</th><th>Plataforma</th><th class="num">Iniciados</th><th class="num">Completos</th><th class="num">Parciais</th></tr></thead><tbody id="versions"><tr><td colspan="5">Carregando visão local…</td></tr></tbody></table></div></section>
<section aria-labelledby="sources-title"><div class="section-title"><h2 id="sources-title">Origem e atividade</h2><span class="small">Janela completa do arquivo: __FULL_WINDOW__</span></div><div class="panel"><div class="attribution" id="sources"></div><div class="attribution-line"><span class="muted">Requisições ao portal</span><strong>__PORTAL_REQUESTS__</strong></div><div class="attribution-line"><span class="muted">Aberturas opt-in no aplicativo</span><strong>__APP_LAUNCHES__</strong></div><p class="small">Origem, visitas e aberturas referem-se à janela completa exportada, independentemente dos filtros acima.</p></div></section>
</div>
<section aria-labelledby="health-title"><div class="section-title"><h2 id="health-title">Integridade da coleta</h2><span class="small">Atualizado: __UPDATED__</span></div><div class="panel"><p class="small" id="health">Backup mais recente: __BACKUP__ · Atraso de logs: __LAG__ bytes · Coleta automática a cada cinco minutos.</p><p class="warn">O painel usa somente contagens agregadas. Pode incluir downloads de homologação e não comprova usuários únicos, instalações ou faturamento. O histórico começa quando a coleta foi ativada.</p></div></section>
</main>
<footer>PRÓXIMA ERA · Relatório privado gerado localmente · Sem conexão de rede, cookies, rastreamento ou dependências externas. Não publicar este arquivo em diretórios web.</footer>
</div>
<script id="data-json" type="application/json">__REPORT_JSON__</script>
<script>
(function(){
'use strict';
const data=JSON.parse(document.getElementById('data-json').textContent);
const nf=new Intl.NumberFormat('pt-BR');
const last=data.period.last_calendar_day;
const state={days:7,platform:'all'};
const nums=['started','complete','partial','bytes'];
function datePlus(s,n){const x=new Date(s+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)}
function fromDay(){return datePlus(last,1-state.days)}
function relevant(){return data.versions.filter(r=>r.day>=fromDay() && r.day<=last && (state.platform==='all'||r.platform===state.platform))}
function aggregates(rows){const out={started:0,complete:0,partial:0,bytes:0,android:0,windows:0};rows.forEach(r=>{nums.forEach(k=>out[k]+=Number(r[k])||0);if(r.platform==='android')out.android+=Number(r.complete)||0;else if(r.platform==='windows')out.windows+=Number(r.complete)||0});return out}
function number(id,val){document.getElementById(id).textContent=nf.format(val)}
function el(tag,cl,txt){const item=document.createElement(tag);if(cl)item.className=cl;if(txt!==undefined)item.textContent=txt;return item}
function render(){
 const rows=relevant(), totals=aggregates(rows);
 number('started',totals.started);number('complete',totals.complete);
 number('android',totals.android);number('windows',totals.windows);
 document.querySelectorAll('[data-days]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.days)===state.days)));
 document.querySelectorAll('[data-platform]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.platform===state.platform)));
 document.getElementById('table-period').textContent=fromDay()+' a '+last;
 const series=new Map();rows.forEach(r=>{const current=series.get(r.day)||{android:0,windows:0};current[r.platform]=(current[r.platform]||0)+(Number(r.complete)||0);series.set(r.day,current)});
 const bars=Array.from({length:state.days},(_,i)=>{const day=datePlus(last,i-state.days+1);return {day,...(series.get(day)||{android:0,windows:0})}});
 const max=Math.max(1,...bars.map(b=>b.android+b.windows));
 const chart=document.getElementById('daily-chart');chart.replaceChildren();
 bars.forEach((b,i)=>{
   const col=el('div','chart-day');const track=el('div','track');const stack=el('div','stack');
   const visible=(state.platform==='android'?b.android:state.platform==='windows'?b.windows:b.android+b.windows);
   stack.style.height=Math.max(2,Math.round((visible/max)*100))+'%';
   if(b.android>0){const a=el('div','android-segment');a.style.flex=String(b.android);stack.append(a)}
   if(b.windows>0){const w=el('div','windows-segment');w.style.flex=String(b.windows);stack.append(w)}
   col.title=b.day+' · Android '+b.android+' · Windows '+b.windows;
   col.setAttribute('aria-label',col.title);
   track.append(stack);col.append(track);
   col.append(el('div','chart-label',(i===0||i===state.days-1||i%Math.max(1,Math.ceil(state.days/8))===0)?b.day.slice(8,10):''));
   chart.append(col)
 });
 document.getElementById('chart-note').textContent='Janela de '+state.days+' dias-calendário · '+(state.platform==='all'?'Todas as plataformas':state.platform==='android'?'Android':'Windows')+' · São Paulo';
 const grouped=new Map();
 rows.forEach(r=>{const key=r.version+'|'+r.platform;const record=grouped.get(key)||{version:r.version,platform:r.platform,started:0,complete:0,partial:0};for(const k of ['started','complete','partial'])record[k]+=Number(r[k])||0;grouped.set(key,record)});
 const body=document.getElementById('versions');body.replaceChildren();
 const values=Array.from(grouped.values()).sort((a,b)=>b.version.localeCompare(a.version)||a.platform.localeCompare(b.platform));
 if(!values.length){const tr=el('tr');const td=el('td','empty','Sem registros de transferência neste filtro.');td.colSpan=5;tr.append(td);body.append(tr)}
 else values.forEach(r=>{const tr=el('tr');tr.append(el('td','',r.version));const td=el('td');td.append(el('span','platform',r.platform==='android'?'Android':'Windows'));tr.append(td);['started','complete','partial'].forEach(k=>tr.append(el('td','num',nf.format(r[k]))));body.append(tr)});
}
document.querySelectorAll('[data-days]').forEach(b=>b.addEventListener('click',()=>{state.days=Number(b.dataset.days);render()}));
document.querySelectorAll('[data-platform]').forEach(b=>b.addEventListener('click',()=>{state.platform=b.dataset.platform;render()}));
const sources=document.getElementById('sources');
[['home','Home institucional'],['apps','Catálogo de apps'],['other','Outros / legado']].forEach(([key,name])=>{const line=el('div','attribution-line');line.append(el('span','muted',name));line.append(el('strong','',nf.format(data.sources[key]?.complete||0)+' completos'));sources.append(line)});
document.getElementById('csv').addEventListener('click',()=>{
 const lines=[['data','versao','plataforma','iniciados','completos','parciais','bytes'].join(';')];
 relevant().forEach(r=>lines.push([r.day,r.version,r.platform,r.started,r.complete,r.partial,r.bytes].map(x=>String(x).replace(/[;\r\n]/g,'')).join(';')));
 const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='retro-downloads-'+state.days+'dias-'+state.platform+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
});
render();
})();
</script>
</body>
</html>
"""

def load_report(path):
    if not Path(path).is_file():
        raise FileNotFoundError('Relatório SQLite não encontrado; não criar novo banco')
    spec=importlib.util.spec_from_file_location('retro_existing',path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def render(data):
    if data.get('source') != 'persistent_sqlite_read_only':
        raise ValueError('Dashboard requer somente agregados do SQLite persistente')
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    # The embedded JSON can never escape its inert script tag via </script>.
    payload=(payload.replace('&','\\u0026').replace('<','\\u003c')
                    .replace('>','\\u003e').replace('\u2028','\\u2028')
                    .replace('\u2029','\\u2029'))
    safe=lambda value: html.escape(str(value),quote=True)
    total=data['downloads'];platforms=data['platforms'];health=data['health']
    pending=health['unprocessed_log_bytes']
    lag=sum(v or 0 for v in pending.values())
    replacements={
        '__REPORT_JSON__':payload,
        '__STATIC_COMPLETE__':safe(total['complete']),
        '__STATIC_STARTED__':safe(total['started']),
        '__STATIC_ANDROID__':safe(platforms['android']['complete']),
        '__STATIC_WINDOWS__':safe(platforms['windows']['complete']),
        '__FULL_WINDOW__':safe(data['period']['first_calendar_day']+' a '+data['period']['last_calendar_day']),
        '__PORTAL_REQUESTS__':safe(data['portal_page_requests']),
        '__APP_LAUNCHES__':safe(data['opt_in_app_launch_events']),
        '__UPDATED__':safe(data['generated_at']),
        '__BACKUP__':safe(health['latest_backup'] or 'Nenhum snapshot detectado'),
        '__LAG__':safe(lag)
    }
    result=PAGE
    for key,value in replacements.items():
        result=result.replace(key,value)
    return result

def private_save(content,output,private_root=DEFAULT_PRIVATE):
    root=Path(private_root).resolve()
    dest=Path(output).resolve()
    if dest.parent!=root or dest.suffix.lower()!='.html':
        raise ValueError('Relatório só pode ser salvo no diretório privado autorizado')
    if root.exists() and root.is_symlink():
        raise ValueError('Diretório privado é symlink')
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    os.chmod(root,0o700)
    name=None
    try:
        with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',newline='\n',
                                         prefix='.retro-dash-',suffix='.html',
                                         dir=root,delete=False) as handle:
            name=Path(handle.name)
            handle.write(content)
        os.chmod(name,0o600)
        # Atomic replacement; if there was a previous symlink, it is replaced, not followed.
        os.replace(name,dest)
        os.chmod(dest,0o600)
    finally:
        if name and name.exists():
            name.unlink()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--days',type=int,default=90,help='Dias-calendário incluídos (padrão 90)')
    p.add_argument('--output',type=Path,default=DEFAULT_PRIVATE/'retro-dashboard.html')
    p.add_argument('--report-script',type=Path,default=REPORT_SOURCE,help=argparse.SUPPRESS)
    args=p.parse_args()
    if args.days!=90:
        p.error('O dashboard interativo usa 7/30/90 dias; gere sempre 90 dias')
    try:
        mod=load_report(args.report_script)
        data=mod.report(args=argparse.Namespace(day=None,days=90,since=None))
        private_save(render(data),args.output)
        print('PAINEL_PRIVADO_GERADO',args.output)
        print('FONTE',data['source'],'VERSOES',len(data['versions']))
        return 0
    except (ValueError,OSError,RuntimeError) as exc:
        print('ERRO: '+str(exc),file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())
