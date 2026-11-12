# Nested Intelligent UI tree format (v0.4)

## Goal

Hermes transcript directives accept a single paragraph with `key="value"` attributes. They do not natively accept an OpenUI AST or multi-line component program. To compose several widgets within **one inline transcript element**, this extension accepts a limited and predictable tree grammar in the `tree` attribute.

The plugin only renders allowlisted nodes; it does not interpret user code, Markdown as JSX, scripts, styles or event-handler fields.

## Syntax

```text
::intui{kind="layout" title="Overview" tree="grid(cols=2)[metric(labels=Revenue;values=22K)~card[heading(text=Notes)~text(text=Important details)]]"}
```

```ebnf
Tree       := Node
Node       := Name ["(" Prop (";" Prop)* ")"] ["[" Node ("~" Node)* "]"]
Prop       := Name "=" Value
Name       := [a-z][a-z0-9]*
Value      := text excluding literal ';' and ')'
```

Only these containers accept bracketed children: `col`, `row`, `stack`, `grid`, `card`, `section`, `carousel`, `box`, `list`, `when`, `tabview`, `tab`, and `form`.

Primitives: `heading(text,size)`, `text(text)`, `caption(text)`, `badge(text)`, `divider`, `spacer`, `link(text,url)`, `action(text,prompt)`, plus reactive `input`, `select`, `toggle`, `derive`, `result` (v0.4).

Allowed widget leaf nodes: `metric`, `progress`, `bars`, `bar`, `line`, `table`, `cards`, `steps`, `checklist`, `tabs`, `options`, `notice`, `calc`, `calculator`, `donut`, `pie`, `timeline`, `matrix`, `compare`, `diagram`, `flow`, `accordion`, `kv`, `keyvalue`, `gauge`, `scatter`, `sparkline`, `stats`.

`grid(cols=2)` supports 1–4 columns, responsive down to 1. Containers accept `gap=0…32` (CSS pixels). `heading(size=18)` supports 12–25 px. Unsupported properties are ignored. Container children are separated by `~`; normal list values within widgets still use `|` and table rows use `;`, so encode the semicolons in nested table rows.

Escape reserved delimiters inside property values using percent encoding:

| Literal in value | Encode as |
|---|---|
| `;` | `%3B` |
| `~` | `%7E` |
| `(` | `%28` |
| `)` | `%29` |
| `[` | `%5B` |
| `]` | `%5D` |
| `{` | `%7B` |
| `}` | `%7D` |
| `%` followed by hex code | `%25` followed by remaining literal |

For a nested calculator expression, use `expression=total%2F%28people%29` instead of unescaped parentheses. Text content is **plain text**: no Markdown, HTML, CSS, JavaScript or custom events are evaluated.

## Examples

A responsive 2-column overview:

```text
::intui{kind="layout" title="Hardware overview" tree="col[heading(text=Device status)~grid(cols=2)[metric(labels=RAM|GPU;values=64 GB|RTX 2080 Ti)~gauge(label=Print progress;value=68;max=100;unit=%)]~section[caption(text=Next step)~text(text=Complete calibration before the next run)]]"}
```

Local interactive action and native table:

```text
::intui{kind="layout" title="Design review" tree="col[card[heading(text=Parts list)~table(columns=Name|Price;rows=Shell|120%3BMotor|340)]~row[badge(text=Illustrative data)~action(text=Discuss selection;prompt=Evaluate the parts list)]]" sample="true"}
```

The second layout's `table` receives `rows="Shell|120;Motor|340"` after decoding `%3B`, because the tree grammar reserves the unencoded semicolon.

Nested visual chart:

```text
::intui{kind="layout" title="Experiment" tree="grid(cols=2)[sparkline(label=Run trend;values=2|5|4|7|6)~scatter(points=1:2|2:4|3:5;x=Iteration;y=Score)]" sample="true"}
```


## Reactive layout state (v0.4)

