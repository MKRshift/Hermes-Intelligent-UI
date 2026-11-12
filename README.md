# Hermes Intelligent UI

Experimental inline interactive UI for Hermes Desktop. Source baseline: v0.7.0.

- [Architecture audit and roadmap](docs/NEXT-ARCHITECTURE.md)
- [Validation and current limits](docs/VALIDATION.md)
- [Source provenance](docs/SOURCE-RECORD.json)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Development planning is on `work/codex`; the supplied baseline is preserved in Git history. This is not a verified release or a claim of parity with either reference project. First-party contributions use MIT; upstream notices remain intact.

---

# Hermes × Thesys Open Intelligent UI — v0.7.0 source integration

**This is a different architecture from v0.1–0.6.** v0.6 used a custom partial renderer. v0.7 embeds the real `@openuidev/react-lang` runtime and copies the original Thesys component definitions into a Hermes Desktop **source checkout**, then handles fenced `openui` blocks in the normal transcript. The composer toggle remains a Hermes Desktop plugin. The user-supplied source was taken from `Archive(4).zip`, open-intelligent-ui-main.

## What is integrated
- Actual OpenUI Lang renderer and streaming parser via official `@openuidev/react-lang`.
- Original component library implementations: layouts, chart, SVG, forms, map, media, HtmlView, timer, functions, and events.
- Hermes' existing assistant transcript and composer; no second chat window.
- Reactive $variable state, OpenUI actions mapped to a draft (not auto-sent), custom clipboard action.
- Demo read-only tool provider from the reference project. Model-defined mutations are intentionally not exposed.

## Prerequisites
- macOS with Xcode Command Line Tools, Git, Node 26+ and pnpm available.
- Internet access to clone Hermes and install official npm packages.
- A **source-built** Hermes Desktop. The official signed/installed release cannot be safely modified by a desktop plugin.
- OpenUI references from the archive are redistributed under their upstream MIT license; see `vendor/LICENSE-THESYS.txt`.

## Installation

Double-click `Install_Source_Integration.command`. It prompts for the Hermes Agent source checkout; if absent, it offers to clone the official repo in `~/Developer/hermes-openui-source`. It backs up both modified source files, adds the original library in a namespaced folder, updates dependencies, and runs `pnpm install`. It does **not** silently modify the running signed Hermes application.

The modified source is built separately via `Run_Hermes_OpenUI.command`. In the modified Desktop app, enable `OpenUI · Thesys renderer` under Capabilities → Plugins, select **Visual**, and ask for a generated UI. The source integration must be running; installing only the composer plugin will show raw code.

## Important limitations (not 100% parity yet)
1. This package does not rebuild/test Hermes Desktop on macOS here. npm dependencies were unavailable in the test container. Live rendering and cross-version TypeScript compatibility remain unverified.
2. The original Thesys Next.js image search and street-route API endpoints have not been transplanted into Hermes. Direct image URLs, maps with coordinates, and fallback straight-line routes work subject to network access; external image search and street routing need a backend.
3. The original Thesys Gateway auto-corrects invalid OpenUI code as it streams. Hermes' model endpoint is not automatically connected to that Gateway, so some generated programs may fail parsing.
4. State persistence is implemented for completed code strings, but streaming edits may reset local state. No automatic filesystem, account, or arbitrary network actions are exposed.
5. `::intui` v0.6 directives do not automatically convert to OpenUI Lang. Use fenced `openui` blocks.

To reach hosted-project parity, we must still implement image/route services, Gateway-level validation/correction, reliable model prompt injection and end-to-end macOS tests. The installation is a SOURCE patch — not an ordinary plugin-only installer.

## Files
- `source/apply_patch.py` — checks anchors, saves backups, copies the original implementation, patches Hermes's real Markdown transcript component, adds dependencies.
- `bridge/openui-bridge.tsx` — React integration and safe composer action handling.
- `vendor/thesys-lib/` — the real Thesys library source supplied in the reference ZIP.
- `vendor/thesys-openui-system-prompt.txt` — upstream-generated component prompt.
- `extension/plugin.js` — composer toggle and OpenUI language instructions, not the renderer itself.
- `tests/test_patch.py` — offline source patch regression tests; no false claims of live success.
