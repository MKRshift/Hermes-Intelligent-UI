#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="${1:-}"
if [[ -z "$SRC" && -f "$ROOT/.last-checkout-path" ]]; then SRC="$(cat "$ROOT/.last-checkout-path")"; fi
SRC="${SRC:-$HOME/Developer/hermes-openui-source}"
python3 "$ROOT/source/apply_patch.py" "$SRC" --verify

PROFILE="${HERMES_OPENUI_PROFILE_ROOT:-$HOME/Library/Application Support/Hermes OpenUI}"
export HERMES_HOME="$PROFILE/hermes-home"
export HERMES_RUNTIME_DIR="$PROFILE/tools"
export HERMES_DESKTOP_USER_DATA_DIR="$PROFILE/electron"
export HERMES_DESKTOP_APP_NAME="Hermes OpenUI"
export HERMES_DESKTOP_ISOLATED_BACKEND=1
export HERMES_DESKTOP_IGNORE_EXISTING=1
export HERMES_DESKTOP_SKIP_PROTOCOL_REGISTRATION=1
PLUGIN="$HERMES_HOME/desktop-plugins/hermes-intelligent-ui/plugin.js"
mkdir -p "$(dirname "$PLUGIN")" "$HERMES_DESKTOP_USER_DATA_DIR"
if [[ ! -e "$PLUGIN" ]]; then cp "$ROOT/extension/plugin.js" "$PLUGIN"; fi
if ! cmp -s "$ROOT/extension/plugin.js" "$PLUGIN"; then
  echo "The OpenUI profile has a different composer plugin: $PLUGIN" >&2
  exit 1
fi

cd "$SRC"
export HERMES_DESKTOP_HERMES_ROOT="$(pwd -P)"
cd apps/desktop
exec bash ../../scripts/run-in-hermes-env bash -c '
  export HERMES_DESKTOP_PYTHON="${__HERMES_TEST_PYTHON:?Hermes did not provision its development interpreter}"
  exec pnpm run dev
'
