import { jsx, jsxs } from 'react/jsx-runtime'
import { useState } from 'react'
import { host } from '@hermes/plugin-sdk'
import { pluginContext, clean, parts, number, fnum, hash, COLOR, MUTED, ACCENT, BORDER, sub, btn, rowCss, shell, empty, pill } from './shared.js'

function TableWidget({attrs}) {
  const cols = parts(attrs.columns || attrs.headers,'|',7,80)
  const rows = clean(attrs.rows,10000).split(';').slice(0,80).map(row=>row.split('|').slice(0,cols.length||5).map(x=>clean(x,180)))
  const [search,setSearch] = useState('')
  const [sort,setSort] = useState({column:-1,dir:1})
  if (!cols.length || !rows.length) return empty('Table needs columns and rows.')
  const query=search.toLowerCase().trim()
  const filtered=rows.filter(row=>!query||row.some(v=>v.toLowerCase().includes(query))).sort((a,b)=>{
    if(sort.column<0)return 0
    const av=a[sort.column]??'',bv=b[sort.column]??''
    const an=validNumeric(av.replaceAll(',','')),bn=validNumeric(bv.replaceAll(',',''))
    return sort.dir*(an!==null&&bn!==null?an-bn:av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'}))
  })
  const order=column=>setSort(old=>old.column===column?{column,dir:-old.dir}:{column,dir:1})
  const cell={padding:'8px 10px',borderBottom:`1px solid ${BORDER}`,verticalAlign:'top',overflowWrap:'anywhere',textAlign:'left'}
  return shell(attrs,jsxs('div',{children:[
    jsxs('div',{style:{...rowCss,justifyContent:'space-between',marginBottom:9},children:[
      jsx('input',{type:'search',value:search,onChange:e=>setSearch(e.target.value.slice(0,120)),placeholder:'Filter rows…','aria-label':'Filter table rows',style:{...btn,width:'min(230px,100%)',fontSize:12}}),
      jsx('span',{style:sub,children:`${filtered.length} of ${rows.length} rows`})
    ]}),
    jsx('div',{style:{overflowX:'auto'},children:jsxs('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:12},children:[
      jsx('thead',{children:jsx('tr',{children:cols.map((c,i)=>jsx('th',{scope:'col',style:{...cell,color:MUTED,fontWeight:580},children:jsx('button',{type:'button',onClick:()=>order(i),'aria-label':`Sort by ${c}`,style:{border:0,background:'transparent',color:'inherit',font:'inherit',cursor:'pointer',textAlign:'left',padding:0},children:c+(sort.column===i?(sort.dir>0?' ↑':' ↓'):'')})},i))})}),
      jsx('tbody',{children:filtered.map((r,i)=>jsx('tr',{children:cols.map((_,j)=>jsx('td',{style:cell,children:r[j]||'—'},j))},i))})
    ]})})
  ]}),'Table')
}

