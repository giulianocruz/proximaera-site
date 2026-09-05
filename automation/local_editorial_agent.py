#!/usr/bin/env python3
import argparse
import datetime as dt
import html
import json
import os
import re
import unicodedata
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape
from zoneinfo import ZoneInfo

ROOT = Path(os.getenv("EDITORIAL_ROOT", "/workspace"))
PUBLIC = ROOT / "public"
STATE_FILE = ROOT / "state.json"
TOPICS_FILE = ROOT / "topics.json"
LOG_FILE = ROOT / "agent.log"
BASE_URL = "https://proximaera.com.br"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://chamasofia-ollama:11434/api/generate")
MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
OUTLINE_MODEL = os.getenv("OLLAMA_OUTLINE_MODEL", "qwen2.5:3b")
SCHEDULE = "segunda, quarta e sexta, 07:17 (America/Sao_Paulo)"


def log(message):
    stamp = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    line = f"[{stamp}] {message}"
    print(line, flush=True)
    ROOT.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def slugify(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value[:82] or "guia-local"


def words(value):
    return re.findall(r"\b[\wÀ-ÿ'-]+\b", value or "", flags=re.UNICODE)


def all_text(article):
    chunks = [article.get("title", ""), article.get("meta_description", ""), article.get("lead", "")]
    for section in article.get("sections", []):
        chunks.append(section.get("heading", ""))
        chunks.extend(section.get("paragraphs", []))
    chunks.extend(article.get("checklist", []))
    for item in article.get("faq", []):
        chunks.extend([item.get("question", ""), item.get("answer", "")])
    chunks.extend([article.get("cta_title", ""), article.get("cta_text", "")])
    return " ".join(str(x) for x in chunks)


def trim_words(value, max_chars):
    value = re.sub(r"\s+", " ", (value or "").strip())
    if len(value) <= max_chars:
        return value
    cut = value[:max_chars + 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return cut.rstrip(".") + "."


def normalize_metadata(article):
    title = re.sub(r"\s+", " ", article.get("title", "").strip())
    if len(title) > 100:
        title = trim_words(title, 98).rstrip(".")
    if len(title) < 32:
        title = (title.rstrip(".:") + ": guia prático para negócios locais").strip()
        title = trim_words(title, 98).rstrip(".")
    article["title"] = title
    meta = re.sub(r"\s+", " ", article.get("meta_description", "").strip())
    if len(meta) < 100:
        lead = re.sub(r"\s+", " ", article.get("lead", "").strip())
        meta = (meta + " " + lead).strip()
    article["meta_description"] = trim_words(meta, 165)
    return article


def semantic_forbidden_hits(text):
    patterns = [
        r"\b\d{1,3}\s*%", r"\bIBGE\b", r"\bPrefeitura\b",
        r"segundo (dados|pesquisa|levantamento)", r"de acordo com (dados|pesquisa|levantamento)",
        r"Google My Business", r"primeiros resultados", r"melhorar (sua|a) posição",
        r"garant(?:ir|e|ia|ido|ida).{0,55}(?:primeir[oa]s? resultados|ranking|posição|faturamento|receita|conversão)",
        r"(?:primeir[oa]s? resultados|ranking|posição|faturamento|receita|conversão).{0,55}garant(?:ir|e|ia|ido|ida)",
        r"aumentar (a )?conversão", r"Google (dá|da) preferência", r"rastre\w*.{0,40}chamad",
        r"palavras-chave.{0,90}nome (?:da|do|de) (?:empresa|negócio)",
        r"nome (?:da|do|de) (?:empresa|negócio).{0,90}palavras-chave",
        r"número de e-mail", r"clicar diretamente em seu anúncio"
    ]
    return [pattern for pattern in patterns if re.search(pattern, text or "", flags=re.I)]


def quality_errors(article, topic=None):
    errors = []
    text = all_text(article)
    title = article.get("title", "").strip()
    meta = article.get("meta_description", "").strip()
    sections = article.get("sections", [])
    faq = article.get("faq", [])
    count_words = len(words(text))
    botucatu_count = len(re.findall(r"\bBotucatu\b", text, flags=re.I))
    if not 32 <= len(title) <= 100:
        errors.append("título fora do intervalo editorial")
    if not 100 <= len(meta) <= 170:
        errors.append("meta description deve ter entre 100 e 170 caracteres")
    if len(sections) != 5:
        errors.append("artigo precisa ter exatamente 5 seções")
    if any(len(section.get("paragraphs", [])) != 2 for section in sections):
        errors.append("cada seção precisa de exatamente 2 parágrafos")
    if len(article.get("checklist", [])) < 5:
        errors.append("checklist precisa de pelo menos 5 itens")
    if len(faq) != 3:
        errors.append("FAQ precisa ter exatamente 3 perguntas")
    if not 450 <= count_words <= 1200:
        errors.append(f"texto deve ter 450 a 1200 palavras; recebeu {count_words}")
    if not 2 <= botucatu_count <= 8:
        errors.append(f"Botucatu deve aparecer naturalmente de 2 a 8 vezes; apareceu {botucatu_count}")
    hits = semantic_forbidden_hits(text)
    if hits:
        errors.append("há afirmação ou prática proibida pelo gate factual: " + ", ".join(hits[:3]))
    if topic:
        topic_hits=[p for p in topic.get("forbid_patterns",[]) if re.search(p,text,flags=re.I)]
        if topic_hits:
            errors.append("conteúdo saiu do trilho da pauta: " + ", ".join(topic_hits[:3]))
        missing=[c for c in topic.get("required_concepts",[]) if c.lower() not in text.lower()]
        if missing:
            errors.append("faltam conceitos obrigatórios da pauta: " + ", ".join(missing))
    if re.search(r"https?://", text, flags=re.I):
        errors.append("não inserir URLs externas dentro do texto gerado")
    generated_parts = []
    for section in sections:
        generated_parts.extend(section.get("paragraphs", []))
    generated_parts.extend(article.get("checklist", []))
    for item in faq:
        generated_parts.extend([item.get("question", ""), item.get("answer", "")])
    if any(re.search(r"<[^>]+>|\{.*?\}", str(part), flags=re.I) or "primeiro parágrafo" in str(part).lower() or "segundo parágrafo" in str(part).lower() for part in generated_parts):
        errors.append("há artefato de HTML/JSON no conteúdo editorial")
    normalized = [re.sub(r"\s+", " ", str(part)).strip().lower() for part in generated_parts if str(part).strip()]
    if len(normalized) != len(set(normalized)):
        errors.append("há blocos editoriais duplicados")
    return errors

def grounding_block(topic):
    facts = topic.get("grounding", [])
    if not facts:
        return "Não há fonte factual externa fornecida. Evite afirmações sobre algoritmos, plataformas, mercado ou comportamento local; concentre-se em orientação prática."
    return "FATOS PERMITIDOS E VERIFICADOS:\n" + "\n".join(f"- {fact}" for fact in facts)


def build_outline_prompt(topic, recent_titles):
    recent = "\n".join(f"- {title}" for title in recent_titles[-8:]) or "- nenhum ainda"
    return f"""Você planeja um guia editorial local da Próxima Era, empresa de tecnologia de Botucatu/SP.
Tema editorial já aprovado: {topic['title_hint']}
Intenção: {topic['intent']}
Palavras relacionadas: {', '.join(topic['keywords'])}
{grounding_block(topic)}

Crie apenas a estrutura do artigo. O título e a meta description já foram definidos editorialmente e NÃO devem ser reescritos.
Gere um lead de 45 a 70 palavras, EXATAMENTE 5 títulos de seção orientados à ação, checklist com 6 itens, CTA curto e útil.
Prefira “SEO local” em português; evite introduções genéricas, tendências sem fonte, superlativos e promessas.
Não invente estatísticas, rankings, números locais, eventos, bairros, instituições, funcionamento interno do Google ou resultados garantidos.
Evite repetir estes títulos recentes:
{recent}

Retorne SOMENTE JSON:
{{"lead":"...","section_headings":["...","...","...","...","..."],"checklist":["..."],"cta_title":"...","cta_text":"..."}}
"""


def build_section_prompt(topic, article_title, heading, index, total):
    local_rule = "Mencione Botucatu no máximo uma vez nesta seção e somente se ajudar o contexto." if index in (1, 3) else "Não é necessário mencionar Botucatu nesta seção."
    focus_rule = "Mantenha o foco estrito no tema da seção. Não transforme o texto em tutorial de SEO local ou Perfil da Empresa no Google." if topic.get("intent") != "local-seo" else "Mantenha o foco em SEO local responsável e nos fatos permitidos."
    guidance_list = (topic.get("plan") or {}).get("section_guidance", [])
    guidance = guidance_list[index-1] if index-1 < len(guidance_list) else "Siga estritamente o título da seção e não acrescente táticas ou fatos de plataforma não fornecidos."
    return f"""Você escreve uma seção de um guia prático da Próxima Era.
Artigo: {article_title}
Tema-base: {topic['title_hint']}
Seção {index} de {total}: {heading}
Público: microempresas, comércio, prestadores de serviço e profissionais de Botucatu e região.
{grounding_block(topic)}

Escreva EXATAMENTE 2 parágrafos, juntos com 90 a 140 palavras. Seja concreto, didático e aplicável.
{local_rule}
{focus_rule}
Diretriz editorial obrigatória desta seção: {guidance}
Use somente os fatos permitidos acima para afirmações sobre Google ou outras plataformas. Se um fato não estiver sustentado, transforme-o em sugestão prática ou omita.
Nunca recomende inserir palavras-chave extras no nome real de uma empresa. Use “Perfil da Empresa no Google”, nunca “Google My Business”.
Não diga que o Google “dá preferência”, rastreia chamadas automaticamente ou garante primeiros resultados.
Não use “garantir”, “conquistar o Google”, “aumentar receita”, “aumentar conversão” ou promessas equivalentes.
Não invente estatísticas, pesquisas, rankings, fatos econômicos locais, eventos, bairros, instituições ou números. Não use percentuais nem URLs.
Não fale que é IA e não faça propaganda da Próxima Era no corpo do texto.
Retorne SOMENTE JSON: {{"paragraphs":["primeiro parágrafo","segundo parágrafo"]}}
"""

def ask_ollama(prompt, num_predict=700, timeout=240, model=None):
    payload = {
        "model": model or MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.38, "num_predict": num_predict, "num_ctx": 4096},
    }
    request = urllib.request.Request(OLLAMA_URL, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        result = json.loads(response.read().decode("utf-8"))
    raw = result.get("response", "").strip()
    return json.loads(raw)


def split_into_two_paragraphs(text):
    text = re.sub(r"\s+", " ", (text or "").strip())
    sentences = re.split(r"(?<=[.!?])\s+", text)
    if len(sentences) < 2:
        tokens = text.split()
        if len(tokens) < 80:
            return []
        mid = len(tokens) // 2
        return [" ".join(tokens[:mid]), " ".join(tokens[mid:])]
    target = max(1, len(words(text)) // 2)
    left, right, count = [], [], 0
    for sentence in sentences:
        if count < target or not left:
            left.append(sentence); count += len(words(sentence))
        else:
            right.append(sentence)
    if not right:
        right = [left.pop()]
    return [" ".join(left).strip(), " ".join(right).strip()]


def clean_generated_text(value):
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("```html", " ").replace("```", " ")
    text = re.sub(r"\bGoogle My Business\b", "Perfil da Empresa no Google", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" \t\r\n'\"")
    return text


def extract_text_parts(value):
    if isinstance(value, str):
        text = clean_generated_text(value)
        return [text] if text else []
    if isinstance(value, dict):
        out = []
        for item in value.values():
            out.extend(extract_text_parts(item))
        return out
    if isinstance(value, list):
        out = []
        for item in value:
            out.extend(extract_text_parts(item))
        return out
    return []


def normalize_section_paragraphs(section):
    paragraphs = extract_text_parts(section.get("paragraphs", []))
    if len(paragraphs) == 1:
        paragraphs = split_into_two_paragraphs(paragraphs[0])
    elif len(paragraphs) > 2:
        midpoint = max(1, len(paragraphs) // 2)
        paragraphs = [" ".join(paragraphs[:midpoint]), " ".join(paragraphs[midpoint:])]
    return [clean_generated_text(p) for p in paragraphs] if len(paragraphs) == 2 else []

def clean_local_heading(value):
    value = re.sub(r"\s+(?:em|de|para)\s+Botucatu\b", "", value, flags=re.I)
    value = re.sub(r"\s{2,}", " ", value).strip(" -:,. ")
    return value


def normalize_local_repetition(article, max_mentions=7):
    seen = 0
    def clean(value):
        nonlocal seen
        text = str(value or "")
        def repl(match):
            nonlocal seen
            seen += 1
            if seen <= max_mentions:
                return match.group(0)
            prefix = (match.group(1) or "").lower()
            if prefix == "em": return "na região"
            if prefix == "de": return "local"
            if prefix == "para": return "para a região"
            return ""
        cleaned = re.sub(r"\b(?:(em|de|para)\s+)?Botucatu\b", repl, text, flags=re.I)
        return re.sub(r"\s{2,}", " ", cleaned).strip()
    article["title"] = clean(article.get("title", ""))
    article["meta_description"] = clean(article.get("meta_description", ""))
    article["lead"] = clean(article.get("lead", ""))
    for section in article.get("sections", []):
        section["heading"] = clean_local_heading(section.get("heading", ""))
        section["paragraphs"] = [clean(p) for p in section.get("paragraphs", [])]
    article["checklist"] = [clean(x) for x in article.get("checklist", [])]
    for item in article.get("faq", []):
        item["question"] = clean(item.get("question", ""))
        item["answer"] = clean(item.get("answer", ""))
    article["cta_title"] = clean(article.get("cta_title", ""))
    article["cta_text"] = clean(article.get("cta_text", ""))
    return article


def build_faq_prompt(topic, article_title):
    return f"""Crie uma FAQ curta para um guia local da Próxima Era.
Artigo: {article_title}
Tema: {topic['title_hint']}
Público: pequenos negócios e profissionais.
{grounding_block(topic)}
Gere EXATAMENTE 3 perguntas com respostas de 2 a 4 frases.
Use somente os fatos permitidos para afirmações sobre plataformas. Não prometa ranking, resultado, faturamento ou conversão.
Não use “garantir”, “primeiros resultados”, “Google My Business” nem recomende palavras-chave no nome real da empresa.
Sem estatísticas, URLs ou fatos locais não fornecidos.
Retorne SOMENTE JSON: {{"faq":[{{"question":"...","answer":"..."}}]}}
"""


def normalize_faq(value):
    out = []
    for item in value if isinstance(value, list) else []:
        if not isinstance(item, dict):
            continue
        question = clean_generated_text(item.get("question", ""))
        answer = clean_generated_text(item.get("answer", ""))
        if question and answer:
            out.append({"question": question, "answer": answer})
    return out[:3]


def generate_faq(topic, article_title):
    for attempt in range(1, 3):
        log(f"gerando FAQ — tentativa {attempt}")
        try:
            result = ask_ollama(build_faq_prompt(topic, article_title), num_predict=430, timeout=180)
            faq = normalize_faq(result.get("faq", []))
            if len(faq) == 3:
                return faq
        except Exception as exc:
            log(f"falha na FAQ: {exc}")
    return [
        {"question":"Por onde começar?","answer":"Comece revisando as informações que o cliente precisa para entender e contatar a empresa. Depois, escolha uma melhoria simples e acompanhe o resultado antes de avançar."},
        {"question":"É preciso investir em anúncios para aparecer localmente?","answer":"Anúncios são uma opção de divulgação, mas não substituem informações comerciais corretas, presença digital organizada e conteúdo útil. O trabalho orgânico pode ser desenvolvido de forma gradual."},
        {"question":"Como acompanhar a evolução?","answer":"Observe contatos recebidos, origem dos acessos e interações no Perfil da Empresa e no site. Compare períodos e registre quais mudanças foram feitas para entender o que merece continuar."}
    ]

def topic_meta_description(topic):
    meta = str(topic.get("meta_hint") or "").strip()
    if meta:
        return trim_words(meta, 165)
    intent = str(topic.get("intent") or "presença digital").replace("-", " ")
    meta = f"Guia prático da Próxima Era sobre {intent}, com orientações aplicáveis para pequenos negócios e profissionais de Botucatu e região."
    return trim_words(meta, 165)


def generate_article(topic, recent_titles):
    plan = topic.get("plan") if isinstance(topic.get("plan"), dict) else None
    if plan:
        outline = plan
        headings = [str(x).strip() for x in plan.get("section_headings", []) if str(x).strip()]
        if len(headings) != 5 or len(plan.get("checklist", [])) < 5:
            raise ValueError("plano editorial determinístico incompleto")
        log("usando plano editorial determinístico")
    else:
        outline = None
        for outline_attempt in range(1, 3):
            log(f"planejando estrutura — tentativa {outline_attempt}")
            outline = ask_ollama(build_outline_prompt(topic, recent_titles), num_predict=600, timeout=240, model=OUTLINE_MODEL)
            headings = [str(x).strip() for x in outline.get("section_headings", []) if str(x).strip()]
            if len(headings) == 5 and len(outline.get("checklist", [])) >= 5:
                break
            log(f"outline incompleto: {len(headings)} seções, {len(outline.get('checklist', []))} checklist")
        else:
            raise ValueError("outline não atingiu a estrutura mínima")
    headings = [clean_local_heading(h) for h in headings]
    article = {
        "title": str(topic.get("title_hint") or "").strip(),
        "meta_description": topic_meta_description(topic),
        "lead": clean_generated_text(outline.get("lead", "")),
        "sections": [],
        "checklist": extract_text_parts(outline.get("checklist", []))[:8],
        "faq": [],
        "sources": topic.get("sources", []),
        "cta_title": clean_generated_text(outline.get("cta_title", "Próximo passo")),
        "cta_text": clean_generated_text(outline.get("cta_text", "Organize uma ação por vez e acompanhe o que melhora no atendimento e na operação.")),
    }
    article = normalize_metadata(article)
    planned_faq = normalize_faq(outline.get("faq", [])) if plan else []
    article["faq"] = planned_faq if len(planned_faq) == 3 else generate_faq(topic, article["title"])
    section_fallbacks = (plan or {}).get("section_fallbacks", [])
    prefer_editorial_fallbacks = bool((plan or {}).get("prefer_editorial_fallbacks"))
    for idx, heading in enumerate(headings, 1):
        paragraphs = []
        if prefer_editorial_fallbacks and idx-1 < len(section_fallbacks):
            editorial_fallback = [clean_generated_text(x) for x in section_fallbacks[idx-1] if clean_generated_text(x)]
            fallback_text = " ".join(editorial_fallback)
            if len(editorial_fallback) == 2 and not semantic_forbidden_hits(fallback_text) and not any(re.search(p, fallback_text, flags=re.I) for p in topic.get("forbid_patterns", [])):
                paragraphs = editorial_fallback
                log(f"seção {idx} usando conteúdo editorial aprovado")
        if paragraphs:
            article["sections"].append({"heading": heading, "paragraphs": paragraphs})
            continue
        fallback = []
        fallback_words = 0
        for section_attempt in range(1, 3):
            log(f"redigindo seção {idx}/5 — tentativa {section_attempt}: {heading}")
            try:
                section = ask_ollama(build_section_prompt(topic, article["title"], heading, idx, 5), num_predict=380, timeout=180)
                candidate = normalize_section_paragraphs(section)
                section_text = " ".join(candidate)
                section_words = len(words(section_text)) if candidate else 0
                section_hits = semantic_forbidden_hits(section_text) + [p for p in topic.get("forbid_patterns",[]) if re.search(p, section_text, flags=re.I)]
                if section_hits:
                    log(f"seção {idx} reprovada semanticamente: {', '.join(section_hits[:2])}")
                    continue
                if section_words > fallback_words:
                    fallback, fallback_words = candidate, section_words
                if candidate and 65 <= section_words <= 190:
                    paragraphs = candidate
                    break
                log(f"seção {idx} fora do padrão: {len(candidate)} parágrafos, {section_words} palavras")
            except Exception as exc:
                log(f"falha na seção {idx}, tentativa {section_attempt}: {exc}")
        if not paragraphs and fallback and fallback_words >= 50:
            paragraphs = fallback
            log(f"seção {idx} aceita pelo melhor rascunho limpo com {fallback_words} palavras")
        if not paragraphs and idx-1 < len(section_fallbacks):
            editorial_fallback = [clean_generated_text(x) for x in section_fallbacks[idx-1] if clean_generated_text(x)]
            fallback_text = " ".join(editorial_fallback)
            if len(editorial_fallback) == 2 and not semantic_forbidden_hits(fallback_text) and not any(re.search(p, fallback_text, flags=re.I) for p in topic.get("forbid_patterns", [])):
                paragraphs = editorial_fallback
                log(f"seção {idx} usando fallback editorial aprovado")
        if not paragraphs:
            raise ValueError(f"seção {idx} não pôde ser normalizada")
        article["sections"].append({"heading": heading, "paragraphs": paragraphs})
    return normalize_local_repetition(article)


def render_article(article, number, date_iso, slug):
    e = html.escape
    url = f"{BASE_URL}/botucatu/{slug}.html"
    title = article["title"].strip()
    meta = article["meta_description"].strip()
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "Article", "headline": title, "description": meta, "datePublished": date_iso, "dateModified": date_iso,
             "author": {"@type": "Organization", "name": "Próxima Era"},
             "publisher": {"@type": "Organization", "name": "Próxima Era", "logo": {"@type": "ImageObject", "url": f"{BASE_URL}/assets/logo-horizontal.svg"}},
             "mainEntityOfPage": url, "about": {"@type": "Place", "name": "Botucatu", "address": {"@type": "PostalAddress", "addressRegion": "SP", "addressCountry": "BR"}}},
            {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": item["question"], "acceptedAnswer": {"@type": "Answer", "text": item["answer"]}} for item in article["faq"]]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Próxima Era", "item": BASE_URL + "/"},
                {"@type": "ListItem", "position": 2, "name": "Botucatu em modo digital", "item": BASE_URL + "/botucatu/"},
                {"@type": "ListItem", "position": 3, "name": title, "item": url}]}
        ]
    }
    if article.get("sources"):
        schema["@graph"][0]["citation"] = [src.get("url") for src in article["sources"] if src.get("url")]
    sections = []
    for section in article["sections"]:
        paragraphs = "".join(f"<p>{e(p)}</p>" for p in section["paragraphs"])
        sections.append(f"<h2>{e(section['heading'])}</h2>{paragraphs}")
    checklist = "".join(f"<li>{e(item)}</li>" for item in article["checklist"])
    faq = "".join(f"<details><summary>{e(item['question'])}</summary><p>{e(item['answer'])}</p></details>" for item in article["faq"])
    source_items = "".join(f'<li><a href="{e(src.get("url", ""))}" rel="noopener noreferrer">{e(src.get("title", "Fonte oficial"))}</a></li>' for src in article.get("sources", []) if src.get("url"))
    source_section = f'<section class="local-sources"><h2>Fontes oficiais consultadas</h2><ul>{source_items}</ul><p>As fontes sustentam as afirmações factuais sobre plataformas; as recomendações práticas são editoriais da Próxima Era.</p></section>' if source_items else ""
    human_date = dt.date.fromisoformat(date_iso).strftime("%d.%m.%Y")
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#071018"/><meta name="description" content="{e(meta)}"/><meta name="robots" content="index,follow,max-image-preview:large"/>
<title>{e(title)} — Próxima Era</title><link rel="canonical" href="{url}"/><meta property="og:type" content="article"/><meta property="og:locale" content="pt_BR"/>
<meta property="og:title" content="{e(title)}"/><meta property="og:description" content="{e(meta)}"/><meta property="og:url" content="{url}"/>
<meta property="og:image" content="{BASE_URL}/assets/og-proxima-era.webp"/><meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="../favicon.svg" type="image/svg+xml"/><link rel="stylesheet" href="../styles.css"/>
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script></head>
<body class="inner-page local-article"><header class="inner-header"><a href="../index.html"><img src="../assets/logo-horizontal.svg" width="270" height="60" alt="Próxima Era"/></a>
<nav><a href="../index.html#projetos">Projetos</a><a href="../botucatu/">Botucatu</a><a href="../sinais/">Sinais</a><a href="../contato.html">Contato</a></nav></header>
<main><article class="article-page"><a class="back-link" href="index.html">← Botucatu em modo digital</a><span class="section-kicker">GUIA LOCAL {number:03d} · {human_date}</span>
<h1>{e(title)}</h1><p class="article-lead">{e(article['lead'])}</p>{''.join(sections)}
<section class="local-checklist"><h2>Checklist para colocar em prática</h2><ul>{checklist}</ul></section>
<section class="local-faq"><h2>Perguntas frequentes</h2>{faq}</section>{source_section}
<section class="local-cta"><p class="section-kicker">PRÓXIMO PASSO</p><h2>{e(article['cta_title'])}</h2><p>{e(article['cta_text'])}</p><a class="button primary" href="../contato.html">Falar com a Próxima Era <span>→</span></a></section>
<p class="local-byline">Conteúdo do Núcleo Editorial Local da Próxima Era · Botucatu/SP.</p></article></main>
<footer class="inner-footer"><span>Próxima Era · Botucatu/SP · CNPJ 68.964.484/0001-22</span><div><a href="../privacidade.html">Privacidade</a><a href="../termos.html">Termos</a><a href="../contato.html">Contato</a></div></footer></body></html>'''


def article_meta(article, number, date_iso, slug, topic_id):
    return {"number": number, "date": date_iso, "slug": slug, "topic_id": topic_id,
            "title": article["title"].strip(), "description": article["meta_description"].strip(),
            "url": f"{BASE_URL}/botucatu/{slug}.html"}


def render_index(articles):
    rows = []
    for item in sorted(articles, key=lambda x: (x["date"], x["number"]), reverse=True):
        date_human = dt.date.fromisoformat(item["date"]).strftime("%d.%m.%Y")
        rows.append(f'<a href="{html.escape(item["slug"])}.html" class="article-row"><span>{date_human} · GUIA LOCAL {item["number"]:03d}</span><h2>{html.escape(item["title"])}</h2><p>{html.escape(item["description"])}</p><b>Ler guia →</b></a>')
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#071018"/><meta name="description" content="Guias práticos da Próxima Era para presença digital, automação, IA e negócios locais em Botucatu e região."/>
<title>Botucatu em modo digital — Próxima Era</title><meta name="robots" content="index,follow,max-image-preview:large"/><link rel="canonical" href="{BASE_URL}/botucatu/"/>
<meta property="og:type" content="website"/><meta property="og:title" content="Botucatu em modo digital — Próxima Era"/><meta property="og:description" content="Tecnologia aplicada ao dia a dia de negócios locais."/>
<meta property="og:url" content="{BASE_URL}/botucatu/"/><meta property="og:image" content="{BASE_URL}/assets/og-proxima-era.webp"/><meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="../favicon.svg" type="image/svg+xml"/><link rel="stylesheet" href="../styles.css"/></head><body class="inner-page local-hub">
<header class="inner-header"><a href="../index.html"><img src="../assets/logo-horizontal.svg" width="270" height="60" alt="Próxima Era"/></a><nav><a href="../index.html#projetos">Projetos</a><a href="../botucatu/">Botucatu</a><a href="../sinais/">Sinais</a><a href="../contato.html">Contato</a></nav></header>
<main><section class="inner-hero"><p class="section-kicker">BOTUCATU EM MODO DIGITAL</p><h1>Tecnologia útil para negócios daqui.</h1><p>Guias práticos sobre presença digital, automação, inteligência artificial, atendimento e organização para empresas e profissionais de Botucatu e região.</p></section>
<section class="local-principles"><div><strong>LOCAL</strong><span>Contexto de quem atende e vende na região.</span></div><div><strong>PRÁTICO</strong><span>Ações aplicáveis, sem jargão desnecessário.</span></div><div><strong>SEM INVENÇÃO</strong><span>Sem estatísticas locais ou promessas sem fonte.</span></div></section>
<section class="article-list">{''.join(rows) if rows else '<p class="local-empty">Primeiro guia em preparação. Sinal recebido.</p>'}</section></main>
<footer class="inner-footer"><span>Próxima Era · Botucatu/SP · CNPJ 68.964.484/0001-22</span><div><a href="../privacidade.html">Privacidade</a><a href="../termos.html">Termos</a><a href="../contato.html">Contato</a></div></footer></body></html>'''


