'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import { SCANS_PER_DAY, SCAN_DURATION_MS, SCANS_REQUIRED_TO_MAP, MINERAL_META, todayDateKey } from '@/lib/data'
import type { Target } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatCountdown } from '@/lib/format'

interface ScanStationScreenProps {
  player: Player
  targets: Target[]
  onBack: () => void
  onStartScan: (targetId: string) => void
  onCollectScan: () => void
}

function revealedMinerals(target: Target, scanCount: number): string[] {
  if (scanCount <= 0) return []
  const partial = Math.ceil((scanCount / SCANS_REQUIRED_TO_MAP) * target.minerals.length)
  return target.minerals.slice(0, Math.max(1, partial))
}

const SURVEY_LANDMARKS = ['crater field', 'high-albedo ridge']

export default function ScanStationScreen({ player, targets, onBack, onStartScan, onCollectScan }: ScanStationScreenProps) {
  const [now, setNow] = useState(() => Date.now())

  const today = todayDateKey()
  const scanDate = player.scanDate ?? ''
  const scansUsedToday = scanDate === today ? (player.scansUsedToday ?? 0) : 0
  const scansRemaining = SCANS_PER_DAY - scansUsedToday
  const scanCounts = player.targetScanCounts ?? {}

  const activeScan = player.activeScan ?? null
  const scanTimeLeft = activeScan ? activeScan.completesAt - now : 0
  const scanReady = activeScan ? now >= activeScan.completesAt : false
  const scanProgress = activeScan
    ? Math.min(100, ((SCAN_DURATION_MS - Math.max(0, activeScan.completesAt - now)) / SCAN_DURATION_MS) * 100)
    : 0

  useEffect(() => {
    if (!activeScan || scanReady) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [activeScan, scanReady])

  const activeTarget = activeScan ? targets.find(t => t.id === activeScan.targetId) ?? null : null

  return (
    <div className="game-screen">
      <TopBar eyebrow="EARTH BASE · SCANNING" title="Scanning Station" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>

        <Panel accent="var(--ln-cyan)" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScannerIcon />
            <div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ln-cyan)' }}>
                Remote Target Scanner
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 2 }}>
                Scan targets to map deposits and unlock landing clearance.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <StatusPill kind={scansRemaining > 0 ? 'ok' : 'warn'}>
              {scansRemaining}/{SCANS_PER_DAY} SCANS TODAY
            </StatusPill>
          </div>
        </Panel>

        {activeScan && (
          <Panel
            accent={scanReady ? 'var(--ln-ok)' : 'var(--ln-cyan)'}
            style={{ padding: 12, marginTop: 10 }}
          >
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: scanReady ? 'var(--ln-ok)' : 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 6 }}>
              {scanReady ? 'SCAN COMPLETE' : 'SCANNING IN PROGRESS'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 14, color: '#e8f0fe' }}>
                  {activeTarget?.name ?? activeScan.targetId}
                </div>
                <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: '#6b7fa3', marginTop: 2 }}>
                  {scanReady ? 'DATA READY FOR COLLECTION' : `ETA ${formatCountdown(scanTimeLeft)}`}
                </div>
              </div>
              {!scanReady && (
                <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ln-cyan)', letterSpacing: '-0.02em' }}>
                  {formatCountdown(scanTimeLeft)}
                </div>
              )}
            </div>
            {!scanReady && (
              <div style={{ height: 4, background: 'rgba(57,211,239,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${scanProgress}%`, background: 'var(--ln-cyan)', borderRadius: 2, transition: 'width 1s linear' }} />
              </div>
            )}
            {scanReady && (
              <PrimaryBtn onClick={onCollectScan}>
                COLLECT SCAN DATA
              </PrimaryBtn>
            )}
          </Panel>
        )}

        <div style={{ marginTop: 16, marginBottom: 6, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6b7fa3' }}>
          AVAILABLE TARGETS
        </div>

        {targets.map(target => {
          const count = scanCounts[target.id] ?? 0
          const mapped = count >= SCANS_REQUIRED_TO_MAP
          const isBeingScanned = activeScan?.targetId === target.id
          const canScan = !activeScan && scansRemaining > 0 && !mapped
          const revealed = revealedMinerals(target, count)

          return (
            <Panel
              key={target.id}
              accent={mapped ? 'var(--ln-ok)' : isBeingScanned ? 'var(--ln-cyan)' : undefined}
              style={{ padding: 12, marginBottom: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: mapped ? 'rgba(57,211,106,0.15)' : 'rgba(57,211,239,0.1)', border: `1px solid ${mapped ? 'var(--ln-ok)' : 'rgba(57,211,239,0.3)'}`, flexShrink: 0 }}>
                  <TargetIcon type={target.type} mapped={mapped} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 14, color: '#e8f0fe' }}>{target.name}</span>
                    <StatusPill kind={mapped ? 'ok' : count > 0 ? 'info' : 'mute'}>
                      {mapped ? 'MAPPED' : count > 0 ? `${count}/${SCANS_REQUIRED_TO_MAP} SCANS` : 'UNSCANNED'}
                    </StatusPill>
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#6b7fa3', marginTop: 2 }}>
                    {target.type.toUpperCase()} · ORBIT {target.orbit}
                  </div>

                  {count > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <ScanProgressBar count={count} required={SCANS_REQUIRED_TO_MAP} />
                    </div>
                  )}

                  {revealed.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#6b7fa3', textTransform: 'uppercase', marginBottom: 4 }}>
                        {mapped ? 'MAPPED DEPOSITS' : 'PARTIAL SURVEY'}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {revealed.map(mineral => {
                          const meta = MINERAL_META[mineral]
                          return (
                            <span
                              key={mineral}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, background: (meta?.color ?? '#888') + '22', border: `1px solid ${meta?.color ?? '#888'}55`, fontFamily: 'var(--ln-font-mono)', fontSize: 10, fontWeight: 700, color: meta?.color ?? '#888', letterSpacing: '0.04em' }}
                            >
                              {meta?.sym ?? mineral.slice(0, 2).toUpperCase()}
                            </span>
                          )
                        })}
                        {!mapped && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 4, background: 'rgba(107,127,163,0.15)', border: '1px solid rgba(107,127,163,0.3)', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#6b7fa3' }}>
                            ???
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {mapped && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#6b7fa3', textTransform: 'uppercase', marginBottom: 4 }}>LANDMARKS</div>
                      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#a9b8ce' }}>
                        {SURVEY_LANDMARKS.map(l => l.toUpperCase()).join(' · ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                {mapped ? (
                  <StatusPill kind="ok">LANDING CLEARANCE GRANTED</StatusPill>
                ) : isBeingScanned ? (
                  <StatusPill kind="info">SCAN IN PROGRESS</StatusPill>
                ) : canScan ? (
                  <GhostBtn onClick={() => onStartScan(target.id)}>
                    START SCAN
                  </GhostBtn>
                ) : !activeScan && scansRemaining <= 0 ? (
                  <StatusPill kind="warn">DAILY SCAN LIMIT REACHED</StatusPill>
                ) : null}
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

function ScanProgressBar({ count, required }: { count: number; required: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: required }, (_, i) => (
          <div
            key={i}
            style={{ width: 16, height: 6, borderRadius: 2, background: i < count ? 'var(--ln-cyan)' : 'rgba(57,211,239,0.15)', border: '1px solid rgba(57,211,239,0.3)' }}
          />
        ))}
      </div>
      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#6b7fa3' }}>
        {count}/{required} SCANS
      </span>
    </div>
  )
}

function TargetIcon({ type, mapped }: { type: string; mapped: boolean }) {
  const color = mapped ? 'var(--ln-ok)' : 'var(--ln-cyan)'
  if (type === 'planet') {
    return (
      <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.5" />
        <ellipse cx="9" cy="9" rx="9" ry="3.5" stroke={color} strokeWidth="1" opacity=".5" />
      </svg>
    )
  }
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <polygon points="9,2 12,7 17,8 13,12 14,17 9,14.5 4,17 5,12 1,8 6,7" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function ScannerIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="5" stroke="var(--ln-cyan)" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="10" stroke="var(--ln-cyan)" strokeWidth="1" opacity=".4" strokeDasharray="3 2" />
      <path d="M14 4v4M14 20v4M4 14h4M20 14h4" stroke="var(--ln-cyan)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
