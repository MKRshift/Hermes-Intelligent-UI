#!/usr/bin/env node
/**
 * Static OpenUI Lang 1.0 -> Hermes ::intui tree converter (developer utility).
 * No eval, dynamic expressions, effects, custom functions or network access.
 * This is NOT the full upstream OpenUI compiler.
 * Usage: node tools/convert-openui.mjs examples/static-openui.oui
 */
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const deny = text => { throw Error(text) }
const MAX_SOURCE=24_000
function tokenize(source){
  if(typeof source!=='string'||!source.trim()||source.length>MAX_SOURCE)deny('Source must be 1–24,000 characters')
  const tokens=[]
  const pattern=/\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|\$?[A-Za-z_][A-Za-z0-9_]*|[()\[\]{},:=;]/gy
  let p=0
  while(p<source.length){
    pattern.lastIndex=p;const match=pattern.exec(source)
    if(!match)deny(`Unsupported syntax near offset ${p}: ${source.slice(p,p+22).replace(/\n/g,' ')}`)
    const token=match[0];p+=token.length
    if(/^\s|^\/\//.test(token)||token.startsWith('/*'))continue
    tokens.push(token)
    if(tokens.length>5000)deny('Too many tokens')
  }
  return tokens
}
function decodeQuoted(token){
  const inner=token.slice(1,-1)
  return inner.replace(/\\([\\'"nrt])/g,(_,x)=>({'n':'\n','r':'\r','t':'\t'}[x]??x))
}
function parse(source){
  const ts=tokenize(source)
  let at=0,depth=0
  const definitions=new Map()
  const get=()=>ts[at]
  const take=()=>ts[at++]
  function need(token){if(take()!==token)deny(`Expected '${token}' near token ${at}`)}
  function expression(){
    if(++depth>24)deny('Expression nesting exceeds 24')
    const tk=take();let v
    if(tk==='['){const items=[];while(get()!==']'){
      if(!get())deny('Unclosed array')
      items.push(expression());if(get()===','){take();if(get()===']')break}else if(get()!==']')deny('Expected comma in array')
      if(items.length>100)deny('Array has too many entries')
    }need(']');v={kind:'array',items}}
    else if(tk==='{'){
      const fields={}
      while(get()!=='}'){
        const k=take();if(!k)deny('Unclosed object')
        if(!/^[$A-Za-z_][A-Za-z0-9_]*$/.test(k)&& !/^['"]/.test(k))deny('Object key must be a literal')
        need(':');const key=/^['"]/.test(k)?decodeQuoted(k):k
        if(Object.hasOwn(fields,key))deny('Duplicate object key')
        fields[key]=expression()
        if(get()===','){take();if(get()==='}')break}else if(get()!=='}')deny('Expected comma in object')
        if(Object.keys(fields).length>100)deny('Object has too many fields')
      }need('}');v={kind:'object',fields}}
    else if(/^['"]/.test(tk??''))v={kind:'literal',value:decodeQuoted(tk)}
    else if(/^-?(?:\d|\.\d)/.test(tk??'')){const n=Number(tk);if(!Number.isFinite(n)||Math.abs(n)>1e12)deny('Number out of range');v={kind:'literal',value:n}}
    else if(tk==='true'||tk==='false'||tk==='null')v={kind:'literal',value:tk==='null'?null:tk==='true'}
    else if(/^\$?[A-Za-z_][A-Za-z0-9_]*$/.test(tk??'')){
      if(get()==='('){take();const args=[];while(get()!==')'){
        if(!get())deny('Unclosed function call')
        args.push(expression());if(get()===','){take();if(get()===')')break}else if(get()!==')')deny('Expected comma in call')
        if(args.length>18)deny('Too many component arguments')
      }need(')');v={kind:'call',name:tk,args}}
      else v={kind:'reference',name:tk}
    }else deny(`Unsupported token ${String(tk)}`)
    depth--;return v
  }
  while(at<ts.length){
    if(get()===';'){take();continue}
    const name=take()
    if(!/^\$?[A-Za-z_][A-Za-z0-9_]*$/.test(name??''))deny('Expected assignment name')
    need('=')
    if(definitions.has(name))deny(`Duplicate assignment: ${name}`)
    definitions.set(name,expression())
    if(definitions.size>75)deny('Too many assignments')
    if(get()===';')take()
  }
  if(!definitions.has('root'))deny('Missing root assignment')
  return definitions
}
const escape = raw=>String(raw??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/%/g,'%25').replace(/;/g,'%3B').replace(/~/g,'%7E').replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/\[/g,'%5B').replace(/\]/g,'%5D').replace(/\{/g,'%7B').replace(/\}/g,'%7D').replace(/"/g,'%22')
const flat = raw=>String(raw??'').replace(/[|;]/g,' / ').replace(/[\r\n]/g,' ').slice(0,160)
export function convert(source){
  const definitions=parse(source)
  const resolving=new Set();let nodes=0
  function deref(node,level=0){
    if(level>24)deny('Too many references')
    if(node?.kind!=='reference')return node
    if(!definitions.has(node.name))deny(`Undefined reference ${node.name}`)
    if(resolving.has(node.name))deny(`Cyclic reference: ${node.name}`)
    resolving.add(node.name);const r=deref(definitions.get(node.name),level+1);resolving.delete(node.name);return r
  }
  function literal(node){const n=deref(node);if(n?.kind!=='literal')deny('Only static literal arguments are supported');return n.value}
  function optional(node,fallback=null){return node===undefined?fallback:literal(node)}
  const str=(node,fallback='')=>String(optional(node,fallback)??fallback)
  const atom=(name,args={})=>{
    const fields=Object.entries(args).filter(([,v])=>v!==undefined&&v!==null&&v!=='')
    return name+(fields.length?'('+fields.map(([k,v])=>`${k}=${escape(v)}`).join(';')+')':'')
  }
  function staticArray(node){const n=deref(node);if(n?.kind!=='array')deny('Expected a static array');return n.items}
  function children(node,depth){return staticArray(node).map(n=>component(n,depth+1)).join('~')}
  const kindNames=new Set(['col','row','box','grid','card','carousel','section','stack','list','form'])
  function component(node,depth=0){
    if(depth>5)deny('Hermes layout maximum nesting depth is 5')
    if(++nodes>32)deny('Hermes layout allows at most 32 nodes')
    const value=deref(node)
    if(value?.kind!=='call')deny('A visual component must be a call')
    const name=value.name.toLowerCase(),a=value.args
    if(kindNames.has(name)){
      const nameToNode={col:'col',row:'row',box:'box',grid:'grid',card:'card',carousel:'carousel',section:'section',stack:'stack',list:'list',form:'form'}
      const label=name==='grid'?{cols:optional(a[1],2)}:undefined
      const contents=children(a[0],depth)
      if(!contents)deny(`${value.name} needs children`)
      return atom(nameToNode[name],label)+( '['+contents+']' )
    }
    if(name==='title'){
      const size=str(a[1],'md');const px=({xs:13,sm:15,md:18,lg:21,xl:25,'2xl':25})[size]||18
      return atom('heading',{text:str(a[0]),size:px})
    }
    if(name==='text'||name==='caption'||name==='label'||name==='badge'||name==='quote'||name==='markdown'||name==='code'||name==='listitem')
      return atom(({label:'caption',quote:'quote'})[name]||name,{text:str(a[0])})
    if(name==='divider'||name==='spacer')return name
    if(name==='link')return atom('link',{text:str(a[0]),url:str(a[1])})
    if(name==='table'){
      const headers=staticArray(a[0]).map(x=>flat(literal(x)))
      const rows=staticArray(a[1]).map(x=>staticArray(x).map(y=>flat(literal(y))))
      if(headers.length>7||rows.length>80)deny('Table exceeds Hermes limits')
      return atom('table',{columns:headers.join('|'),rows:rows.map(x=>x.join('|')).join(';')})
    }
    if(name==='chart'){
      const chartType=str(a[0]).toLowerCase(),data=staticArray(a[1]);const xKey=str(a[2],'label')
      const yKey= a[3]===undefined ? 'value' : str(staticArray(a[3])[0]||{kind:'literal',value:'value'})
      const labels=[],values=[]
      for(const row of data){
        const obj=deref(row)
        if(obj?.kind!=='object')deny('Chart rows must be static objects')
        labels.push(flat(literal(obj.fields[xKey])))
        const n=literal(obj.fields[yKey]);if(typeof n!=='number')deny('Chart values must be numeric')
        values.push(n)
      }
      if(labels.length>16)deny('Chart exceeds 16 entries')
      const dest=({bar:'bars',line:'line',donut:'donut',pie:'donut',area:'line'})[chartType]
      if(!dest)deny(`Unsupported chart type: ${chartType}`)
      return atom(dest,{labels:labels.join('|'),values:values.join('|')})
    }
    deny(`Unsupported OpenUI component: ${value.name}. Use static Col/Row/Grid/Card, text, charts, tables, links or dividers.`)
  }
  const tree=component(definitions.get('root'))
  const directive=`::intui{kind="layout" title="Imported OpenUI" tree="${tree}"}`
  if(tree.length>1800||directive.slice(8,-1).length>2048)deny('Converted UI exceeds Hermes directive limit; split into smaller layouts')
  if(/[{}]/.test(directive.slice(8,-1)))deny('Host directive contains braces')
  return {tree,directive,nodes,sourceAssignments:definitions.size}
}
const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]
if(invoked){
  try{
    const filename=process.argv[2];if(!filename)deny('Usage: node tools/convert-openui.mjs <file.oui>')
    const result=convert(readFileSync(filename,'utf8'))
    process.stdout.write(result.directive+'\n')
    process.stderr.write(`Converted ${result.nodes} static nodes from ${result.sourceAssignments} assignments.\nThis directive must be emitted by the assistant in Hermes to render, not pasted as a user message.\n`)
  }catch(error){console.error('Cannot convert OpenUI:',error.message);process.exitCode=1}
}
