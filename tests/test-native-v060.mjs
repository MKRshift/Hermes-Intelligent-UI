// v0.6.0: real static OpenUI conversion + saved reactive form scenarios.
import { jsxExports, reactExports } from './desktop/react-shim.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm'
import {convert} from '../official/tools/convert-openui.mjs'

const example=readFileSync(new URL('../official/examples/static-openui.oui',import.meta.url),'utf8')
const imported=convert(example)
assert.equal(imported.nodes,12)
assert.match(imported.directive,/^::intui\{kind="layout"/)
assert.match(imported.tree,/bars\(labels=Mon\|Tue\|Wed;values=12\|23\|18\)/)
assert.ok(imported.directive.length<2058)
assert.ok(!/[{}]/.test(imported.directive.slice('::intui{'.length,-1)))
for(const unsafe of [
  'root = Col([Title(@Set($a, 2))])',
  'root = Col([SearchImage("cats")])',
  'root = Col([HtmlView("<script>alert(1)</script>")])',
  'root = Col([Button("Send", @ToAssistant("hello"))])',
  'root = Col([Title(x)])\nx = root',
  'root = Box([Title("x")])\nfoo = process.exit(0)',
])assert.throws(()=>convert(unsafe))
assert.throws(()=>convert('root = Col([Title("hi")])\nroot = Col([Text("duplicate")])'),/Duplicate/)
assert.throws(()=>convert('root = Col([Title("x"), MathBlock("x")])'),/Unsupported/)
assert.throws(()=>convert('root = Col([Title(foo)])\nfoo = bar\nbar = foo'),/Cyclic/)
assert.equal(convert('root = Col([Card([Title("A & B")]), Quote("Cost; over [10%]")])').tree.includes('%3B'),true)

const inserts=[],regs=[],storage=new Map()
const sdk={COMPOSER_AREAS:{actions:'composer.actions',middleware:'composer.middleware'},TRANSCRIPT_DIRECTIVE_AREA:'transcript.directives',
  atom:v=>({v,get(){return this.v},set(x){this.v=x}}),useValue:a=>a.get(),
  host:{notify(){},composer:{insertText:async(...args)=>{inserts.push(args);return true}}}}
let slots=[],hookIndex=0
const useState=init=>{const i=hookIndex++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value}]}
const jsx=(type,props,key)=>({type,props,key})
const context=createContext({console,Math,Number,Intl,JSON,String,Array,Object,Date,Set,Map,Error,RegExp,decodeURIComponent,Promise})
const source=readFileSync(new URL('../official/plugin.js',import.meta.url),'utf8')
const main=new SourceTextModule(source+'\nexport {parseTree,prepareLayoutState,validDate,validateLayoutForm,layoutStateKey,restoreLayoutValues}',{context})
const sm=new SyntheticModule(Object.keys(sdk),function(){for(const k of Object.keys(sdk))this.setExport(k,sdk[k])},{context})
function makeModule(exports) {
  return new SyntheticModule(Object.keys(exports),function(){for(const k of Object.keys(exports))this.setExport(k,exports[k])},{context})
}
const jm=makeModule(jsxExports(jsx))
const rm=makeModule(reactExports(useState))
await main.link(k=>({'@hermes/plugin-sdk':sm,'react/jsx-runtime':jm,'react':rm}[k]))
await main.evaluate()
main.namespace.default.register({storage:{get:(key,fallback)=>storage.get(key)??fallback,set:(key,value)=>storage.set(key,value)},register:r=>regs.push(r),onDispose(){}})
const renderer=regs.find(r=>r.id==='inline-ui-renderer').data.render
const {parseTree,prepareLayoutState,validDate,validateLayoutForm,layoutStateKey,restoreLayoutValues}=main.namespace
const parsed=parseTree(imported.tree)
assert.equal(parsed.ok,true,parsed.error)
assert.equal(prepareLayoutState(parsed.tree).ok,true)
assert.equal(validDate('2024-02-29'),true)
assert.equal(validDate('2023-02-29'),false)
assert.equal(validDate('2026-04-31'),false)
assert.equal(validDate('2026-11-12'),true)
const tree='col[form[textinput(name=project;label=Project;required=true;minlen=3;maxlen=50)~dateinput(name=due;label=Deadline;value=2026-11-12;required=true)~toggle(name=approved;label=Approved;value=0;required=true)~submit(text=Create plan;prompt=Plan $project by $due)]]'
const attrs={kind:'layout',title:'Project form',persist:'true',id:'project-form-1',tree}
const layout=parseTree(tree)
assert.equal(layout.ok,true,layout.error)
const prepared=prepareLayoutState(layout.tree)
assert.equal(prepared.ok,true,prepared.error)
assert.equal(prepared.controls.length,3)
assert.deepEqual([...validateLayoutForm(prepared,prepared.defaults)],["Project is required","Approved is required"])
assert.equal(layoutStateKey(attrs,'chat-06')!==layoutStateKey(attrs,'chat-07'),true)
assert.equal(layoutStateKey({...attrs,id:'bad id'},'chat-06'),null)
assert.equal(layoutStateKey(attrs,null),null)
const walk=element=>{
  if(Array.isArray(element))return element.flatMap(walk)
  if(!element||typeof element!=='object')return []
  if(typeof element.type==='function')return walk(element.type(element.props))
  return [element,...walk(element.props?.children)]
}
const paint=()=>{hookIndex=0;return walk(renderer({attrs,sessionId:'chat-06'}))}
const find=(items,p)=>items.find(p)
hookIndex=0
const renderedImport=walk(renderer({attrs:{kind:'layout',title:'Imported demo',tree:imported.tree},sessionId:'chat-import'}))
assert.ok(find(renderedImport,n=>n.type==='h4'&&n.props.children==='Daily orders'))
assert.ok(find(renderedImport,n=>n.type==='td'&&n.props.children==='Monday'))
assert.ok(find(renderedImport,n=>n.type==='a'&&n.props.href==='https://example.org'))
slots=[] // use an independent simulated React component instance for the form
let nodes=paint()
assert.ok(find(nodes,n=>n.type==='input'&&n.props.type==='date'))
const submit=()=>find(nodes,n=>n.type==='button'&&n.props?.children==='Create plan')
assert.ok(submit())
submit().props.onClick()
nodes=paint()
assert.ok(find(nodes,n=>n.props.role==='alert'&&String(n.props.children).includes('Project is required')))
assert.equal(inserts.length,0)
find(nodes,n=>n.type==='input'&&n.props.type==='text').props.onChange({target:{value:'Hi'}})
nodes=paint()
submit().props.onClick()
nodes=paint()
assert.ok(find(nodes,n=>n.props.role==='alert'&&String(n.props.children).includes('at least 3')))
find(nodes,n=>n.type==='input'&&n.props.type==='text').props.onChange({target:{value:'New item'}})
nodes=paint()
find(nodes,n=>n.type==='button'&&n.props.role==='switch').props.onClick()
nodes=paint()
submit().props.onClick()
await Promise.resolve();await Promise.resolve()
assert.deepEqual(inserts.at(-1).slice(0,2),['chat-06','Plan New item by 2026-11-12'])
const key=layoutStateKey(attrs,'chat-06')
assert.equal(storage.get(key).project,'New item')
assert.equal(storage.get(key).approved,1)
slots=[] // simulated transcript unmount/reload; keep plugin storage
nodes=paint()
assert.equal(find(nodes,n=>n.type==='input'&&n.props.type==='text').props.value,'New item')
assert.ok(find(nodes,n=>n.type==='button'&&n.props.role==='switch'&&n.props['aria-checked']))
assert.equal(restoreLayoutValues(prepared,key).project,'New item')
const clear=find(nodes,n=>n.type==='button'&&n.props?.children==='Clear saved')
assert.ok(clear)
clear.props.onClick()
nodes=paint()
assert.equal(storage.get(key),null)
assert.equal(find(nodes,n=>n.type==='input'&&n.props.type==='text').props.value,'')
storage.set(key,{project:'x'.repeat(700),due:'2026-02-31',approved:9})
const safe=restoreLayoutValues(prepared,key)
assert.equal(safe.project.length,50)
assert.equal(safe.due,'2026-11-12')
assert.equal(safe.approved,0)
console.log('PASS: static OpenUI import, unsupported AST rejection, 3-control required form, date validation, chat-scoped draft, persistence, restored-value sanitation')
