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

// Read the saved transcript without requiring a live chat attachment. Keep
// the request bound to the focused chat and its owning connection/profile.
function replayOpenUI(session, runtime, id) {
  const connection = host.state.connectionId?.get()
  const profile = host.state.profile?.get()
  const owner = host.state.focusedSessionOwner?.get()
  const useOwnerRoute = owner && ((owner.connectionId || null) !== (connection || null) || owner.profile !== profile)
  const requestKey = JSON.stringify([owner?.connectionId ?? connection, owner?.profile ?? profile, session, id])
  if (replays.has(requestKey)) return replays.get(requestKey)
  const sameRoute = () => host.state.connectionId?.get() === connection && host.state.profile?.get() === profile
  const fromRows = rows => (Array.isArray(rows) ? rows : [])
    .filter(row => row.role === 'assistant' && typeof row.text === 'string')
    .flatMap(row => programFrames(row.text).filter(frame => frame.complete && frame.id === id))
  const request = Promise.resolve().then(async () => {
    let read = (method, params) => host.request(method, params)
    if (useOwnerRoute) {
      if (!host.profileRoutes || !host.requestProfile) return
      const routes = await host.profileRoutes()
      const route = routes.find(item => item.connectionId === owner.connectionId && item.profile === owner.profile)
      if (!route) return
      read = (method, params) => host.requestProfile(route, method, params)
    }
    let cursor
    try {
      do {
        if (!sameRoute()) return
        const page = await read('session.transcript', { session_id: session, order: 'latest', limit: 100, ...(cursor ? { cursor } : {}) })
        if (!sameRoute()) return
        const frames = fromRows(page.rows)
        if (frames.length) { publish(session, frames, true); return }
        if (page.next_cursor === cursor) break
        cursor = page.next_cursor
      } while (cursor)
    } catch { /* Older gateways may only expose the attached session read. */ }
    if (!runtime || useOwnerRoute || !sameRoute()) return
    const history = await host.request('session.history', { session_id: runtime })
    if (sameRoute()) publish(session, fromRows(history.messages), true)
  })
    .catch(() => {})
    .finally(() => { if (replays.get(requestKey) === request) replays.delete(requestKey) })
  replays.set(requestKey, request)
  return request
}

export { ID, getProgram, programFrames, programs, registerOpenUITransport, replayOpenUI }
