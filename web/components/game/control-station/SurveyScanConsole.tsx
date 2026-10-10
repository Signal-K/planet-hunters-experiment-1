'use client'

import { useEffect, useState } from 'react'
import type { Target } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import {
  SURVEY_SCAN_RESEARCH_XP,
  scanInstrumentLaunched,
  scanProgress,
  scannableTargets,
} from '@/lib/systems/SurveyScanSystem'

interface SurveyScanConsoleProps {
  player: Pick<Player, 'freeOperations' | 'transitSatelliteLaunchedAt' | 'deepSpaceTelescopeBuilt' | 'deepSpaceTelescopeLaunchedAt' | 'activeScan' | 'chartedBodies' | 'researchXP'>
  targets: readonly Target[]
  onStart: (targetId: string) => void
  onResolve: () => void
}

const label: React.CSSProperties = { font: '800 14px var(--ln-font-display)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ln-text)' }
const body: React.CSSProperties = { margin: 0, font: '14px/1.45 var(--ln-font-body)', color: 'var(--ln-text-dim)' }

/**
 * Survey scan console (SSL-512). Free Ops scanning without a client: pick a
 * body, an owned telescope sweeps it, the body is charted, research XP is paid,
 * and the chart stays listed here afterwards.
 */
export default function SurveyScanConsole({ player, targets, onStart, onResolve }: SurveyScanConsoleProps) {
  const [now, setNow] = useState(() => Date.now())
  const scanning = !!player.activeScan
  useEffect(() => {
    if (!scanning) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      onResolve()
    }, 500)
    return () => window.clearInterval(timer)
  }, [scanning, onResolve])

  const ready = scanInstrumentLaunched(player)
  const bodies = scannableTargets(targets)
  const charted = player.chartedBodies ?? {}
  const chartedList = bodies.filter(target => charted[target.id])
  const progress = scanProgress(player, now)
  const activeName = bodies.find(target => target.id === player.activeScan?.targetId)?.name

  return (
    <section data-testid="survey-scan-console" aria-label="Survey scan" style={{ display: 'grid', gap: 12, padding: 12, border: '1px solid var(--ln-hairline-strong)', borderRadius: 8, background: 'var(--ln-panel)' }}>
      <div className="ln-section-label">Survey scan · no client needed</div>
      {!ready ? (
        <p style={body} data-testid="survey-scan-locked">Launch a telescope from the Launchpad to scan bodies. Your own instruments do the survey.</p>
      ) : (
        <>
          <p style={body}>Point your telescope at a body. The scan runs, the body is charted, and you earn {SURVEY_SCAN_RESEARCH_XP} research XP. Balance: {player.researchXP ?? 0} research XP.</p>
          {scanning && (
            <div data-testid="survey-scan-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={`Scanning ${activeName ?? 'body'}`} style={{ display: 'grid', gap: 4 }}>
              <span style={label}>Scanning {activeName} · {Math.round(progress * 100)}%</span>
              <span style={{ display: 'block', height: 8, borderRadius: 4, background: 'var(--ln-surface-2)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${progress * 100}%`, background: 'var(--ln-cyan)' }} />
              </span>
            </div>
          )}
          <div role="group" aria-label="Bodies to scan" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {bodies.map(target => {
              const done = !!charted[target.id]
              const active = player.activeScan?.targetId === target.id
              return (
                <button
                  key={target.id}
                  type="button"
                  data-testid={`survey-scan-target-${target.id}`}
                  data-state={done ? 'charted' : active ? 'scanning' : 'open'}
                  disabled={done || scanning}
                  onClick={() => onStart(target.id)}
                  style={{ flex: '0 0 auto', minHeight: 44, minWidth: 112, padding: '6px 12px', textAlign: 'left', borderRadius: 8, border: `2px solid ${done ? 'var(--ln-ok)' : 'var(--ln-hairline-strong)'}`, background: done ? 'var(--ln-ok-soft)' : 'var(--ln-panel)', color: 'var(--ln-text)', cursor: done || scanning ? 'default' : 'pointer' }}
                >
                  <span style={{ ...label, display: 'block' }}>{target.name}</span>
                  <span style={{ font: '14px var(--ln-font-body)', color: 'var(--ln-text-dim)' }}>{done ? `Charted · +${SURVEY_SCAN_RESEARCH_XP} research XP` : active ? 'Scanning' : 'Scan'}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
      {chartedList.length > 0 && (
        <div data-testid="survey-scan-atlas" style={{ display: 'grid', gap: 6 }}>
          <span style={label}>Charted · {chartedList.length} of {bodies.length}</span>
          {chartedList.map(target => (
            <div key={target.id} data-testid={`survey-scan-chart-${target.id}`} style={{ ...body, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ color: 'var(--ln-text)' }}>{target.name}</strong>
              <span>+{SURVEY_SCAN_RESEARCH_XP} research XP · {target.minerals.map(id => MINERAL_META[id]?.name ?? id).join(', ') || 'No minerals'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
