import { jsx, jsxs } from 'react/jsx-runtime'
import { host } from '@hermes/plugin-sdk'

let pluginContext = null
function setPluginContext(ctx) { pluginContext = ctx }

// Generated UI never executes code/HTML from the model. All attrs are untrusted strings.
function clean(value, limit = 220) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim().slice(0, limit) : ''
}
function cleanInput(value,limit=240){
  return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ch=>ch==='\n'?'\n':ch==='\t'?' ':ch==='\r'?'': ' ').slice(0,limit):''
}
function parts(value, delimiter = '|', count = 12, limit = 160) {
  return clean(value, 6500).split(delimiter).slice(0, count).map(s => clean(s, limit)).filter(Boolean)
}
function number(value, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  const n = Number(String(value).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? Math.max(-1e12, Math.min(1e12, n)) : fallback
}
function fnum(n) {
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
}
function hash(value) {
  let x = 2166136261
  for (let i = 0; i < value.length; i++) x = Math.imul(x ^ value.charCodeAt(i), 16777619)
  return (x >>> 0).toString(36)
}
const COLOR = 'var(--ui-text-primary)'
const MUTED = 'var(--ui-text-secondary)'
const ACCENT = 'var(--ui-accent)'
const BORDER = 'var(--ui-stroke-secondary)'
const RADIUS = 14
const panel = {
  border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '14px 16px',
  margin: '10px 0 14px', width: '100%', maxWidth: 820, boxSizing: 'border-box',
  color: COLOR, background: 'color-mix(in srgb, var(--ui-text-primary) 3%, transparent)',
  fontSize: 13, lineHeight: 1.5, overflow: 'hidden'
}
const sub = { color: MUTED, fontSize: 12 }
const btn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 10px',
  font: 'inherit', color: COLOR, cursor: 'pointer', background: 'transparent',
  maxWidth: '100%', textAlign: 'left'
}
const titleCss = {fontSize: 13, fontWeight: 650, letterSpacing: '-0.012em', marginBottom: 9}
const rowCss = {display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}
function header(attrs, fallback) {
  return jsx('div', {style: titleCss, children: clean(attrs.title, 130) || fallback})
}
function shell(attrs, body, fallback='Interactive UI') {
  const embedded=attrs._nested==='1'
  return jsxs('section', {
    style: embedded?{...panel,margin:0,maxWidth:'none',padding:'10px 11px',height:'100%'}:panel, 'aria-label': clean(attrs.title, 100) || fallback,
    children: [header(attrs, fallback), body,
      (attrs.source || attrs.sample === 'true') && jsx('div', {
        style: {...sub, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${BORDER}`},
        children: attrs.sample === 'true' ? 'Illustrative values · not live data' : `Source: ${clean(attrs.source, 160)}`
      })]
  })
}
function empty(text) { return jsx('div', {style: sub, children: text}) }
function pill(text, key) { return jsx('span', {key, style:{...sub,border:`1px solid ${BORDER}`,borderRadius:100,padding:'2px 9px'},children:text}) }

function safeExternalUrl(value) {
  const s = clean(value,1000)
  if (/^https?:\/\/[^\s/@?#]+(?:\.[^\s/@?#]+|:\d+)(?:[/?#][^\s]*)?$/i.test(s)) return s
  return null
}
function toGap(raw, defaultGap=10) {return Math.max(0,Math.min(32,number(raw,defaultGap)))}
function insertIntoChat(sessionId,text) {
  const message = clean(text,500)
  if (!message) return Promise.resolve(false)
  try {return Promise.resolve(host.composer.insertText(sessionId ?? null,message,{mode:'block'})).then(ok=>{
    if(!ok)host.notify({kind:'warning',message:'Open the source chat to add this to its composer.'})
    return ok
  },()=>{host.notify({kind:'error',message:'Could not insert the selected text.'});return false})}
  catch {host.notify({kind:'error',message:'Could not insert the selected text.'});return Promise.resolve(false)}
}

export { pluginContext, setPluginContext, clean, cleanInput, parts, number, fnum, hash, COLOR, MUTED, ACCENT, BORDER, sub, btn, titleCss, rowCss, shell, empty, pill, safeExternalUrl, toGap, insertIntoChat }
