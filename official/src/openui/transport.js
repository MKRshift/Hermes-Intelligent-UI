import { atom, host } from '@hermes/plugin-sdk'

const MAX_PROGRAM = 32_000
const ID = /^[a-f0-9]{16}$/
const ANCHOR = /^::openui\{id="([a-f0-9]{16})"\}[ \t]*\r?\n(?:[ \t]*\r?\n)?<!--[ \t]*openui:\1[ \t]*\r?\n/gm
const programs = atom(new Map())
const tails = new Map()
const replays = new Map()
const key = (session, id) => JSON.stringify([session, id])

// The transcript keeps the whole answer. The native directive only contains
// the reference, so the SDK's small attribute limit doesn't cap the program.
function programFrames(text) {
  const frames = []
  for (const match of text.matchAll(ANCHOR)) {
    const start = match.index + match[0].length
    const end = text.indexOf('-->', start)
    const code = text.slice(start, end < 0 ? undefined : end)
    if (code.length <= MAX_PROGRAM) frames.push({ id: match[1], code, complete: end >= 0 })
  }
  return frames
}

function publish(session, frames, final = false) {
  if (!session || !frames.length) return
  const current = programs.get()
  const next = new Map(current)
  for (const { id, code, complete } of frames) {
    const idKey = key(session, id)
    const before = next.get(idKey)
    if (!final && before?.complete) continue
    if (before?.code === code && before.complete === complete) continue
    next.delete(idKey)
    next.set(idKey, { code, complete })
  }
  if (next.size === current.size && [...next].every(([k, v]) => current.get(k) === v)) return
  while (next.size > 96) next.delete(next.keys().next().value)
  programs.set(next)
}

function registerOpenUITransport(ctx) {
  ctx.onEvent?.('message.start', event => tails.delete(event.session_id))
  ctx.onEvent?.('message.interim', event => tails.delete(event.session_id))
  ctx.onEvent?.('message.delta', event => {
    const { session_id: session, payload } = event
    if (!session || typeof payload?.text !== 'string') return
    // Retain only a bounded tail, enough to span one whole program and marker.
    const text = ((tails.get(session) || '') + payload.text).slice(-(MAX_PROGRAM + 256))
    if (!tails.has(session) && tails.size >= 32) tails.delete(tails.keys().next().value)
    tails.set(session, text)
    publish(session, programFrames(text))
  })
  ctx.onEvent?.('message.complete', event => {
    const { session_id: session, payload } = event
    const text = payload?.text || payload?.rendered || tails.get(session)
    if (typeof text === 'string') publish(session, programFrames(text), true)
    tails.delete(session)
    replays.delete(session)
  })
  ctx.onDispose(() => {
    tails.clear()
    replays.clear()
    programs.set(new Map())
  })
}

function getProgram(snapshot, session, id) {
  return snapshot.get(key(session, id))
}

// Resolve durable transcript cards through the exact runtime bound to the
// focused transcript. Don't read an arbitrary session named by model output.
function replayOpenUI(session, runtime) {
  if (replays.has(runtime)) return replays.get(runtime)
  const connection = host.state.connectionId?.get()
  const profile = host.state.profile?.get()
  const owner = host.state.focusedSessionOwner?.get()
  if (owner && ((owner.connectionId ?? null) !== (connection ?? null) || owner.profile !== profile)) {
    return Promise.resolve()
  }
  const request = Promise.resolve().then(() => host.request('session.history', { session_id: runtime }))
    .then(history => {
      if (host.state.connectionId?.get() !== connection || host.state.profile?.get() !== profile) return
      const frames = (history.messages || []).filter(row => row.role === 'assistant' && typeof row.text === 'string')
        .flatMap(row => programFrames(row.text).filter(frame => frame.complete))
      publish(runtime, frames, true)
      if (session !== runtime) publish(session, frames, true)
    })
    .catch(() => {})
    .finally(() => { if (replays.get(runtime) === request) replays.delete(runtime) })
  replays.set(runtime, request)
  return request
}

export { ID, getProgram, programFrames, programs, registerOpenUITransport, replayOpenUI }
