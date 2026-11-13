/** The existing voxel_worlds.snapshot field is UTF-8 Go JSON encoded as base64
 * on native. Keep that wire format so either client can resume the same core. */
export function encodeCoreSnapshot(snapshot: string): string {
  return btoa(Array.from(new TextEncoder().encode(snapshot), byte => String.fromCharCode(byte)).join(''))
}
export function decodeCoreSnapshot(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  try {
    const snapshot = new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(atob(value), char => char.charCodeAt(0)),
    )
    const parsed = JSON.parse(snapshot) as { v?: unknown; bodyId?: unknown; rover?: unknown }
    return parsed.v === 1 && typeof parsed.bodyId === 'string' && parsed.rover != null ? snapshot : undefined
  } catch { return undefined }
}
