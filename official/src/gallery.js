import { useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { atom, useValue } from '@hermes/plugin-sdk'
import { NATIVE_EXAMPLES } from './catalog.js'
import { renderDirective } from './render.js'
import { btn, rowCss, sub, GALLERY_SESSION } from './shared.js'

const galleryOpen = atom(false)

// Only the plugin's checked-in examples pass through this parser. Assistant
// replies continue to use Hermes's own transcript directive parser.
const cards = NATIVE_EXAMPLES.map((line, index) => ({
  id: String(index),
  attrs: Object.fromEntries([...line.matchAll(/([a-z]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]))
}))
const initialCard = cards.find(card => card.attrs.title === 'Interactive quote') ?? cards[0]

function isGalleryRequest(text) {
  const phrase = text.trim()
  if (/^\/intui-examples$/i.test(phrase)) return true
  if (phrase.length > 180 || /\n|::|[0-9]|\b(?:using|based on|from|with my|for my|files?|attachments?|html)\b/i.test(phrase)) return false
  const clean = phrase.replace(/[.!?]+$/, '')
  return /^(?:please\s+)?(?:show(?: me)?|open|try|generate|give me|make|create)\s+(?:(?:some|som|a few|a|the)\s+)?(?:examples?\s+(?:of|for)\s+(?:the\s+)?(?:visual\s+)?(?:intelligent ui|native widgets|openui)|(?:(?:visual\s+)?(?:intelligent ui|native widget|openui)\s+examples?|widget examples))(?:\s+(?:here|for me|to test|for me to test|here for me|here to test|here for me to test))?$/i.test(clean)
}

function GalleryButton() {
  const open = useValue(galleryOpen)
  return jsx('button', {
    type: 'button', style: { ...btn, whiteSpace: 'nowrap', fontSize: 11 },
    'aria-expanded': open, onClick: () => galleryOpen.set(!open), children: 'Widget examples'
  })
}

function GalleryPanel() {
  const open = useValue(galleryOpen)
  const [selection, setSelection] = useState(initialCard.id)
  if (!open) return null
  const selected = cards.find(card => card.id === selection) ?? initialCard
  return jsxs('section', {
    'aria-label': 'Native widget examples',
    style: { padding: '10px 12px', maxHeight: 'min(46vh, 420px)', overflowY: 'auto' },
    children: [
      jsxs('div', { style: { ...rowCss, justifyContent: 'space-between' }, children: [
        jsx('strong', { children: 'Native widget examples' }),
        jsx('select', {
          'aria-label': 'Widget example', style: btn, value: selected.id,
          onChange: event => setSelection(event.target.value),
          children: cards.map(card => jsx('option', { value: card.id, children: `${card.attrs.title} · ${card.attrs.kind}` }, card.id))
        }),
        jsx('button', { type: 'button', style: btn, onClick: () => galleryOpen.set(false), children: 'Close examples' })
      ] }),
      jsx('p', { style: sub, children: 'Built-in samples. No model request or files. Draft actions only preview a notification here.' }),
      jsx('div', { children: renderDirective({ attrs: selected.attrs, sessionId: GALLERY_SESSION }) }, selected.id)
    ]
  })
}

export { galleryOpen, isGalleryRequest, GalleryButton, GalleryPanel }
