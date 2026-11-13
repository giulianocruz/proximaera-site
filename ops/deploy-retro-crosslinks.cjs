'use strict';
/* Publishes only the audited Próxima Era Retro home/apps cross-links.
 * Read-only unless --apply. Never touches contact, offers, tracking,
 * WordPress, portal downloads, server configuration, or other projects. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const host='proximaera-vps',site='/opt/proximaera/site';
const allow=['index.html','aplicativos/index.html','aplicativos/apps.css','assets/projects/proxima-era-retro.svg'];
const baseline={
 'index.html':'efd8f87712b68bb13346c0efd721ac916f936ff784d3890fb59c707836444d0c',
 'aplicativos/index.html':'0f184de0637c14d92d2c941f4a6887090de794122bf3e0fc6e6c4f9b422a4125',
 'aplicativos/apps.css':'b840d12dc2c18d9c40eb1ed166bbe349a6a87232df5d1eea2bb5430ec9408475',
 'assets/projects/proxima-era-retro.svg':null
};
const apply=process.argv.includes('--apply');
assert(process.argv.slice(2).every(x=>x==='--apply'),'Usage: node ops/deploy-retro-crosslinks.cjs [--apply]');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const desired=Object.fromEntries(allow.map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));
const home=fs.readFileSync(path.join(root,'index.html'),'utf8'),apps=fs.readFileSync(path.join(root,'aplicativos/index.html'),'utf8');
assert.equal((home.match(/data-track="projeto-retro-home"/g)||[]).length,1,'Home Retro card missing/duplicated');
assert.equal((apps.match(/class="card card-retro"/g)||[]).length,1,'Retro app card missing/duplicated');
for(const link of ['../retro/#download','../retro/testes.html','../retro/privacidade.html'])assert(apps.includes(link),'Missing '+link);
const cfg={baseline,desired,files:allow,site};
const py=x=>JSON.stringify(JSON.stringify(x));
function ssh(script){
 const r=cp.spawnSync('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=8',host,'python3','-'],{
  input:script,encoding:'utf8',timeout:75000,maxBuffer:1024*1024});
 if(r.error||r.status!==0)throw Error('SSH failed: '+String(r.error||r.stderr||r.stdout).slice(-1400));
 return r.stdout.trim();
}
function scp(local,remote){
 const r=cp.spawnSync('scp',['-q','-o','BatchMode=yes','-o','ConnectTimeout=8',local,host+':'+remote],{
  encoding:'utf8',timeout:60000});
 if(r.error||r.status!==0)throw Error('SCP failed: '+String(r.error||r.stderr||r.stdout).slice(-1400));
}
const check=[
 'import pathlib,hashlib,json',
 'cfg=json.loads('+py(cfg)+')',
 "base=pathlib.Path(cfg['site'])",
 "digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None",
 'found={item:digest(base/item) for item in cfg["files"]}',
 "mode='already_deployed' if all(found[f]==cfg['desired'][f] for f in cfg['files']) else 'baseline' if all(found[f]==cfg['baseline'][f] for f in cfg['files']) else 'changed'",
 "print(json.dumps({'mode':mode,'hashes':found}))"
].join('\n');
const state=JSON.parse(ssh(check));
console.log('RETRO_CROSSLINK_PREFLIGHT '+JSON.stringify({mode:apply?'apply':'read-only',remoteState:state.mode,files:allow}));
if(state.mode==='already_deployed'){console.log('RETRO_CROSSLINK_ALREADY_PUBLISHED');process.exit(0);}
if(state.mode!=='baseline')throw Error('Production differs from reviewed baseline. Refusing to overwrite.');
if(!apply){console.log('RETRO_CROSSLINK_READ_ONLY_PASS');process.exit(0);}
const stamp=desired['index.html'].slice(0,12);
const stage='/opt/proximaera/backups/.retro-crosslinks-stage-'+stamp;
ssh('import pathlib\np=pathlib.Path('+JSON.stringify(stage)+')\np.mkdir(parents=True,exist_ok=True)\nprint("STAGE_READY")');
for(const file of allow){
 const remote=stage+'/'+file;
 ssh('import pathlib\np=pathlib.Path('+JSON.stringify(remote)+')\np.parent.mkdir(parents=True,exist_ok=True)');
 scp(path.join(root,file),remote);
}
const install=[
 'import pathlib,json,hashlib,shutil,tempfile,os,datetime',
 'cfg=json.loads('+py(cfg)+')',
 'stage=pathlib.Path('+JSON.stringify(stage)+')',
 "base=pathlib.Path(cfg['site'])",
 'digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None',
 'for name in cfg["files"]:',
 " if digest(stage/name)!=cfg['desired'][name]:raise RuntimeError('Arquivo de estágio incorreto: '+name)",
 " if digest(base/name)!=cfg['baseline'][name]:raise RuntimeError('Produção mudou desde o preflight: '+name)",
 "backup=pathlib.Path('/opt/proximaera/backups')/('retro-home-apps-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))",
 'backup.mkdir(parents=True,exist_ok=False)',
 'for name in cfg["files"]:',
 ' src=base/name',
 ' if src.exists():',
 '  target=backup/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,target)',
 'changed=[]',
 'try:',
 ' for name in cfg["files"]:',
 '  dst=base/name;dst.parent.mkdir(parents=True,exist_ok=True)',
 "  with tempfile.NamedTemporaryFile(prefix='.'+dst.name+'.',dir=dst.parent,delete=False) as out:",
 '   tmp=out.name;out.write((stage/name).read_bytes());out.flush();os.fsync(out.fileno())',
 '  os.chmod(tmp,0o644);os.replace(tmp,dst);changed.append(name)',
 ' for name in cfg["files"]:',
 "  if digest(base/name)!=cfg['desired'][name]:raise RuntimeError('Falha de verificação: '+name)",
 'except:',
 ' for name in reversed(changed):',
 '  previous=backup/name;dst=base/name',
 '  if previous.exists():shutil.copy2(previous,dst)',
 '  elif dst.exists():dst.unlink()',
 ' raise',
 "print(json.dumps({'state':'PUBLISHED','backup':str(backup),'count':len(cfg['files'])}))"
].join('\n');
const outcome=JSON.parse(ssh(install));
const verification=JSON.parse(ssh(check));
assert.equal(verification.mode,'already_deployed','Files differ after deployment');
console.log('RETRO_CROSSLINK_DEPLOY_VERIFIED '+JSON.stringify({...outcome,homepage:'https://proximaera.com.br/',apps:'https://proximaera.com.br/aplicativos/'}));
