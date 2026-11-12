#!/bin/bash
# Convert a static OpenUI Lang 1.0 file to Hermes native syntax. Never executes OpenUI code.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
printf '\n  ◈  OpenUI -> Hermes static converter\n\n'
if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js 18+ is needed for conversion (not for the Hermes extension).\n' >&2
  exit 1
fi
if [[ $# -gt 0 ]]; then
  SRC="$1"
elif [[ "$(uname -s)" == 'Darwin' ]]; then
  SRC="$(osascript -e 'POSIX path of (choose file with prompt "Select a static OpenUI Lang .oui or .txt file")' 2>/dev/null)" || exit 0
else
  printf 'Pass a file path: bash Convert_OpenUI.command /path/to/layout.oui\n' >&2
  exit 1
fi
if [[ ! -f "$SRC" ]]; then
  printf 'Not a file: %s\n' "$SRC" >&2
  exit 1
fi
BASE="${SRC%.*}"
[[ "$BASE" == "$SRC" ]] && BASE="$SRC"
DEST="$BASE.hermes-intui.txt"
if [[ -e "$DEST" ]]; then DEST="$BASE.$(date +%Y%m%d-%H%M%S)-$$.hermes-intui.txt"; fi
node "$ROOT/official/tools/convert-openui.mjs" "$SRC" > "$DEST" || { rm -f "$DEST";exit 1; }
printf '\nConverted file: %s\n' "$DEST"
printf 'The resulting directive must appear in an assistant reply for Hermes to render it.\n'
printf 'This converter only accepts a safe, static OpenUI subset; it does not execute @functions or actions.\n'
if [[ "$(uname -s)" == 'Darwin' ]]; then open -R "$DEST" 2>/dev/null || true; fi
if [[ -t 0 ]]; then read -r -p 'Press Return to close...' _ || true; fi
