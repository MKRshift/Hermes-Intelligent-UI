import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'

const require = createRequire(new URL('../official/package.json', import.meta.url))
const react = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const atom = value => ({ get: () => value, set: next => { value = next } })
const listeners = new Map(), contributions = new Map()
const runtime = 'runtime-a', stored = 'stored-a'
let history = []
let apiReads = 0
const sdk = {
  atom, useValue: store => store.get(), useTheme: () => ({ renderedMode: 'dark' }),
  COMPOSER_AREAS: { actions: 'composer.actions', top: 'composer.top', middleware: 'composer.middleware' },
  TRANSCRIPT_DIRECTIVE_AREA: 'transcript.directives',
  host: {
    state: { focusedSessionId: atom(runtime), focusedStoredSessionId: atom(stored) },
    async request(method, args) {
      assert.equal(method, 'session.history')
      assert.equal(args.session_id, runtime)
      apiReads++
      return { messages: history }
    }
  }
}
const context = createContext({ console, Intl, crypto: webcrypto, AbortController, URL, queueMicrotask })
const makeModule = exports => new SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
}, { context })
const modules = {
  '@hermes/plugin-sdk': makeModule(sdk),
  react: makeModule({ default: react, ...react }),
  'react/jsx-runtime': makeModule(require('react/jsx-runtime'))
}
const code = readFileSync(new URL('../official/plugin.js', import.meta.url), 'utf8')
const bundle = new SourceTextModule(code + '\nexport { programs, getProgram, replayOpenUI, library };', { context })
await bundle.link(name => modules[name])
await bundle.evaluate()
bundle.namespace.default.register({
  register: item => contributions.set(item.id, item),
  onEvent: (type, fn) => listeners.set(type, fn),
  storage: { get: () => 'visual' },
  onDispose() {}
})
const request = contributions.get('composer-ui-instructions').data.handler({ text: 'Make an event budget' })
const id = request.text.match(/\[HERMES OPENUI VISUAL\] ([a-f0-9]{16})/)[1]
const anchor = `::openui{id="${id}"}`
const start = `${anchor}\n\n<!--openui:${id}\n`
const program = `root = Col([Title("Event budget"), Slider($guests,1,20,1,"Guests"), Text("Total: " + ($guests * 140) + " NOK"), Table(["Item","Price"],[["Admission", $guests * 140]]), Chart("bar",[{name:"Admission",cost:$guests * 140}], "name", ["cost"]), Image("https://example.com/photo.jpg")])
$guests = 6`
const emit = (type, session_id, text) => listeners.get(type)({ session_id, payload: { text } })
const { programs, getProgram, replayOpenUI } = bundle.namespace
const snapshot = session => getProgram(programs.get(), session, id)
emit('message.start', runtime)
emit('message.delta', runtime, start.slice(0, 12))
emit('message.delta', runtime, start.slice(12) + program)
assert.equal(snapshot(runtime).code, program)
assert.equal(snapshot(runtime).complete, false)
assert.equal(snapshot('other-chat'), undefined)
const finalProgram = program + '\n' + Array.from({ length: 50 }, (_, n) => `note${n} = Text("Unrendered data above the directive body limit ${n}")`).join('\n')
assert.ok(finalProgram.length > 2048)
const answer = start + finalProgram + '\n-->'
emit('message.complete', runtime, answer)
assert.equal(snapshot(runtime).code, finalProgram + '\n')
assert.equal(snapshot(runtime).complete, true)
const render = contributions.get('openui-renderer').data.render
const html = renderToStaticMarkup(render({ attrs: { id }, streaming: false, sessionId: stored })).replace(/<style>[\s\S]*?<\/style>/g, '')
assert.match(html, /aria-label="OpenUI answer"/)
assert.match(html, />Event budget</)
assert.match(html, />Total:/)
const { createParser } = require('@openuidev/lang-core')
const parsed = createParser(bundle.namespace.library.toJSONSchema(), 'Col').parse(program)
assert.equal(parsed.stateDeclarations.$guests, 6)
assert.match(html, /type="range"/)
assert.match(html, /<table/)
assert.match(html, /<img[^>]+src="https:\/\/example\.com\/photo\.jpg"/)
assert.doesNotMatch(html, /root = Col/)

const second = 'deadb33fdeadb33f'
const secondText = answer.replaceAll(id, second)
history = [
  { role: 'user', text: secondText.replace('Event budget', 'User impersonation') },
  { role: 'assistant', text: secondText }
]
await Promise.all([replayOpenUI(stored, runtime), replayOpenUI(stored, runtime)])
assert.equal(apiReads, 1)
assert.equal(getProgram(programs.get(), stored, second).code, finalProgram + '\n')
const otherId = 'beefb33fdeadb33f'
history = [{ role: 'user', text: answer.replaceAll(id, otherId) }]
await replayOpenUI(stored, runtime)
assert.equal(getProgram(programs.get(), stored, otherId), undefined)
console.log('OpenUI: complete and streamed native transport, original components and state, scoped transcript replay passed.')