A layout can contain up to **eight controls** and **eight computed variables**. All state is local to the single rendered message. Moving a control updates every bound value in the same layout. No API call, browser JavaScript injection or model execution occurs during interactions.

| Node | Purpose | Required fields |
| --- | --- | --- |
| `input` | Slider plus number field | `name`, `value`, `min`, `max`; optional `step`, `label`, `hint` |
| `select` | Numeric dropdown | `name`, numeric `values` (pipe-delimited); optional `labels`, `value` |
| `toggle` | On/off switch (numeric 0 or 1) | `name`; optional `value=1` and `label` |
| `derive` | Define a hidden computed variable | `name`, `expression` |
| `result` | Live calculated metric | `expression`, `label`, optional `name` (defines a variable), `unit`, `decimals`, `share=false` |

Variable names must start with a letter and contain only letters, digits, or underscores (up to 21 characters). Names must be unique across controls and named results/derivations. `select` only supports numeric option values; labels can be words. Invalid controls display a layout-state error. `result` without a name is a readout only.

Bind a numeric property to a formula with an initial `=` **after** the property equals sign. For example `values==qty*12|=qty*25` evaluates to a two-element numeric list. Bind text with `$name`, for example `text(text=Quantity $qty)`. Both are handled by the same safe arithmetic interpreter used by standalone calculators. Expressions allow only numeric literals, variables, `+`, `-`, `*`, `/`, `^` and parentheses. **Encode parentheses inside the compact tree as `%28` and `%29`.** A failed expression produces an error indicator, not executable code. Link destinations and source labels never interpolate.

Example:

```text
::intui{kind="layout" title="Material budget" sample="true" tree="col[input(name=qty;label=Parts;value=5;min=1;max=40;step=1)~select(name=mat;label=Material;values=10|16;labels=PLA|PETG;value=10)~toggle(name=rush;label=Rush;value=0)~derive(name=base;expression=qty*mat)~result(name=total;label=Total cost;expression=base*%281+rush*0.15%29;unit=NOK)~bars(labels=Base|Total;values==base|=total)~text(text=You selected $qty parts)]"}
```

Every input change recomputes both the `result` and the chart. **Reset** restores the original model-provided defaults. **Use scenario in chat**, action buttons, and **Use result in chat** insert text into the originating chat draft for the user to review; they never send it automatically.

Declared formula variables are evaluated in dependency order regardless of the nodes' positions. Circular, out-of-range, or unresolved expressions are flagged. Controls are not shared across separate directives or separate messages. This is a native Hermes-compatible reactive layer, not the full Thesys OpenUI runtime.

## Validation and interactive behavior

- Max `tree` string: 1,800 characters (Hermes directive limit is 2,048 for the complete brace body); 32 nodes; depth 5; up to 18 properties per node.
- `link` only renders an `<a>` for an explicit HTTP(S) URL without embedded credentials. URLs can only open after a click.
- `action` inserts up to 500 characters into the draft for **that transcript's `sessionId`**. It does not send the message.
- Other interactive leaf widgets retain their existing local state. v0.4 layout inputs and derived values share one React state map within the layout component; no automatic model submission. In v0.6, an outer layout can opt into scoped local persistence with `persist="true" id="unique-id"`.
- Bad trees produce a syntax-error panel rather than executing generated code or breaking the transcript.
- Text and numerical values come from the model. Validate sources separately.

## Not a full upstream AST

This schema is deliberately smaller than OpenUI Lang (`root = Col([...])`, mutable `$variables`, component positional calls and actions). It is a bounded Hermes transcript encoding that can be emitted by any configured model without a second parser service or SDK change.

**Hermes parser constraint:** The official transcript directive parser uses `[^{}]` inside the outer `::name{...}` and caps the entire directive body at **2,048 characters**. Therefore nested layouts deliberately use `[...]` instead of literal `{...}`. The `tree` attribute is capped at 1,800 characters to leave room for short outer attributes; a directive with excessively long title/source/other fields can still exceed the Hermes limit and fail to render. Keep the entire directive body under 2,048 characters.


