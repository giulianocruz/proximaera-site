#!/usr/bin/env python3
"""Publicacao protegida da landing de diagnostico, sem reimplantar todo o site."""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import stat
import tempfile

ROOT = pathlib.Path("/opt/proximaera/site")
STAGE = pathlib.Path("/tmp/pe-diagnostic-20261109")
BACKUPS = pathlib.Path("/opt/proximaera/backups")
NEW_DIR = "diagnostico-gratuito"
NEW_FILES = ("index.html", "style.css", "app.js")
SHARED = {
    "tracking.js": "1eb5c3c6d57a1c5c9320e475ea1823302fdfaf22350e2925606ff31e23e1c0f2",
    "sitemap.xml": "a839a225e359858411c1188b64ca438b667e3ed281e2e9f8bb95ffe212fb3271",
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def atomic_write(path, data, mode, uid, gid):
    fd, tmp = tempfile.mkstemp(prefix=".pe-diagnostic-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
        os.chmod(tmp, mode)
        os.chown(tmp, uid, gid)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def preflight():
    for name, expected in SHARED.items():
        target = ROOT / name
        if not target.is_file() or target.is_symlink():
            raise RuntimeError("arquivo protegido ausente ou symlink: " + name)
        actual = sha(target.read_bytes())
        if actual != expected:
            raise RuntimeError("DRIFT em producao: " + name + " " + actual)
        candidate = STAGE / name
        if not candidate.is_file() or candidate.is_symlink():
            raise RuntimeError("staging ausente: " + name)

    folder = ROOT / NEW_DIR
    if folder.exists() or folder.is_symlink():
        raise RuntimeError("landing ja existe; nao sobrescrever")
    for name in NEW_FILES:
        candidate = STAGE / NEW_DIR / name
        if not candidate.is_file() or candidate.is_symlink():
            raise RuntimeError("staging da landing ausente: " + name)

    html = (STAGE / NEW_DIR / "index.html").read_text(encoding="utf-8")
    app = (STAGE / NEW_DIR / "app.js").read_text(encoding="utf-8")
    css = (STAGE / NEW_DIR / "style.css").read_text(encoding="utf-8")
    tracking = (STAGE / "tracking.js").read_text(encoding="utf-8")
    sitemap = (STAGE / "sitemap.xml").read_text(encoding="utf-8")
    if not all(x in html for x in ('id="diagnosticForm"', "privacidade.html", "R$ 79,90", "diagnóstico")):
        raise RuntimeError("HTML da campanha incompleto")
    if "5514998193831" not in app or "diagnostic_intent" not in app:
        raise RuntimeError("Formulario nao direciona ao numero aprovado")
    if len(css) < 6000 or "peIsDiagnostic" not in tracking:
        raise RuntimeError("CSS ou consentimento ausente")
    if "https://proximaera.com.br/diagnostico-gratuito/" not in sitemap:
        raise RuntimeError("Sitemap nao inclui a landing")
    staged = {k: sha((STAGE / k).read_bytes()) for k in SHARED}
    staged.update({NEW_DIR + "/" + k: sha((STAGE / NEW_DIR / k).read_bytes()) for k in NEW_FILES})
    return staged


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    staged = preflight()
    print("PRECHECK_OK", json.dumps(staged, sort_keys=True), flush=True)
    if args.check:
        print("DRY_RUN_OK: sem modificacoes em producao")
        return
    if os.geteuid() != 0:
        raise RuntimeError("publicacao exige root")
    moment = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = BACKUPS / ("diagnostic-landing-" + moment)
    backup.mkdir(parents=True, mode=0o700)
    before = {}
    original_stats = {}
    for name, expected in SHARED.items():
        target = ROOT / name
        before[name] = target.read_bytes()
        original_stats[name] = target.stat()
        if sha(before[name]) != expected:
            raise RuntimeError("drift na copia de seguranca: " + name)
        shutil.copy2(target, backup / name)
        if sha((backup / name).read_bytes()) != expected:
            raise RuntimeError("erro de backup: " + name)
    (backup / "manifest.json").write_text(json.dumps({
        "previous": {n: sha(data) for n, data in before.items()},
        "published": staged
    }, indent=2), encoding="utf-8")

    page_folder = ROOT / NEW_DIR
    changed = []
    try:
        if page_folder.exists() or page_folder.is_symlink():
            raise RuntimeError("landing foi criada por outro processo")
        page_folder.mkdir(mode=0o755)
        for name in SHARED:
            target = ROOT / name
            if sha(target.read_bytes()) != SHARED[name]:
                raise RuntimeError("drift durante publicacao: " + name)
            metadata = original_stats[name]
            payload = (STAGE / name).read_bytes()
            atomic_write(target, payload, stat.S_IMODE(metadata.st_mode), metadata.st_uid, metadata.st_gid)
            changed.append(name)
            if sha(target.read_bytes()) != staged[name]:
                raise RuntimeError("hash divergente: " + name)
        owner = original_stats["tracking.js"]
        for name in NEW_FILES:
            target = page_folder / name
            payload = (STAGE / NEW_DIR / name).read_bytes()
            atomic_write(target, payload, 0o644, owner.st_uid, owner.st_gid)
            if sha(target.read_bytes()) != staged[NEW_DIR + "/" + name]:
                raise RuntimeError("hash divergente: " + NEW_DIR + "/" + name)
    except Exception:
        for name in reversed(changed):
            target = ROOT / name
            if sha(target.read_bytes()) == staged[name]:
                meta = original_stats[name]
                atomic_write(target, before[name], stat.S_IMODE(meta.st_mode), meta.st_uid, meta.st_gid)
        if page_folder.is_dir():
            for name in NEW_FILES:
                target = page_folder / name
                if target.is_file() and sha(target.read_bytes()) == staged[NEW_DIR + "/" + name]:
                    target.unlink()
            if not any(page_folder.iterdir()):
                page_folder.rmdir()
        raise
    print("RELEASE_OK backup=" + str(backup) + " files=5", flush=True)


if __name__ == "__main__":
    main()
