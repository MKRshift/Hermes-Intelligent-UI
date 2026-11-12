#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-}"
if [[ -z "$SRC" && -f "$ROOT/.last-checkout-path" ]]; then SRC="$(cat "$ROOT/.last-checkout-path")"; fi
SRC="${SRC:-$HOME/Developer/hermes-openui-source}"
BACKUPS="$SRC/.hermes-openui-backups"
if [[ ! -d "$BACKUPS" ]]; then echo "No backups found: $BACKUPS" >&2; exit 1; fi
mapfile_compat() { find "$BACKUPS" -mindepth 1 -maxdepth 1 -type d -print | sort; }
LAST="$(mapfile_compat | tail -1)"
if [[ ! -f "$LAST/restore.command" ]]; then echo 'No restore script in latest backup.' >&2; exit 1; fi
"$LAST/restore.command"
printf '\nSource restored. The composer plugin remains in Hermes and can be disabled in Capabilities → Plugins.\n'
