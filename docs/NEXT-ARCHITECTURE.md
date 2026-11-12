# Hermes Intelligent UI: next architecture

Planning audit, 12 November 2026. Findings below describe the original v0.7.0 archive. See [validation](VALIDATION.md) for progress on the pinned source build and widget state.

## Decision

Keep Hermes as the chat and agent host. Build on v0.7.0's genuine OpenUI renderer for interactive components. Borrow CopilotKit's separation of plain text, structured UI and sandboxed custom experiences. Do not embed either project's second chat application or require its agent stack.

The supplied v0.6 summary is historical context; that archive was not audited in this pass. v0.7.0 already removes the old directive-body bottleneck by rendering fenced OpenUI programs. A document store remains useful for identity, revisions and persistence, but it is no longer a prerequisite for rendering larger programs.

## What each reference contributes

| Reference | Relevant approach | Hermes adaptation |
| --- | --- | --- |
| Thesys | OpenUI language, component/function library, reactive controls and streamed parsing | Retain the real runtime and library; generate prompts from the same component spec |
| CopilotKit | Agent chooses text, native UI or generated HTML; isolated custom runtime with a validated follow-up bridge | Adopt presentation routing and explicit sandbox capabilities; keep Hermes's agent/session lifecycle |
| Hermes | Existing transcript and composer integration | Small versioned host adapter, with a plugin-only route only if the required public SDK hook is verified |

References inspected: [Thesys](https://github.com/thesysdev/open-intelligent-ui), [CopilotKit architecture](https://github.com/CopilotKit/OpenIntelligentUI/blob/8391a94c1c3939c679e40ddd7bfc08a9ef690e70/docs/architecture.md), [Hermes transcript](https://github.com/NousResearch/hermes-agent/blob/e3bf4be5df04cf72dab4914b073361c71af1dbe1/apps/desktop/src/components/assistant-ui/markdown-text.tsx). Exact snapshot IDs are recorded in SOURCE-RECORD.json. The Thesys archive's original revision is unknown; do not label the current upstream HEAD as its provenance.

## Findings in v0.7.0

| Priority | Evidence | Consequence and next change |
| --- | --- | --- |
| P0 | `bridge/openui-bridge.tsx`: storage key hashes the entire source plus session; effect reloads initial state whenever key changes | Streaming changes identity. Identical blocks in one session share storage. Use stable session/message/block identity and separate program revisions. Test stream, reload and chat switching. |
| P0 | `source/apply_patch.py`: early return if text contains HermesOpenUI; floating dependency ranges; no lockfile backup | Partial installations can appear successful, and restore does not restore dependency resolution. Add explicit installation manifest, preflight, exact tested host/runtime versions and transactional lockfile handling. |
| P0 | Patch tests use a tiny synthetic transcript | Passing tests do not establish TypeScript or live host compatibility. Add pinned host build and actual transcript tests before release. |
| P1 | `extension/plugin.js`: mode instructions appended to draft text; full prompt advertises SearchImage | Generation is not backed by a verified agent capability contract. Derive prompt from available services; investigate supported agent-side injection. |
| P1 | `media.tsx` and `map/use-street-route.ts` call relative Next.js API routes | These services are absent in Hermes. Add typed host services with credentials held on the backend, timeouts, caching, attribution and explicit unavailable states. |
| P1 | Bridge uses demoTools selected by a name-prefix denylist | Demo rows are not live data, and naming is not authorization. Use explicit registered read-only capabilities and label demo fixtures. |
| P1 | HtmlView permits scripts from CDN origins and HTTPS images | Opaque iframe origin is useful but does not mean network-free execution. Review network policy, resource limits and every host message; do not expose agent tools directly to generated JS. |
| P1 | Bridge has no local error boundary and follows OS color scheme | One failed widget needs a readable local fallback. Theme should follow Hermes settings, including manual override. |

## Proposed flow

Hermes agent → presentation choice → UI document/event → host adapter → inline renderer.

The renderer selects plain Markdown, OpenUI components, or isolated HTML. Preserve existing fenced OpenUI messages as an import path. Keep legacy `::intui` support separate if the other version supplies it; it is not present here.

A proposed UI document contains schemaVersion, documentId, sessionId, messageId, blockId, revision, renderer, source, status and declared capabilities. Store control state separately with a state schema version. Treat document identifiers as references, never access tokens; every backend read/write checks the owning session.

Proposed stream events are document.created, source.append, document.completed, document.failed and state.updated, with document ID, revision and monotonic sequence. Ignore duplicates, reject stale revisions, bound source size and coalesce writes. Replay must not invoke actions. Keep the last valid preview while a chunk is incomplete; show a recoverable error after completion if parsing fails. Fenced text can remain the first transport until Hermes's structured event extension points are confirmed.

Actions have an explicit allowlist and typed payloads. Continue-conversation inserts a draft, as today. URL navigation and clipboard stay separate capabilities. Any future state-changing tool follows Hermes's normal user authorization path. Persist only user-approved form fields; sensitive values should not enter durable UI state by default.

## Delivery order and acceptance

1. **Reproducible host baseline.** Pin a Hermes revision and resolved runtime dependencies; complete typecheck/build and install/restore tests. Demonstrate one real chart and one form in the Hermes transcript. Preserve the original archive baseline for comparison.
2. **Stable state and streaming.** The pinned host now scopes each widget by chat, message and block. Edits stay in memory during streaming; settled widgets can restore a matching revision after a renderer reload in the same window. Invalid roots fall back to source and widgets follow the Hermes theme. Cancel/retry, multiple gateway profiles and persistence across app launches still need their own validation and design.
3. **Capability-aware generation.** Generate prompts from the library and available services; make Off/Auto/Visual behavior explicit. Off is ordinary chat; Auto may choose plain text; Visual prefers useful UI with an honest fallback. Verify missing services are not advertised as available.
4. **Images and maps.** Implement host image/routing adapters, source attribution and offline/error handling. Distinguish illustrative straight lines from actual route geometry. No service keys in renderer code or exported documents.
5. **Custom experiences.** Harden HtmlView before expanding to games/3D. Test blocked host access, forged messages, resize limits, broken scripts and excessive output. Add approved, pinned assets for reproducibility.
6. **Release evidence.** Run a small gallery of calculator, comparison, chart, form, map, image, SVG and HTML examples in light/dark and narrow/wide layouts. Publish compatibility versions, screenshots, known gaps and reproducible checks. Measure time to first useful UI and interaction latency without inventing a performance target before baseline measurement.

## Working alongside the other version

`main` preserves the supplied source baseline. `work/codex` contains the audit and pinned source build. Bring the other version onto a separate branch, compare the bridge, installer, prompts and service changes, then integrate compatible changes before changing the UI state format.