function StepsWidget({attrs}) {
  const items = parts(attrs.items||attrs.steps,'|',14,180)
  const details = parts(attrs.details,'|',14,220)
  return shell(attrs, jsx('ol',{style:{margin:0,padding:0,listStyle:'none',display:'grid',gap:12},children:items.map((v,i)=>jsxs('li',{style:{display:'flex',alignItems:'flex-start',gap:12},children:[
    jsx('span',{style:{display:'inline-flex',flexShrink:0,width:23,height:23,borderRadius:100,alignItems:'center',justifyContent:'center',background:`color-mix(in srgb, ${ACCENT} 17%, transparent)`,color:ACCENT,fontSize:12,fontWeight:650},children:String(i+1)}),
    jsxs('div',{children:[jsx('div',{style:{fontWeight:540},children:v}),details[i]&&jsx('div',{style:sub,children:details[i]})]})
  ]},i))}), 'Steps')
}
function CardsWidget({attrs}) {
  const labels=parts(attrs.labels||attrs.items,'|',8,110)
  const values=parts(attrs.values,'|',8,100)
  const details=parts(attrs.details,'|',8,240)
  return shell(attrs, jsx('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,175px),1fr))',gap:10},children:labels.map((label,i)=>jsxs('div',{style:{border:`1px solid ${BORDER}`,borderRadius:10,padding:12,minWidth:0},children:[
    jsx('div',{style:{fontWeight:630},children:label}),values[i]&&jsx('div',{style:{fontSize:20,fontWeight:650,marginTop:5},children:values[i]}),
    details[i]&&jsx('div',{style:{...sub,marginTop:5},children:details[i]})
  ]},i))}), 'Cards')
}
function ChecklistWidget({attrs,sessionId}) {
  const items = parts(attrs.items,'|',20,190)
  const key='checks:'+hash((sessionId||'new')+'|'+JSON.stringify(attrs))
  const [checked,setChecked] = useState(()=> {
    const saved = pluginContext?.storage?.get(key,[])
    return Array.isArray(saved)?saved.filter(n=>Number.isInteger(n)&&n>=0&&n<items.length):[]
  })
  const toggle=i=>{
    const next=checked.includes(i)?checked.filter(x=>x!==i):[...checked,i]
    setChecked(next)
    pluginContext?.storage?.set(key,next)
  }
  return shell(attrs, jsxs('div',{children:[
    jsx('div',{style:{...sub,marginBottom:10},children:`${checked.length} of ${items.length} complete`}),
    jsx('div',{style:{display:'grid',gap:9},children:items.map((item,i)=>jsxs('label',{style:{display:'flex',gap:9,alignItems:'flex-start',cursor:'pointer'},children:[
      jsx('input',{type:'checkbox',checked:checked.includes(i),onChange:()=>toggle(i),style:{accentColor:ACCENT,marginTop:3}}),
      jsx('span',{style:{textDecoration:checked.includes(i)?'line-through':'none',opacity:checked.includes(i)?0.62:1},children:item})
    ]},i))})
  ]}), 'Checklist')
}
function TabsWidget({attrs}) {
  const tabs=parts(attrs.tabs||attrs.labels,'|',8,70)
  const content=parts(attrs.contents||attrs.details,'|',8,900)
  const [active,setActive]=useState(0)
  return shell(attrs, jsxs('div',{children:[
    jsx('div',{style:{...rowCss,gap:6,marginBottom:10},role:'tablist',children:tabs.map((t,i)=>jsx('button',{type:'button',role:'tab','aria-selected':active===i,style:{...btn,fontSize:12,background:active===i?`color-mix(in srgb, ${ACCENT} 14%, transparent)`:'transparent',borderColor:active===i?ACCENT:BORDER},onClick:()=>setActive(i),children:t},i))}),
    jsx('div',{role:'tabpanel',style:{whiteSpace:'pre-wrap',minHeight:30},children:content[active]||'—'})
  ]}), 'Tabs')
}
function OptionsWidget({attrs,sessionId}) {
  const choices = parts(attrs.choices||attrs.items,'|',12,100)
  const [selected,setSelected]=useState('')
  const insert = async choice => {
    setSelected(choice)
    const text = clean(attrs.prompt,200).replaceAll('[choice]',choice).replaceAll('{choice}',choice) || `I choose: ${choice}`
    try {
      const ok = await host.composer.insertText(sessionId??null,text,{mode:'block'})
      if (!ok) host.notify({kind:'warning',message:'Open this chat to add your selection.'})
    } catch { host.notify({kind:'error',message:'Cannot insert into the composer.'}) }
  }
  return shell(attrs, jsxs('div',{children:[
    attrs.detail&&jsx('div',{style:{...sub,marginBottom:12},children:clean(attrs.detail,300)}),
    jsx('div',{style:{...rowCss,gap:8},children:choices.map((c,i)=>jsx('button',{type:'button',style:{...btn,background:selected===c?`color-mix(in srgb, ${ACCENT} 14%, transparent)`:'transparent',borderColor:selected===c?ACCENT:BORDER},onClick:()=>void insert(c),children:c},i))}),
    jsx('div',{style:{...sub,marginTop:11},children:'Selecting an option adds it to this chat’s composer. Review it before sending.'})
  ]}), 'Choose an option')
}
function NoticeWidget({attrs}) {
  return shell(attrs, jsxs('div',{style:{display:'grid',gap:8},children:[
    jsx('div',{style:{whiteSpace:'pre-wrap'},children:clean(attrs.text||attrs.body||attrs.detail,2500)}),
    attrs.tags && jsx('div',{style:rowCss,children:parts(attrs.tags,'|',10,50).map((t,i)=>pill(t,i))})
  ]}), 'Note')
}