def write_public_indexes(articles, state):
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "index.html").write_text(render_index(articles), encoding="utf-8")
    feed = [{"title": a["title"], "description": a["description"], "url": a["url"], "date": a["date"], "number": a["number"]} for a in sorted(articles, key=lambda x: (x["date"], x["number"]), reverse=True)[:12]]
    save_json(PUBLIC / "feed.json", feed)
    rss_items = "".join(f"<item><title>{xml_escape(a['title'])}</title><link>{a['url']}</link><guid>{a['url']}</guid><pubDate>{dt.datetime.fromisoformat(a['date']+'T12:00:00+00:00').strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate><description>{xml_escape(a['description'])}</description></item>" for a in feed)
    rss = f'''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Botucatu em modo digital — Próxima Era</title><link>{BASE_URL}/botucatu/</link><description>Guias práticos para negócios locais de Botucatu e região.</description><language>pt-BR</language>{rss_items}</channel></rss>'''
    (PUBLIC / "feed.xml").write_text(rss, encoding="utf-8")
    urls = [f"  <url><loc>{BASE_URL}/botucatu/</loc><lastmod>{dt.date.today().isoformat()}</lastmod><changefreq>weekly</changefreq></url>"]
    urls += [f"  <url><loc>{a['url']}</loc><lastmod>{a['date']}</lastmod><changefreq>monthly</changefreq></url>" for a in articles]
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + '\n</urlset>\n'
    (PUBLIC / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    status = {"status": "ok", "last_run": state.get("last_run"), "model": MODEL, "articles": len(articles), "schedule": SCHEDULE, "next_number": state.get("next_number", 1)}
    save_json(PUBLIC / "status.json", status)


def unique_slug(title, articles):
    base = slugify(title)
    used = {a["slug"] for a in articles}
    if base not in used:
        return base
    n = 2
    while f"{base}-{n}" in used:
        n += 1
    return f"{base}-{n}"


def choose_topic(topics, state):
    used = set(state.get("used_topics", []))
    available = [topic for topic in topics if topic.get("autopublish") is True and topic["id"] not in used]
    if not available:
        raise RuntimeError("fila de autopublicação segura concluída; adicione novas pautas curadas")
    return available[0]


def main():
    parser = argparse.ArgumentParser(description="Agente Editorial Local da Próxima Era")
    parser.add_argument("--dry-run", action="store_true", help="gera e valida, mas não publica")
    parser.add_argument("--rebuild", action="store_true", help="regera índices a partir do estado")
    args = parser.parse_args()
    ROOT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    topics = load_json(TOPICS_FILE, [])
    if not topics:
        raise SystemExit("topics.json vazio ou ausente")
    state = load_json(STATE_FILE, {"next_number": 1, "cycle": 1, "used_topics": [], "articles": []})
    articles = state.setdefault("articles", [])
    if args.rebuild:
        write_public_indexes(articles, state)
        log(f"índices reconstruídos: {len(articles)} artigos")
        return
    topic = choose_topic(topics, state)
    recent_titles = [item["title"] for item in articles]
    article = None
    errors = []
    last_exception = None
    for attempt in range(1, 3):
        try:
            log(f"gerando pauta {topic['id']} — pipeline estruturado, tentativa {attempt}")
            article = generate_article(topic, recent_titles)
            errors = quality_errors(article, topic)
            if not errors:
                break
            log("reprovado pelo quality gate: " + " | ".join(errors))
            quarantine = ROOT / "quarantine"
            quarantine.mkdir(parents=True, exist_ok=True)
            stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            rejected = {"topic": topic.get("id"), "attempt": attempt, "errors": errors, "article": article}
            save_json(quarantine / f"{stamp}-{topic.get('id','topic')}-attempt{attempt}.json", rejected)
        except Exception as exc:
            last_exception = exc
            errors = [f"falha de geração: {exc}"]
            log(errors[0])
    if errors:
        detail = f" Última falha: {last_exception}" if last_exception else ""
        raise SystemExit("artigo não atingiu o padrão editorial após 2 tentativas." + detail)
    number = int(state.get("next_number", 1))
    today = dt.datetime.now(ZoneInfo("America/Sao_Paulo")).date().isoformat()
    slug = unique_slug(topic.get("slug_hint") or article["title"], articles)
    html_doc = render_article(article, number, today, slug)
    if args.dry_run:
        preview = ROOT / "preview.html"
        preview.write_text(html_doc, encoding="utf-8")
        log(f"dry-run aprovado: {article['title']} -> {preview}")
        return
    article_path = PUBLIC / f"{slug}.html"
    tmp = article_path.with_suffix(".html.tmp")
    tmp.write_text(html_doc, encoding="utf-8")
    tmp.replace(article_path)
    meta = article_meta(article, number, today, slug, topic["id"])
    articles.append(meta)
    state["next_number"] = number + 1
    state.setdefault("used_topics", []).append(topic["id"])
    state["last_run"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    state["last_topic"] = topic["id"]
    save_json(STATE_FILE, state)
    write_public_indexes(articles, state)
    log(f"PUBLICADO GUIA LOCAL {number:03d}: {article['title']} — {meta['url']}")


if __name__ == "__main__":
    main()

