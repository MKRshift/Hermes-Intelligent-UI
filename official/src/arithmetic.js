import { clean } from './shared.js'

function validNumeric(s) {
  const v=String(s??'').trim()
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,2})?$/.test(v))return null
  const n=Number(v)
  return Number.isFinite(n) && Math.abs(n)<=1e12?n:null
}
function safeFormula(expr, vars={}) {
  if(typeof expr!=='string'||!expr.trim()||expr.length>240)return {ok:false,error:'Missing or oversized expression'}
  const tokens=[];let i=0
  while(i<expr.length){
    if(/\s/.test(expr[i])){i++;continue}
    const m=/^(?:[A-Za-z_][A-Za-z_0-9]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[()+\-*/^])/.exec(expr.slice(i))
    if(!m)return {ok:false,error:'Unsupported expression character'}
    tokens.push(m[0]);i+=m[0].length
    if(tokens.length>100)return {ok:false,error:'Expression is too complex'}
  }
  let at=0,level=0,ops=0
  const peek=()=>tokens[at]
  const take=()=>tokens[at++]
  const guard=(v)=>{if(++ops>120||!Number.isFinite(v)||Math.abs(v)>1e12)throw Error('Calculation is out of range');return v}
  function atom(){
    if(++level>16)throw Error('Expression is too deeply nested')
    let v,t=take()
    if(t==='('){v=add();if(take()!==')')throw Error('Unclosed parentheses')}
    else if(t==='-'||t==='+'){v=(t==='-'?-1:1)*atom()}
    else if(t && /^[A-Za-z_]/.test(t)){
      if(!Object.prototype.hasOwnProperty.call(vars,t)||!Number.isFinite(vars[t]))throw Error(`Unknown input: ${t}`)
      v=vars[t]
    } else {
      v=validNumeric(t)
      if(v===null)throw Error('Invalid number or expression')
    }
    level--;return guard(v)
  }
  function power(){let v=atom();if(peek()==='^'){take();const e=power();if(Math.abs(e)>12)throw Error('Exponent is too large');v=guard(v**e)}return v}
  function mul(){let v=power();while(peek()==='*'||peek()==='/'){
    const op=take(),b=power();if(op==='/'&&b===0)throw Error('Cannot divide by zero');v=guard(op==='*'?v*b:v/b)
  }return v}
  function add(){let v=mul();while(peek()==='+'||peek()==='-'){
    const op=take(),b=mul();v=guard(op==='+'?v+b:v-b)
  }return v}
  try {const value=add();if(at!==tokens.length)throw Error('Unexpected expression token');return {ok:true,value}}
  catch(e){return {ok:false,error:clean(e?.message||'Invalid expression',120)}}
}
function parseCalcInputs(src){
  return clean(src,1300).split('|').slice(0,6).map(item=>{
    const [name,def,lo,hi,step]=item.split(':')
    if(!/^[a-zA-Z][a-zA-Z_0-9]{0,20}$/.test(name||''))return null
    const [d,min,max,st]=[def,lo,hi,step].map(validNumeric)
    if([d,min,max,st].some(x=>x===null)||min>=max||st<=0)return null
    return {name,min,max,step:st,value:Math.min(max,Math.max(min,d))}
  }).filter(Boolean).filter((v,i,all)=>all.findIndex(x=>x.name===v.name)===i)
}

export { validNumeric, safeFormula, parseCalcInputs }
