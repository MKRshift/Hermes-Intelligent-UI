import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'

const state = []
let stateIndex = 0
const modules = {}
const registrations = new Map()
const draftWrites = []
const atom = initial => ({ value: initial, get() { return this.value }, set(value) { this.value = value } })
const jsx = (type, props) => ({ type, props })
const context = createContext({ Intl })
function shim(name, exports) {
  modules[name] = new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
  }, { context })
}
shim('@hermes/plugin-sdk', {
  atom, useValue: value => value.get(),
  COMPOSER_AREAS: { actions: 'composer.actions', top: 'composer.top', middleware: 'composer.middleware' },
  TRANSCRIPT_DIRECTIVE_AREA: 'transcript.directives',
  host: { notify() {}, composer: { insertText: (...args) => { draftWrites.push(args); return true } } }
})
shim('react/jsx-runtime', { jsx, jsxs: jsx })
shim('react', {
  useState(initial) {
    const index = stateIndex++
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
    return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }]
  }
})
const code = readFileSync(new URL('../official/plugin.js', import.meta.url), 'utf8')
const plugin = new SourceTextModule(code, { context })
await plugin.link(name => modules[name])
await plugin.evaluate()
plugin.namespace.default.register({
  register: contribution => registrations.set(contribution.id, contribution),
  storage: { get: () => 'auto', set() {} },
  onDispose() {}
})

const middleware = registrations.get('composer-ui-instructions').data.handler
const draft = { text: 'create a cake recipie', attachments: ['unchanged'] }
const submitted = middleware(draft)
assert.equal(submitted.attachments, draft.attachments)
assert.ok(submitted.text.startsWith(draft.text + '\n\n--- Attached Context ---'))
assert.match(submitted.text, /Output ONLY one unquoted, unfenced ::intui directive/)
assert.equal(middleware(submitted), submitted)
assert.equal(middleware({ text: '/help' }).text, '/help')

// Check examples with Hermes's actual parser when a checkout is supplied.
const hostParser = process.argv[2] ? (await import(process.argv[2])).segmentTranscriptDirectives : null
function parseExample(example) {
  assert.ok(example && example.length < 1600)
  if (hostParser) {
    const [segment] = hostParser(example)
    assert.equal(segment.directive.source, example)
    assert.equal(segment.directive.name, 'intui')
    return segment.directive.attrs
  }
  assert.match(example, /^::intui\{[^{}\n]+\}$/)
  return Object.fromEntries([...example.matchAll(/([a-z]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]))
}
const examplesIn = text => text.split('\n').filter(line => line.startsWith('::intui{')).map(parseExample)
const [attrs] = examplesIn(submitted.text)
const renderDirective = registrations.get('inline-ui-renderer').data.render
const render = () => {
  stateIndex = 0
  const widget = renderDirective({ attrs, sessionId: 'test' })
  return widget.type(widget.props)
}
function find(tree, predicate) {
  if (tree == null || typeof tree !== 'object') return undefined
  if (predicate(tree)) return tree
  for (const child of [tree.props?.children].flat(Infinity)) {
    const result = find(child, predicate)
    if (result) return result
  }
}
assert.ok(find(render(), node => node.props.children === '8 servings'))
assert.ok(find(render(), node => node.props.children === '240 g'))
find(render(), node => node.props['aria-label'] === 'Increase servings').props.onClick()
assert.ok(find(render(), node => node.props.children === '9 servings'))
assert.ok(find(render(), node => node.props.children === '270 g'))
find(render(), node => node.props.type === 'checkbox').props.onChange()
assert.equal(find(render(), node => node.props.type === 'checkbox').props.checked, true)
find(render(), node => node.props.children === 'Reset recipe').props.onClick()
assert.ok(find(render(), node => node.props.children === '8 servings'))
assert.equal(find(render(), node => node.props.type === 'checkbox').props.checked, false)

// A mixed request should expose every supported family. Each example must
// produce a real widget with meaningful content, not an unsupported fallback.
const catalog = examplesIn(middleware({
  text: 'Build a dashboard with a chart, diagram, calculator, layout form and recipe.'
}).text)
const expected = {
  accordion: 'details', bars: 'div', calc: 'input', cards: 'div', checklist: 'input',
  diagram: 'svg', donut: 'svg', gauge: 'svg', kv: 'dl', layout: 'section', line: 'svg',
  matrix: 'input', metric: 'div', notice: 'div', options: 'button', progress: 'div',
  recipe: 'output', scatter: 'svg', sparkline: 'svg', steps: 'ol', table: 'table',
  tabs: 'button', timeline: 'ol'
}
assert.deepEqual([...new Set(catalog.map(item => item.kind))].sort(), Object.keys(expected).sort())
for (const item of catalog) {
  state.length = 0
  stateIndex = 0
  let widget = renderDirective({ attrs: item, sessionId: 'test' })
  while (typeof widget?.type === 'function') widget = widget.type(widget.props)
  assert.equal(widget?.type, 'section', `${item.kind} must render a widget panel`)
  assert.ok(find(widget, node => node.type === expected[item.kind]), `${item.kind} must contain ${expected[item.kind]}`)
  assert.ok(!find(widget, node => typeof node.props.children === 'string' && /^(Layout syntax error|Layout state error|Unsupported Intelligent UI)/.test(node.props.children)))
}
const formOnly = examplesIn(middleware({ text: 'Build a form with a date picker and save the inputs.' }).text)
assert.ok(formOnly.some(item => item.kind === 'layout' && item.tree.includes('datepicker')))
assert.ok(formOnly.every(item => item.kind === 'layout'))

const panel = registrations.get('widget-examples-panel').render()
const paintGallery = () => { stateIndex = 0; return panel.type(panel.props) }
state.length = 0
assert.equal(paintGallery(), null)
assert.equal(middleware({ text: 'generate som example of visual intelligent ui here for me to test' }), null)
assert.ok(middleware({ text: 'Generate examples of Intelligent UI from my dataset' }).text.includes('[HERMES NATIVE UI]'))
assert.ok(middleware({ text: 'Show widget examples', attachments: ['file'] }).text.includes('[HERMES NATIVE UI]'))
const picker = find(paintGallery(), node => node.type === 'select' && node.props['aria-label'] === 'Widget example')
assert.equal(picker.props.children.length, 24) // 23 types plus a second layout sample
const estimate = picker.props.children.find(option => option.props.children === 'Estimate · calc')
picker.props.onChange({ target: { value: estimate.props.value } })
const galleryCalc = find(paintGallery(), node => typeof node.type === 'function')
const calculator = galleryCalc.type(galleryCalc.props)
assert.equal(find(calculator, node => node.props.role === 'status').props.children, '375 NOK')
find(calculator, node => node.props.children === 'Use result in chat').props.onClick()
assert.equal(draftWrites.length, 0, 'Gallery actions must not insert into the composer')
find(paintGallery(), node => node.props.children === 'Close examples').props.onClick()
assert.equal(paintGallery(), null)
console.log(`Native composer, local example gallery, recipe interactions and ${Object.keys(expected).length} widget types passed.`)
