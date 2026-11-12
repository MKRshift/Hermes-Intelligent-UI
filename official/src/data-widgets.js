import { jsx, jsxs } from 'react/jsx-runtime'
import { useState } from 'react'
import { host } from '@hermes/plugin-sdk'
import { clean, parts, number, fnum, hash, COLOR, MUTED, ACCENT, BORDER, sub, btn, rowCss, shell, empty, insertIntoChat } from './shared.js'
import { validNumeric, safeFormula, parseCalcInputs } from './arithmetic.js'

function StatWidget({attrs}) {
  const labels = parts(attrs.labels || attrs.label, '|', 6, 65)
  const values = parts(attrs.values || attrs.value, '|', 6, 80)
  const details = parts(attrs.details || attrs.detail, '|', 6, 100)
  return shell(attrs, jsx('div', {style:{display:'grid',gridTemplateColumns:`repeat(${Math.max(1,Math.min(3,values.length))},minmax(0,1fr))`,gap:12},
    children: values.map((v, i) => jsxs('div', {style:{minWidth:0},children:[
      jsx('div',{style:sub,children:labels[i] || 'Metric'}),
      jsx('div',{style:{fontSize:25,fontWeight:690,letterSpacing:'-.035em',overflowWrap:'anywhere'},children:v}),
      details[i] && jsx('div',{style:sub,children:details[i]})
    ]},i))}), 'Metrics')
}
function ProgressWidget({attrs}) {
  const val = number(attrs.value)
  const max = Math.max(0.00001,number(attrs.max,100))
  const pct = Math.max(0,Math.min(100,val/max*100))
  return shell(attrs, jsxs('div',{children:[
    jsxs('div',{style:{...rowCss,justifyContent:'space-between',marginBottom:8},children:[jsx('span',{style:sub,children:clean(attrs.label)||'Progress'}),jsx('strong',{children:`${fnum(val)} / ${fnum(max)}${clean(attrs.unit,12)}`})]}),
    jsx('div',{style:{height:8,background:`color-mix(in srgb, ${MUTED} 13%, transparent)`,borderRadius:99,overflow:'hidden'},children:jsx('div',{style:{height:'100%',width:`${pct}%`,background:ACCENT,borderRadius:99}})}),
    attrs.detail && jsx('div',{style:{...sub,marginTop:9},children:clean(attrs.detail,250)})
  ]}), 'Progress')
}
function ChartWidget({attrs, line}) {
  const labels = parts(attrs.labels, '|', 16, 40)
  const raw = parts(attrs.values, '|', 16, 28).map(x=>number(x,NaN))
  const pairs = labels.map((label,i)=>({label,value:raw[i]})).filter(x=>Number.isFinite(x.value))
  const [asTable,setAsTable] = useState(false)
  if (!pairs.length) return empty('No numeric chart data provided.')
  const lo = Math.min(0,...pairs.map(x=>x.value)); const hi=Math.max(1,...pairs.map(x=>x.value))
  const pct = x => Math.max(0,Math.min(100,(x-lo)/Math.max(1e-8,hi-lo)*100))
  const chart = line ? (
    jsxs('div',{children:[
      jsx('svg',{viewBox:'0 0 600 175',width:'100%',height:175,role:'img','aria-label':clean(attrs.title)||'Line chart',style:{overflow:'visible'},children:jsxs('g',{children:[
        [0,1,2,3].map(i=>jsx('line',{x1:30,x2:580,y1:25+i*40,y2:25+i*40,stroke:BORDER,strokeWidth:1},i)),
        jsx('polyline',{points:pairs.map((p,i)=>`${35+i*540/Math.max(1,pairs.length-1)},${150-125*pct(p.value)/100}`).join(' '),fill:'none',stroke:ACCENT,strokeWidth:3,strokeLinejoin:'round',strokeLinecap:'round'}),
        pairs.map((p,i)=>jsx('circle',{cx:35+i*540/Math.max(1,pairs.length-1),cy:150-125*pct(p.value)/100,r:3.7,fill:ACCENT},i))
      ]})}),
      jsx('div',{style:{...rowCss,justifyContent:'space-between'},children:pairs.filter((_,i)=>pairs.length<=7 || i===0 || i===pairs.length-1 || i % Math.ceil(pairs.length/5)===0).map((p,i)=>jsx('span',{style:sub,children:p.label},i))})
    ]})
  ) : jsx('div',{style:{display:'grid',gap:9},children:pairs.map((p,i)=>jsxs('div',{style:{display:'grid',gridTemplateColumns:'minmax(70px,115px) 1fr auto',gap:10,alignItems:'center'},children:[
    jsx('span',{style:{...sub,overflowWrap:'anywhere'},children:p.label}),
    jsx('div',{style:{height:12,borderRadius:5,background:`color-mix(in srgb, ${MUTED} 11%, transparent)`,overflow:'hidden'},children:jsx('div',{style:{height:'100%',width:`${pct(p.value)}%`,background:ACCENT,borderRadius:5}})}),
    jsx('span',{style:{...sub,fontVariantNumeric:'tabular-nums'},children:`${fnum(p.value)}${clean(attrs.unit,12)}`})
  ]},i))})
  const table = jsx('table',{style:{width:'100%',borderCollapse:'collapse',fontVariantNumeric:'tabular-nums'},children:jsx('tbody',{children:pairs.map((p,i)=>jsxs('tr',{children:[jsx('td',{style:{padding:'6px 4px',borderBottom:`1px solid ${BORDER}`},children:p.label}),jsx('td',{style:{padding:'6px 4px',textAlign:'right',borderBottom:`1px solid ${BORDER}`},children:`${fnum(p.value)}${clean(attrs.unit,12)}`})]},i))})})
  return shell(attrs, jsxs('div',{children:[
    jsx('div',{style:{display:'flex',justifyContent:'flex-end',marginBottom:9},children:jsx('button',{type:'button',style:{...btn,fontSize:11,padding:'4px 8px'},onClick:()=>setAsTable(!asTable),children:asTable?'Show chart':'View data'})}),
    asTable?table:chart,
    attrs.detail && jsx('div',{style:{...sub,marginTop:10},children:clean(attrs.detail,320)})
  ]}), line?'Line chart':'Bar chart')
}

