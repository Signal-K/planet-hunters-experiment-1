import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('warms same-origin game artwork and chunks without fetching APIs or other origins', async () => {
  const listeners = new Map<string, (event: unknown) => void>()
  const put = vi.fn(), fetch = vi.fn(async (_url: string) => ({ ok: true }))
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://landnam.test' }, addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener) },
    URL, caches: { open: async () => ({ put }) }, fetch,
  })
  let done: Promise<unknown> | undefined
  listeners.get('message')!({
    data: { type: 'CACHE_URLS', urls: ['/game/assets/base/kit/earth-pixel.png', '/_next/static/chunks/flight.js', '/api/private', 'https://elsewhere.test/game/assets/image.png'] },
    waitUntil: (promise: Promise<unknown>) => { done = promise }, ports: [],
  })
  await done
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(['https://landnam.test/game/assets/base/kit/earth-pixel.png', 'https://landnam.test/_next/static/chunks/flight.js'])
  expect(put).toHaveBeenCalledTimes(2)
})
