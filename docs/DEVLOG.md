# v0.7.0 — Source integration pivot (2026-11-12)

Problem: v0.1–0.6 could not deliver full OpenUI fidelity because they used native Hermes ::intui directives with a 2048-byte parser limit and a custom replacement component vocabulary.

Change: Installed original component library from the user-provided Thesys repository plus official OpenUI React renderer interface at Hermes transcript's fenced-code boundary. Composer plugin now requests fenced OpenUI Lang instead of old directives.

Offline verification: three Python source-patch tests passed (successful install, idempotence, restore, unsupported-version refusal, invalid source refusal); macOS shell scripts pass bash -n; plugin passes node --check; package integrity verified.

Not validated: Electron/Vite compilation with actual npm packages, Hermes live chat behavior, hosted image search and street routing, Thesys Gateway autofix.

Follow-up tasks: (1) compile against Hermes source on macOS; (2) fix TypeScript incompatibilities, if any; (3) map Hermes media/search and route APIs to OpenUI; (4) request-model prompt injection via system instructions; (5) end-to-end interactive component tests; (6) disable rendering in user messages at source.
