#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CHECKOUT="${1:-$HOME/Developer/hermes-openui-source}"
REVISION="$(cat "$ROOT/source/hermes-revision.txt")"

if [[ "$(uname -s)" != Darwin ]]; then echo 'This launcher supports macOS.' >&2; exit 1; fi
for dep in git python3 node corepack; do
  command -v "$dep" >/dev/null || { echo "Missing prerequisite: $dep" >&2; exit 1; }
done
if (( $(node -p 'process.versions.node.split(".")[0]') < 26 )); then
  echo 'Use Node 26 or newer for the pinned Hermes checkout.' >&2
  exit 1
fi
if [[ ! -e "$CHECKOUT" ]]; then
  mkdir -p "$CHECKOUT"
  git -C "$CHECKOUT" init -q
  git -C "$CHECKOUT" remote add origin https://github.com/NousResearch/hermes-agent.git
  git -C "$CHECKOUT" fetch --depth 1 origin "$REVISION"
  git -C "$CHECKOUT" checkout --detach FETCH_HEAD
fi
CHECKOUT="$(cd "$CHECKOUT" && pwd -P)"

ALREADY_INSTALLED=false
if [[ -e "$CHECKOUT/.hermes-openui-install" ]]; then ALREADY_INSTALLED=true; fi
python3 "$ROOT/source/apply_patch.py" "$CHECKOUT"

if ! (
  cd "$CHECKOUT"
  PNPM="$(node -p 'require("./pm/lock.json").packages.pnpm.version')"
  corepack "pnpm@$PNPM" install --frozen-lockfile --trust-lockfile
); then
  if ! $ALREADY_INSTALLED; then python3 "$ROOT/source/apply_patch.py" "$CHECKOUT" --restore; fi
  echo 'Dependency installation failed. See the error above.' >&2
  exit 1
fi

printf '%s\n' "$CHECKOUT" > "$ROOT/.last-checkout-path"
echo "Source integration ready at $CHECKOUT"
echo 'Use Run_Hermes_OpenUI.command to start the separate development app.'
