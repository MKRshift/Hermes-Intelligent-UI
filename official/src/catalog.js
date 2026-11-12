// Native widget vocabulary and examples sent by the composer.

const NATIVE_MARKER = '[HERMES NATIVE UI]'
const RECIPE_EXAMPLE = '::intui{kind="recipe" title="Vanilla cake" servings="8" ingredients="240|g|flour;150|g|sugar;115|g|butter;2||eggs;120|ml|milk;2|tsp|baking powder;1|tsp|vanilla" steps="Heat oven to 175 °C and grease the pan.|Cream butter and sugar. Beat in eggs and vanilla.|Fold in flour and baking powder, alternating with milk.|Bake until a skewer comes out clean, about 30 minutes.|Cool before slicing."}'

// Examples are real, parser-checked directives, not pseudocode. Keep the
// catalog here so the composer can teach the model only the relevant shapes.
const NATIVE_GROUPS = [
  {
    match: /\b(?:charts?|graphs?|plots?|trends?|bars?|lines?|pie|donut|scatter|sparkline|visuali[sz]e|data)\b/i,
    examples: [
      '::intui{kind="bars" title="Weekly totals" labels="Mon|Tue" values="12|19" sample="true"}',
      '::intui{kind="line" title="Trend" labels="Jan|Feb|Mar" values="5|8|11" sample="true"}',
      '::intui{kind="donut" title="Budget split" labels="Parts|Labor" values="40|60" sample="true"}',
      '::intui{kind="scatter" title="Trade-offs" points="1:4|2:6|3:5" labels="A|B|C" x="Mass" y="Strength" sample="true"}',
      '::intui{kind="sparkline" title="Recent trend" values="2|4|3|7" label="Daily count" sample="true"}'
    ]
  }, {
    match: /\b(?:tables?|metric|metrics|kpi|kpis|status|progress|gauge|specifications|properties|dashboard)\b/i,
    examples: [
      '::intui{kind="metric" title="Status" labels="Tasks|Issues" values="12|3" sample="true"}',
      '::intui{kind="progress" title="Build" label="Complete" value="73" max="100" unit="%" sample="true"}',
      '::intui{kind="gauge" title="Battery" label="Charge" value="77" min="0" max="100" unit="%" sample="true"}',
      '::intui{kind="kv" title="Machine" labels="Memory|Storage" values="16 GB|1 TB" sample="true"}',
      '::intui{kind="table" title="Parts" columns="Part|Cost" rows="Case|200;Cable|15" sample="true"}'
    ]
  }, {
    match: /\b(?:cards?|steps?|guides?|timeline|schedule|roadmap|diagram|flowchart|flow|accordion|notice|explain|process)\b/i,
    examples: [
      '::intui{kind="cards" title="Alternatives" labels="A|B" values="Light|Strong" details="Easier to lift|Higher load"}',
      '::intui{kind="steps" title="Setup" items="Prepare|Test" details="Check the parts|Run a sample"}',
      '::intui{kind="timeline" title="Launch" dates="Week 1|Week 2" items="Design|Ship" details="Draft|Release" statuses="done|planned" sample="true"}',
      '::intui{kind="diagram" title="Pipeline" nodes="Input|Process|Output" links="0>1|1>2" details="Collect data|Transform it|Review result"}',
      '::intui{kind="accordion" title="Questions" labels="Why|How" contents="The reason|The method"}',
      '::intui{kind="notice" title="Check first" text="Verify measurements before cutting." tags="Preparation|Reminder"}'
    ]
  }, {
    match: /\b(?:calculat\w*|estimat\w*|compar\w*|matrix|weights?|checklist|tabs?|options?|choices?|select|sliders?)\b/i,
    examples: [
      '::intui{kind="calc" title="Estimate" inputs="units:3:1:30:1" labels="Units" expression="units*125" result="Total" unit="NOK" sample="true"}',
      '::intui{kind="matrix" title="Weighted comparison" options="A|B" criteria="Cost|Quality" scores="8|7;6|9" weights="3|4" sample="true"}',
      '::intui{kind="checklist" title="Build checklist" items="Inspect parts|Assemble|Test"}',
      '::intui{kind="tabs" title="Details" tabs="Summary|Notes" contents="Main finding|Supporting notes"}',
      '::intui{kind="options" title="Choose a plan" choices="A|B" prompt="Explore plan [choice]"}'
    ]
  }
]
const LAYOUT_EXAMPLES = [
  '::intui{kind="layout" title="Interactive quote" sample="true" tree="col[row[slider(name=qty;label=Parts;value=3;min=1;max=30)~segmentedcontrol(name=rate;label=Material;values=12|20;labels=PLA|PETG;value=12)]~derive(name=total;expression=qty*rate)~when(test=qty>=5)[badge(text=Bulk order)]~tabview[tab(label=Quote)[result(label=Total;expression=total;unit=NOK)]~tab(label=Breakdown)[bars(labels=Rate|Total;values==rate|=total)]]]"}',
  '::intui{kind="layout" title="Project form" tree="col[form[textinput(name=project;label=Project;required=true;minlen=3)~datepicker(name=due;label=Deadline;required=true)~textarea(name=notes;label=Notes)~toggle(name=approved;label=Approved;required=true;value=0)~submit(text=Prepare draft;prompt=Plan $project for $due)]]"}'
]

