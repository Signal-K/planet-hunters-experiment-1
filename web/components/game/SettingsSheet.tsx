'use client'

import React, { useEffect, useState } from 'react'
import { useGame } from '@/game-context'
import { pbShared } from '@/lib/pb'
import { DEV_GROUPS } from '@/lib/devPresets'
import { canOfferFullscreen, enterFullscreen, readFullscreenEnv } from '@/lib/fullscreen'
import PageSurface from '@/components/ui/PageSurface'
import { TRAINING_TRY_IDS, currentTrainingTry, type TrainingTryId } from '@/lib/systems/FlightPlanSystem'

interface SettingsSheetProps {
  onClose: () => void
}

const IS_DEV = process.env.NODE_ENV === 'development'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
        letterSpacing: '0.22em', color: 'var(--ln-cyan-press)', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--ln-s-2) 0',
      borderBottom: '1px solid var(--ln-cyan-soft)',
    }}>
      {children}
    </div>
  )
}

function Btn({
  label, onClick, variant = 'ghost', disabled,
}: { label: string; onClick: () => void; variant?: 'ghost' | 'danger' | 'primary'; disabled?: boolean }) {
  const colors = {
    ghost:   { bg: 'var(--ln-cyan-soft)',   border: 'var(--ln-cyan-border)',      color: 'var(--ln-cyan)' },
    primary: { bg: 'var(--ln-cyan-soft)',   border: 'var(--ln-cyan-border)',      color: 'var(--ln-cyan-press)' },
    danger:  { bg: 'var(--ln-crit-soft)',   border: 'var(--ln-crimson-border)',   color: 'var(--ln-crit)' },
  }
  const c = colors[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 'var(--ln-s-2) var(--ln-s-4)', borderRadius: 8, minHeight: 44, minWidth: 44,
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
        fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

export default function SettingsSheet({ onClose }: SettingsSheetProps) {
  const game = useGame()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkipTraining, setConfirmSkipTraining] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const email = pbShared.authStore.record?.email as string | undefined

  useEffect(() => {
    const update = () => setShowFullscreen(canOfferFullscreen(readFullscreenEnv()))
    update()
    const mq = window.matchMedia('(orientation: landscape)')
    mq.addEventListener('change', update)
    document.addEventListener('fullscreenchange', update)
    return () => {
      mq.removeEventListener('change', update)
      document.removeEventListener('fullscreenchange', update)
    }
  }, [])

  function handleSignOut() {
    onClose()
    game.signOut()
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return }
    onClose()
    game.resetGame()
  }

  function jumpPreset(key: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('preset', key)
    window.location.href = url.toString()
  }

  function replay(tryId: TrainingTryId) {
    onClose()
    game.openTrainingTry(tryId)
  }

  return (
    <PageSurface
      tray
      contentStyle={{
        background: 'linear-gradient(180deg, var(--ln-panel-2), var(--ln-void))',
        border: '1px solid var(--ln-cyan-soft)',
        padding: 'var(--ln-s-4) var(--ln-s-5) var(--ln-s-6)',
        overflowY: 'auto',
      }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan-press)', textTransform: 'uppercase' }}>Landnam</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: 'var(--ln-text)', marginTop: 2 }}>Settings</div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--ln-divider)', border: '1px solid var(--ln-divider)',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
          }}>✕</button>
        </div>

        <Section label="Account">
          <Row>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>
                {email ?? 'Email account'}
              </div>
              {!email && (
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                  Account details are loading
                </div>
              )}
            </div>
            <Btn label="Sign Out" onClick={handleSignOut} variant="ghost" />
          </Row>
        </Section>

        {showFullscreen && (
          <Section label="Display">
            <Row>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text)' }}>Hide browser bars</div>
              <Btn label="Fullscreen" onClick={() => { enterFullscreen().catch(() => {}) }} variant="primary" />
            </Row>
          </Section>
        )}

        {game.player.missionsDone > 0 && (
          <Section label="Program">
            <Row>
              <div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Skill tree</div>
                <div data-testid="menu-skill-points" style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                  {(game.player.skillPoints ?? 0) > 0 ? `${game.player.skillPoints} skill points available` : 'Spend skill points on upgrades'}
                </div>
              </div>
              <Btn label="Open" onClick={() => { onClose(); game.go('skills') }} variant="primary" />
            </Row>
          </Section>
        )}

        <Section label="Training">
          <div className="patch-shelf" data-testid="training-patch-shelf" role="list" aria-label="Mission patches">
            {TRAINING_TRY_IDS.map(tryId => {
              const active = currentTrainingTry(game.player.flightPlan) === tryId
              const done = !!game.player.flightPlan?.completed?.[tryId]
              const status = done ? 'Done' : active ? 'On air' : 'Standby'
              const label = tryId === 'part' ? 'Part tweak' : tryId === 'scan' ? 'Planet scan' : 'Mining'
              return <div key={tryId} role="listitem" className="patch" data-state={done ? 'done' : active ? 'active' : 'standby'}>
                <span className="patch-ring" aria-hidden="true">{done ? '✓' : TRAINING_TRY_IDS.indexOf(tryId) + 1}</span>
                <div data-testid={`training-${tryId}-status`}>
                  <div className="patch-name">{label}</div>
                  <div className="patch-status">{status}</div>
                </div>
                <Btn label="Replay" onClick={() => replay(tryId)} variant="primary" />
              </div>
            })}
          </div>
          {!game.player.freeOperations && (
            <Row>
              <div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text)' }}>Skip training</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: 'var(--ln-text-muted)', marginTop: 2 }}>{confirmSkipTraining ? 'Confirm: all three tries will be marked done.' : 'Marks every try done and opens Free Ops.'}</div>
              </div>
              <Btn
                label={confirmSkipTraining ? 'Confirm' : 'Skip'}
                onClick={() => {
                  if (!confirmSkipTraining) { setConfirmSkipTraining(true); return }
                  game.skipFlightPlan()
                  onClose()
                }}
              />
            </Row>
          )}
          <Row>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Reset game</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                {confirmReset ? 'This will erase all progress. Tap again to confirm.' : 'Erase all local progress and start over'}
              </div>
            </div>
            <Btn
              label={confirmReset ? 'Confirm' : 'Reset'}
              onClick={handleReset}
              variant="danger"
            />
          </Row>
        </Section>

        {IS_DEV && (
          <Section label="Debug">
            <Row>
              <div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Preview state</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                  Return to your saved game and account
                </div>
              </div>
              <Btn label="My Game" onClick={() => { onClose(); window.location.href = '/game' }} variant="primary" />
            </Row>

            <Row>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Free Ops mode</div>
              <button
                onClick={() => game.setPlayer(p => ({ ...p, freeOperations: !p.freeOperations }))}
                style={{
                  padding: 'var(--ln-s-2) var(--ln-s-4)', borderRadius: 8,
                  background: game.player.freeOperations ? 'var(--ln-ok-soft)' : 'var(--ln-divider)',
                  border: `1px solid ${game.player.freeOperations ? 'var(--ln-ok-soft)' : 'var(--ln-divider)'}`,
                  color: game.player.freeOperations ? 'var(--ln-ok)' : 'var(--ln-text-muted)',
                  fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {game.player.freeOperations ? 'On' : 'Off'}
              </button>
            </Row>

            {DEV_GROUPS.map((group, gi) => (
              <div key={group.label} style={{ marginTop: gi === 0 ? 10 : 6 }}>
                <div style={{
                  fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.18em', color: group.color, textTransform: 'uppercase', marginBottom: 6,
                }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.shots.map(shot => (
                    <button
                      key={shot.key}
                      onClick={() => jumpPreset(shot.key)}
                      title={shot.hint}
                      style={{
                        padding: 'var(--ln-s-1) var(--ln-s-2)', borderRadius: 6,
                        background: 'var(--ln-bg)', border: `1px solid ${group.color}44`,
                        color: group.color, fontFamily: 'var(--ln-font-display)',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                      }}
                    >
                      {shot.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}
    </PageSurface>
  )
}
