import './openui-styles.css'

import { useAui, useAuiState } from '@assistant-ui/react'
import { Renderer, type ActionEvent } from '@openuidev/react-lang'
import { host } from '@hermes/plugin-sdk'
import { useStore } from '@nanostores/react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Block, type BlockProps } from 'streamdown'
import { useSessionView } from '@/app/chat/session-view'
import { ErrorBoundary } from '@/components/error-boundary'
import { useTheme } from '@/themes'
import { checkpointWidgetState, readWidgetState, rememberWidgetState, sourceRevision, widgetKey } from './openui-state'
import { runLibraryAction } from './thesys-lib/actions'
import { demoTools } from './thesys-lib/demo-data'
import { library } from './thesys-lib/library'

const MAX_CODE_CHARS = 150_000
const BlockIndex = createContext<number | null>(null)
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
export function OpenUITranscriptBlock(props: BlockProps) {
  return <BlockIndex.Provider value={props.index}><Block {...props} /></BlockIndex.Provider>
}

interface HermesOpenUIProps {
  response: string
  isStreaming: boolean
  offset: number
}

export function HermesOpenUI({ response, isStreaming, offset }: HermesOpenUIProps) {
  const view = useSessionView()
  const storedId = useStore(view.$storedId)
  const runtimeId = useStore(view.$runtimeId)
  const sessionId = storedId || runtimeId
  const liveSession = runtimeId || storedId
  const blockIndex = useContext(BlockIndex)
  const aui = useAui()
  const partIndex = aui.part.query?.type === 'index' ? aui.part.query.index : null
  const messageId = useAuiState(s => s.message.id)
  const rowId = useAuiState(s => {
    const part = s.part as { sourceRowId?: number }
    if (part.sourceRowId !== undefined) return part.sourceRowId
    if (s.message.content.filter(candidate => candidate.type === 'text').length === 1) {
      const row = s.message.metadata.custom.rowId
      if (typeof row === 'number') return row
    }
  })
  // Several backend rows can be folded into one assistant message. Persist by
  // row and the text part's ordinal within that row, not the folded index.
  const rowPart = useAuiState(s => partIndex === null ? 0 : s.message.content
    .slice(0, partIndex)
    .filter(part => part.type === 'text' && (part as { sourceRowId?: number }).sourceRowId === rowId).length)
  const hasSlot = partIndex !== null && blockIndex !== null
  const liveKey = hasSlot && liveSession ? widgetKey('live', liveSession, messageId, partIndex, blockIndex, offset) : null
  const savedKey = hasSlot && sessionId && rowId !== undefined && !isStreaming
    ? widgetKey('saved', sessionId, rowId, rowPart, blockIndex, offset, sourceRevision(response))
    : null

  return <OpenUIWidget key={liveKey} {...{ response, isStreaming, sessionId, liveKey, savedKey }} />
}

interface OpenUIWidgetProps {
  response: string
  isStreaming: boolean
  sessionId: string | null
  liveKey: string | null
  savedKey: string | null
}

function OpenUISourceFallback({ response }: { response: string }) {
  return <details><summary>Could not display this interactive answer. Show source</summary><pre>{response}</pre></details>
}

function OpenUIWidget({ response, isStreaming, sessionId, liveKey, savedKey }: OpenUIWidgetProps) {
  // Treat initialState as a mount-time seed. Feeding a fresh seed on every
  // chunk would overwrite changes in OpenUI's active store.
  const [initialState] = useState(() => readWidgetState(liveKey, savedKey))
  const [hasRoot, setHasRoot] = useState<boolean | null>(null)
  const { renderedMode } = useTheme()
  useEffect(() => {
    if (liveKey && savedKey) checkpointWidgetState(liveKey, savedKey)
  }, [liveKey, savedKey])
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
    if (!liveKey) return
    rememberWidgetState(liveKey, value)
    if (savedKey) checkpointWidgetState(liveKey, savedKey)
  }, [liveKey, savedKey])
  if (response.length > MAX_CODE_CHARS) return <div>OpenUI payload is too large to render safely.</div>
  return (
    <section className="hermes-openui-original" data-openui-theme={renderedMode}
      style={{width:'100%',maxWidth:'100%',minWidth:0,overflow:'hidden',margin:'12px 0'}}>
      <ErrorBoundary label="openui-widget" fallback={() => <OpenUISourceFallback response={response} />}>
        <Renderer
          response={response}
          isStreaming={isStreaming}
          library={library}
          toolProvider={readOnlyTools}
          onAction={handleAction}
          initialState={initialState}
          onStateUpdate={handleState}
          onParseResult={result => setHasRoot(Boolean(result?.root || result?.rootExpression))}
        />
        {!isStreaming && hasRoot === false && <OpenUISourceFallback response={response} />}
      </ErrorBoundary>
    </section>
  )
}