## v0.5.0 — conditional sections, tabs and text controls

`when(test=...)[child~child]` conditionally renders children based on the current numeric values. The test uses the same bounded arithmetic grammar as `derive`, with one optional comparison (`>=`, `<=`, `>`, `<`, `==`, `!=`). Examples: `when(test=qty>=5)[badge(text=Bulk discount)]` and `when(test=rush)[badge(text=Express)]`. Unsupported boolean expressions such as `&&`, `||`, ternaries and function calls produce a visible error and do not execute.

`tabview(label=Views)[tab(label=Summary)[text(text=Summary)]~tab(label=Details)[text(text=Details)]]` renders a native tab bar. Tabs can contain multiple child elements. A layout supports 1–8 tabs in one tabview. All state controls are layout-scoped even when their tab is hidden, and the selected tab is local UI state.

Use `textinput(name=project;label=Project;value=Prototype;maxlen=80)` for plain text and `textarea(name=notes;label=Notes;maxlen=240;rows=3)` for multiline notes. These variables can be used with `$project` and `$notes` in text and action prompts, but **not** as numeric operands in formulas. No data is sent anywhere until the user deliberately clicks a draft-insertion action or sends a separate chat message.

Use `segmented(name=level;label=Tier;values=1|2|3;labels=Basic|Pro|Plus;value=2)` for numeric options displayed as a segmented button row. The input is numeric so it can participate in calculations. Aliases: `segmentedcontrol` and `radiogroup` map to `segmented`; `slider` maps to `input`; `checkbox` maps to `toggle`. `title` maps to `heading`; `label` maps to `caption`; `button` maps to `action`. `box`, `list`, `listitem`, `quote`, `code`, and `markdown` are small native approximations of the corresponding OpenUI components, not full upstream substitutes.

**Important:** the whole directive must stay below Hermes' 2,048-character attribute body maximum, and `tree=` must be below 1,800 characters. Percent-encode `;`, `~`, brackets, parentheses, and braces inside values. No JSX, React, HTML, URLs for automatic fetches, or arbitrary generated JS is run by this renderer.


## v0.6.0 — native forms and optional saved values

Use `form[...]` to group an input section. Add `dateinput(name=due;label=Deadline;value=2026-12-01)` or alias `datepicker`. A date value must be a valid `YYYY-MM-DD` date from years 1900–2100, or empty.

Set `required=true` on `textinput`, `textarea`, `dateinput` or `toggle`. For a toggle, required means **On**. Use `minlen=3` to require a minimum non-whitespace text length. Add `submit(text=Add to chat;prompt=Use $project and $due)` inside the form. The button validates all named controls in the layout and inserts text in the originating chat draft only after validation succeeds. Errors are displayed in the form. The plugin never submits the chat message automatically.

Example:

```text
::intui{kind="layout" title="Work order" persist="true" id="work-order-01" tree="col[form[textinput(name=project;label=Project;required=true;minlen=3)~datepicker(name=due;label=Due;required=true;value=2026-12-01)~submit(text=Draft task;prompt=Schedule $project for $due)]]"}
```

Saved state is **opt-in**, and only enabled when `persist="true"`, a valid explicit ASCII `id` (letters, numbers, `_`, `-`, maximum 64 chars), and a Hermes session ID are available. Values are stored in Hermes plugin-local storage under a hash of session ID, explicit layout ID and exact tree. The plugin does not access other chats or files. Text, dates, selections and numbers are validated and bounded before restoration. Clicking **Reset** restores defaults; clicking **Clear saved** resets values and clears the stored entry. Using the same ID and identical tree twice in the same chat shares those saved values, because the SDK does not expose a stable message ID for each directive.

If the layout tree changes, its storage key changes, so old saved values are not migrated. Uninstalling the plugin does not guarantee removal of Hermes plugin storage; use Clear saved for the relevant layout.

See [OPENUI_COMPAT.md](OPENUI_COMPAT.md) for the offline static OpenUI translator; it converts only a restricted subset of genuine OpenUI Lang programs.
