#!/usr/bin/env python3
"""Publica captação rápida do contato institucional sem alterar o formulário assistido.
--check valida os alvos e registra hashes; --apply exige hashes iguais.
"""
from pathlib import Path
import json,os,hashlib,shutil,tempfile,stat,datetime,sys
root=Path("/opt/proximaera/site")
guard=Path("/tmp/pe-contact-intake-20261112-guard.json")
assets={
 "contact-intake-v1.js":Path("/tmp/pe-contact-intake-v1.js"),
 "assets/premium/contact-intake-v1.css":Path("/tmp/pe-contact-intake-v1.css")
}
html_path=root/"contato.html"
privacy_path=root/"privacidade.html"
fragment='''<section class="pe-intake" aria-labelledby="peIntakeTitle">
  <div class="pe-intake__intro">
    <p class="section-kicker">ATENDIMENTO PRÓXIMA ERA</p>
    <h2 id="peIntakeTitle">Seu próximo projeto começa por uma conversa.</h2>
    <p>Solicite um retorno humano pelo WhatsApp. Conte o que seu negócio precisa e organizamos seu pedido para atendimento.</p>
    <ul class="pe-intake__features"><li>Sem compromisso de contratação</li><li>Seu projeto encaminhado à nossa central</li><li>Seus dados usados apenas para responder ao pedido</li></ul>
  </div>
  <form class="pe-intake__form" id="peIntakeForm">
    <div class="pe-intake__fields">
      <label>Seu nome *<input type="text" name="name" minlength="2" maxlength="70" autocomplete="name" required></label>
      <label>Seu WhatsApp com DDD *<input type="tel" name="phone" minlength="10" maxlength="24" inputmode="tel" autocomplete="tel" placeholder="(14) 99999-9999" required></label>
      <label class="pe-intake__full">O que você procura? *<select name="interest" required><option value="">Selecione uma solução</option><option>Página comercial</option><option>Site premium</option><option>Aplicativo</option><option>Automação e IA</option><option>Diagnóstico digital</option><option>Ainda estou avaliando</option></select></label>
      <label>Nome da empresa (opcional)<input type="text" name="company" maxlength="90" autocomplete="organization"></label>
      <label>E-mail (opcional)<input type="email" name="email" maxlength="140" autocomplete="email"></label>
      <label class="pe-intake__full">Conte brevemente seu objetivo (opcional)<textarea name="details" rows="2" maxlength="280" placeholder="O que gostaria de resolver?"></textarea></label>
    </div>
    <label class="pe-intake__privacy"><input type="checkbox" name="privacyAccepted" required><span>Autorizo a Próxima Era a registrar os dados acima para responder à minha solicitação. Li a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</span></label>
    <button type="submit" data-track="solicitar-retorno">Solicitar retorno pelo WhatsApp →</button>
    <p class="pe-intake__notice">Atendimento humano, sem cobrança nesta etapa. O registro não adiciona seu número a uma lista de publicidade.</p>
    <p id="peIntakeStatus" role="status" aria-live="polite"></p>
  </form>
</section>
<div class="pe-contact-divider"><h2>Prefere escrever uma mensagem detalhada?</h2><p>Use o formulário abaixo para preparar a mensagem e confirmar o envio por WhatsApp ou e-mail.</p></div>
'''
old_privacy="Na página Fecha Negócio, o formulário de interesse registra automaticamente os dados enviados por você (nome, WhatsApp, empresa e e-mail quando informado, assunto de interesse, origem da campanha e preferências declaradas). Os registros são armazenados na Central administrativa da Próxima Era como leads para resposta ao pedido e acompanhamento do atendimento, com acesso restrito à administração. Você pode optar por falar diretamente pelo WhatsApp sem preencher o formulário. Na página de diagnóstico gratuito, ao tocar em solicitar, seus dados e as respostas sobre o negócio também são registrados na Central administrativa para possibilitar o contato e a análise humana. A mensagem promocional é opcional, com aceite separado."
new_privacy="Na página Fecha Negócio, o formulário de interesse registra automaticamente os dados enviados por você (nome, WhatsApp, empresa e e-mail quando informado, assunto de interesse, origem da campanha e preferências declaradas). Os registros são armazenados na Central administrativa da Próxima Era como leads para resposta ao pedido e acompanhamento do atendimento, com acesso restrito à administração. Você pode optar por falar diretamente pelo WhatsApp sem preencher o formulário. Na página de diagnóstico gratuito, ao tocar em solicitar, seus dados e as respostas sobre o negócio também são registrados na Central administrativa para possibilitar o contato e a análise humana. A mensagem promocional é opcional, com aceite separado.</p><p>Na página Contato, o formulário Solicitar retorno pelo WhatsApp registra nome, telefone, interesse e, quando fornecidos, empresa, e-mail, resumo e origem da campanha na Central administrativa, após autorização específica para responder ao pedido. O formulário Preparar mensagem continua assistido e somente envia a mensagem quando o visitante confirma o envio por WhatsApp ou e-mail. Solicitar retorno não implica inscrição em publicidade."
old_tags="As páginas de ofertas e a Página Fecha Negócio utilizam Google Analytics 4 e Meta Pixel somente após a opção explícita de aceitar marketing. Sem o aceite, essas tags de terceiros não são carregadas. Você pode recusar sem perder acesso à página ou ao atendimento. Esses serviços poderão tratar informações de navegação de acordo com suas próprias políticas, quando autorizados."
new_tags="O Google Analytics 4 é carregado nas páginas instrumentadas do site somente após a opção explícita de aceitar marketing. O Meta Pixel é usado nas páginas de campanhas, como ofertas, Página Fecha Negócio e diagnóstico digital, também apenas após o consentimento. Sem o aceite, essas tags de terceiros não são carregadas. Você pode recusar sem perder acesso à página ou ao atendimento. Esses serviços poderão tratar informações de navegação de acordo com suas próprias políticas, quando autorizados."
def sha(data):return hashlib.sha256(data).hexdigest()
def prepare():
 html=html_path.read_bytes();txt=html.decode("utf-8")
 if txt.count('<section class="contact-layout">')!=1 or txt.count('</head>')!=1:raise RuntimeError("ABORT: marcador HTML ausente")
 if 'peIntakeForm' in txt or 'contact-intake-v1' in txt:raise RuntimeError("ABORT: formulário já existe")
 new=txt.replace('<section class="contact-layout">',fragment+'<section class="contact-layout">',1)
 new=new.replace("</head>",'<link rel="stylesheet" href="assets/premium/contact-intake-v1.css?v=20261112" /><script defer src="contact-intake-v1.js?v=20261112"></script></head>',1)
 privacy=privacy_path.read_bytes();p=privacy.decode("utf-8")
 for old in (old_privacy,old_tags):
  if p.count(old)!=1:raise RuntimeError("ABORT: política mudou; revisar manualmente")
 p=p.replace(old_privacy,new_privacy,1).replace(old_tags,new_tags,1).replace("Última atualização: 09/11/2026.","Última atualização: 12/11/2026.")
 changes={html_path:(html,new.encode("utf-8")),privacy_path:(privacy,p.encode("utf-8"))}
 for rel,source in assets.items():
  f=root/rel
  if f.exists():raise RuntimeError("ABORT: asset já existe em produção "+rel)
  if not source.is_file():raise RuntimeError("ABORT: asset de staging ausente "+str(source))
  data=source.read_bytes()
  if not data:raise RuntimeError("ABORT: asset vazio "+str(source))
  changes[f]=(None,data)
 return changes
