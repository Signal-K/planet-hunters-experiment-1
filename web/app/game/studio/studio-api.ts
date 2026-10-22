import type { DataDocBundle, SceneBundle, StudioIndex, StudioRequest, StudioResponse } from '@/lib/authoring/studio-types'
import type { Focus } from '@/lib/authoring/focus'

const ENDPOINT = '/api/dev/studio'

async function read<T>(query: string): Promise<T> {
  const response = await fetch(`${ENDPOINT}?${query}`, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error ?? `Studio API ${response.status}`)
  return body as T
}

export const getIndex = () => read<StudioIndex>('index=1')
export const getFocus = () => read<Focus | null>('focus=1')
export const getScene = (id: string, sig?: string) => read<SceneBundle | { unchanged: true }>(`scene=${encodeURIComponent(id)}${sig ? `&sig=${sig}` : ''}`)
export const getData = (kind: string, id: string, sig?: string) => read<DataDocBundle | { unchanged: true }>(`data=${kind}:${encodeURIComponent(id)}${sig ? `&sig=${sig}` : ''}`)

export async function send(request: StudioRequest): Promise<StudioResponse> {
  try {
    const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) })
    return (await response.json()) as StudioResponse
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export const isUnchanged = (value: object): value is { unchanged: true } => 'unchanged' in value