function TimelineWidget({attrs}){
  const items=parts(attrs.items,'|',12,110),dates=parts(attrs.dates,'|',12,65),details=parts(attrs.details,'|',12,180)
  const statuses=parts(attrs.statuses,'|',12,25)
  return shell(attrs,jsx('ol',{style:{padding:0,margin:0,listStyle:'none',display:'grid',gap:0},children:items.map((x,i)=>jsxs('li',{style:{display:'grid',gridTemplateColumns:'minmax(65px,95px) 18px 1fr',gap:9,alignItems:'stretch'},children:[
    jsx('div',{style:{...sub,paddingTop:5,textAlign:'right'},children:dates[i]||`#${i+1}`}),
    jsxs('div',{style:{display:'flex',flexDirection:'column',alignItems:'center'},children:[
      jsx('div',{style:{width:11,height:11,marginTop:7,borderRadius:'50%',border:`2px solid ${statuses[i]==='done'?ACCENT:BORDER}`,background:statuses[i]==='done'?ACCENT:'transparent'}}),
      i!==items.length-1&&jsx('div',{style:{width:1,minHeight:18,background:BORDER,flex:1}})
    ]}),
    jsxs('div',{style:{paddingBottom:18},children:[jsx('div',{style:{fontWeight:580},children:x}),
      details[i]&&jsx('div',{style:sub,children:details[i]}),statuses[i]&&jsx('div',{style:{...sub,marginTop:2},children:statuses[i]})]})
  ]},i))}),'Timeline')
}

function AccordionWidget({attrs}) {
  const labels=parts(attrs.labels||attrs.items,'|',12,120)
  const content=parts(attrs.contents||attrs.details,'|',12,1000)
  return shell(attrs,jsx('div',{style:{display:'grid',gap:6},children:labels.map((x,i)=>jsxs('details',{
    style:{border:`1px solid ${BORDER}`,borderRadius:8,padding:'8px 10px'},children:[
      jsx('summary',{style:{cursor:'pointer',fontWeight:560},children:x}),
      jsx('p',{style:{...sub,margin:'8px 0 2px',whiteSpace:'pre-wrap'},children:content[i]||'—'})
    ]},i))}),'Expandable sections')
}
function KeyValueWidget({attrs}) {
  const labels=parts(attrs.labels||attrs.keys,'|',16,90), values=parts(attrs.values,'|',16,170)
  return shell(attrs,jsx('dl',{style:{margin:0,display:'grid',gridTemplateColumns:'minmax(85px,0.7fr) minmax(0,1.3fr)',gap:'9px 14px'},children:labels.flatMap((key,i)=>[
    jsx('dt',{style:{...sub,overflowWrap:'anywhere'},children:key},`k${i}`),
    jsx('dd',{style:{margin:0,fontWeight:570,overflowWrap:'anywhere'},children:values[i]||'—'},`v${i}`)
  ])}),'Properties')
}

export { TableWidget, StepsWidget, CardsWidget, ChecklistWidget, TabsWidget, OptionsWidget, NoticeWidget, TimelineWidget, AccordionWidget, KeyValueWidget }
