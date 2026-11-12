import * as sdk from '@hermes/plugin-sdk'
import { Renderer, type ActionEvent } from '@openuidev/react-lang'
import { useCallback, useEffect, useState } from 'react'
import { readWidgetState, rememberWidgetState, checkpointWidgetState, widgetKey } from '../../../bridge/openui-state'
import theme from '../../../vendor/thesys-lib/components/theme.css'
import styles from '../../../vendor/thesys-lib/components/components.css'
import base from '../../../bridge/openui-styles.css'
import layout from './layout.css'
import { pluginContext } from '../shared.js'
import { library } from './library'
import { ID, getProgram, programs, replayOpenUI } from './transport.js'

const { host, useValue } = sdk
const widgetStyles = theme + base + `@scope (.hermes-openui-original) { ${styles} }\n` + layout

export function installOpenUIStyles(ctx: { onDispose: (fn: () => void) => void }) {
  if (typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = widgetStyles
  document.head.append(style)
  ctx.onDispose(() => style.remove())
}

function actionHandler(event: ActionEvent, sessionId: string | null) {
  if (event.type === 'continue_conversation') {
    if (!sessionId) return
    const message = String(event.humanFriendlyMessage || 'Continue from this interface').slice(0, 4000)
    const values = event.formState ? '\nForm values: ' + JSON.stringify(event.formState).slice(0, 8000) : ''
    const context = event.params?.context !== undefined ? '\nContext: ' + JSON.stringify(event.params.context).slice(0, 4000) : ''
    void Promise.resolve(host.composer.insertText(sessionId, message + values + context, { mode: 'block' }))
      .then(ok => { if (!ok) host.notify({ kind: 'warning', message: 'Open the original chat to use this action.' }) })
      .catch(() => host.notify({ kind: 'warning', message: 'Could not prepare the follow-up.' }))
  } else if (event.type === 'CopyToClipboard' && typeof event.params?.text === 'string') {
    void pluginContext?.os?.writeClipboard(event.params.text.slice(0, 16_000))
      .catch(() => host.notify({ kind: 'warning', message: 'Could not copy the text.' }))
  } else if (event.type === 'open_url' && typeof event.params?.url === 'string') {
    try {
      const url = new URL(event.params.url)
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
        void pluginContext?.os?.openExternal(url.href).catch(() => {})
    } catch { /* Untrusted action: ignore malformed URLs. */ }
  }
}

function Widget({ code, streaming, sessionId, id }: {
  code: string; streaming: boolean; sessionId: string | null; id: string
}) {
  const stateKey = sessionId ? widgetKey('desktop', sessionId, id) : null
  const [initialState] = useState(() => readWidgetState(null, stateKey))
  const [hasRoot, setHasRoot] = useState<boolean | null>(null)
  const { renderedMode } = sdk.useTheme()
  const save = useCallback((value: Record<string, unknown>) => {
    if (!stateKey) return
    rememberWidgetState(stateKey, value)
    checkpointWidgetState(stateKey, stateKey)
  }, [stateKey])
  const onAction = useCallback((event: ActionEvent) => actionHandler(event, sessionId), [sessionId])
  return (
    <section aria-label="OpenUI answer" className="hermes-openui-original hermes-openui-answer"
      data-openui-theme={renderedMode} data-theme={renderedMode}>
      <Renderer library={library} response={code} isStreaming={streaming}
        initialState={initialState} onStateUpdate={save} onAction={onAction}
        onParseResult={result => setHasRoot(Boolean(result?.root || result?.rootExpression))} />
      {hasRoot === false && <div role="status">
        {streaming ? 'Building the interactive answer…' : 'This interactive answer could not be displayed. Try asking Hermes to regenerate it.'}
      </div>}
    </section>
  )
}

function Card({ id, streaming, sessionId }: { id: string; streaming: boolean; sessionId: string | null }) {
  const snapshot = useValue(programs)
  const focusedRuntime = useValue(host.state.focusedSessionId)
  const focusedStored = useValue(host.state.focusedStoredSessionId)
  const [boundRuntime, setBoundRuntime] = useState<string | null>(null)
  const runtime = sessionId && (sessionId === focusedStored || sessionId === focusedRuntime) ? focusedRuntime : null
  useEffect(() => { if (runtime) setBoundRuntime(runtime) }, [runtime])
  const live = runtime || boundRuntime
  const program = getProgram(snapshot, sessionId, id) || getProgram(snapshot, live, id)
  const [attempted, setAttempted] = useState(false)
  useEffect(() => {
    if (!runtime || !sessionId || streaming || program?.complete || attempted) return
    let active = true
    void replayOpenUI(sessionId, runtime).then(() => { if (active) setAttempted(true) })
    return () => { active = false }
  }, [runtime, sessionId, streaming, program?.complete, attempted])
  if (!program?.code.trim()) {
    return <div className="hermes-openui-answer" role="status">{streaming || (runtime && !attempted) ? 'Building the interactive answer…' :
      !runtime && !attempted ? 'Select this chat to load the interactive answer.' :
      'The interactive answer is missing. Try asking Hermes to regenerate it.'}</div>
  }
  if (!streaming && !program.complete) return <div className="hermes-openui-answer" role="status">The interactive answer ended before it was complete. Try again.</div>
  return <Widget code={program.code} streaming={streaming && !program.complete} sessionId={sessionId} id={id} />
}

export function renderOpenUI({ attrs, streaming, sessionId }: {
  attrs: Record<string, string>; streaming: boolean; sessionId: string | null
}) {
  if (!ID.test(attrs.id || '')) return <div className="hermes-openui-answer" role="status">This interactive answer is missing its reference.</div>
  return <Card key={attrs.id} id={attrs.id} streaming={streaming} sessionId={sessionId} />
}
