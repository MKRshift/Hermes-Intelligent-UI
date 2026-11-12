# OpenUI Lang 1.0 -> Hermes native converter (v0.6.0)

## Purpose

Use `Convert_OpenUI.command` (macOS) or `node official/tools/convert-openui.mjs input.oui` to convert a **static subset** of Thesys OpenUI Lang 1.0 to Hermes' compact `::intui` language. This is a development and migration tool. It does not run the original OpenUI component library.

The Thesys source supplied in `Archive(4).zip` defines a program such as `root = Col([Title("Hello"), Text("Details")])`. The converter resolves the named `root` assignment and static component references, then produces the Hermes native equivalent.

## Accepted subset

- The entry assignment must be named `root`.
- Assignments can reference other named assignments, for example `root = Col([head, details])` and `head = Title("Overview")`.
- Literals: quoted strings, finite numbers, booleans, `null`, arrays and static object records. No expressions, operators, `@functions`, actions or code execution.
- Layout components: `Col`, `Row`, `Grid`, `Card`, `Box`, `Carousel`, `Section`, `Stack`, `List`, `Form` (literal child arrays).
- Static text/components: `Title`, `Text`, `Caption`, `Label`, `Badge`, `Quote`, `Markdown`, `Code`, `ListItem`, `Divider`, `Spacer`, `Link`.
- `Table([headers], [rows])` with literal arrays.
- `Chart("bar|line|area|donut|pie", [{label:"A",value:10}], "label", ["value"])` with literal arrays of records; `area` falls back to a native line chart. Only the **first** series is supported.
- Upstream colors, rich text styling, event handlers, layouts with function-computed data, media and custom CSS are not reproduced.

## Rejected constructs

`@Set`, `@Each`, `@CopyToClipboard`, `Query(...)`, `SearchImage(...)`, `HtmlView(...)`, `Button(...)` / custom actions, inline formulas, mutable `$variables`, charts with multiple data series, charts built from a live data source, unsupported components and invalid or recursive references. The tool exits non-zero with a readable error. It does not silently convert unsafe actions into working controls.

## How to use

1. Install the Hermes extension with `Install_Native_Hermes_UI.command`.
2. Open `Convert_OpenUI.command`, select a static `.oui` or `.txt` source. Node.js 18+ is required **only for conversion**, not to run the installed plugin.
3. The converter writes `filename.hermes-intui.txt` containing a single, validated-size `::intui` paragraph.
4. For testing, ask the Hermes model to repeat the directive in its assistant reply, without code fences. The Hermes transcript recognizes only **assistant** directives.
5. For regular conversations, use **Visual** mode in Hermes' ordinary chat composer; it asks the model to produce native Hermes components directly.

## Limits and trust boundaries

The native Hermes directive body cannot exceed 2,048 characters, and its tree is limited to 1,800 characters, 32 nodes and five levels. The converter enforces these bounds. The parser is a data-only lexer/recursive-descent parser, not `eval` or a JavaScript interpreter. Conversion never contacts a server. It cannot import a Thesys program larger than 24,000 characters.

Model-provided values and source labels are still unverified, even when a component is displayed as a UI. Conversion does not establish data authenticity. This package is unaffiliated with Thesys or Hermes upstream.
