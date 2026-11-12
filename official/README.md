# Native Hermes Desktop plugin

Install with [Install_Native_Hermes_UI.command](../Install_Native_Hermes_UI.command), then use the **Intelligent UI** control in your existing Hermes composer. If necessary, open the Command Palette and choose **Reload desktop plugins**. Off keeps normal chat; Auto and Visual add instructions for native widgets.

The previous composer-only plugin asked for OpenUI Lang code. Official Hermes renders the supported transcript directive, not arbitrary OpenUI source, so the code appeared as text. The native plugin keeps all 22 v0.6.0 widget kinds and adds recipes. The composer supplies examples for the requested features so the model can emit the matching `::intui` directives. Recipe cards use ordinary Hermes controls for serving counts, ingredient amounts, and checklists; their data cannot execute model-written code.

The instructions are appended as attached context using Hermes's existing transcript convention. Some Hermes builds may show that context in the live user bubble or title before the conversation is reopened. The model still decides what to write: plain text stays plain text, and invalid directives can fall back to source or an error. Previously saved raw replies are not rewritten. The plugin does not add the full OpenUI Lang runtime to the official app.

The full native catalog covers:

- Charts and data: bars, line, donut, scatter, sparkline, gauge, progress, metrics, key/value pairs, and filterable tables.
- Explanations: cards, steps, timelines, diagrams, accordions, and notices.
- Interactive tools: calculators, weighted comparisons, checklists, tabs, options, and recipes.
- [Composed layouts](TREE_FORMAT.md): shared inputs, calculated values, conditional sections, nested tabs, validated forms, draft actions, and opt-in saved inputs.

The [static OpenUI converter](OPENUI_COMPAT.md) is also available. It translates the supported literal subset into native widgets.

## Try it

- **Chart:** “Plot weekly totals 8, 12, and 10 in a native line chart.”
- **Comparison:** “Build an adjustable comparison matrix for two options. A has cost score 8 and quality score 6; B has cost score 6 and quality score 9. Start with weights 2 and 3.”
- **Reactive layout:** “Make a native quote with quantity and material controls, a live total, and a breakdown tab. Use 12 NOK per PLA part and 20 NOK per PETG part.”
- **Form:** “Create a native project form with a required project name and deadline, optional notes, and a button to prepare a draft.”
- **Recipe:** “Make a vanilla cake recipe with adjustable servings and a checklist.”

## Development

Develop with Node 22+. Edit the modules under `src/` (composer catalog, widget families, layout rendering, layout state, and shared helpers). The build writes the single `plugin.js` that Hermes loads; the installer uses this bundled file and requires no developer dependencies.

```sh
npm --prefix official ci
npm --prefix official run build
npm --prefix official test
```

To verify all catalog examples against Hermes's parser, run `node --experimental-vm-modules tests/test_native_plugin.mjs /path/to/transcript-directives.ts` using the parser under `apps/desktop/src/lib/` in the Hermes checkout.

Verified on 12 November 2026 in the installed Hermes Desktop v0.23.1 with its existing local Hermes Brain model. In a new chat, the prompt `create a cake recipie` in Visual mode produced a **Simple Vanilla Cake** card. Increasing servings from 8 to 9 changed flour from 250 g to 281.25 g. The local regression check also verifies checking and resetting items.

The expanded catalog passed parser and rendering checks for all 23 kinds, plus the recovered v0.6.0 tests for linked state, forms, saved inputs, and the converter. An existing recipe still rendered in Hermes after installing the modular build. Fresh line-chart and mixed-widget prompts were attempted in the installed app, but the local Ollama runner logged a GPU error and returned empty streams; live generation of those prompts was not verified.
