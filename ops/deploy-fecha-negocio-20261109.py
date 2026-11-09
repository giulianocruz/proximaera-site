#!/usr/bin/env python3
"""Publica somente o funil Fecha Negócio, com verificação de drift e rollback."""
import argparse
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import stat
import tarfile
import tempfile

ROOT = pathlib.Path("/opt/proximaera/site")
STAGE = pathlib.Path("/tmp/pe-fecha-negocio-20261109")
BACKUPS = pathlib.Path("/opt/proximaera/backups")
FILES = (
    "tracking.js",
    "fecha-negocio/index.html",
    "privacidade.html",
)
BASELINE = {
    "tracking.js": "274177d75973041fae4bef0dfb83c1188ca86173563b1519af2485f8879b8b2f",
    "fecha-negocio/index.html": "7786df2a3c062639ba975ff1a88acf373132caf1551facc86d68dd730fb8899a",
    "privacidade.html": "43ed219e92fb169cafca23163921529e62200cb5ab6f9cda5e785a3052b0c18f",
}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def atomic_write(path, data, metadata):
    fd, tmp = tempfile.mkstemp(prefix=".pe-fecha-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(tmp, stat.S_IMODE(metadata.st_mode))
        os.chown(tmp, metadata.st_uid, metadata.st_gid)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if not ROOT.is_dir() or not STAGE.is_dir():
        raise SystemExit("Pasta de produção ou staging ausente.")
    snapshots = {}
    incoming = {}
    for name in FILES:
        target = ROOT / name
        staged = STAGE / name
        if not target.is_file() or target.is_symlink() or not staged.is_file() or staged.is_symlink():
            raise SystemExit(f"Arquivo ausente/não regular: {name}")
        if digest(target) != BASELINE[name]:
            raise SystemExit(f"DRIFT NA PRODUÇÃO: {name}; nada modificado.")
        content = staged.read_bytes()
        if len(content) < 1000:
            raise SystemExit(f"Staging incompleto: {name}")
        snapshots[name] = (target.read_bytes(), target.stat())
        incoming[name] = (content, hashlib.sha256(content).hexdigest())
        print(f"READY {name}: {BASELINE[name]} -> {incoming[name][1]}")
    landing = incoming["fecha-negocio/index.html"][0]
    tracker = incoming["tracking.js"][0]
    privacy = incoming["privacidade.html"][0]
    if b'googletagmanager.com/gtag/js' in landing:
        raise SystemExit("A landing ainda carrega GA4 sem consentimento.")
    if b"peIsFechaNegocio" not in tracker or b"WhatsAppClick" not in tracker:
        raise SystemExit("Rastreamento de anúncios não corresponde à candidata.")
    if b'marketingConsentRevoke' not in privacy:
        raise SystemExit("Política de privacidade sem retirada do consentimento.")
    if args.check:
        print("DRY_RUN_PASS: nenhum arquivo publicado.")
        return
    if os.geteuid() != 0:
        raise SystemExit("Publicação exige administrador.")

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = BACKUPS / f"fecha-negocio-{timestamp}"
    backup.mkdir(mode=0o700)
    archive = backup / "originals.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        for name in FILES:
            tar.add(ROOT / name, arcname=name, recursive=False)
    if archive.stat().st_size < 1000:
        raise SystemExit("Backup não foi criado corretamente.")
    (backup / "manifest.json").write_text(
        json.dumps({"files": {name: {"before": BASELINE[name], "after": incoming[name][1]}
                              for name in FILES}}, indent=2), encoding="utf8")
    changed = []
    try:
        for name in FILES:
            target = ROOT / name
            if digest(target) != BASELINE[name]:
                raise RuntimeError(f"Concorrência detectada: {name}")
            atomic_write(target, incoming[name][0], snapshots[name][1])
            changed.append(name)
            if digest(target) != incoming[name][1]:
                raise RuntimeError(f"Verificação após gravação falhou: {name}")
            print(f"PUBLISHED {name}")
    except Exception:
        for name in reversed(changed):
            target = ROOT / name
            if digest(target) == incoming[name][1]:
                atomic_write(target, *snapshots[name])
        print("ROLLBACK_APPLIED após falha.")
        raise
    print(f"RELEASE_OK BACKUP={backup} (verificar HTTP e eventos em seguida)")

if __name__ == "__main__":
    main()
