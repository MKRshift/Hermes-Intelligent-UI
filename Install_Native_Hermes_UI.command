#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HERMES_DATA="${1:-${HERMES_HOME:-$HOME/.hermes}}"
DEST="$HERMES_DATA/desktop-plugins/hermes-intelligent-ui"
TARGET="$DEST/plugin.js"

if command -v node >/dev/null 2>&1; then
  node --input-type=module --check < "$ROOT/official/plugin.js"
fi
mkdir -p "$DEST"
if [[ -e "$TARGET" ]] && cmp -s "$TARGET" "$ROOT/official/plugin.js"; then
  echo 'The native Hermes plugin is already installed.'
  exit 0
fi
if [[ -e "$TARGET" ]]; then
  BACKUP="$(mktemp "$DEST/plugin.js.backup-native.XXXXXX")"
  cp -p "$TARGET" "$BACKUP"
  echo "Previous plugin saved to $BACKUP"
fi
TEMP="$(mktemp "$DEST/.plugin.js.install.XXXXXX")"
trap 'rm -f "$TEMP"' EXIT
install -m 644 "$ROOT/official/plugin.js" "$TEMP"
mv -f "$TEMP" "$TARGET"
echo 'Installed the native plugin. In Hermes, use Command Palette → Reload desktop plugins.'
