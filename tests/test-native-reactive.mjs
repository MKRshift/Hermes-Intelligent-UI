// Hermes SDK mock integration for v0.4 reactive layout state.
// Node --experimental-vm-modules tests/test-reactive.mjs
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm'

const registrations=[],inserts=[]
const sdk={
 COMPOSER_AREAS:{actions:'composer.actions',middleware:'composer.middleware'},
 TRANSCRIPT_DIRECTIVE_AREA:'transcript.directives',
 atom:v=>({v,get(){return this.v},set(x){this.v=x}}),useValue:a=>a.get(),
 host:{notify(){},composer:{insertText:async(...args)=>{inserts.push(args);return true}}}
}
const calls=[];let currentHook=0
const react={useState(init){const idx=currentHook++;if(!(idx in calls))calls[idx]=typeof init==='function'?init():init;return [calls[idx],v=>{calls[idx]=typeof v==='function'?v(calls[idx]):v}]}}
const jsx=(type,props,key)=>({type,props,key})
const context=createContext({console,Math,Number,Intl,JSON,String,Array,Object,Date,Set,Map,Error,RegExp,decodeURIComponent,Promise})
const source=readFileSync(new URL('../official/plugin.js',import.meta.url),'utf8')
const main=new SourceTextModule(source+'\nexport { prepareLayoutState,computeLayoutState,resolveBindingText,bindAttrs,parseTree }',{context})
const sm=new SyntheticModule(Object.keys(sdk),function(){for(const k of Object.keys(sdk))this.setExport(k,sdk[k])},{context})
const jm=new SyntheticModule(['jsx','jsxs'],function(){this.setExport('jsx',jsx);this.setExport('jsxs',jsx)},{context})
const rm=new SyntheticModule(['useState'],function(){this.setExport('useState',react.useState)},{context})
await main.link(k=>({'@hermes/plugin-sdk':sm,'react/jsx-runtime':jm,'react':rm}[k]))
await main.evaluate()
const {prepareLayoutState,computeLayoutState,resolveBindingText,bindAttrs,parseTree}=main.namespace
const plugin=main.namespace.default
plugin.register({storage:{get:(_,v)=>v,set(){}},register:r=>registrations.push(r),onDispose(){}})
const renderer=registrations.find(r=>r.id==='inline-ui-renderer')?.data?.render
assert.ok(renderer)
const layout='col[heading(text=Price simulator)~grid(cols=2)[input(name=qty;label=Units;value=10;min=1;max=100;step=1)~select(name=material;label=Material;values=12|25;labels=PLA|ABS;value=12)~toggle(name=rush;label=Rush;value=0)]~derive(name=subtotal;expression=qty*material)~result(name=grand;label=Final quote;expression=subtotal*%281+rush*0.2%29;unit=NOK)~metric(labels=Quantity|Subtotal|Total;values==qty|=subtotal|=grand)~bars(labels=Materials|Total;values==subtotal|=grand)~text(text=You selected $qty units)~action(text=Explain;prompt=Explain $qty units costing $grand NOK)]'
const p=parseTree(layout)
assert.equal(p.ok,true,p.error)
const prep=prepareLayoutState(p.tree)
assert.equal(prep.ok,true,prep.error)
assert.equal(prep.controls.length,3)
assert.equal(prep.derivations.length,2)
const derived=computeLayoutState(prep,{qty:10,material:12,rush:0})
assert.equal(derived.vars.subtotal,120)
assert.equal(derived.vars.grand,120)
assert.equal(computeLayoutState(prep,{qty:10,material:25,rush:1}).vars.grand,300)
assert.equal(bindAttrs({values:'=qty|=grand',detail:'$qty units'},derived.vars).attrs.values,'10|120')
assert.equal(resolveBindingText('Based on $qty units',derived.vars).text,'Based on 10 units')
assert.match(resolveBindingText('=1/(qty-qty)',derived.vars).problems[0],/zero/)
assert.ok(resolveBindingText('=foo',derived.vars).problems.length)
assert.ok(resolveBindingText('No $missing',derived.vars).problems.length)
assert.ok(resolveBindingText('=process.exit(0)',derived.vars).problems.length)
assert.equal(bindAttrs({source:'$qty',url:'https://example.com/$qty'},derived.vars).attrs.url,'https://example.com/$qty')
assert.ok(!prepareLayoutState(parseTree('row[input(name=x;value=1)~input(name=x;value=2)]').tree).ok)
assert.ok(!prepareLayoutState(parseTree('row[select(name=x;values=1|2;value=3)~text(text=no)]').tree).ok)
assert.ok(!prepareLayoutState(parseTree('row[input(name=wrong-name)~text(text=no)]').tree).ok)
assert.ok(!prepareLayoutState(parseTree('row[toggle(name=y;value=2)~text(text=no)]').tree).ok)
assert.ok(!prepareLayoutState(parseTree('row[input(name=a;min=4;max=2)~text(text=no)]').tree).ok)
const cyclic=prepareLayoutState(parseTree('col[derive(name=a;expression=b+1)~derive(name=b;expression=a+1)~result(label=Bad;expression=a+1)]').tree)
assert.equal(cyclic.ok,true)
assert.equal(computeLayoutState(cyclic,{}).problems.length,2)
const outOfRange=prepareLayoutState(parseTree('col[input(name=x;value=50;min=0;max=100)~derive(name=big;expression=x^12)]').tree)
assert.equal(outOfRange.ok,true)
assert.equal(computeLayoutState(outOfRange,{x:50}).problems.length,1)

