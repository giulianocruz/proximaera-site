#!/usr/bin/env python3
import datetime as dt
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT=Path('/opt/proximaera-editorial')
PUBLIC=ROOT/'public'
PREVIEW=ROOT/'preview.html'
STATE=ROOT/'state.json'
TOPIC_ID='presenca-google'

if not PREVIEW.exists():
    raise SystemExit('preview.html não encontrado')
html=PREVIEW.read_text(encoding='utf-8')
def match(pattern):
    m=re.search(pattern,html,re.I|re.S)
    return m.group(1).strip() if m else ''

title=match(r'<h1>(.*?)</h1>')
description=match(r'<meta name="description" content="([^"]+)"')
canonical=match(r'<link rel="canonical" href="([^"]+)"')
slug=canonical.rstrip('/').rsplit('/',1)[-1].removesuffix('.html')
if not all([title,description,canonical,slug]):
    raise SystemExit('preview sem metadados mínimos')
state={"next_number":1,"cycle":1,"used_topics":[],"articles":[]}
if STATE.exists():
    state.update(json.loads(STATE.read_text(encoding='utf-8')))
if any(a.get('slug')==slug for a in state.get('articles',[])):
    raise SystemExit('preview já promovido')
number=int(state.get('next_number',1))
today=dt.datetime.now().astimezone().date().isoformat()
PUBLIC.mkdir(parents=True,exist_ok=True)
shutil.copy2(PREVIEW,PUBLIC/f'{slug}.html')
meta={"number":number,"date":today,"slug":slug,"topic_id":TOPIC_ID,"title":re.sub(r'<[^>]+>','',title),"description":description,"url":canonical}
state.setdefault('articles',[]).append(meta)
state['next_number']=number+1
if TOPIC_ID not in state.setdefault('used_topics',[]):
    state['used_topics'].append(TOPIC_ID)
state['last_run']=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
state['last_topic']=TOPIC_ID
STATE.write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding='utf-8')
subprocess.run(['python3',str(ROOT/'local_editorial_agent.py'),'--rebuild'],check=True,env={**os.environ,'EDITORIAL_ROOT':str(ROOT)})
print(f'PUBLICADO GUIA LOCAL {number:03d}: {meta["title"]} -> {canonical}')