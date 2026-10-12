'use client'

import React, { useEffect, useState } from 'react'
import { useGame } from '@/game-context'
import { pbShared } from '@/lib/pb'
import { DEV_GROUPS } from '@/lib/devPresets'
import { canOfferFullscreen, enterFullscreen, readFullscreenEnv } from '@/lib/fullscreen'
import PageSurface from '@/components/ui/PageSurface'
import { TRAINING_TRIES } from '@/lib/data'
import { TRAINING_TRY_IDS, currentTrainingTry, type TrainingTryId } from '@/lib/systems/FlightPlanSystem'

interface SettingsSheetProps {
  onClose: () => void
}

const IS_DEV = process.env.NODE_ENV === 'development'

const PATCH_NOTES: { title: string; lines: string[] }[] = [
  { title: 'Base and flight scenes', lines: ['Pixel-art launchpad, hangar and underground silo', 'Swipe down from the base to dig', 'Shared dock and HUD on every scene'] },
  { title: 'Laser mining', lines: ['Ship laser mining is the default', 'Buried deposits spaced across the dig', 'Layered strata ground'] },
  { title: 'Training', lines: ['Replay or skip the three tries from Settings', 'Free Ops opens when training is done'] },
]

function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="ops-settings__close" onClick={onClick} aria-label={label} data-testid="settings-close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  )
}

export default function SettingsSheet({ onClose }: SettingsSheetProps) {
  const game = useGame()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkipTraining, setConfirmSkipTraining] = useState(false)
  const [showPatchNotes, setShowPatchNotes] = useState(false)
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
      className="ops-settings"
      contentClassName="ops-settings__card"
      testId="settings-sheet"
      ariaLabel="Settings"
    >
      {showPatchNotes ? (
        <>
          <header className="ops-settings__head">
            <h2 className="ops-settings__title">Patch notes</h2>
            <CloseButton onClick={() => setShowPatchNotes(false)} label="Back" />
          </header>
          <div className="ops-settings__stack" data-testid="patch-notes">
            {PATCH_NOTES.map(note => (
              <article key={note.title} className="ops-settings__note">
                <h3>{note.title}</h3>
                <ul>
                  {note.lines.map(line => <li key={line}>{line}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <header className="ops-settings__head">
            <h2 className="ops-settings__title">Settings</h2>
            <CloseButton onClick={onClose} />
          </header>

          <div className="ops-settings__stack">
            <section>
              <h3 className="ops-settings__label">Training</h3>
              <div className="patch-shelf" data-testid="training-patch-shelf" role="list" aria-label="Mission patches">
                {TRAINING_TRY_IDS.map(tryId => {
                  const active = currentTrainingTry(game.player.flightPlan) === tryId
                  const done = !!game.player.flightPlan?.completed?.[tryId]
                  const status = done ? 'Done' : active ? 'On air' : 'Standby'
                  const label = tryId === 'part' ? 'Part tweak' : tryId === 'scan' ? 'Planet scan' : 'Mining'
                  const steps = TRAINING_TRIES.filter(step => step.try === tryId)
                  const stepAt = steps.findIndex(step => step.screen === game.screen)
                  const turn = done ? 1 : active ? Math.max(1, stepAt + 1) / Math.max(1, steps.length) : 0
                  return (
                    <div key={tryId} role="listitem" className="patch" data-state={done ? 'done' : active ? 'active' : 'standby'}>
                      <span className="patch-ring" style={{ ['--patch-turn' as string]: String(turn) }} aria-hidden="true">{done ? '✓' : TRAINING_TRY_IDS.indexOf(tryId) + 1}</span>
                      <div data-testid={`training-${tryId}-status`}>
                        <div className="patch-name">{label}</div>
                        <div className="patch-status">{status}</div>
                      </div>
                      <button type="button" className="ops-settings__replay" onClick={() => replay(tryId)}>Replay</button>
                    </div>
                  )
                })}
              </div>
              {!game.player.freeOperations && (
                <button
                  type="button"
                  className="ops-settings__row"
                  data-testid="skip-training"
                  onClick={() => {
                    if (!confirmSkipTraining) { setConfirmSkipTraining(true); return }
                    game.skipFlightPlan()
                    onClose()
                  }}
                >
                  <span>{confirmSkipTraining ? 'Confirm: mark all tries done' : 'Skip training'}</span>
                </button>
              )}
            </section>

            <section>
              <h3 className="ops-settings__label">Game</h3>
              <button
                type="button"
                className="ops-settings__row"
                data-testid="free-ops-toggle"
                aria-pressed={game.player.freeOperations}
                onClick={() => game.setFreeOps(!game.player.freeOperations)}
              >
                <span>Free Ops</span>
                <span className={game.player.freeOperations ? 'ops-settings__flag ops-settings__flag--on' : 'ops-settings__flag'}>
                  {game.player.freeOperations ? 'On' : 'Off'}
                </span>
              </button>
              <button type="button" className="ops-settings__row" data-testid="patch-notes-button" onClick={() => setShowPatchNotes(true)}>
                <span>Patch notes</span>
              </button>
              <button type="button" className="ops-settings__row ops-settings__row--danger" data-testid="reset-progress" onClick={handleReset}>
                <span>{confirmReset ? 'Confirm: erase all progress' : 'Reset progress'}</span>
              </button>
            </section>

            {showFullscreen && (
              <section>
                <h3 className="ops-settings__label">Display</h3>
                <button type="button" className="ops-settings__row" onClick={() => { enterFullscreen().catch(() => {}) }}>
                  <span>Fullscreen</span>
                </button>
              </section>
            )}

            {game.player.missionsDone > 0 && (
              <section>
                <h3 className="ops-settings__label">Program</h3>
                <div className="ops-settings__row ops-settings__row--static">
                  <span>
                    Skill tree
                    <span className="ops-settings__hint" data-testid="menu-skill-points">
                      {(game.player.skillPoints ?? 0) > 0 ? `${game.player.skillPoints} skill points available` : 'Spend skill points on upgrades'}
                    </span>
                  </span>
                  <button type="button" className="ops-settings__replay" onClick={() => { onClose(); game.go('skills') }}>Open</button>
                </div>
              </section>
            )}

            <section>
              <h3 className="ops-settings__label">Account</h3>
              <div className="ops-settings__row ops-settings__row--static">
                <span>
                  {email ?? 'Email account'}
                  {!email && <span className="ops-settings__hint">Account details are loading</span>}
                </span>
                <button type="button" className="ops-settings__replay" onClick={handleSignOut}>Sign out</button>
              </div>
            </section>

            {IS_DEV && (
              <section>
                <h3 className="ops-settings__label">Debug</h3>
                <button type="button" className="ops-settings__row" onClick={() => { onClose(); window.location.href = '/game' }}>
                  <span>My game</span>
                </button>
                {DEV_GROUPS.map(group => (
                  <div key={group.label} className="ops-settings__presets">
                    <h4 className="ops-settings__label">{group.label}</h4>
                    <div className="ops-settings__preset-row">
                      {group.shots.map(shot => (
                        <button key={shot.key} type="button" className="ops-settings__preset" onClick={() => jumpPreset(shot.key)} title={shot.hint}>
                          {shot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </>
      )}
    </PageSurface>
  )
}
