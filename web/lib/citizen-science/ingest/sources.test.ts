import { describe, expect, it, vi } from 'vitest'
import {
  fetchOpenNeocpCandidates,
  fetchOpenTessTois,
  isNasaOpenDisposition,
  parseNeocpRows,
  parseTessToiRows,
} from './sources'

describe('citizen-science ingest sources', () => {
  it('keeps only NASA-open TOI dispositions', () => {
    expect(isNasaOpenDisposition('PC')).toBe(true)
    expect(isNasaOpenDisposition('APC')).toBe(true)
    expect(isNasaOpenDisposition('')).toBe(true)
    expect(isNasaOpenDisposition('KP')).toBe(false)
    expect(isNasaOpenDisposition('CP')).toBe(false)
    expect(isNasaOpenDisposition('FP')).toBe(false)
  })

  it('parses NASA TAP rows into subject-shaped fields without inventing lightcurves', () => {
    const rows = parseTessToiRows([
      { toi: '1019.01', tid: 341420329, tfopwg_disp: 'PC', pl_orbper: 5.23, pl_trandep: 20796.9, st_teff: 7645, sectors: null },
    ])
    expect(rows).toEqual([expect.objectContaining({
      toi: '1019.01',
      ticId: '341420329',
      disposition: 'PC',
      periodDays: 5.23,
      depthPct: 2.07969,
      starTeffK: 7645,
      sectors: '',
    })])
  })

  it('parses MPC NEOCP JSON into asteroid_candidates fields', () => {
    const rows = parseNeocpRows([
      {
        Temp_Desig: 'XL0918A',
        Score: 100,
        Discovery_year: 2026,
        Discovery_month: 9,
        Discovery_day: 18.8,
        'R.A.': 23.0744,
        Decl: -7.4002,
        V: 19.8,
        NObs: 3,
        Arc: 0.01,
        H: 24.8,
        Not_Seen_dys: 0.278,
      },
    ])
    expect(rows[0]).toEqual({
      tempDesig: 'XL0918A',
      score: 100,
      discoveryDate: '2026-09-18',
      ra: 23.0744,
      decl: -7.4002,
      vMag: 19.8,
      hMag: 24.8,
      nObs: 3,
      arcDays: 0.01,
      lastSeenDays: 0.278,
    })
  })

  it('fails closed when the public source HTTP status is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchOpenTessTois({ fetch: fetchImpl }, 5)).rejects.toThrow(/NASA TAP/)
    await expect(fetchOpenNeocpCandidates({ fetch: fetchImpl }, 5)).rejects.toThrow(/MPC NEOCP/)
  })
})
