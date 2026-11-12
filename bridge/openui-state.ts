const PREFIX = 'hermes-openui-v2:'
const MAX_STATE_CHARS = 48_000
const MAX_LIVE_WIDGETS = 128

// Streamdown can remount the code renderer as a message settles. Keep the
// snapshot outside that tree, bounded to recent widgets in this window.
const liveStates = new Map<string, string>()

export function widgetKey(...coordinates: (string | number)[]): string {
  return PREFIX + JSON.stringify(coordinates)
}

export function sourceRevision(source: string): string {
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619)
  return `${source.length}:${(hash >>> 0).toString(36)}`
}

function readSnapshot(raw?: string | null): Record<string, unknown> | undefined {
  if (!raw || raw.length > MAX_STATE_CHARS) return
  try {
    const value: unknown = JSON.parse(raw)
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch { /* Ignore corrupt or unavailable saved state. */ }
}

export function readWidgetState(liveKey: string | null, savedKey: string | null) {
  const live = liveKey && readSnapshot(liveStates.get(liveKey))
  if (live) return live
  if (savedKey) {
    try {
      return readSnapshot(sessionStorage.getItem(savedKey))
    } catch { /* The widget still works without storage. */ }
  }
}

export function rememberWidgetState(liveKey: string, value: Record<string, unknown>) {
  let serialized: string | undefined
  try {
    const snapshot = JSON.stringify(value)
    if (snapshot.length <= MAX_STATE_CHARS) serialized = snapshot
  } catch { /* Skip nonserializable values. */ }
  liveStates.delete(liveKey)
  if (!serialized) return
  liveStates.set(liveKey, serialized)
  if (liveStates.size > MAX_LIVE_WIDGETS) {
    const oldest = liveStates.keys().next()
    if (!oldest.done) liveStates.delete(oldest.value)
  }
}

// Use window session storage until there is an opt-in policy for saving form
// values across launches. This still survives a renderer reload in that window.
export function checkpointWidgetState(liveKey: string, savedKey: string) {
  try {
    const snapshot = liveStates.get(liveKey)
    if (snapshot) sessionStorage.setItem(savedKey, snapshot)
  } catch { /* Keep the in-memory state when storage is full or disabled. */ }
}
