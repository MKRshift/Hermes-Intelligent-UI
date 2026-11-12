# Native Hermes Desktop plugin

Install with [Install_Native_Hermes_UI.command](../Install_Native_Hermes_UI.command), then use the **Intelligent UI** control in your existing Hermes composer. If necessary, open the Command Palette and choose **Reload desktop plugins**. Off keeps normal chat; Auto and Visual add instructions for native widgets.

The previous composer-only plugin asked for OpenUI Lang code. Official Hermes renders the supported transcript directive, not arbitrary OpenUI source, so the code appeared as text. The native plugin keeps the v0.6.0 widget library and asks the model to send a short `::intui` directive. Recipe cards use ordinary Hermes controls for serving counts, ingredient amounts, and checklists; their data cannot execute model-written code.

The instructions are appended as attached context using Hermes's existing transcript convention. Some Hermes builds may show that context in the live user bubble or title before the conversation is reopened. The model still decides what to write: plain text stays plain text, and invalid directives can fall back to source or an error. Previously saved raw replies are not rewritten. The plugin does not add the full OpenUI Lang runtime to the official app.

Run the local regression check with Node 22+:

```sh
node --experimental-vm-modules tests/test_native_plugin.mjs
```

Optionally pass the path to the installed Hermes checkout's `apps/desktop/src/lib/transcript-directives.ts` to validate the example against its actual parser.

Verified on 12 November 2026 in the installed Hermes Desktop v0.23.1 with its existing local Hermes Brain model. In a new chat, the prompt `create a cake recipie` in Visual mode produced a **Simple Vanilla Cake** card. Increasing servings from 8 to 9 changed flour from 250 g to 281.25 g. The local regression check also verifies checking and resetting items.
