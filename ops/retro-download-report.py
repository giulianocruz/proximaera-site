#!/usr/bin/env python3
"""Próxima Era Retro: relatório PRIVADO, somente leitura, dos logs de downloads.

Conta respostas HTTP observadas, não instalações nem pessoas únicas.
Uma resposta GET 200 com bytes de corpo >= tamanho do arquivo oficial da
versão atual é classificada "transferência completa provável", nunca
como prova de instalação. 206 e status de interrupção ficam separados.

Uso em máquina com Docker e acesso autorizado:
  python3 ops/retro-download-report.py --since 24h
  python3 ops/retro-download-report.py --since 7d
  python3 ops/retro-download-report.py --file tests/fixtures/retro-access.log --manifest tests/fixtures/retro-version.json

Não grava logs ou cookies, não revela IP, agentes ou referers e não faz deploy.
A contagem cobre SOMENTE os logs ainda retidos pelo container, nunca a vida
inteira do aplicativo; reinícios/rotação podem limitar o período real.
"""
import argparse
import collections
import datetime as dt
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import urlopen
from urllib.parse import urlsplit, unquote

CONTAINER = "proximaera-retro-downloads"
VERSION_URL = "https://proximaera.com.br/retro/version.json"
REQUEST = re.compile(r'"(GET|HEAD)\s+(\S+)\s+HTTP/[0-9.]+"\s+(\d{3})\s+(\d+|-)')
SINCE = re.compile(r"^(?:[1-9]\d{0,2})(?:h|d)$")
FILE_NAME = re.compile(r"^[A-Za-z0-9._-]{3,160}\.(?:apk|zip)$", re.I)


def cmd(args):
    proc = subprocess.run(args, capture_output=True, text=True, timeout=25, check=False)
    if proc.returncode:
        raise RuntimeError("Falha ao consultar logs/metadados do contêiner; confira Docker e permissões")
    return proc.stdout


def manifest_from(source):
    if source:
        return json.loads(Path(source).read_text(encoding="utf-8"))
    with urlopen(VERSION_URL, timeout=12) as response:
        return json.load(response)


def latest_files(manifest):
    if not isinstance(manifest, dict):
        raise ValueError("manifesto de versão inválido")
    files = manifest.get("files", {})
    expected = {}
    for platform in ("android", "windows"):
        item = files.get(platform, {})
        name = item.get("name")
        size = item.get("size_bytes")
        if (not isinstance(name, str) or not FILE_NAME.fullmatch(name)
                or not isinstance(size, int) or isinstance(size, bool)
                or not 1_000 <= size <= 2_000_000_000):
            raise ValueError("manifesto com arquivo/tamanho inválido para " + platform)
        expected[name] = (platform, size)
    return expected


def scan(logtext, expected):
    counts = collections.Counter()
    current = collections.Counter()
    older = collections.Counter()
    observed_gets = 0
    parsed_http_requests = 0
    for line in logtext.splitlines():
        match = REQUEST.search(line)
        if not match:
            continue
        parsed_http_requests += 1
        method, target, code, size_text = match.groups()
        if method != "GET":
            continue  # HEAD não baixa o arquivo
        filename = unquote(urlsplit(target).path.rsplit("/", 1)[-1])
        if not FILE_NAME.fullmatch(filename):
            continue
        # Só conta objetos da rota de download configurada, para não misturar assets.
        if "/downloads/" not in urlsplit(target).path:
            continue
        observed_gets += 1
        body_bytes = int(size_text) if size_text.isdigit() else -1
        known = expected.get(filename)
        if known:
            platform, full_size = known
            if code == "200" and body_bytes >= full_size:
                current[(platform, "complete_response_probable")] += 1
            elif code == "206":
                current[(platform, "partial_range")] += 1
            elif code in ("499", "408") or body_bytes < full_size and code == "200":
                current[(platform, "incomplete_or_interrupted")] += 1
            else:
                current[(platform, "other_http_" + code)] += 1
        else:
            ext = "android" if filename.lower().endswith(".apk") else "windows"
            older[(ext, code)] += 1
    for (platform, metric), value in current.items():
        counts[platform + "/" + metric] = value
    for (platform, status), value in older.items():
        counts[platform + "/older_or_unknown_http_" + status] = value
    return {"http_requests_parsed": parsed_http_requests, "binary_gets_observed": observed_gets, "counts": dict(sorted(counts.items()))}


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", default="24h", help="janela pedida ao Docker, ex. 24h, 7d")
    parser.add_argument("--file", help="arquivo de logs local para teste; não aciona o Docker")
    parser.add_argument("--manifest", help="manifesto JSON local para teste")
    args = parser.parse_args()
    if not SINCE.fullmatch(args.since):
        parser.error("--since deve ter formato 1h...999h ou 1d...999d")
    manifest = manifest_from(args.manifest)
    expected = latest_files(manifest)
    started_at = None
    if args.file:
        logdata = Path(args.file).read_text(encoding="utf-8")
        source = "fixture"
    else:
        logdata = cmd(["docker", "logs", "--since", args.since, CONTAINER])
        source = CONTAINER
        try:
            inspection = json.loads(cmd(["docker", "inspect", CONTAINER]))
            started_at = inspection[0]["State"]["StartedAt"]
        except (ValueError, KeyError, IndexError, RuntimeError):
            started_at = None
    summary = scan(logdata, expected)
    complete_window = None
    if started_at:
        try:
            length = int(args.since[:-1]) * (3600 if args.since.endswith('h') else 86400)
            timestamp = dt.datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            complete_window = timestamp <= dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=length)
        except (ValueError, OverflowError):
            complete_window = None
    output = {
        "status": "ok",
        "period_requested": args.since,
        "source": source,
        "container_started_at": started_at,
        "requested_period_fully_covered": complete_window,
        "latest_version": manifest.get("version"),
        "latest_files": {platform: {"name": name, "size_bytes": size} for name, (platform, size) in expected.items()},
        **summary,
        "interpretation": "Respostas completas prováveis por bytes enviados; não são instalações, usuários únicos ou downloads históricos totais.",
        "retention_warning": "Somente logs disponíveis no contêiner. Reinícios ou rotação podem excluir eventos anteriores."
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except (OSError, ValueError, RuntimeError) as exc:
        print("ERRO: " + str(exc), file=sys.stderr)
        sys.exit(1)
