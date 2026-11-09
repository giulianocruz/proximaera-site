#!/usr/bin/env python3
"""Troca atomica dos destinos de WhatsApp da Proxima Era com guardas e rollback.

Uso na VPS: --check gera um manifest; --apply so age se os hashes continuarem iguais.
Nao usa substituicao cega de arquivos HTML (preserva alteracoes locais de producao).
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import tempfile

FILES = (
    "index.html",
    "contato.html",
    "fecha-negocio/index.html",
    "fecha-negocio/modelos/index.html",
    "fecha-negocio/modelos/demo.js",
    "vender/index.html",
    "vender/app.js",
    "cobranca-profissional/index.html",
    "comece-a-vender/index.html",
    "divulgacao-express/index.html",
    "fecha-venda/index.html",
    "primeiros-clientes/index.html",
    "ofertas/canva-pro/index.html",
    "ofertas/combo-criador/index.html",
    "ofertas/google-ai-pro/index.html",
)
OLD_NUMBER = b"5514996428874"
NEW_NUMBER = b"5514998193831"
OLD_DISPLAY = b"99642-8874"
NEW_DISPLAY = b"99819-3831"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def targets(root):
    for rel in FILES:
        path = root / rel
        if not path.is_file() or path.is_symlink():
            raise RuntimeError(f"Arquivo ausente ou symlink: {rel}")
        before = path.read_bytes()
        if OLD_NUMBER not in before:
            raise RuntimeError(f"Telefone de origem ausente em {rel}; abortando")
        if NEW_NUMBER in before:
            raise RuntimeError(f"Arquivo parcialmente alterado: {rel}; abortando")
        after = before.replace(OLD_NUMBER, NEW_NUMBER).replace(OLD_DISPLAY, NEW_DISPLAY)
        if OLD_NUMBER in after or OLD_DISPLAY in after:
            raise RuntimeError(f"Telefone antigo permaneceu: {rel}")
        yield rel, path, before, after


def atomic_put(path, data, original_stat):
    fd, tmp = tempfile.mkstemp(prefix=".pe-whatsapp-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(data)
            out.flush()
            os.fsync(out.fileno())
        os.chmod(tmp, stat.S_IMODE(original_stat.st_mode))
        if hasattr(os, "chown"):
            os.chown(tmp, original_stat.st_uid, original_stat.st_gid)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("/opt/proximaera/site"))
    parser.add_argument("--guard", type=Path, default=Path("/tmp/pe-whatsapp-personal-guard-20261109.json"))
    parser.add_argument("--backup-root", type=Path, default=Path("/opt/proximaera/backups"))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    items = list(targets(root))
    observed = {rel: digest(before) for rel, _path, before, _after in items}
    if args.check:
        args.guard.write_text(json.dumps(observed, indent=2), encoding="utf-8")
        print(f"DRY_RUN_OK files={len(items)} guard={args.guard}")
        for rel, _path, before, after in items:
            print(f"{rel}: {digest(before)[:12]} -> {digest(after)[:12]}")
        return
    expected = json.loads(args.guard.read_text(encoding="utf-8"))
    if expected != observed:
        raise RuntimeError("DRIFT: arquivo mudou desde --check; nenhuma troca realizada")
    if hasattr(os, "geteuid") and os.geteuid() != 0:
        raise RuntimeError("Publicacao requer root")
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = args.backup_root / ("whatsapp-personal-" + stamp)
    backup_dir.mkdir(parents=True, mode=0o700)
    for rel, path, before, _after in items:
        backup = backup_dir / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, backup)
        if digest(backup.read_bytes()) != digest(before):
            raise RuntimeError(f"Falha no backup {rel}; publicacao nao iniciou")
    (backup_dir / "manifest.json").write_text(
        json.dumps({"before": observed, "after": {rel: digest(after) for rel, _path, _before, after in items}}, indent=2),
        encoding="utf-8",
    )
    applied = []
    try:
        for rel, path, before, after in items:
            if digest(path.read_bytes()) != observed[rel]:
                raise RuntimeError(f"DRIFT durante deploy: {rel}")
            original_stat = path.stat()
            atomic_put(path, after, original_stat)
            applied.append((path, original_stat, before))
            if digest(path.read_bytes()) != digest(after):
                raise RuntimeError(f"Checksum falhou apos alteracao: {rel}")
    except Exception:
        for path, metadata, before in reversed(applied):
            atomic_put(path, before, metadata)
        raise
    print(f"RELEASE_OK files={len(items)} backup={backup_dir}")
    for rel, _path, _before, after in items:
        print(f"UPDATED {rel} sha={digest(after)}")


if __name__ == "__main__":
    main()
