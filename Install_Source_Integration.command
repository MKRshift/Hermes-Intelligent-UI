#!/bin/bash
set -euo pipefail
printf '\n  ◈ Hermes × Actual Thesys OpenUI v0.7.0\n  SOURCE-LEVEL integration — not a simple disk plugin\n\n'
if [[ "$(uname -s)" != 'Darwin' ]]; then echo 'This automatic installer is for macOS.' >&2; exit 1; fi
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEFAULT="$HOME/Developer/hermes-openui-source"
CHECKOUT="${1:-$DEFAULT}"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
export PATH="/opt/homebrew/bin:$HOME/.local/share/pnpm:$PATH"
for dep in git python3 node pnpm; do
 if ! command -v "$dep" >/dev/null 2>&1; then
   echo "Missing prerequisite: $dep. See README. Your current Hermes installation is unchanged." >&2
   exit 1
 fi
done
MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if ((MAJOR < 26)); then echo "Node 26+ required by current Hermes Desktop source (found Node $MAJOR). Nothing modified." >&2; exit 1; fi
if [[ ! -e "$CHECKOUT" ]]; then
  echo "Cloning Hermes into separate development checkout: $CHECKOUT"
  mkdir -p "$(dirname "$CHECKOUT")"
  git clone --depth 1 https://github.com/NousResearch/hermes-agent.git "$CHECKOUT"
fi
if [[ ! -f "$CHECKOUT/apps/desktop/src/components/assistant-ui/markdown-text.tsx" ]]; then
  echo "Not a Hermes Desktop source checkout: $CHECKOUT" >&2; exit 1
fi
python3 "$ROOT/source/apply_patch.py" "$CHECKOUT"
mkdir -p "$HERMES_HOME/desktop-plugins/hermes-intelligent-ui"
DEST="$HERMES_HOME/desktop-plugins/hermes-intelligent-ui/plugin.js"
if [[ -f "$DEST" ]]; then
  cp -p "$DEST" "$DEST.backup-before-openui-$(date +%Y%m%d%H%M%S)"
fi
cp "$ROOT/extension/plugin.js" "$DEST"
echo "Installed composer control: $DEST"
echo "Resolving official OpenUI/Hermes dependencies (requires internet)..."
(cd "$CHECKOUT" && pnpm install --no-frozen-lockfile)
cat > "$ROOT/.last-checkout-path" <<< "$CHECKOUT"
echo ""
echo "Source integration added to: $CHECKOUT"
echo "IMPORTANT: Your currently installed Hermes Desktop app remains unchanged."
echo "Open Run_Hermes_OpenUI.command to BUILD AND LAUNCH the modified source app."
echo "If only the composer toggle appears, you are still running unmodified Hermes."
if [[ -t 0 ]]; then read -r -p 'Press Return to close...' _ || true; fi