function nativeInstructions(text, selected) {
  const policy = selected === 'visual'
    ? 'Mode: Visual. Prefer a working visual or interactive widget whenever it adds value.'
    : 'Mode: Auto. Use prose for ordinary questions; use a widget when requested or when it improves the answer.'
  const matched = NATIVE_GROUPS.filter(group => group.match.test(text))
  const recipe = /\b(?:recip(?:e|ie)s?|cake|baking)\b/i.test(text)
  const layout = /\b(?:forms?|layout|dashboard|shared state|reactive|linked|persist\w*|sav(?:e|ed) (?:form|inputs)|tabview|date (?:field|picker))\b/i.test(text)
  const recipeGuide = 'Recipe: use servings and ingredients as decimal quantity|unit|name; separate ingredient rows with ; and steps with |. An empty unit is valid. Include the complete recipe.'
  if (recipe && !matched.length && !layout) {
    return [policy,
      'Answer now with one interactive recipe in Hermes native format. Output ONLY one unquoted, unfenced ::intui directive on its own line. No preamble, plans, tool calls, OpenUI Lang, code or HTML.',
      recipeGuide + ' Follow this shape and keep the whole directive under 1600 characters. Do not put quotes, newlines or braces inside attribute values.',
      RECIPE_EXAMPLE
    ].join('\n')
  }
  const useLayout = layout || (selected === 'visual' && !matched.length)
  const examples = matched.length ? matched.flatMap(group => group.examples)
    : useLayout ? [] : NATIVE_GROUPS.map(group => group.examples[0])
  return [policy,
    'Render up to three standalone ::intui directives in this reply, separated by blank lines. Double-quote attributes, with no quotes, newlines or braces inside values. Never wrap directives in code fences. Do not emit OpenUI Lang, HTML or JS. Keep each line under 1600 characters. Use prose if a visual is inappropriate. Do not invent facts; label illustrations sample="true".',
    'Use the following shapes as references, and replace all sample content with the answer:',
    ...examples,
    ...(recipe ? [recipeGuide, RECIPE_EXAMPLE] : []),
    ...(useLayout ? [
      'Layout grammar: node(key=value;key=value)[child~child]. Containers include col, row, grid, box, card, section, stack, carousel, list, form, tabview, tab and when. Nodes include heading, text, caption, quote, link, badge and the standalone widgets. Encode literal ; ~ ( ) [ ] { } inside a value as %3B %7E %28 %29 %5B %5D %7B %7D. Keep nesting at most 5 levels and total nodes at most 32.',
      'Controls share named state: input/slider, select, toggle, segmented, textinput, textarea, dateinput. Use derive and result for numeric expressions, $name for text or draft insertion, and =name in chart values. Form submit validates required inputs and prepares a draft without sending it. Only when the user asks to save inputs, use persist="true" and a unique id on the outer layout.',
      ...LAYOUT_EXAMPLES
    ] : []),
    'Do not promise a widget or a later action. For an explicit native widget request, show the actual directive.'
  ].join('\n')
}

export { NATIVE_MARKER, nativeInstructions }
