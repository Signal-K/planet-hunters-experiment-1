import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ScanStationScreen from './ScanStationScreen'
import { STATIC_CATALOG } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { Player } from '@/lib/game-types'

const NOOP = () => undefined
const NOOP1 = () => undefined

function renderScanStation(playerOverrides: Partial<Player>) {
  const player: Player = { ...DEFAULT_STATE.player, ...playerOverrides }
  return renderToStaticMarkup(
    <ScanStationScreen
      player={player}
      targets={STATIC_CATALOG.targets}
      onBack={NOOP}
      onStartScan={NOOP1}
      onCollectScan={NOOP}
    />,
  )
}

describe('ScanStationScreen', () => {
  it('renders the scanner rationale copy and daily scan counter', () => {
    const markup = renderScanStation({})
    expect(markup).toContain('data-testid="scan-station-screen"')
    expect(markup).toContain('Remote Target Scanner')
    expect(markup).toContain('Scouting from orbit before you launch')
    expect(markup).toContain('SCANS TODAY')
  })

  it('exposes a testid for starting a scan on an unscanned target', () => {
    const target = STATIC_CATALOG.targets[0]
    const markup = renderScanStation({ targetScanCounts: {} })
    expect(markup).toContain(`data-testid="scan-station-start-scan-${target.id}"`)
  })

  it('exposes a testid for collecting a completed scan', () => {
    const target = STATIC_CATALOG.targets[0]
    const markup = renderScanStation({
      activeScan: { targetId: target.id, completesAt: Date.now() - 1000 },
    })
    expect(markup).toContain('data-testid="scan-station-collect-btn"')
  })

  // ScanStationCoach is gated by a client-only localStorage check (useEffect),
  // which never runs under renderToStaticMarkup — see ScanStationCoach.tsx.
  // Its content/behavior is covered directly in ScanStationCoach.test.tsx.
})
