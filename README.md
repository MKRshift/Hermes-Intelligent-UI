# Hermes Intelligent UI

Interactive answers inside the Hermes Desktop app you already use. Visual mode runs the original Thesys OpenUI renderer with native chat controls, charts, tables, and galleries. Auto mode keeps the existing Hermes widget catalog.

## Use your installed Hermes app

1. Run [Install_Native_Hermes_UI.command](Install_Native_Hermes_UI.command). For the native publishing tool, run `./Install_Native_Hermes_UI.command --agent-profile PROFILE` with the profile you use in Hermes.
2. Choose **Intelligent UI · Visual** in the composer and start a new chat. If the button is missing, open the Command Palette and choose **Reload desktop plugins**.
3. Try “Make a coffee order estimate with a quantity slider and live total.” **Widget examples** still opens the original 23 widgets without sending a message.

The installed Hermes app handles the chat and transcript. The plugin renders a model-generated OpenUI program inline; it does not require a separate app or a Hermes source build. Existing replies saved as bare source still display as originally written.

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

## Source experiment limits

- The original Thesys image search and street routing services are not available. Map tiles and direct image URLs depend on network access.
- The Hermes model endpoint does not use Thesys Gateway's stream correction, so a model can still produce invalid OpenUI.
- Widget edits survive streaming, chat switches and renderer reloads in the same window once Hermes has saved the message. Values are not carried across app launches.
- v0.6 `::intui` directives are not converted. Assistant replies use fenced `openui` blocks.

First-party contributions use MIT; upstream notices remain intact.
