#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-}"
if [[ -z "$SRC" && -f "$ROOT/.last-checkout-path" ]]; then SRC="$(cat "$ROOT/.last-checkout-path")"; fi
SRC="${SRC:-$HOME/Developer/hermes-openui-source}"
python3 "$ROOT/source/apply_patch.py" "$SRC" --restore
echo 'Run the pinned pnpm install again in the checkout if you plan to build stock Hermes there.'
