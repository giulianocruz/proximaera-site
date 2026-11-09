#!/usr/bin/env python3
"""Publicacao pontual da politica de privacidade, com guarda de hash e rollback."""
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
TARGET = ROOT / "privacidade.html"
STAGE = pathlib.Path("/tmp/pe-privacy-assistido-20261109.html")
BACKUPS = pathlib.Path("/opt/proximaera/backups")
EXPECTED = "792e8b3071856f8ce29fa43fcbd625a437576567ee32e20a7b52bab75bfb0784"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def atomic_write(target, data, metadata):
    fd, temp = tempfile.mkstemp(prefix=".privacy-new-", dir=str(target.parent))
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(temp, stat.S_IMODE(metadata.st_mode))
        os.chown(temp, metadata.st_uid, metadata.st_gid)
        os.replace(temp, target)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true")
    group.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if not TARGET.is_file() or TARGET.is_symlink() or not STAGE.is_file() or STAGE.is_symlink():
        raise SystemExit("Alvo ou staging ausente/invalido")
    before = TARGET.read_bytes()
    after = STAGE.read_bytes()
    if sha(before) != EXPECTED:
        raise SystemExit("DRIFT: producao foi modificada; sem publicacao")
    required = [
        "Na configuração atual do site".encode("utf-8"),
        b"marketingConsentRevoke",
        b"marketingConsentReset",
        b"pe_marketing_consent",
        b"</html>",
    ]
    if len(after) < 5000 or any(x not in after for x in required):
        raise SystemExit("Staging nao corresponde ao texto revisado")
    print("READY: atual=" + sha(before) + " nova=" + sha(after), flush=True)
    if args.check:
        print("DRY_RUN_OK: producao intacta")
        return
    if os.geteuid() != 0:
        raise SystemExit("Publicacao exige root")
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUPS / ("privacy-assisted-" + stamp)
    backup_dir.mkdir(parents=True, mode=0o700)
    backup = backup_dir / "privacidade.html"
    shutil.copy2(TARGET, backup)
    if sha(backup.read_bytes()) != EXPECTED:
        raise SystemExit("Backup falhou; producao intacta")
    manifest = {"target": str(TARGET), "before": EXPECTED, "after": sha(after)}
    (backup_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    meta = TARGET.stat()
    if sha(TARGET.read_bytes()) != EXPECTED:
        raise SystemExit("Producao mudou durante o preparo; nada alterado")
    try:
        atomic_write(TARGET, after, meta)
        if sha(TARGET.read_bytes()) != sha(after):
            raise RuntimeError("Falha no checksum pos-deploy")
    except Exception:
        if sha(TARGET.read_bytes()) == sha(after):
            atomic_write(TARGET, before, meta)
        raise
    print("RELEASE_OK backup=" + str(backup_dir) + " sha=" + sha(after))

if __name__ == "__main__":
    main()
