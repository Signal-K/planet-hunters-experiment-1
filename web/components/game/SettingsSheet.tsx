'use client'

import React, { useEffect, useState } from 'react'
import { useGame } from '@/game-context'
import { pbShared } from '@/lib/pb'
import { DEV_GROUPS } from '@/lib/devPresets'
import { canOfferFullscreen, enterFullscreen, readFullscreenEnv } from '@/lib/fullscreen'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { readStoredOrientation, storeOrientation, type OrientationPreference } from '@/lib/orientation'
import PageSurface from '@/components/ui/PageSurface'
import { PushOptIn } from '@/components/game/PushOptIn'
import { type TrainingTryId } from '@/lib/systems/FlightPlanSystem'

interface SettingsSheetProps {
  onClose: () => void
}

const ORIENTATION_CHOICES: { id: OrientationPreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
]

const PATCH_NOTES: { title: string; lines: string[] }[] = [
  { title: 'Base and flight scenes', lines: ['Pixel-art launchpad, hangar and underground silo', 'Swipe down from the base to dig', 'Shared dock and HUD on every scene'] },
  { title: 'Laser mining', lines: ['Ship laser mining is the default', 'Buried deposits spaced across the dig', 'Layered strata ground'] },
  { title: 'Training', lines: ['Replay the three tries from Settings', 'Free Ops opens when training is done'] },
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

function Row({ children }: { children: React.ReactNode }) {
  return <div className="ops-settings__row">{children}</div>
}

/** Cream and blue pixel horizon. No green, yellow, or orange. */
function SettingsSky() {
  return (
    <div className="ops-settings__sky" aria-hidden="true">
      <svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="96" fill="var(--ln-blueprint-paper-2)" />
        <rect width="320" height="34" fill="var(--ln-blueprint-blue)" opacity="0.28" />
        <rect y="34" width="320" height="14" fill="var(--ln-blueprint-blue)" opacity="0.12" />
        <g fill="var(--ln-blueprint-ink)">
          <rect x="16" y="12" width="3" height="3" />
          <rect x="58" y="22" width="2" height="2" />
          <rect x="112" y="8" width="3" height="3" />
          <rect x="176" y="18" width="2" height="2" />
          <rect x="230" y="10" width="3" height="3" />
          <rect x="292" y="20" width="2" height="2" />
        </g>
        <g fill="var(--ln-blueprint-blue)">
          <rect x="0" y="56" width="40" height="40" />
          <rect x="28" y="44" width="28" height="52" />
          <rect x="52" y="60" width="24" height="36" />
          <rect x="72" y="38" width="32" height="58" />
          <rect x="100" y="52" width="22" height="44" />
          <rect x="188" y="48" width="28" height="48" />
          <rect x="210" y="34" width="36" height="62" />
          <rect x="242" y="54" width="24" height="42" />
          <rect x="262" y="42" width="30" height="54" />
          <rect x="288" y="58" width="32" height="38" />
        </g>
        <g fill="var(--ln-blueprint-ink)">
          <rect x="0" y="74" width="52" height="22" />
          <rect x="40" y="66" width="36" height="30" />
          <rect x="72" y="78" width="44" height="18" />
          <rect x="108" y="70" width="28" height="26" />
          <rect x="196" y="72" width="40" height="24" />
          <rect x="228" y="62" width="36" height="34" />
          <rect x="260" y="76" width="60" height="20" />
        </g>
        <g fill="var(--ln-blueprint-paper)">
          <rect x="146" y="80" width="32" height="6" />
          <rect x="158" y="62" width="6" height="18" />
        </g>
        <polygon points="158,62 161,52 164,62" fill="var(--ln-blueprint-ink)" />
      </svg>
    </div>
  )
}

export default function SettingsSheet({ onClose }: SettingsSheetProps) {
  const game = useGame()
  const [confirmReset, setConfirmReset] = useState(false)
  const [showPatchNotes, setShowPatchNotes] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [orientation, setOrientation] = useState<OrientationPreference>('auto')
  const [showDebug, setShowDebug] = useState(false)
  const email = pbShared.authStore.record?.email as string | undefined
  const freeOps = game.player.freeOperations

  useEffect(() => {
    setOrientation(readStoredOrientation())
    // Presets stay on the dev launcher. A normal player build, and ordinary
    // play without ?dev=1, never shows the Debug section.
    if (isDevLauncherEnabled() && new URLSearchParams(window.location.search).get('dev') === '1') {
      setShowDebug(true)
    }
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

  function chooseOrientation(next: OrientationPreference) {
    setOrientation(next)
    storeOrientation(next)
  }

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
      <SettingsSky />
      {showPatchNotes ? (
        <>
          <header className="ops-settings__head">
            <h2 className="ops-settings__page">Patch notes</h2>
            <CloseButton onClick={() => setShowPatchNotes(false)} label="Back" />
          </header>
          <div className="ops-settings__stack ops-settings__stack--notes" data-testid="patch-notes">
            {PATCH_NOTES.map(note => (
              <article key={note.title} className="ops-settings__panel ops-settings__note">
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
            <h2 className="ops-settings__page">Settings</h2>
            <CloseButton onClick={onClose} />
          </header>

          <div className="ops-settings__stack">
            <section>
              <h3 className="ops-settings__label">Display</h3>
              <div className="ops-settings__panel">
                <div className="ops-settings__field ops-settings__field--orient">
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">Screen orientation</div>
                    <div className="ops-settings__sub">Lock to portrait or landscape</div>
                  </div>
                  <div className="ln-set-segment ops-settings__choices ops-settings__choices--three" role="group" aria-label="Screen orientation" data-testid="orientation-segment">
                    {ORIENTATION_CHOICES.map(choice => (
                      <button
                        key={choice.id}
                        type="button"
                        aria-pressed={orientation === choice.id}
                        onClick={() => chooseOrientation(choice.id)}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>
                {showFullscreen && (
                  <Row>
                    <div className="ops-settings__copy">
                      <div className="ops-settings__name">Fullscreen</div>
                      <div className="ops-settings__sub">Use the whole screen</div>
                    </div>
                    <button type="button" className="ops-settings__btn" onClick={() => { enterFullscreen().catch(() => {}) }}>
                      Enter
                    </button>
                  </Row>
                )}
              </div>
            </section>

            <section>
              <h3 className="ops-settings__label">Training</h3>
              <div className="ops-settings__panel">
                <Row>
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">Replay tutorials</div>
                    <div className="ops-settings__sub">Mining, scan, and the part tweak</div>
                  </div>
                  <button type="button" className="ops-settings__btn" data-testid="replay-tutorials" onClick={() => replay('mining')}>
                    Replay
                  </button>
                </Row>
              </div>
            </section>

            <section>
              <h3 className="ops-settings__label">Game</h3>
              <div className="ops-settings__panel">
                <div className="ops-settings__field">
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">Free Ops</div>
                    <div className="ops-settings__sub">{freeOps ? 'On' : 'Off'}</div>
                  </div>
                  <div className="ln-set-segment ops-settings__choices ops-settings__choices--two" role="group" aria-label="Free Ops" data-testid="free-ops-toggle">
                    <button type="button" aria-pressed={!freeOps} onClick={() => game.setFreeOps(false)}>Off</button>
                    <button type="button" aria-pressed={freeOps} onClick={() => game.setFreeOps(true)}>On</button>
                  </div>
                </div>
                {game.player.freeOperations && (
                  <Row>
                    <div className="ops-settings__copy">
                      <div className="ops-settings__name">Mission alerts</div>
                    </div>
                    <div className="ops-settings__alerts">
                      <PushOptIn userId={game.authUserId ?? undefined} />
                    </div>
                  </Row>
                )}
              </div>
            </section>

            <section>
              <h3 className="ops-settings__label">Account</h3>
              <div className="ops-settings__panel">
                <Row>
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">{email ?? 'Signed in'}</div>
                  </div>
                  <button type="button" className="ops-settings__btn" onClick={handleSignOut}>Sign out</button>
                </Row>
              </div>
            </section>

            <section>
              <div className="ops-settings__panel ops-settings__panel--danger">
                <Row>
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">Reset progress</div>
                    <div className="ops-settings__sub">{confirmReset ? 'This cannot be undone' : 'Erases the saved game'}</div>
                  </div>
                  <button type="button" className="ops-settings__btn ops-settings__btn--danger" data-testid="reset-progress" onClick={handleReset}>
                    {confirmReset ? 'Confirm: erase all progress' : 'Reset progress'}
                  </button>
                </Row>
              </div>
            </section>

            {game.player.missionsDone > 0 && (
              <section>
                <h3 className="ops-settings__label">Program</h3>
                <div className="ops-settings__panel">
                  <Row>
                    <div className="ops-settings__copy">
                      <div className="ops-settings__name">Skill tree</div>
                      <div className="ops-settings__sub" data-testid="menu-skill-points">
                        {(game.player.skillPoints ?? 0) > 0 ? `${game.player.skillPoints} skill points available` : 'Spend skill points on upgrades'}
                      </div>
                    </div>
                    <button type="button" className="ops-settings__btn" onClick={() => { onClose(); game.go('skills') }}>Open</button>
                  </Row>
                </div>
              </section>
            )}

            {showDebug && (
              <section>
                <h3 className="ops-settings__label">Debug</h3>
                <div className="ops-settings__panel">
                  <Row>
                    <div className="ops-settings__copy">
                      <div className="ops-settings__name">My game</div>
                      <div className="ops-settings__sub">Leave the stage preset</div>
                    </div>
                    <button type="button" className="ops-settings__btn" onClick={() => { onClose(); window.location.href = '/game' }}>Open</button>
                  </Row>
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
                </div>
              </section>
            )}

            <button type="button" className="ops-settings__notes-link" data-testid="patch-notes-button" onClick={() => setShowPatchNotes(true)}>
              Patch notes
            </button>
          </div>
        </>
      )}
    </PageSurface>
  )
}
