import { clean, cleanInput, parts, number, hash, pluginContext } from './shared.js'
import { safeFormula, validNumeric } from './arithmetic.js'
import { getWidget } from './widgets.js'

/* v0.6: bounded tree grammar and native, interactive data components.
 * Single quoted host attribute: tree="grid(cols=2)[metric(... )~...]".
 * No runtime compilation, JSX expressions, HTML, arbitrary CSS or JS payloads.
 */
function parseTree(source) {
  if (typeof source !== 'string' || source.length === 0 || source.length > 1800)
    return {ok:false,error:'Layout must contain 1–1,800 characters'}
  let p = 0, count = 0
  const raw = source
  const skip = () => { while (p < raw.length && /\s/.test(raw[p])) p++ }
  const fail = m => { throw Error(`${m} near character ${p + 1}`) }
  const ident = () => {
    skip()
    const m = /^[a-z][a-z0-9]{0,22}/.exec(raw.slice(p))
    if (!m) fail('Expected component or property name')
    p += m[0].length
    return m[0]
  }
  const val = () => {
    const start = p
    while (p < raw.length && raw[p] !== ';' && raw[p] !== ')') p++
    if (p - start > 4000) fail('Property is too long')
    let value = raw.slice(start, p).trim()
    if (value.includes('"') || /[\u0000-\u0008\u000b-\u001f]/.test(value)) fail('Unsupported property character')
    try { if (/%[0-9a-f]{2}/i.test(value)) value = decodeURIComponent(value) }
    catch { fail('Bad percent-encoded property') }
    return clean(value, 4000)
  }
  function node(depth) {
    if (depth > 5 || ++count > 32) fail('Layout is too large')
    const type = canonicalNodeType(ident()), attrs = Object.create(null), children = []
    const containers = [...LAYOUT_CONTAINERS]
    const primitives = ['heading','text','caption','badge','divider','link','action','spacer','input','select','toggle','segmented','textinput','textarea','dateinput','submit','derive','result','listitem','quote','code','markdown']
    if (!LAYOUT_CONTAINERS.has(type) && !primitives.includes(type) && !getWidget(type)) fail(`Unsupported component ${type}`)
    skip()
    if (raw[p] === '(') {
      p++; skip()
      let attributes = 0
      while (raw[p] !== ')') {
        if (++attributes > 18) fail('Too many properties')
        const key = ident()
        skip()
        if (raw[p++] !== '=') fail('Expected =')
        const value = val()
        if (Object.hasOwn(attrs,key)) fail('Duplicate property')
        attrs[key] = value
        if (raw[p] === ';') { p++; skip(); if(raw[p] === ')') fail('Trailing property separator') }
        else if (raw[p] !== ')') fail('Expected ; or )')
        if (p >= raw.length) fail('Unclosed properties')
      }
      p++; skip()
    }
    if (raw[p] === '[') {
      if (!containers.includes(type)) fail('Only layout containers accept children')
      p++; skip()
      if (raw[p] === ']') fail('Empty container')
      for (;;) {
        children.push(node(depth+1))
        skip()
        if (raw[p] === '~') { p++; skip(); continue }
        if (raw[p] === ']') { p++; break }
        fail('Expected ~ or ]')
      }
    } else if (containers.includes(type)) fail(`${type} needs children in brackets`)
    if(type==='tabview' && (children.length<1||children.length>8||children.some(x=>x.type!=='tab')))fail('Tabs require 1–8 tab children')
    return {type,attrs,children}
  }
  try {
    const tree = node(0)
    skip()
    if (p !== raw.length) fail('Unexpected trailing content')
    return {ok:true,tree,nodeCount:count}
  } catch(e) { return {ok:false,error:clean(e?.message || 'Invalid layout',130)} }
}

// v0.5: Reactive layout-scoped input and derived-value graph.
// Only bounded numeric variables and a non-evaluating expression grammar are allowed.
// A layout is the scope boundary: values never leave a message until the user clicks
// "Use scenario in chat" or a similarly explicit draft-insertion action.
const LAYOUT_CONTAINERS=new Set(['col','row','grid','card','section','stack','carousel','box','list','form','tabview','tab','when'])
// An intentionally restricted mapping of OpenUI-like names to native Hermes nodes.
// Not an OpenUI Lang parser: names and arguments are adapted only inside tree=.
const NODE_ALIASES={title:'heading',label:'caption',button:'action',slider:'input',checkbox:'toggle',
  segmentedcontrol:'segmented',radiogroup:'segmented',textinput:'textinput',markdown:'markdown',
  textarea:'textarea',datepicker:'dateinput',date:'dateinput',listitem:'listitem'}
