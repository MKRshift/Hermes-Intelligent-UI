# Hermes Intelligent UI

Interactive answers inside the Hermes Desktop app you already use. The native plugin renders recipe cards, charts, tables, calculators and other inline controls.

## Use your installed Hermes app

1. Run [Install_Native_Hermes_UI.command](Install_Native_Hermes_UI.command). The installer saves a copy of the previous plugin.
2. In Hermes, open the Command Palette and choose **Reload desktop plugins** if the composer still shows **OpenUI** instead of **Intelligent UI**.
3. Select **Auto** or **Visual** beside the composer. Try **create a cake recipe**. The inline card lets you change servings and check off ingredients and steps.

This route uses Hermes’s native `::intui` widgets. A reply already saved as raw OpenUI Lang source will stay as written; send a fresh prompt with the native plugin active. No separate app or source build is needed.

- [Native plugin validation and troubleshooting](official/README.md)
- [Architecture roadmap](docs/NEXT-ARCHITECTURE.md)
- [Source provenance](docs/SOURCE-RECORD.json) and [third-party notices](THIRD_PARTY_NOTICES.md)

## Optional developer source experiment

You need Git, Python 3, Node 26 or newer, Corepack and Xcode Command Line Tools. Run these commands from this repository in Terminal:

```sh
./Install_Source_Integration.command
./Run_Hermes_OpenUI.command
```

The installer fetches a dedicated Hermes checkout at the [pinned revision](source/hermes-revision.txt), applies the source overlay and installs its locked dependencies. An optional path argument selects another checkout at that revision. To update an existing overlay, run the restore command before installing the new version. The launcher provisions a separate development profile under `~/Library/Application Support/Hermes OpenUI`. First launch may download the Hermes backend and tools; configure a provider in that profile to generate replies.

Enable **OpenUI · Thesys renderer** under Capabilities → Plugins, choose **Visual** in the composer and try the [sample](examples/sample-openui.md). The composer extension supplies instructions; the source build renders the answer. The installed Hermes app is separate from this build.

Run `./Restore_Hermes_Source.command` to remove the overlay from the source checkout. Restore reverses the Hermes source and dependency changes and refuses to overwrite conflicting edits.

## Current limits

- The original Thesys image search and street routing services are not available. Map tiles and direct image URLs depend on network access.
- The Hermes model endpoint does not use Thesys Gateway's stream correction, so a model can still produce invalid OpenUI.
- Widget edits survive streaming, chat switches and renderer reloads in the same window once Hermes has saved the message. Values are not carried across app launches.
- v0.6 `::intui` directives are not converted. Assistant replies use fenced `openui` blocks.

First-party contributions use MIT; upstream notices remain intact.
