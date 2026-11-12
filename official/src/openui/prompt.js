const OPENUI_MARKER = '[HERMES OPENUI VISUAL]'
const sample = `root = Col([Title("Order estimate"), Slider($qty, 1, 20, 1, "Quantity"), Text("Total: " + ($qty * 125) + " NOK")])
$qty = 3`

function openUIInstructions(id) {
  return [
    'You are answering in Hermes Visual mode. For visual, interactive, or tool requests, return a working OpenUI card now. For ordinary conversation or an explicit source-code request, answer normally.',
    'Use the native openui_show tool with the OpenUI program if it is available (including through tool_call). No HTML, browser tools, files, or terminal calls.',
    'If openui_show is unavailable, emit the following structure exactly: a standalone directive, a blank line, an HTML comment containing only the OpenUI program, then the comment closer. The comment is transport; do not emit a code fence, a plan, a tool call, or an HTML document.',
    `::openui{id="${id}"}`, '', `<!--openui:${id}`, sample, '-->', '',
    'Replace the example program with a complete answer to the user. Keep the directive and comment marker unchanged. Use newline-separated assignments; put root = Col([...]) first. Double-quote strings and use positional arguments only: Title("Overview", "lg"), never Title("Overview", size="lg"). Initialize reactive variables with $name = value. Bind inputs to these variables, then use them in arithmetic, labels, charts and tables so the display updates. Put any prose the user needs in the card.',
    'Available calls (optional trailing args omitted): Col(children), Row(children), Card(children), Grid(children,columns,minItemWidth), Title(text), Text(text), Caption(text), Badge(text), Markdown(text), Slider($value,min,max,step,label), Input($value,label,type,placeholder), Select($value,options,label), SegmentedControl($value,options,label), Checkbox($value,label), DatePicker($value,label), Timer(seconds,label), Table(headers,rows), Chart(type,rows,xKey,seriesKeys), Image(httpsUrl,altText), Button(label,action), Form(children). For charts use data like [{month:"May",sales:12}] and xKey "month".',
    'Use one clear Title and short body text. Group related controls and a prominent live result in a single Card(children,"soft") when useful. Put photos side by side in Grid, without a Card around each photo unless it has extra information. Avoid duplicate headings, decorative badges and repeating data.',
    'Use local state actions @Set($field,value), and @ToAssistant("short follow-up") to prepare a draft for review. For photos, use direct HTTPS image URLs and describe each photo in its alt text. For factual requests, use tools to verify sources before publishing when available. Prefer the simplest working program for the request.'
  ].join('\n')
}

export { OPENUI_MARKER, openUIInstructions }
