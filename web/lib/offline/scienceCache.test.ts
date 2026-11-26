import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

it.each(['cors', 'no-cors'])('serves cached opaque science images only to compatible requests (%s)', async mode => {
  const handlers: Record<string, (event: unknown) => void> = {}
  const opaque = { type: 'opaque' }
  const readable = { ok: true, type: 'cors', clone: () => readable }
  const cache = { match: vi.fn(async () => opaque), put: vi.fn(async () => {}), keys: vi.fn(async () => []) }
  const fetch = vi.fn(async () => readable)
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler } },
    caches: { open: async () => cache }, fetch, URL, Response,
  })
  let result: Promise<unknown> | undefined
  handlers.fetch({ request: { url: 'https://panoptes-uploads.zooniverse.org/subject_location/recording.png', method: 'GET', mode }, respondWith: (promise: Promise<unknown>) => { result = promise } })
  expect(await result).toBe(mode === 'cors' ? readable : opaque)
  expect(fetch).toHaveBeenCalledTimes(mode === 'cors' ? 1 : 0)
})
