#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-}"
if [[ -z "$SRC" && -f "$ROOT/.last-checkout-path" ]]; then SRC="$(cat "$ROOT/.last-checkout-path")"; fi
SRC="${SRC:-$HOME/Developer/hermes-openui-source}"
export PATH="/opt/homebrew/bin:$HOME/.local/share/pnpm:$PATH"
if [[ ! -f "$SRC/apps/desktop/src/components/assistant-ui/openui-bridge.tsx" ]]; then echo 'OpenUI source integration not installed. Run Install_Source_Integration.command.' >&2; exit 1; fi
cd "$SRC/apps/desktop"
echo "Building/running SOURCE Hermes Desktop with real OpenUI renderer from $SRC"
echo 'Use this modified Desktop session, not the already installed Hermes.app.'
pnpm run dev
