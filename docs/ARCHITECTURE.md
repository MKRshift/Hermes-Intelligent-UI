# Architecture and reality check

Prior versions created custom widgets and used a compact Hermes transcript directive with a 2,048-character cap. Even with 25 types they could not replicate the original OpenUI AST, functions, actions, or media.

The only practical direct solution is to render full OpenUI Lang at the Hermes Markdown content boundary. Hermes `apps/desktop/src/components/assistant-ui/markdown-text.tsx` already owns fenced code rendering via `SyntaxHighlighter` and `@assistant-ui/react`. The source patch intercepts ONLY `openui` language fences and passes the original source to `<Renderer library={library} response={...} isStreaming={...} />`. This uses the real OpenUI runtime and actual user-supplied Thesys library.

A companion plugin injects language instructions and a composer toggle, but does not import third-party React dependencies. Hermes runtime plugins allow imports only from `react`, `react/jsx-runtime` and the official SDK, which is why v0.6 could not directly use the original runtime.

## Trust and functionality
- Only the normal assistant transcript opts into OpenUI. Scratchpads, foreign previews and transcript surfaces that disable artifacts leave fences as code.
- Thesys HtmlView remains inside a sandboxed iframe with CSP. Components and tool providers are trusted code; the model generates declarative OpenUI Lang.
- External image search and routing APIs from the Next.js app are absent. Their hooks will gracefully fall back, but are not integrated.
- Real `@ToAssistant` inserts draft text to the originating session; it does not send automatically.
- The [validation record](VALIDATION.md) describes what was tested on macOS.
