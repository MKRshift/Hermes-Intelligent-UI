# Hermes Intelligent UI

Experimental interactive answers inside Hermes Desktop, using the real OpenUI Lang runtime and Thesys component library. The original v0.7.0 archive is preserved on `main`; this development branch adds a reproducible source build.

- [Architecture roadmap](docs/NEXT-ARCHITECTURE.md)
- [Build checks and known limits](docs/VALIDATION.md)
- [Source provenance](docs/SOURCE-RECORD.json) and [third-party notices](THIRD_PARTY_NOTICES.md)

## Try the source build on macOS

You need Git, Python 3, Node 26 or newer, Corepack and Xcode Command Line Tools. Run these commands from this repository in Terminal:

```sh
./Install_Source_Integration.command
./Run_Hermes_OpenUI.command
```

The installer fetches a dedicated Hermes checkout at the [pinned revision](source/hermes-revision.txt), applies the source overlay and installs its locked dependencies. An optional path argument selects another checkout at that revision. The launcher provisions a separate development profile under `~/Library/Application Support/Hermes OpenUI`. First launch may download the Hermes backend and tools; configure a provider in that profile to generate replies.

Enable **OpenUI · Thesys renderer** under Capabilities → Plugins, choose **Visual** in the composer and try the [sample](examples/sample-openui.md). The composer extension supplies instructions; the source build renders the answer. The installed Hermes app is separate from this build.

Run `./Restore_Hermes_Source.command` to remove the overlay from the source checkout. Restore reverses the Hermes source and dependency changes and refuses to overwrite conflicting edits.

## Current limits

- The original Thesys image search and street routing services are not available. Map tiles and direct image URLs depend on network access.
- The Hermes model endpoint does not use Thesys Gateway's stream correction, so a model can still produce invalid OpenUI.
- Control persistence is keyed to source text. A changing stream or two identical blocks can still cause incorrect state reuse.
- v0.6 `::intui` directives are not converted. Assistant replies use fenced `openui` blocks.

First-party contributions use MIT; upstream notices remain intact.
