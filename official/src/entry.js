import { jsx, jsxs } from 'react/jsx-runtime'
import * as sdk from '@hermes/plugin-sdk'
import { pluginContext, setPluginContext, clean, hash, ACCENT, MUTED, BORDER, btn, empty } from './shared.js'
import { getWidget } from './widgets.js'
import { LayoutWidget } from './layout-view.js'
import { NATIVE_MARKER, nativeInstructions } from './catalog.js'

const ID = 'hermes-intelligent-ui'
const { host, COMPOSER_AREAS, TRANSCRIPT_DIRECTIVE_AREA, atom, useValue } = sdk
const mode = atom('off')

function renderDirective({attrs={},sessionId}) {
  if (Object.keys(attrs).length>26) return empty('Invalid Intelligent UI component.')
  const kind=clean(attrs.kind,20).toLowerCase()
  const Widget=kind==='layout'?LayoutWidget:getWidget(kind)
  if (!Widget) return empty('Unsupported Intelligent UI component: '+kind)
  return jsx(Widget,{attrs,sessionId},kind==='layout'?hash(attrs.tree||''):kind==='recipe'?hash(JSON.stringify(attrs)):undefined)
}

function Toggle() {
  const selected=useValue(mode)
  const next={off:'auto',auto:'visual',visual:'off'}[selected]||'off'
  const label={off:'Intelligent UI · Off',auto:'Intelligent UI · Auto',visual:'Intelligent UI · Visual'}[selected]
  return jsx('button',{
    type:'button',title:`UI mode: ${selected}. Click to switch to ${next}.`,
    'aria-pressed':selected!=='off','aria-label':`Intelligent UI: ${selected}. Switch to ${next}.`,
    style:{...btn,gap:6,whiteSpace:'nowrap',borderRadius:999,padding:'4px 10px',fontSize:11,
      color:selected!=='off'?ACCENT:MUTED,borderColor:selected!=='off'?ACCENT:BORDER,
      background:selected!=='off'?`color-mix(in srgb, ${ACCENT} 12%, transparent)`:'transparent'},
    onClick:()=>{
      mode.set(next)
      pluginContext?.storage?.set('mode',next)
      host.notify({kind:'info',message:next==='off'?'Intelligent UI disabled.':`Intelligent UI: ${next} mode for new requests.`})
    },children:jsxs('span',{style:{display:'inline-flex',alignItems:'center',gap:5},children:[
      jsx('span',{style:{fontSize:12},children:'◈'}),label]})
  })
}

export default {
  id:ID,
  name:'Hermes Intelligent UI',
  description:'Composer Intelligent UI: inline interactive calculators, diagrams, charts, comparisons and native controls.',
  defaultEnabled:true,
  register(ctx) {
    setPluginContext(ctx)
    const storedMode=ctx.storage.get('mode',null)
    mode.set(['off','auto','visual'].includes(storedMode)?storedMode:(ctx.storage.get('enabled',false)===true?'auto':'off'))
    if (typeof COMPOSER_AREAS?.actions==='string') {
      ctx.register({id:'composer-mode-button',area:COMPOSER_AREAS.actions,order:85,render:()=>jsx(Toggle,{})})
    } else if (typeof COMPOSER_AREAS?.bottom==='string') {
      ctx.register({id:'composer-mode-button',area:COMPOSER_AREAS.bottom,order:85,render:()=>jsx(Toggle,{})})
    }
    if (typeof COMPOSER_AREAS?.middleware==='string') {
      ctx.register({id:'composer-ui-instructions',area:COMPOSER_AREAS.middleware,data:{
        handler(draft) {
          if (mode.get()==='off'||!draft||typeof draft.text!=='string') return draft
          if (!draft.text.trim() || /^\s*\//.test(draft.text) || draft.text.includes(NATIVE_MARKER)) return draft
          return { ...draft, text: draft.text + '\n\n--- Attached Context ---\n\n' + NATIVE_MARKER + '\n' + nativeInstructions(draft.text, mode.get()) }
        }
      }})
    }
    if(typeof TRANSCRIPT_DIRECTIVE_AREA==='string') {
      ctx.register({id:'inline-ui-renderer',area:TRANSCRIPT_DIRECTIVE_AREA,data:{name:'intui',render:renderDirective}})
    } else {
      host.notify({kind:'warning',message:'This Hermes Desktop build lacks inline transcript directives. Update Hermes to use Intelligent UI.'})
    }
    ctx.onDispose(()=>{setPluginContext(null);mode.set('off')})
  }
}
