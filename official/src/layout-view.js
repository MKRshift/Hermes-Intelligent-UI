import { jsx, jsxs } from 'react/jsx-runtime'
import { useState } from 'react'
import { pluginContext, clean, cleanInput, parts, number, fnum, COLOR, ACCENT, BORDER, sub, btn, rowCss, shell, empty, pill, safeExternalUrl, toGap, insertIntoChat } from './shared.js'
import { safeFormula, validNumeric } from './arithmetic.js'
import { getWidget } from './widgets.js'
import { parseTree, LAYOUT_CONTAINERS, CONTROL_TYPES, safeCondition, layoutStateKey, restoreLayoutValues, validDate, validateLayoutForm, formDraft, prepareLayoutState, computeLayoutState, bindAttrs } from './layout-state.js'

function ControlNode({node,context}) {
  const a=node.attrs,def=context.prepared.controls.find(x=>x.name===a.name)
  if(!def)return empty('Control is not registered')
  const value=context.values[def.name]
  const label=clean(a.label||def.name,100)
  const set=(raw)=>{
    if(def.kind==='textinput'||def.kind==='textarea'||def.kind==='dateinput'){
      if(def.kind==='dateinput'){if(raw!==''&&!validDate(raw))return;context.setValues(old=>({...old,[def.name]:raw}));return}
      context.setValues(old=>({...old,[def.name]:cleanInput(String(raw??''),def.maxlen)}))
      return
    }
    const n=validNumeric(raw)
    if(n===null)return
    const next=def.kind==='toggle'?(n?1:0):(def.kind==='select'||def.kind==='segmented')?(def.options.includes(n)?n:value):Math.max(def.min,Math.min(def.max,n))
    context.setValues(old=>({...old,[def.name]:next}))
  }
  const heading=jsx('label',{style:{...sub,fontWeight:620},children:label+(def.required?' *':'')})
  let field
  if(def.kind==='textinput'||def.kind==='textarea'||def.kind==='dateinput') {
    const common={value:String(value??''),'aria-label':label,
      onChange:e=>set(e.target.value),placeholder:clean(a.placeholder,100),maxLength:def.maxlen,
      style:{...btn,boxSizing:'border-box',width:'100%',minWidth:0}}
    field=def.kind==='textarea'?jsx('textarea',{...common,rows:Math.max(2,Math.min(5,Math.round(number(a.rows,3))))}):jsx('input',{...common,type:def.kind==='dateinput'?'date':'text',min:def.kind==='dateinput'?'1900-01-01':undefined,max:def.kind==='dateinput'?'2100-12-31':undefined})
  }
  else if(def.kind==='toggle')field=jsx('button',{type:'button',role:'switch','aria-checked':value===1,'aria-label':label,
    onClick:()=>set(value===1?0:1),style:{...btn,width:'fit-content',background:value===1?`color-mix(in srgb, ${ACCENT} 15%, transparent)`:'transparent',borderColor:value===1?ACCENT:BORDER},children:value===1?'On':'Off'})
  else if(def.kind==='select'||def.kind==='segmented') {
    const opts=parts(a.labels,'|',12,90)
    if(def.kind==='segmented')field=jsx('div',{role:'group','aria-label':label,style:{...rowCss,gap:5},children:def.options.map((v,i)=>jsx('button',{
      type:'button','aria-pressed':value===v,onClick:()=>set(String(v)),
      style:{...btn,borderColor:value===v?ACCENT:BORDER,background:value===v?`color-mix(in srgb, ${ACCENT} 12%, transparent)`:'transparent'},
      children:opts[i]||fnum(v)},String(v)))})
    else field=jsx('select',{value:String(value),'aria-label':label,onChange:e=>set(e.target.value),style:{...btn,minWidth:100,maxWidth:240},children:def.options.map((v,i)=>jsx('option',{value:String(v),children:opts[i]||fnum(v)},String(v)))})
  } else {
    const slider=jsx('input',{type:'range',min:def.min,max:def.max,step:def.step,value,onChange:e=>set(e.target.value),
      'aria-label':label,style:{accentColor:ACCENT,width:'100%',minWidth:0}})
    const numeric=jsx('input',{type:'number',min:def.min,max:def.max,step:def.step,value,onChange:e=>set(e.target.value),
      'aria-label':`${label} numeric value`,style:{...btn,padding:'6px 8px',width:100,boxSizing:'border-box'}})
    field=jsxs('div',{style:{display:'flex',gap:9,alignItems:'center',minWidth:0},children:[slider,numeric]})
  }
  return jsxs('div',{style:{display:'grid',gap:5,minWidth:0},children:[heading,field,
    a.hint&&jsx('div',{style:sub,children:clean(a.hint,180)})]})
}
function ResultNode({node,context,sessionId}) {
  const a=node.attrs
  const label=clean(a.label||a.name||'Calculated result',100)
  const expression=a.expression||a.expr||''
  const result=a.name&&Object.hasOwn(context.vars,a.name)?{ok:true,value:context.vars[a.name]}:safeFormula(expression,context.vars)
  const unit=clean(a.unit,20)
  const decimalsRaw=validNumeric(a.decimals??'2')
  const decimals=Math.max(0,Math.min(6,Math.floor(decimalsRaw??2)))
  const output=result.ok?`${new Intl.NumberFormat(undefined,{maximumFractionDigits:decimals}).format(result.value)}${unit?' '+unit:''}`:`Error: ${clean(result.error||'Invalid formula',100)}`
  return jsxs('div',{style:{minWidth:0,padding:'10px 12px',borderRadius:12,background:`color-mix(in srgb, ${ACCENT} 8%, transparent)`},children:[
    jsx('div',{style:sub,children:label}),
    jsx('div',{role:'status','aria-live':'polite',style:{fontSize:24,fontWeight:700,fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere'},children:output}),
    a.share!=='false'&&jsx('button',{type:'button',disabled:!result.ok,style:{...btn,marginTop:9,fontSize:11,opacity:result.ok?1:.4},
      onClick:()=>void insertIntoChat(sessionId,`${label}: ${output}`),children:'Use result in chat'})
  ]})
}
function FormSubmitNode({node,context,sessionId}) {
  const [error,setError]=useState('')
  const a=node.attrs
  const submit=()=>{
    const issues=validateLayoutForm(context.prepared,context.values)
    if(issues.length){setError(issues.join('; '));return}
    const draft=formDraft(context.prepared,context.values,context.vars,a.prompt||'')
    if(!draft.ok){setError(draft.error);return}
    setError('')
    void insertIntoChat(sessionId,draft.text)
  }
  return jsxs('div',{style:{display:'grid',gap:6},children:[
    jsx('button',{type:'button',style:{...btn,width:'fit-content'},onClick:submit,children:clean(a.text||a.label,120)||'Add form to chat'}),
    error&&jsx('div',{role:'alert',style:{...sub,color:'var(--ui-text-danger, #e66)'},children:error})
  ]})
}
function LayoutTabs({node,sessionId,path,context}) {
  const [active,setActive]=useState(0)
  const index=Math.min(Math.max(0,active),node.children.length-1)
  const current=node.children[index]
  return jsxs('section',{style:{minWidth:0},children:[
    jsx('div',{role:'tablist','aria-label':clean(node.attrs.label,100)||'Sections',style:{...rowCss,gap:6,borderBottom:`1px solid ${BORDER}`,paddingBottom:8,marginBottom:10},children:
      node.children.map((n,i)=>jsx('button',{type:'button',role:'tab','aria-selected':i===index,
        style:{...btn,fontSize:12,color:i===index?ACCENT:COLOR,borderColor:i===index?ACCENT:BORDER},
        onClick:()=>setActive(i),children:clean(n.attrs.label||n.attrs.title,90)||`Tab ${i+1}`},i))}),
    jsx('div',{role:'tabpanel',children:current.children.map((child,i)=>jsx('div',{key:`${index}-${i}`,style:{marginBottom:8,minWidth:0},children:renderTreeNode(child,sessionId,`${path}-${index}-${i}`,context)}))})
  ]})
}
function renderTreeNode(node,sessionId,path='n',context=null) {
  const raw=node.attrs,t=node.type
  const resolved=context?bindAttrs(raw,context.vars):{attrs:raw,problems:[]}
  const a=resolved.attrs
  if(context)context.problems.push(...resolved.problems)
  if(t==='when') {
    const cond=safeCondition(raw.test||raw.expression,context?.vars||{})
    if(!cond.ok){if(context)context.problems.push('Condition: '+clean(cond.error,90));return empty('Conditional section unavailable')}
    if(!cond.value)return null
  }
  if(t==='tabview')return jsx(LayoutTabs,{node,sessionId,path,context})
  if(t==='tab')return empty('A tab must be inside tabview')
  if(t==='submit')return jsx(FormSubmitNode,{node,sessionId,context})
  if (LAYOUT_CONTAINERS.has(t)) {
    const children=node.children.map((child,i)=>jsx('div',{style:{minWidth:0},children:renderTreeNode(child,sessionId,`${path}${i}`,context)},`${path}${i}`))
    const gap=toGap(a.gap,10)
    let style={display:'flex',flexDirection:'column',gap,minWidth:0}
    if(t==='row') style={...style,flexDirection:'row',flexWrap:a.wrap==='false'?'nowrap':'wrap',alignItems:'start'}
    if(t==='grid') {
      const cols=Math.max(1,Math.min(4,Math.round(number(a.cols||a.columns,2))))
      const min=Math.max(130,Math.min(320,Math.floor(660/cols)-25))
      style={display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${min}px),1fr))`,gap,minWidth:0}
    }
    if(t==='box')style={...style,padding:Math.max(0,Math.min(24,number(a.padding,8))),borderRadius:10}
    if(t==='list')style={...style,gap:3,paddingLeft:5}
    if(t==='card') style={...style,border:`1px solid ${BORDER}`,borderRadius:12,padding:12,background:'color-mix(in srgb, var(--ui-text-primary) 2%, transparent)'}
    if(t==='section')style={...style,padding:'3px 0 12px',borderBottom:`1px solid ${BORDER}`}
    if(t==='form')style={...style,padding:'12px',borderRadius:12,border:`1px solid ${BORDER}`}
    if(t==='carousel')style={...style,flexDirection:'row',overflowX:'auto',scrollSnapType:'x mandatory',paddingBottom:8}
    if(t==='carousel')return jsx('div',{style,children:children.map((child,i)=>jsx('div',{key:i,style:{flex:'0 0 min(78%,235px)',scrollSnapAlign:'start'},children:child},i))})
    return jsx('div',{style,children})
  }
  if(CONTROL_TYPES.has(t)) return jsx(ControlNode,{node,context})
  if(t==='derive')return null
  if(t==='result')return jsx(ResultNode,{node,context,sessionId})
  if(t==='heading') return jsx('h4',{style:{fontSize:Math.max(12,Math.min(25,number(a.size,18))),fontWeight:700,margin:0,lineHeight:1.2},children:clean(a.text,360)})
  if(t==='text') return jsx('p',{style:{fontSize:13,margin:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere'},children:clean(a.text,1400)})
  if(t==='caption') return jsx('span',{style:sub,children:clean(a.text,600)})
  if(t==='quote')return jsx('blockquote',{style:{margin:'2px 0',padding:'9px 12px',borderLeft:`3px solid ${ACCENT}`,background:`color-mix(in srgb, ${ACCENT} 5%, transparent)`,borderRadius:5},children:clean(a.text,1200)})
  if(t==='code')return jsx('pre',{style:{fontSize:12,whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:10,borderRadius:8,border:`1px solid ${BORDER}`},children:jsx('code',{children:clean(a.text,1500)})})
  if(t==='markdown')return jsx('p',{style:{margin:0,whiteSpace:'pre-wrap',fontSize:13},children:clean(a.text,1200)})
  if(t==='listitem')return jsx('div',{style:{display:'flex',gap:8,alignItems:'start'},children:[jsx('span',{'aria-hidden':'true',style:{color:ACCENT},children:'•'}),jsx('span',{children:clean(a.text,450)})]})
  if(t==='badge') return pill(clean(a.text,65),path)
  if(t==='divider') return jsx('hr',{style:{height:1,border:0,background:BORDER,width:'100%',margin:0}})
  if(t==='spacer') return jsx('div',{style:{flex:1,minHeight:1}})
  if(t==='link') {
    const href=safeExternalUrl(a.url)
    return href?jsx('a',{href,target:'_blank',rel:'noopener noreferrer',style:{color:ACCENT,textDecoration:'underline',overflowWrap:'anywhere'},children:clean(a.text||href,150)}):empty('Invalid link URL')
  }
  if(t==='action')return jsx('button',{type:'button',style:btn,onClick:()=>void insertIntoChat(sessionId,a.prompt||a.text),children:clean(a.text||'Use in chat',100)})
  const Widget=getWidget(t)
  return Widget?jsx(Widget,{attrs:{...a,_nested:'1'},sessionId}):empty('Unsupported item')
}
function LayoutWidget({attrs,sessionId}) {
  const parsed=parseTree(attrs.tree)
  // Always call hooks in the same order, including while content is streaming.
  const prepared=parsed.ok?prepareLayoutState(parsed.tree):{ok:false,error:'No valid layout yet',controls:[],derivations:[],defaults:{}}
  const persistenceKey=layoutStateKey(attrs,sessionId)
  const [values,setRawValues]=useState(()=>prepared.ok?restoreLayoutValues(prepared,persistenceKey):{})
  const setValues=(next)=>setRawValues(current=>{
    const result=typeof next==='function'?next(current):next
    if(persistenceKey){
      try {pluginContext?.storage?.set(persistenceKey,result)}catch{}
    }
    return result
  })
  if(!parsed.ok)return shell(attrs,empty(`Layout syntax error: ${parsed.error}`),'Composed layout')
  if(!prepared.ok)return shell(attrs,empty(`Layout state error: ${prepared.error}`),'Composed layout')
  const derived=computeLayoutState(prepared,values)
  const context={prepared,values,setValues,vars:derived.vars,problems:[...derived.problems]}
  const tree=renderTreeNode(parsed.tree,sessionId,'n',context)
  const problems=[...new Set(context.problems)].slice(0,4)
  const controls=prepared.controls
  const snapshot=()=>{
    const inputs=controls.map(d=>`${clean(d.name,25)}=${typeof values[d.name]==='string'?JSON.stringify(clean(values[d.name],d.maxlen||120)):values[d.name]}`).join(', ')
    const outputs=prepared.derivations.filter(d=>Object.hasOwn(derived.vars,d.name)).map(d=>`${d.name}=${derived.vars[d.name]}`).join(', ')
    return `Scenario inputs: ${inputs}${outputs?'; calculated: '+outputs:''}`
  }
  return shell(attrs,jsxs('div',{children:[
    controls.length>0&&jsxs('div',{style:{...rowCss,justifyContent:'flex-end',paddingBottom:11,marginBottom:11,borderBottom:`1px solid ${BORDER}`},children:[
      jsx('span',{style:{...sub,marginRight:'auto'},children:`${controls.length} linked ${controls.length===1?'control':'controls'} · ${persistenceKey?'saved locally':'local to this message'}`}),
      jsx('button',{type:'button',style:{...btn,fontSize:11},onClick:()=>setValues({...prepared.defaults}),children:'Reset'}),
      persistenceKey&&jsx('button',{type:'button',style:{...btn,fontSize:11},onClick:()=>{setValues({...prepared.defaults});try{pluginContext?.storage?.set(persistenceKey,null)}catch{}},children:'Clear saved'}),
      jsx('button',{type:'button',style:{...btn,fontSize:11},onClick:()=>void insertIntoChat(sessionId,snapshot()),children:'Use scenario in chat'})
    ]}),
    problems.length>0&&jsx('div',{role:'alert',style:{...sub,padding:'8px 10px',marginBottom:9,border:`1px solid ${BORDER}`,borderRadius:8},children:'Some calculations could not resolve: '+problems.join('; ')}),
    tree
  ]}),'Composed layout')
}

export { LayoutWidget }