function canonicalNodeType(name){return NODE_ALIASES[name]||name}
function safeCondition(expression,vars){
  const condition=clean(expression,240)
  if(!condition)return {ok:false,error:'Condition is empty'}
  const m=/^(.*?)\s*(>=|<=|==|!=|>|<)\s*(.*?)$/.exec(condition)
  if(!m){
    const n=safeFormula(condition,vars)
    return n.ok?{ok:true,value:n.value!==0}:n
  }
  const left=safeFormula(m[1],vars),right=safeFormula(m[3],vars)
  if(!left.ok)return left
  if(!right.ok)return right
  const a=left.value,b=right.value
  const value=({'==':()=>a===b,'!=':()=>a!==b,'>':()=>a>b,'<':()=>a<b,'>=':()=>a>=b,'<=':()=>a<=b}[m[2]])()
  return {ok:true,value}
}
const VARIABLE_NAME=/^[A-Za-z][A-Za-z0-9_]{0,20}$/
const CONTROL_TYPES=new Set(['input','select','toggle','segmented','textinput','textarea','dateinput'])
// A state key always belongs to one session + explicit author ID + exact tree.
// Without a stable message ID from Hermes, persistence is opt-in only.
function layoutStateKey(attrs,sessionId) {
  if(attrs.persist!=='true'||!sessionId||!/^[A-Za-z0-9_-]{1,64}$/.test(attrs.id||''))return null
  return 'layout-state:v1:'+hash(`${sessionId}|${attrs.id}|${attrs.tree||''}`)
}
function restoreLayoutValues(prepared,key){
  const defaults={...prepared.defaults}
  if(!key)return defaults
  let stored
  try {stored=pluginContext?.storage?.get(key,null)}catch{return defaults}
  if(!stored||typeof stored!=='object'||Array.isArray(stored))return defaults
  for(const def of prepared.controls){
    const value=stored[def.name]
    if(def.kind==='textinput'||def.kind==='textarea'){
      if(typeof value==='string')defaults[def.name]=cleanInput(value,def.maxlen)
    } else if(def.kind==='dateinput'){
      if(typeof value==='string'&&validDate(value))defaults[def.name]=value
    } else if(typeof value==='number'&&Number.isFinite(value)){
      if(def.kind==='input'&&value>=def.min&&value<=def.max)defaults[def.name]=value
      else if((def.kind==='select'||def.kind==='segmented')&&def.options.includes(value))defaults[def.name]=value
      else if(def.kind==='toggle'&&(value===0||value===1))defaults[def.name]=value
    }
  }
  return defaults
}
function validDate(value){
  if(typeof value!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(value))return false
  const [y,m,d]=value.split('-').map(Number)
  if(y<1900||y>2100)return false
  const dt=new Date(Date.UTC(y,m-1,d))
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d
}
function validateLayoutForm(prepared,values) {
  const errors=[]
  for(const def of prepared.controls){
    const value=values[def.name]
    if(def.required){
      const missing=(def.kind==='textinput'||def.kind==='textarea'||def.kind==='dateinput')?!String(value??'').trim():value===null||value===undefined||(def.kind==='toggle'&&value!==1)
      if(missing)errors.push(`${def.label||def.name} is required`)
    }
    if((def.kind==='textinput'||def.kind==='textarea')&&String(value??'').trim().length>0&&String(value).trim().length<def.minlen)
      errors.push(`${def.label||def.name} needs at least ${def.minlen} characters`)
    if(def.kind==='dateinput'&&String(value??'')&&!validDate(value))errors.push(`${def.label||def.name} must be a valid date`)
  }
  return errors.slice(0,6)
}
function formDraft(prepared,values,vars,template){
  const resolved=resolveBindingText(template||'',vars)
  if(resolved.problems.length)return {ok:false,error:'Unknown value in submission: '+resolved.problems[0]}
  if(resolved.text.trim())return {ok:true,text:cleanInput(resolved.text,500)}
  const parts=prepared.controls.map(d=>`${d.label||d.name}: ${String(values[d.name]??'').slice(0,140)}`)
  return {ok:true,text:cleanInput(parts.join('\n'),500)}
}
function prepareLayoutState(tree) {
  const controls=[],derivations=[],names=new Set()
  function visit(node) {
    const a=node.attrs||{},t=node.type
    if(CONTROL_TYPES.has(t)||t==='derive'||(t==='result'&&a.name)) {
      const name=a.name||''
      if(!VARIABLE_NAME.test(name))throw Error('Every named input or result needs a valid name')
      if(names.has(name))throw Error('Duplicate state name: '+name)
      names.add(name)
      if(CONTROL_TYPES.has(t)) {
        if(controls.length>=8)throw Error('A layout supports at most 8 controls')
        const meta={label:clean(a.label||name,80),required:a.required==='true',minlen:Math.max(0,Math.min(120,Math.round(number(a.minlen,0))))}
        if(t==='input') {
          const lo=validNumeric(a.min??'0'),hi=validNumeric(a.max??'100')
          const step=validNumeric(a.step??'1'),def=validNumeric(a.value??'0')
          if([lo,hi,step,def].some(x=>x===null)||lo>=hi||step<=0||step>hi-lo)throw Error('Invalid range for '+name)
          controls.push({...meta,kind:t,name,min:lo,max:hi,step,default:Math.max(lo,Math.min(hi,def))})
        } else if(t==='select'||t==='segmented') {
          const options=parts(a.values,'|',12,30).map(validNumeric)
          if(!options.length||options.some(x=>x===null)||new Set(options).size!==options.length)throw Error('Invalid numeric choices for '+name)
          const def=validNumeric(a.value??String(options[0]))
          if(def===null||!options.includes(def))throw Error('Default choice is not among options for '+name)
          controls.push({...meta,kind:t,name,options,default:def})
        } else if(t==='textinput'||t==='textarea') {
          const maxLimit=t==='textarea'?360:160
          const maxlen=Math.max(1,Math.min(maxLimit,Math.round(number(a.maxlen,maxLimit))))
          controls.push({...meta,kind:t,name,maxlen,default:clean(a.value,maxlen)})
        } else if(t==='dateinput') {
          if(a.value&&!validDate(a.value))throw Error('Date must be YYYY-MM-DD for '+name)
          controls.push({...meta,kind:t,name,default:a.value||''})
        } else {
          if(a.value!==undefined&&!['0','1'].includes(a.value))throw Error('Toggle value must be 0 or 1')
          controls.push({...meta,kind:t,name,default:a.value==='1'?1:0})
        }
      } else {
        if(derivations.length>=8)throw Error('A layout supports at most 8 calculated variables')
        const expression=a.expression||a.expr||''
        if(!expression||expression.length>240)throw Error('Missing or oversized formula for '+name)
        derivations.push({name,expression})
      }
    } else if(t==='derive') throw Error('A derived variable requires a name')
    for(const child of node.children||[])visit(child)
  }
  try {
    visit(tree)
    return {ok:true,controls,derivations,defaults:Object.fromEntries(controls.map(v=>[v.name,v.default]))}
  } catch(e) {return {ok:false,error:clean(e?.message||'Invalid controls',150)}}
}
function computeLayoutState(prepared, inputs) {
  const vars={...inputs},pending=[...prepared.derivations],problems=[]
  // Resolve formulas in any order. A cyclic or invalid formula never executes.
  for(let pass=0;pass<prepared.derivations.length&&pending.length;pass++) {
    for(let i=pending.length-1;i>=0;i--) {
      const d=pending[i],calc=safeFormula(d.expression,vars)
      if(calc.ok){vars[d.name]=calc.value;pending.splice(i,1)}
    }
  }
  for(const item of pending) {
    const calc=safeFormula(item.expression,vars)
    problems.push(`${item.name}: ${calc.error||'Unresolved formula'}`)
  }
  return {vars,problems}
}
function resolveBindingText(raw, vars) {
  if(typeof raw!=='string')return {text:'',problems:[]}
  const problems=[]
  const fragments=raw.split(/([|;])/g).map(fragment=>{
    const v=fragment.trim()
    if(v.startsWith('=')&&v.length>1) {
      const result=safeFormula(v.slice(1),vars)
      if(result.ok)return String(result.value)
      problems.push(result.error)
      return '—'
    }
    return fragment.replace(/\$([A-Za-z][A-Za-z0-9_]{0,20})\b/g,(token,name)=>{
      if(!Object.hasOwn(vars,name)) {problems.push('Unknown variable: '+name);return '—'}
      return typeof vars[name]==='string'?vars[name].trim():String(vars[name])
    })
  })
  return {text:fragments.join(''),problems}
}
function bindAttrs(attrs,vars) {
  const out={...attrs},problems=[]
  for(const [k,v] of Object.entries(attrs)) {
    // Formula definitions are interpreted only by the bounded math evaluator.
    // Source and link destinations stay literal so a model cannot fabricate
    // a dynamic "source" or URL through state expansion.
    if(['expression','expr','source','url','inputs','sample','name','kind','test'].includes(k))continue
    const result=resolveBindingText(v,vars)
    out[k]=result.text
    problems.push(...result.problems)
  }
  return {attrs:out,problems}
}

export { parseTree, LAYOUT_CONTAINERS, CONTROL_TYPES, safeCondition, layoutStateKey, restoreLayoutValues, validDate, validateLayoutForm, formDraft, prepareLayoutState, computeLayoutState, resolveBindingText, bindAttrs }
