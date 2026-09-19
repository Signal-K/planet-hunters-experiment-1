import { describe, expect, it, vi } from 'vitest'
import { canWriteToSharedPool, resolveIngestEnv, runSharedSubjectIngest, writePlannedInserts } from './run'
import { NASA_TOI_TAP_URL, MPC_NEOCP_JSON_URL } from './sources'
import { ASTEROID_CANDIDATES_COLLECTION, TESS_SUBJECTS_COLLECTION } from './types'

describe('shared subject ingest runner', () => {
  it('resolves shared-backend env aliases without inventing credentials', () => {
    const env = resolveIngestEnv({
      PB_STARSAILORS_URL: 'https://signal-k-starsailors.fly.dev',
      PB_ADMIN_EMAIL: '',
      PB_ADMIN_PASSWORD: '',
    } as unknown as NodeJS.ProcessEnv)
    expect(env.sharedPbUrl).toBe('https://signal-k-starsailors.fly.dev')
    expect(canWriteToSharedPool(env)).toBe(false)
  })

  it('dry-runs when admin credentials are missing instead of faking a write', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith(NASA_TOI_TAP_URL)) {
        return {
          ok: true,
          json: async () => [{ toi: '7001.01', tid: 1, tfopwg_disp: 'PC', pl_orbper: 3, pl_trandep: 1000, st_teff: 5000 }],
        }
      }
      if (url.startsWith(MPC_NEOCP_JSON_URL)) {
        return {
          ok: true,
          json: async () => [{ Temp_Desig: 'XL0918A', Score: 90, Discovery_year: 2026, Discovery_month: 9, Discovery_day: 18, 'R.A.': 1, Decl: 2, V: 19, H: 24, NObs: 3, Arc: 0.1, Not_Seen_dys: 0.2 }],
        }
      }
      throw new Error(`unexpected fetch ${url}`)
    })

    const result = await runSharedSubjectIngest({
      env: { sharedPbUrl: 'https://signal-k-starsailors.fly.dev' },
      fetch: fetchImpl as unknown as typeof fetch,
    })

    expect(result.mode).toBe('dry-run')
    expect(result.written).toBe(0)
    expect(result.skippedWriteReason).toMatch(/credentials/)
    expect(result.plan.tessInserted[0]?.identity).toBe('7001.01')
    expect(result.plan.neocpInserted[0]?.identity).toBe('XL0918A')
  })

  it('refuses to write a settled TESS or NEOCP payload', async () => {
    const create = vi.fn()
    const pb = { collection: () => ({ create }) }
    await expect(writePlannedInserts(pb as never, [{
      collection: TESS_SUBJECTS_COLLECTION,
      identity: '7001.01',
      payload: { consensus: 'planet', gold_label: '', subject_type: 'transit' },
    }])).rejects.toThrow(/settled TESS/)
    await expect(writePlannedInserts(pb as never, [{
      collection: ASTEROID_CANDIDATES_COLLECTION,
      identity: 'XL0918A',
      payload: { resolved: true, temp_desig: 'XL0918A' },
    }])).rejects.toThrow(/settled NEOCP/)
    expect(create).not.toHaveBeenCalled()
  })
})
