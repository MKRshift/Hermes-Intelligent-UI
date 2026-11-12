import './openui-styles.css'

import { Renderer, type ActionEvent } from '@openuidev/react-lang'
import { host } from '@hermes/plugin-sdk'
import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'
import { useSessionView } from '@/app/chat/session-view'
import { runLibraryAction } from './thesys-lib/actions'
import { demoTools } from './thesys-lib/demo-data'
import { library } from './thesys-lib/library'

const MAX_CODE_CHARS = 150_000
const MAX_STATE_CHARS = 48_000
// The upstream demo's queries are read-only demo queries. Never register
// model-defined mutations or arbitrary filesystem/network tools here.
const readOnlyTools = Object.fromEntries(Object.entries(demoTools).filter(([name]) =>
  !/^(set|create|delete|update|mutate|write|save|submit|book|buy|remove)/i.test(name)))

function safeURL(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw)
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null
    return u.toString()
  } catch { return null }
}
function safeText(value: unknown, limit=6000): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, limit)
}
function keyFor(session: string | null, source: string) {
  let h = 2166136261
  for (const c of source) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return `hermes-openui-v070:${session || 'local'}:${(h>>>0).toString(36)}`
}
function initialStateFor(key: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch { return {} }
}
/** The original Thesys OpenUI library, parsed/rendered by the REAL OpenUI runtime.
 * An inline assistant message, NOT an iframe or another chat window. */
export function HermesOpenUI({ response, isStreaming }: { response: string; isStreaming: boolean }) {
  const view = useSessionView()
  const storedId = useStore(view.$storedId)
  const runtimeId = useStore(view.$runtimeId)
  const sessionId = storedId || runtimeId || null
  const key = keyFor(sessionId, response)
  const [state, setState] = useState<Record<string, unknown>>(() => initialStateFor(key))
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const update=() => setDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const handleAction = useCallback((event: ActionEvent) => {
    if (event.type === 'continue_conversation') {
      const lines = [safeText(event.humanFriendlyMessage || 'Continue from this interface')]
      if (event.formState) lines.push(`Form values: ${safeText(JSON.stringify(event.formState), 12000)}`)
      if (event.params && 'context' in event.params && event.params.context !== undefined)
        lines.push(`Context: ${safeText(JSON.stringify(event.params.context), 12000)}`)
      void Promise.resolve(host.composer.insertText(sessionId, lines.join('\n'), { mode: 'block' }))
        .then(ok => { if (!ok) host.notify({kind:'warning',message:'Open the original chat to use this action.'}) })
        .catch(() => host.notify({kind:'warning',message:'Could not insert the action into the composer.'}))
    } else if (event.type === 'open_url') {
      const url = safeURL(event.params?.url)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } else if (event.type === 'CopyToClipboard') {
      void runLibraryAction(event)
    }
  }, [sessionId])
  const handleState = useCallback((value: Record<string, unknown>) => {
    try {
      const serialized = JSON.stringify(value)
      if (serialized.length <= MAX_STATE_CHARS) localStorage.setItem(key, serialized)
    } catch { /* Disable persistence if browser storage is unavailable. */ }
  }, [key])
  useEffect(() => { setState(initialStateFor(key)) }, [key])
  if (response.length > MAX_CODE_CHARS) return <div>OpenUI payload is too large to render safely.</div>
  return (
    <section className="hermes-openui-original" data-openui-theme={dark ? 'dark' : 'light'}
      style={{width:'100%',maxWidth:'100%',minWidth:0,overflow:'hidden',margin:'12px 0'}}>
      <Renderer
        response={response}
        isStreaming={isStreaming}
        library={library}
        toolProvider={readOnlyTools}
        onAction={handleAction}
        initialState={state}
        onStateUpdate={handleState}
      />
    </section>
  )
}
