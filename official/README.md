# Native Hermes Desktop plugin

Run the [installer](../Install_Native_Hermes_UI.command) and choose **Intelligent UI · Visual** in your installed Hermes composer. For the most reliable generation, install the publishing tool into the profile you use:

```sh
./Install_Native_Hermes_UI.command --agent-profile ollama
```

Replace `ollama` with the profile name if needed. Start a new chat after enabling the tool. If the composer does not show Intelligent UI, choose **Reload desktop plugins** from the command palette.

- **Off** uses regular Hermes chat.
- **Auto** uses the original `::intui` catalog, including all 23 widget kinds, [reactive layouts](TREE_FORMAT.md), and saved forms.
- **Visual** runs the OpenUI Lang renderer and the original Thesys layouts, controls, tables, charts, SVG, and image components. The model writes a fresh program for each request. Answers are centered in the chat; dense tables and galleries can widen, and grids reflow in narrow panes. Controls share state, and a follow-up button can prepare a draft in the originating chat. **Widget examples** remains available in every mode.

Try “Make a workshop quote for 4 boards at 85 NOK each with a quantity slider, a live total, and a cost breakdown.” Or ask for an adjustable recipe, a dashboard with filters, or a photo gallery.

Visual mode uses Hermes's transcript SDK. The composer gives the model the component syntax and the profile's `openui_show` tool publishes the program to the current turn. A short directive mounts the renderer, and the saved assistant message keeps the full data-only program for replay. When the model emits the transport directly, the renderer can use its streamed data; the publishing tool delivers its completed program with the final reply. No app binary or Hermes source tree is modified.

This integration supports direct HTTPS photos. The Thesys demo's image search and map services, custom HTML, and embedded video are outside the native OpenUI library. Invalid programs may still need regeneration, and old bare source replies are unchanged. OpenUI control state is kept in the current app window.

## Development

Use Node 22 or later. The build bundles the modules in `src/` and the OpenUI renderer into `plugin.js`; the desktop install does not require a build environment. Agent code is under `agent/`.

```sh
npm --prefix official ci
npm --prefix official run build
npm --prefix official test
python3 -m unittest discover -s tests -v
./Install_Native_Hermes_UI.command --agent-profile ollama
```

Tests cover legacy widgets, long and streamed OpenUI programs, rendering with the actual OpenUI engine, and restoring cards from saved assistant messages. To check the old catalog with Hermes's actual parser, pass its `apps/desktop/src/lib/transcript-directives.ts` to `tests/test_native_plugin.mjs` with Node's `--experimental-vm-modules` flag. The [static converter](OPENUI_COMPAT.md) is still available for literal legacy imports.
