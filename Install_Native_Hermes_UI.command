#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
AGENT_PROFILE=""
if [[ "${1:-}" == "--agent-profile" ]]; then
  AGENT_PROFILE="${2:?Usage: Install_Native_Hermes_UI.command --agent-profile PROFILE [HERMES_DATA]}"
  [[ "$AGENT_PROFILE" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || { echo 'Invalid Hermes profile name.' >&2; exit 1; }
  shift 2
fi
HERMES_DATA="${1:-${HERMES_HOME:-$HOME/.hermes}}"
if [[ -n "$AGENT_PROFILE" ]]; then
  PROFILE_DATA="$HERMES_DATA"
  if [[ "$AGENT_PROFILE" != "default" ]]; then PROFILE_DATA="$HERMES_DATA/profiles/$AGENT_PROFILE"; fi
  [[ -d "$PROFILE_DATA" ]] || { echo "Hermes profile does not exist: $PROFILE_DATA" >&2; exit 1; }
  AGENT_DEST="$PROFILE_DATA/plugins/hermes-intelligent-ui"
  # Hermes refreshes hooks when the package is enabled. Re-enable only this
  # plugin when its installed agent code changes; keep other chats running.
  if [[ -f "$AGENT_DEST/plugin.yaml" ]] &&
      { ! cmp -s "$ROOT/official/agent/plugin.yaml" "$AGENT_DEST/plugin.yaml" ||
        ! cmp -s "$ROOT/official/agent/__init__.py" "$AGENT_DEST/__init__.py"; }; then
    HERMES_HOME="$HERMES_DATA" hermes -p "$AGENT_PROFILE" plugins disable hermes-intelligent-ui
  fi
  mkdir -p "$AGENT_DEST"
  for file in plugin.yaml __init__.py; do
    if [[ ! -f "$AGENT_DEST/$file" ]] || ! cmp -s "$ROOT/official/agent/$file" "$AGENT_DEST/$file"; then
      TEMP_AGENT="$(mktemp "$AGENT_DEST/.agent-install.XXXXXX")"
      install -m 644 "$ROOT/official/agent/$file" "$TEMP_AGENT"
      mv -f "$TEMP_AGENT" "$AGENT_DEST/$file"
    fi
  done
  HERMES_HOME="$HERMES_DATA" hermes -p "$AGENT_PROFILE" plugins enable hermes-intelligent-ui
fi
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
