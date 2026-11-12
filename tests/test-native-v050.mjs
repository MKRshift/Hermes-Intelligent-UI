// v0.5.0: direct grammar, state and mounted-component behavior tests.
// No Hermes app is required. Uses controlled SDK + React mock.
import { jsxExports, reactExports } from './desktop/react-shim.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm'

const registrations=[],inserts=[]
const sdk={COMPOSER_AREAS:{actions:'composer.actions',middleware:'composer.middleware'},
 TRANSCRIPT_DIRECTIVE_AREA:'transcript.directives',
 atom:v=>({v,get(){return this.v},set(x){this.v=x}}),useValue:a=>a.get(),
 host:{notify(){},composer:{insertText:async(...args)=>{inserts.push(args);return true}}}}
const calls=[];let currentHook=0
const react={useState(init){let idx=currentHook++;if(!(idx in calls))calls[idx]=typeof init==='function'?init():init;return[calls[idx],v=>{calls[idx]=typeof v==='function'?v(calls[idx]):v}]}}
const jsx=(type,props,key)=>({type,props,key})
const context=createContext({console,Math,Number,Intl,JSON,String,Array,Object,Date,Set,Map,Error,RegExp,decodeURIComponent,Promise})
const source=readFileSync(new URL('../official/plugin.js',import.meta.url),'utf8')
const main=new SourceTextModule(source+'\nexport {parseTree,prepareLayoutState,computeLayoutState,safeCondition,renderTreeNode,cleanInput}',{context})
const sm=new SyntheticModule(Object.keys(sdk),function(){for(const k of Object.keys(sdk))this.setExport(k,sdk[k])},{context})
function makeModule(exports) {
  return new SyntheticModule(Object.keys(exports),function(){for(const k of Object.keys(exports))this.setExport(k,exports[k])},{context})
}
const jm=makeModule(jsxExports(jsx))
const rm=makeModule(reactExports(react.useState))
await main.link(k=>({'@hermes/plugin-sdk':sm,'react/jsx-runtime':jm,'react':rm}[k]))
await main.evaluate()
const {parseTree,prepareLayoutState,computeLayoutState,safeCondition,cleanInput}=main.namespace
const plugin=main.namespace.default
plugin.register({storage:{get:(_,v)=>v,set(){}},register:r=>registrations.push(r),onDispose(){}})
const renderer=registrations.find(r=>r.id==='inline-ui-renderer').data.render
function walk(el){
 if(Array.isArray(el))return el.flatMap(walk)
 if(!el||typeof el!=='object')return []
 if(typeof el.type==='function')return walk(el.type(el.props))
 return [el,...walk(el.props?.children)]
}
function paint(attrs){currentHook=0;return walk(renderer({attrs:{kind:'layout',title:'v0.5 test',...attrs},sessionId:'session-500'}))}
function find(nodes,predicate){return nodes.find(predicate)}
const layout='col[title(text=Dynamic quote)~slider(name=qty;label=Quantity;value=3;min=0;max=50)~checkbox(name=rush;label=Rush;value=0)~segmentedcontrol(name=level;label=Tier;values=10|20;labels=Base|Premium;value=10)~textinput(name=project;label=Project;maxlen=50;value=Prototype)~textarea(name=notes;label=Notes;maxlen=80)~derive(name=total;expression=qty*level)~when(test=qty>=5)[badge(text=Bulk order)]~tabview(label=Views)[tab(label=Summary)[result(label=Cost;expression=total;unit=NOK)]~tab(label=Details)[text(text=Project $project %26 total $total)~action(text=Draft;prompt=Review $project project costing $total)]]]'
const p=parseTree(layout)
assert.equal(p.ok,true,p.error)
assert.equal(p.tree.children[0].type,'heading','OpenUI title alias')
assert.equal(p.tree.children[1].type,'input','OpenUI slider alias')
assert.equal(p.tree.children[2].type,'toggle','OpenUI checkbox alias')
assert.equal(p.tree.children[3].type,'segmented','OpenUI segmented alias')
const prep=prepareLayoutState(p.tree)
assert.equal(prep.ok,true,prep.error)
assert.equal(prep.controls.length,5)
let state=computeLayoutState(prep,prep.defaults)
assert.equal(state.vars.total,30)
assert.deepEqual({...safeCondition('total >= 30',state.vars)},{ok:true,value:true})
assert.equal(safeCondition('total < 20',state.vars).value,false)
assert.equal(safeCondition('qty',state.vars).value,true)
assert.equal(safeCondition('qty > process.exit(0)',state.vars).ok,false)
assert.equal(safeCondition('total>unknown',state.vars).ok,false)
assert.equal(cleanInput('Hello world '), 'Hello world ', 'Trailing space must survive user typing')
assert.ok(!parseTree('tabview[tab(label=One)[text(text=a)]~text(text=bad)]').ok)
assert.ok(!parseTree('when(test=1)[notreal(text=bad)]').ok)
assert.ok(!prepareLayoutState(parseTree('row[textinput(name=x)~slider(name=x;min=0;max=10)]').tree).ok)
let nodes=paint({tree:layout})
assert.ok(find(nodes,n=>n.type==='button'&&n.props?.children==='On')===undefined)
assert.ok(find(nodes,n=>n.type==='button'&&n.props?.children==='Base'))
assert.ok(!find(nodes,n=>n.props?.children==='Bulk order'),'Hidden conditional initially')
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='30 NOK'))
const range=find(nodes,n=>n.type==='input'&&n.props.type==='range'&&n.props['aria-label']==='Quantity')
assert.ok(range)
range.props.onChange({target:{value:'7'}})
nodes=paint({tree:layout})
assert.ok(find(nodes,n=>n.props?.children==='Bulk order'),'Conditional appears when qty reaches 5')
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='70 NOK'),'Computed result updated')
const advanced=find(nodes,n=>n.type==='button'&&n.props?.children==='Premium')
advanced.props.onClick()
nodes=paint({tree:layout})
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='140 NOK'),'Segmented choice changes computed value')
const text=find(nodes,n=>n.type==='input'&&n.props.type==='text'&&n.props['aria-label']==='Project')
assert.ok(text)
text.props.onChange({target:{value:'My rocket '}})
nodes=paint({tree:layout})
assert.equal(find(nodes,n=>n.type==='input'&&n.props.type==='text'&&n.props['aria-label']==='Project').props.value,'My rocket ')
const notes=find(nodes,n=>n.type==='textarea'&&n.props['aria-label']==='Notes')
notes.props.onChange({target:{value:'A'.repeat(200)}})
nodes=paint({tree:layout})
assert.equal(find(nodes,n=>n.type==='textarea'&&n.props['aria-label']==='Notes').props.value.length,80,'Textarea bounded')
const details=find(nodes,n=>n.type==='button'&&n.props.role==='tab'&&n.props.children==='Details')
assert.ok(details)
details.props.onClick()
nodes=paint({tree:layout})
assert.ok(find(nodes,n=>n.type==='p'&&n.props.children==='Project My rocket & total 140'),'Text binds to shared state in tab')
const draft=find(nodes,n=>n.type==='button'&&n.props.children==='Draft')
assert.ok(draft)
await draft.props.onClick()
assert.equal(inserts.at(-1)[0],'session-500')
assert.equal(inserts.at(-1)[1],'Review My rocket project costing 140')
const reset=find(nodes,n=>n.type==='button'&&n.props.children==='Reset')
reset.props.onClick()
nodes=paint({tree:layout})
assert.ok(!find(nodes,n=>n.props?.children==='Bulk order'),'Reset hides conditional')
assert.equal(find(nodes,n=>n.type==='input'&&n.props.type==='text'&&n.props['aria-label']==='Project').props.value,'Prototype')
console.log('PASS: OpenUI-style aliases, tabs, 5 controls, conditional expressions, text editing, safe formulas, chat session routing, reset')
// Check authoring examples are valid and below the host parser's body maximum.
const readme=readFileSync(new URL('../official/TREE_FORMAT.md',import.meta.url),'utf8')
const directives=[...readme.matchAll(/::intui\{kind="layout"[^\r\n]*\}/g)].map(x=>x[0])
assert.ok(directives.length>=2,'Documentation should include real examples')
for(const directive of directives){
  const body=directive.slice('::intui{'.length,-1)
  assert.ok(body.length<=2048,'Hermes host caps directive body at 2,048 characters')
  assert.ok(!/[{}]/.test(body),'Hermes host cannot parse nested curly braces in attrs')
  const tree=/\btree="([^"]*)"/.exec(body)?.[1]
  assert.ok(tree,'A layout directive needs tree=')
  const parsed=parseTree(tree)
  assert.ok(parsed.ok,`README example must parse: ${parsed.error||''}`)
  assert.ok(prepareLayoutState(parsed.tree).ok,'README example must have valid state declarations')
}
console.log('PASS: documented layout examples fit Hermes host cap and parse')