def atomic_write(path,data,oldstat=None):
 path.parent.mkdir(parents=True,exist_ok=True)
 fd,tmp=tempfile.mkstemp(prefix=".pe-lead-",dir=str(path.parent))
 try:
  with os.fdopen(fd,"wb") as o:o.write(data);o.flush();os.fsync(o.fileno())
  if oldstat:
   os.chmod(tmp,stat.S_IMODE(oldstat.st_mode));os.chown(tmp,oldstat.st_uid,oldstat.st_gid)
  else:os.chmod(tmp,0o644)
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def run():
 changes=prepare()
 before={str(f.relative_to(root)):sha(old) if old is not None else None for f,(old,new) in changes.items()}
 after={str(f.relative_to(root)):sha(new) for f,(old,new) in changes.items()}
 mode=sys.argv[1] if len(sys.argv)>1 else ''
 if mode=="--check":
  guard.write_text(json.dumps(before,sort_keys=True),encoding="utf-8")
  print(json.dumps({"status":"DRY_RUN_OK","files":len(changes),"new_assets":len(assets),"existing_pages":2,"guard":str(guard)}))
  return
 if mode!="--apply":raise SystemExit("use --check ou --apply")
 if json.loads(guard.read_text(encoding="utf-8"))!=before:raise RuntimeError("ABORT: conteúdo mudou desde o dry-run")
 timestamp=datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
 folder=Path("/opt/proximaera/backups")/("institutional-lead-"+timestamp)
 folder.mkdir(parents=True,mode=0o700,exist_ok=False)
 for f,(old,new) in changes.items():
  if old is not None:
   backup=folder/f.relative_to(root)
   backup.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,backup)
   if sha(backup.read_bytes())!=sha(old):raise RuntimeError("ABORT: backup falhou "+str(f))
 (folder/"manifest.json").write_text(json.dumps({"before":before,"after":after},indent=2,ensure_ascii=False),encoding="utf-8")
 applied=[]
 try:
  for f,(old,new) in changes.items():
   if old is not None and sha(f.read_bytes())!=sha(old):raise RuntimeError("DRIFT")
   atomic_write(f,new,f.stat() if old is not None else None);applied.append((f,old))
   if sha(f.read_bytes())!=sha(new):raise RuntimeError("HASH NÃO CONFERE "+str(f))
 except Exception:
  for f,old in reversed(applied):
   if old is None:f.unlink(missing_ok=True)
   else:atomic_write(f,old,f.stat())
  raise
 print(json.dumps({"status":"DEPLOY_OK","backup":str(folder),"files":list(after)},ensure_ascii=False))
if __name__=="__main__":run()
