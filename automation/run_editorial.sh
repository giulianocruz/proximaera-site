#!/usr/bin/env bash
set -euo pipefail

ROOT="/opt/proximaera-editorial"
BACKUPS="$ROOT/backups"
mkdir -p "$ROOT/public" "$BACKUPS"

exec 9>"$ROOT/editorial.lock"
if ! flock -n 9; then
  echo "$(date -Is) execução ignorada: agente já está rodando" >> "$ROOT/runner.log"
  exit 0
fi

if [[ -f "$ROOT/state.json" ]]; then
  cp "$ROOT/state.json" "$BACKUPS/state-$(date -u +%Y%m%dT%H%M%SZ).json"
fi

docker run --rm --network coolify \
  -v "$ROOT:/workspace" \
  python:3.12-alpine \
  python /workspace/local_editorial_agent.py \
  >> "$ROOT/runner.log" 2>&1

find "$BACKUPS" -type f -name 'state-*.json' -mtime +45 -delete