const chartColors=[ACCENT, '#a78bfa', '#38bdf8', '#f59e0b', '#fb7185', '#2dd4bf', '#94a3b8']

function CalculatorWidget({attrs,sessionId}){
  const inputs=parseCalcInputs(attrs.inputs)
  const labels=parts(attrs.labels,'|',6,70)
  const defaults=()=>Object.fromEntries(inputs.map(x=>[x.name,x.value]))
  const [values,setValues]=useState(defaults)
  const computed=safeFormula(attrs.expression||attrs.formula||'',values)
  const set=(input,raw)=>{const n=validNumeric(raw);if(n===null)return;setValues(old=>({...old,[input.name]:Math.min(input.max,Math.max(input.min,n))}))}
  if(!inputs.length)return empty('Calculator needs valid inputs.')
  const controls=inputs.map((input,i)=>jsxs('div',{style:{display:'grid',gap:4,minWidth:0},children:[
    jsxs('label',{htmlFor:`intui-${hash(attrs.title+'|'+input.name)}`,style:{...sub,fontWeight:600},children:[labels[i]||input.name]}),
    jsxs('div',{style:{display:'flex',gap:9,alignItems:'center'},children:[
      jsx('input',{id:`intui-${hash(attrs.title+'|'+input.name)}`,type:'range',min:input.min,max:input.max,step:input.step,value:values[input.name],onChange:e=>set(input,e.target.value),style:{flex:1,accentColor:ACCENT,minWidth:0}}),
      jsx('input',{type:'number','aria-label':`${labels[i]||input.name} value`,min:input.min,max:input.max,step:input.step,value:values[input.name],onChange:e=>set(input,e.target.value),style:{...btn,width:92,fontVariantNumeric:'tabular-nums',padding:'6px 8px',boxSizing:'border-box'}})
    ]})
  ]},input.name))
  return shell(attrs,jsxs('div',{children:[
    jsx('div',{style:{display:'grid',gap:13},children:controls}),
    jsxs('div',{style:{background:`color-mix(in srgb, ${ACCENT} 8%, transparent)`,padding:13,borderRadius:10,marginTop:16},children:[
      jsx('div',{style:sub,children:clean(attrs.result||attrs.output,100)||'Result'}),
      jsx('div',{role:'status','aria-live':'polite',style:{fontSize:26,fontWeight:700,fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere'},children:computed.ok?`${fnum(computed.value)} ${clean(attrs.unit,24)}`.trim():`Error: ${computed.error}`})
    ]}),
    jsx('div',{style:{...rowCss,marginTop:10},children:[
      jsx('button',{type:'button',style:btn,onClick:()=>setValues(defaults()),children:'Reset inputs'}),
      jsx('button',{type:'button',disabled:!computed.ok,style:{...btn,opacity:computed.ok?1:0.4},onClick:()=>void insertIntoChat(sessionId,`${clean(attrs.result||attrs.output,80)||'Result'}: ${fnum(computed.value)} ${clean(attrs.unit,24)}`.trim()),children:'Use result in chat'})
    ]}),
    attrs.detail&&jsx('div',{style:{...sub,marginTop:8},children:clean(attrs.detail,350)})
  ]}),'Interactive calculator')
}
function DonutWidget({attrs}){
  const labels=parts(attrs.labels,'|',8,85)
  const nums=parts(attrs.values,'|',8,40).map(validNumeric)
  const items=labels.map((label,i)=>({label,value:nums[i]})).filter(x=>x.value!==null&&x.value>=0)
  const total=items.reduce((acc,x)=>acc+x.value,0)
  if(!items.length||total<=0)return empty('Donut chart requires positive values.')
  const c=2*Math.PI*47;let offset=0
  const arcs=items.map((item,i)=>{
    const fraction=item.value/total
    const element=jsx('circle',{cx:70,cy:70,r:47,fill:'none',stroke:chartColors[i%chartColors.length],strokeWidth:17,
      strokeDasharray:`${fraction*c} ${c}`,strokeDashoffset:-offset*c,transform:'rotate(-90 70 70)'},i)
    offset+=fraction;return element
  })
  return shell(attrs,jsxs('div',{style:{display:'grid',gridTemplateColumns:'minmax(130px,190px) 1fr',gap:12,alignItems:'center'},children:[
    jsx('svg',{viewBox:'0 0 140 140',role:'img','aria-label':`Part-to-whole chart with total ${fnum(total)}`,children:jsxs('g',{children:[...arcs,
      jsx('text',{x:70,y:69,textAnchor:'middle',fontSize:17,fontWeight:700,fill:COLOR,children:fnum(total)}),
      jsx('text',{x:70,y:84,textAnchor:'middle',fontSize:9,fill:MUTED,children:'Total'})]})}),
    jsx('div',{style:{display:'grid',gap:9},children:items.map((x,i)=>jsxs('div',{style:{display:'grid',gridTemplateColumns:'10px 1fr auto',alignItems:'center',gap:7},children:[
      jsx('span',{style:{width:9,height:9,borderRadius:2,background:chartColors[i%chartColors.length]}}),
      jsx('span',{style:{...sub,overflowWrap:'anywhere'},children:x.label}),
      jsx('span',{style:{fontVariantNumeric:'tabular-nums',fontSize:12},children:`${(100*x.value/total).toFixed(1)}%`})
    ]},i))})
  ]}),'Donut chart')
}

function MatrixWidget({attrs,sessionId}){
  const options=parts(attrs.options,'|',6,80),criteria=parts(attrs.criteria,'|',6,80)
  const rows=clean(attrs.scores,1600).split(';').slice(0,6).map(r=>r.split('|').slice(0,6).map(validNumeric))
  const initial=parts(attrs.weights,'|',6,20).map(x=>validNumeric(x)??1)
  const [weights,setWeights]=useState(()=>criteria.map((_,i)=>Math.min(5,Math.max(0,initial[i]??1))))
  if(!criteria.length||options.length<2||rows.length!==options.length||rows.some(r=>r.length!==criteria.length||r.some(x=>x===null||x<0||x>10)))return empty('Comparison requires 2–6 options and scores (0–10) for every criterion.')
  const total=weights.reduce((s,n)=>s+n,0)
  const rankings=options.map((option,i)=>({option,score:total>0?rows[i].reduce((s,x,j)=>s+x*weights[j],0)/total:null})).sort((a,b)=>(b.score??-1)-(a.score??-1))
  const copy=async()=>{
    const text=`Compare my selection: ${rankings.map(r=>`${r.option} ${r.score===null?'unrated':r.score.toFixed(2)+'/10'}`).join(', ')}. Criteria weights: ${criteria.map((c,i)=>`${c}=${weights[i]}`).join(', ')}.`
    try{const ok=await host.composer.insertText(sessionId??null,text,{mode:'block'});if(!ok)host.notify({kind:'warning',message:'Open this chat to insert the ranking.'})}
    catch{host.notify({kind:'error',message:'Cannot insert the comparison.'})}
  }
  return shell(attrs,jsxs('div',{children:[
    jsx('div',{style:{...sub,marginBottom:11},children:'Adjust criterion weights (0–5). Scores are supplied by the answer, not recalculated.'}),
    jsx('div',{style:{display:'grid',gap:9},children:criteria.map((c,i)=>jsxs('label',{style:{display:'grid',gridTemplateColumns:'minmax(70px,125px) 1fr 25px',alignItems:'center',gap:10},children:[
      jsx('span',{style:sub,children:c}),
      jsx('input',{type:'range',min:0,max:5,step:1,value:weights[i],onChange:e=>{const n=Number(e.target.value);setWeights(a=>a.map((v,j)=>j===i?n:v))},style:{width:'100%',accentColor:ACCENT}}),
      jsx('span',{style:{...sub,fontVariantNumeric:'tabular-nums'},children:String(weights[i])})
    ]},i))}),
    jsx('div',{style:{display:'grid',gap:8,marginTop:13},children:rankings.map((r,i)=>jsxs('div',{style:{display:'grid',gridTemplateColumns:'24px minmax(0,1fr) auto',gap:9,alignItems:'center',padding:'9px 11px',border:`1px solid ${BORDER}`,borderRadius:9},children:[
      jsx('span',{style:{color:ACCENT,fontWeight:650},children:String(i+1)}),
      jsx('span',{style:{fontWeight:550,overflowWrap:'anywhere'},children:r.option}),
      jsx('span',{style:{fontVariantNumeric:'tabular-nums'},children:r.score===null?'Set weights':`${r.score.toFixed(2)} / 10`})
    ]},r.option))}),
    jsx('button',{type:'button',style:{...btn,marginTop:12},onClick:()=>void copy(),children:'Use ranking in chat'})
  ]}),'Adjustable comparison')
}
function DiagramWidget({attrs}){
  const nodes=parts(attrs.nodes||attrs.items,'|',9,65)
  const details=parts(attrs.details,'|',9,180)
  const links=parts(attrs.links,'|',16,15).map(x=>{const m=/^(\d+)>(\d+)$/.exec(x);return m?[+m[1],+m[2]]:null}).filter(p=>p&&p[0]<nodes.length&&p[1]<nodes.length&&p[0]!==p[1])
  const [selected,setSelected]=useState(0)
  if(nodes.length<2)return empty('Diagram requires at least two nodes.')
  const columns=Math.min(3,nodes.length),rows=Math.ceil(nodes.length/columns),w=580,h=rows*98+16,unit=w/columns
  const coords=nodes.map((_,i)=>({x:(i%columns+.5)*unit,y:60+Math.floor(i/columns)*98}))
  const id=`arrow-${hash(JSON.stringify(attrs))}`
  return shell(attrs,jsxs('div',{children:[
    jsx('svg',{viewBox:`0 0 ${w} ${h}`,width:'100%',role:'img','aria-label':`Diagram: ${nodes.join(', ')}`,children:jsxs('g',{children:[
      jsx('defs',{children:jsx('marker',{id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse',children:jsx('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:ACCENT})})}),
      links.map(([a,b],i)=>jsx('line',{x1:coords[a].x,y1:coords[a].y,x2:coords[b].x,y2:coords[b].y,stroke:ACCENT,strokeWidth:1.8,opacity:.65,markerEnd:`url(#${id})`},i)),
      nodes.map((t,i)=>jsxs('g',{children:[jsx('rect',{x:coords[i].x-unit*.36,y:coords[i].y-27,width:unit*.72,height:54,rx:10,fill:'var(--ui-bg-primary, var(--background))',stroke:selected===i?ACCENT:BORDER,strokeWidth:selected===i?2:1.5}),
        jsx('text',{x:coords[i].x,y:coords[i].y+5,textAnchor:'middle',fontSize:13,fill:COLOR,children:t.length>22?t.slice(0,21)+'…':t})]},i))
    ]})}),
    jsx('div',{style:{...rowCss,gap:6},children:nodes.map((x,i)=>jsx('button',{type:'button',style:{...btn,borderColor:selected===i?ACCENT:BORDER,fontSize:11},onClick:()=>setSelected(i),children:x},i))}),
    details[selected]&&jsx('div',{style:{...sub,marginTop:8},children:details[selected]})
  ]}),'Flow diagram')
}

function GaugeWidget({attrs}) {
  const val=number(attrs.value),max=number(attrs.max,100), min=number(attrs.min,0)
  const pct=max>min?Math.max(0,Math.min(1,(val-min)/(max-min))):0
  const circumference=2*Math.PI*44
  return shell(attrs,jsxs('div',{style:{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'},children:[
    jsx('svg',{viewBox:'0 0 120 120',width:120,height:120,role:'img','aria-label':`${clean(attrs.label||'Gauge')}: ${fnum(val)} of ${fnum(max)}`,children:jsxs('g',{children:[
      jsx('circle',{cx:60,cy:60,r:44,stroke:BORDER,strokeWidth:12,fill:'none'}),
      jsx('circle',{cx:60,cy:60,r:44,stroke:ACCENT,strokeWidth:12,fill:'none',strokeLinecap:'round',strokeDasharray:`${circumference*pct} ${circumference}`,transform:'rotate(-90 60 60)'}),
      jsx('text',{x:60,y:65,textAnchor:'middle',fill:COLOR,fontSize:20,fontWeight:700,children:`${Math.round(pct*100)}%`})
    ]})}),
    jsxs('div',{style:{display:'grid',gap:3},children:[
      jsx('span',{style:sub,children:clean(attrs.label)||'Current value'}),
      jsx('strong',{style:{fontSize:24,fontVariantNumeric:'tabular-nums'},children:`${fnum(val)} ${clean(attrs.unit,16)}`.trim()}),
      jsx('span',{style:sub,children:`Range: ${fnum(min)} – ${fnum(max)}`}),
      attrs.detail && jsx('span',{style:sub,children:clean(attrs.detail,320)})
    ]})
  ]}),'Gauge')
}
function ScatterWidget({attrs}) {
  const names=parts(attrs.labels,'|',24,55)
  const raw=parts(attrs.points,'|',24,70)
  const points=raw.map((chunk,i)=>{
    const found=/^\s*([+\-]?(?:\d+(?:\.\d*)?|\.\d+))\s*:\s*([+\-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/.exec(chunk)
    if(!found)return null
    const x=validNumeric(found[1]),y=validNumeric(found[2]);return x===null||y===null?null:{x,y,label:names[i]||`Point ${i+1}`}
  }).filter(Boolean)
  if(!points.length)return empty('Scatter plot needs points="1:3|2:5".')
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y)
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  const px=x=>45+(x-minX)/Math.max(1e-10,maxX-minX)*490
  const py=y=>165-(y-minY)/Math.max(1e-10,maxY-minY)*135
  return shell(attrs,jsx('div',{children:jsx('svg',{viewBox:'0 0 580 200',width:'100%',role:'img','aria-label':`Scatter plot: ${points.length} data points`,children:jsxs('g',{children:[
    [0,1,2,3].map(i=>jsx('line',{x1:45,x2:535,y1:30+i*45,y2:30+i*45,stroke:BORDER},i)),
    jsx('line',{x1:45,x2:45,y1:30,y2:165,stroke:MUTED}),
    jsx('text',{x:535,y:192,textAnchor:'end',fontSize:12,fill:MUTED,children:clean(attrs.x||attrs.xlabel,40)||`X (${fnum(minX)} to ${fnum(maxX)})`}),
    jsx('text',{x:46,y:16,textAnchor:'start',fontSize:12,fill:MUTED,children:clean(attrs.y||attrs.ylabel,40)||`Y (${fnum(minY)} to ${fnum(maxY)})`}),
    points.map((p,i)=>jsx('circle',{cx:px(p.x),cy:py(p.y),r:5,fill:ACCENT,stroke:'var(--ui-bg-primary,transparent)',strokeWidth:1.5,children:jsx('title',{children:`${p.label}: (${fnum(p.x)}, ${fnum(p.y)})`})},i))
  ]})})}),'Scatter plot')
}
function SparklineWidget({attrs}) {
  const raw=parts(attrs.values,'|',30,28), v=raw.map(validNumeric)
  if(v.length<2||v.some(x=>x===null))return empty('Sparkline needs at least two numeric values.')
  const lo=Math.min(...v),hi=Math.max(...v),range=Math.max(1e-9,hi-lo)
  return shell(attrs,jsxs('div',{style:{display:'flex',alignItems:'center',gap:14},children:[
    jsx('svg',{viewBox:'0 0 200 65',width:'55%',height:65,role:'img','aria-label':'Trend sparkline',children:jsx('polyline',{
      fill:'none',stroke:ACCENT,strokeWidth:3,strokeLinecap:'round',strokeLinejoin:'round',
      points:v.map((x,i)=>`${5+i*190/(v.length-1)},${57-50*(x-lo)/range}`).join(' ')})}),
    jsxs('div',{style:{display:'grid',gap:4},children:[
      jsx('div',{style:{...sub},children:clean(attrs.label,80)||'Latest'}),
      jsx('div',{style:{fontWeight:690,fontSize:21},children:`${fnum(v.at(-1))} ${clean(attrs.unit,16)}`.trim()})
    ]})
  ]}),'Trend')
}

export { StatWidget, ProgressWidget, ChartWidget, CalculatorWidget, DonutWidget, MatrixWidget, DiagramWidget, GaugeWidget, ScatterWidget, SparklineWidget }
