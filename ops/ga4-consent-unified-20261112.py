#!/usr/bin/env python3
"""Próxima Era: migra GA4 inline para gerenciador de consentimento compartilhado.
Execução: python3 script.py --check; python3 script.py --apply
Em qualquer recusa, nenhum arquivo é escrito. Backup com manifest/rollback.
"""
import argparse
from pathlib import Path
import json, re, os, hashlib, shutil, tempfile, stat, datetime

ROOT=Path("/opt/proximaera/site")
BACKUP_ROOT=Path("/opt/proximaera/backups")
GUARD=Path("/tmp/pe-ga4-consent-release-20261112.json")
TRACKER=ROOT/"tracking.js"
ID="G-RR7D4MYJZ8"
MARKER="<!-- Google tag (gtag.js) -->"
BLOCK=re.compile(
 r'(?m)^[ \t]*<!-- Google tag \(gtag\.js\) -->\r?\n'
 r'[ \t]*<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-RR7D4MYJZ8"></script>\r?\n'
 r'[ \t]*<script>\r?\n'
 r'[ \t]*window\.dataLayer = window\.dataLayer \|\| \[\];\r?\n'
 r'[ \t]*function gtag\(\)\{dataLayer\.push\(arguments\);\}\r?\n'
 r"[ \t]*gtag\('js', new Date\(\)\);\r?\n"
 r"[ \t]*gtag\('config', 'G-RR7D4MYJZ8'\);\r?\n"
 r'[ \t]*</script>\r?\n(?:[ \t]*\r?\n)?')
TRACK_OLD="  const peHasMarketingTags=peIsOffer||peIsFechaNegocio||peIsDiagnostic;"
TRACK_NEW="  const peHasMarketingTags=true; // Consentimento GA4 unificado no institucional e nas ofertas."
PIXEL_OLD="(peHasMarketingTags?peOfferMetaId:'')"
PIXEL_NEW="((peIsOffer||peIsFechaNegocio||peIsDiagnostic)?peOfferMetaId:'')"
SCRIPT='<script defer src="/tracking.js"></script>'
def sha(data):return hashlib.sha256(data).hexdigest()
def build():
 changes={}
 nums=[]
 for p in sorted(ROOT.rglob("*.html")):
  data=p.read_bytes()
  txt=data.decode("utf-8")
  if MARKER not in txt and "googletagmanager.com/gtag/js" not in txt:continue
  rel=str(p.relative_to(ROOT))
  if txt.count(MARKER)!=1 or txt.count("googletagmanager.com/gtag/js")!=1:
   raise RuntimeError(f"BLOQUEADO: duplicado ou snippet desconhecido {rel}")
  found=BLOCK.findall(txt)
  if len(found)!=1:
   at=txt.find(MARKER)
   raise RuntimeError(f"BLOQUEADO: bloco GA4 divergente {rel}: {repr(txt[at:at+420])}")
  revised,n=BLOCK.subn("",txt,count=1)
  if n!=1 or ID in revised and MARKER in revised:
   raise RuntimeError(f"BLOQUEADO: snippet permaneceu {rel}")
  has_tracker=SCRIPT in txt
  if not has_tracker and rel!="404.html":
   if revised.count("</head>")!=1:
    raise RuntimeError(f"BLOQUEADO: </head> não único {rel}")
   revised=revised.replace("</head>",SCRIPT+"</head>",1)
   if SCRIPT not in revised:raise RuntimeError(f"BLOQUEADO: inserção ausente {rel}")
  if revised!=txt:changes[p]=(data,revised.encode("utf-8"))
  nums.append((rel,has_tracker,rel=="404.html"))
 if len(nums)!=41:raise RuntimeError(f"BLOQUEADO: aguardadas 41 páginas, encontradas {len(nums)}")
 added=sum(not item[1] and not item[2] for item in nums)
 if added!=12:raise RuntimeError(f"BLOQUEADO: aguardadas 12 páginas a incluir tracking.js, encontradas {added}")
 raw=TRACKER.read_bytes()
 txt=raw.decode("utf-8")
 if txt.count(TRACK_OLD)!=1 or txt.count(PIXEL_OLD)!=1:
  raise RuntimeError(f"BLOQUEADO: trechos JS não únicos: has={txt.count(TRACK_OLD)}, pixel={txt.count(PIXEL_OLD)}")
 new=txt.replace(TRACK_OLD,TRACK_NEW,1).replace(PIXEL_OLD,PIXEL_NEW,1)
 if "peHasMarketingTags?peOfferMetaId" in new:
  raise RuntimeError("BLOQUEADO: ainda ativaria pixel fora do funil comercial")
 changes[TRACKER]=(raw,new.encode("utf-8"))
 return changes,nums,added

def atomic_write(path, data, oldstat):
 fd,tmp=tempfile.mkstemp(dir=str(path.parent),prefix=".pe-ga4-consent-")
 try:
  with os.fdopen(fd,"wb") as o:
   o.write(data);o.flush();os.fsync(o.fileno())
  os.chmod(tmp,stat.S_IMODE(oldstat.st_mode))
  os.chown(tmp,oldstat.st_uid,oldstat.st_gid)
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def main():
 p=argparse.ArgumentParser()
 p.add_argument("mode",choices=["--check","--apply"])
 a=p.parse_args()
 changes,nums,added=build()
 before={str(f.relative_to(ROOT)):sha(blob) for f,(blob,after) in changes.items()}
 after={str(f.relative_to(ROOT)):sha(blob) for f,(old,blob) in changes.items()}
 if a.mode=="--check":
  GUARD.write_text(json.dumps(before,sort_keys=True),encoding="utf-8")
  print(json.dumps({"result":"DRY_RUN_OK","files":len(changes),"html_files":len(nums),"tracking_added":added,"pixel_default":"only-offer-or-fecha-or-diagnostic","backup_required":True,"guard":str(GUARD)},ensure_ascii=False))
  return
 expected=json.loads(GUARD.read_text("utf-8"))
 if expected!=before:raise RuntimeError("BLOQUEADO: drift detectado desde o dry-run")
 stamp=datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
 base=BACKUP_ROOT/("ga4-consent-unified-"+stamp)
 base.mkdir(mode=0o700,parents=True,exist_ok=False)
 for f,(old,new) in changes.items():
  rel=f.relative_to(ROOT)
  dst=base/rel
  dst.parent.mkdir(parents=True,exist_ok=True)
  shutil.copy2(f,dst)
  if sha(dst.read_bytes())!=sha(old):raise RuntimeError(f"BACKUP FALHOU: {rel}")
 manifest={"created_at_utc":stamp,"root":str(ROOT),"before":before,"after":after,"changes":[str(x.relative_to(ROOT)) for x in changes]}
 (base/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding="utf-8")
 applied=[]
 try:
  for f,(old,new) in changes.items():
   if sha(f.read_bytes())!=sha(old):raise RuntimeError(f"DRIFT durante aplicação: {f}")
   atomic_write(f,new,f.stat())
   applied.append((f,old))
   if sha(f.read_bytes())!=sha(new):raise RuntimeError(f"VALIDAÇÃO hash falhou: {f}")
 except Exception:
  for f,old in reversed(applied):
   atomic_write(f,old,f.stat())
  raise
 print(json.dumps({"result":"DEPLOY_OK","files":len(changes),"html_files":len(nums),"tracking_added":added,"backup":str(base),"tracker_sha":after["tracking.js"]},ensure_ascii=False))
if __name__=="__main__": main()