// Simulate React's re-renders for the root component hook slot and child events.
const rendered=()=>{
 currentHook=0
 const root=renderer({attrs:{kind:'layout',title:'Linked quote',tree:layout},sessionId:'chat-42'})
 return walk(root)
}
function walk(el){
 if(Array.isArray(el))return el.flatMap(walk)
 if(!el||typeof el!=='object')return []
 if(typeof el.type==='function')return walk(el.type(el.props))
 return [el,...walk(el.props?.children)]
}
function find(tree,predicate){return tree.find(predicate)}
let nodes=rendered()
assert.equal(find(nodes,n=>n.type==='div'&&n.props?.children==='120')!==undefined,true,'metric starts with total=120')
const slider=find(nodes,n=>n.type==='input'&&n.props.type==='range'&&n.props['aria-label']==='Units')
assert.ok(slider,'Input control exists')
slider.props.onChange({target:{value:'20'}})
nodes=rendered()
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='240'),'Changing quantity updates metric')
assert.ok(find(nodes,n=>n.type==='p'&&n.props?.children==='You selected 20 units'),'Text interpolation changes with same control')
const dropdown=find(nodes,n=>n.type==='select'&&n.props['aria-label']==='Material')
assert.ok(dropdown)
dropdown.props.onChange({target:{value:'25'}})
nodes=rendered()
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='500'),'Changing dropdown updates total')
const toggle=find(nodes,n=>n.type==='button'&&n.props.role==='switch')
assert.ok(toggle)
toggle.props.onClick()
nodes=rendered()
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='600'),'Toggle updates derived total')
const explain=find(nodes,n=>n.type==='button'&&n.props?.children==='Explain')
assert.ok(explain)
await explain.props.onClick()
assert.equal(inserts.at(-1)[0],'chat-42')
assert.equal(inserts.at(-1)[1],'Explain 20 units costing 600 NOK')
const snapshot=find(nodes,n=>n.type==='button'&&n.props?.children==='Use scenario in chat')
assert.ok(snapshot)
await snapshot.props.onClick()
assert.equal(inserts.at(-1)[0],'chat-42')
assert.match(inserts.at(-1)[1],/qty=20/)
assert.match(inserts.at(-1)[1],/grand=600/)
const reset=find(nodes,n=>n.type==='button'&&n.props?.children==='Reset')
reset.props.onClick()
nodes=rendered()
assert.ok(find(nodes,n=>n.type==='div'&&n.props?.children==='120'),'Reset restores initial total')
const invalidLayout=renderer({attrs:{kind:'layout',tree:'row[input(name=a;value=2)~input(name=a;value=3)]'},sessionId:'chat-42'})
assert.ok(walk(invalidLayout).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('Layout state error')))
console.log('PASS: controls, dependency graph, 3-step reactive updates, reset, chat-bound actions, invalid cycles, no expression execution')
