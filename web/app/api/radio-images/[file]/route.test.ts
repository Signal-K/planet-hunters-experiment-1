import { afterEach, expect, it, vi } from 'vitest'
import { GET } from './route'
import { radioImageSource } from '@/lib/radio-image-source'

const file = '4cae67a6-7dfe-439f-a6a2-a2b1464048eb.png'
const source = `https://panoptes-uploads.zooniverse.org/subject_location/${file}`
const context = (file: string) => ({ params: Promise.resolve({ file }) })
afterEach(() => vi.unstubAllGlobals())

it('delivers the actual recording bytes from a fixed host on the game origin', async () => {
  const fetch = vi.fn(async () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } }))
  vi.stubGlobal('fetch', fetch)
  expect(radioImageSource(source)).toBe(`/api/radio-images/${file}`)
  const response = await GET(new Request('https://game.test'), context(file))
  expect(response.status).toBe(200)
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([137, 80, 78, 71])
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(fetch).toHaveBeenCalledWith(source, expect.objectContaining({ redirect: 'manual' }))
})

it('rejects arbitrary hosts, paths and non-image responses', async () => {
  const fetch = vi.fn(async () => new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } }))
  vi.stubGlobal('fetch', fetch)
  expect((await GET(new Request('https://game.test'), context('../private'))).status).toBe(400)
  expect(fetch).not.toHaveBeenCalled()
  expect(radioImageSource('https://other.test/subject_location/' + file)).toContain('https://other.test')
  expect((await GET(new Request('https://game.test'), context(file))).status).toBe(502)
})

it('does not turn a missing recording into a successful image response', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
  expect((await GET(new Request('https://game.test'), context(file))).status).toBe(404)
})
