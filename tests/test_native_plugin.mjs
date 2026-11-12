import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'

const state = []
let stateIndex = 0
const modules = {}
const registrations = new Map()
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
  COMPOSER_AREAS: { actions: 'composer.actions', middleware: 'composer.middleware' },
  TRANSCRIPT_DIRECTIVE_AREA: 'transcript.directives', host: { notify() {} }
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

// Check the example with Hermes's actual parser when a checkout is supplied.
const example = submitted.text.split('\n').find(line => line.startsWith('::intui{'))
assert.ok(example && example.length < 1600)
let attrs
if (process.argv[2]) {
  const { segmentTranscriptDirectives } = await import(process.argv[2])
  const [segment] = segmentTranscriptDirectives(example)
  assert.equal(segment.directive.source, example)
  assert.equal(segment.directive.name, 'intui')
  attrs = segment.directive.attrs
} else {
  attrs = Object.fromEntries([...example.matchAll(/([a-z]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]))
}
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

console.log('Native composer and recipe rendering checks passed.')
