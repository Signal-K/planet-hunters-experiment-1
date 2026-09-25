import { describe, expect, it, vi } from 'vitest'

const redirect = vi.fn()
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }))

describe('Landnam root (SSL-35)', () => {
  it('sends visitors into the single Landing flow', async () => {
    const { default: Home } = await import('./page')
    Home()
    expect(redirect).toHaveBeenCalledWith('/game')
  })
})
