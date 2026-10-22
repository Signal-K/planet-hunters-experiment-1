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
import { TRAINING_REPLAY_REWARD, TRAINING_TRY_IDS, currentTrainingTry, type TrainingTryId } from '@/lib/systems/FlightPlanSystem'
import { trainingPatchProgress } from '@/lib/data/tutorial'
import { EARTH_BIOMES, biomeLayers } from '@/lib/scene/base-world'
import { SKY_EVENT_CITIES, deviceSkyLocation, sanitizePlayerLocation } from '@/lib/data/sky-event-window'

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

export default function SettingsSheet({ onClose }: SettingsSheetProps) {
  const game = useGame()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSkipTraining, setConfirmSkipTraining] = useState(false)
  const [moveBiome, setMoveBiome] = useState(game.player.earthBiome ?? 'mountains')
  const [confirmMoveBase, setConfirmMoveBase] = useState(false)
  const initialSkyLocation = game.player.skyEventLocation ?? deviceSkyLocation()
  const [skyCity, setSkyCity] = useState(game.player.skyEventLocation?.city ?? '')
  const [skyLatitude, setSkyLatitude] = useState(String(initialSkyLocation.latitude))
  const [skyTimeZone, setSkyTimeZone] = useState(initialSkyLocation.timeZone)
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
      style={{ inset: 0, position: 'fixed', zIndex: 110 }}
      testId="settings-sheet"
      ariaLabel="Settings"
    >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CloseButton onClick={onClose} />
            </div>
          </header>

          <div className="ops-settings__stack">
            <section>
              <h3 className="ops-settings__label">Display</h3>
              <div className="ops-settings__panel">
                <div className="ops-settings__field ops-settings__field--orient">
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">Screen orientation</div>
                    <div className="ops-settings__sub" style={{ display: 'block' }}>Lock to portrait or landscape</div>
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
              <div className="ops-settings__panel ops-settings__training" style={{ padding: 12 }}>
                <p className="ops-settings__replay-reward">Completed tries pay again on completion: +{TRAINING_REPLAY_REWARD.francs} francs · +{TRAINING_REPLAY_REWARD.researchXP} research XP · +{TRAINING_REPLAY_REWARD.stash.iron} iron</p>
                <div className="patch-shelf" data-testid="training-patch-shelf" role="list" aria-label="Mission patches">
                  {TRAINING_TRY_IDS.map(tryId => {
                    const active = currentTrainingTry(game.player.flightPlan) === tryId
                    const done = !!game.player.flightPlan?.completed?.[tryId]
                    const { total, stitched } = trainingPatchProgress(tryId, game.screen, done, active)
                    const status = done ? 'Done' : active ? 'On air' : `Locked · After ${TRAINING_TRY_IDS.indexOf(tryId)}`
                    const label = tryId === 'part' ? 'Part tweak' : tryId === 'scan' ? 'Planet scan' : 'Mining'
                    return (
                      <div key={tryId} role="listitem" className="patch" data-state={done ? 'done' : active ? 'active' : 'standby'}>
                        <svg className="patch-ring" style={done ? { color: 'var(--ln-blueprint-blue)' } : undefined} viewBox="0 0 44 44" role="img" aria-label={`${label}: ${stitched} of ${total} steps stitched`}>
                          <circle className="patch-ring-track" cx="22" cy="22" r="16" />
                          {Array.from({ length: total }, (_, index) => {
                            const circumference = 2 * Math.PI * 16
                            const length = circumference / total * 0.72
                            return <circle key={index} className="patch-ring-segment" data-stitched={index < stitched} style={done && index < stitched ? { stroke: 'var(--ln-blueprint-blue)' } : undefined} cx="22" cy="22" r="16" strokeDasharray={`${length} ${circumference}`} transform={`rotate(${index * 360 / total} 22 22)`} />
                          })}
                          <text x="22" y="26" textAnchor="middle" style={{ fontSize: 14 }}>{String(stitched).padStart(2, '0')}</text>
                        </svg>
                        <div className="ops-settings__copy" data-testid={`training-${tryId}-status`}>
                          <div className="patch-name">{label}</div><div className="patch-status" style={done ? { color: 'var(--ln-blueprint-blue)' } : undefined}>{status}</div>
                        </div>
                        <button type="button" className="ops-settings__btn ops-settings__btn--mini" onClick={() => replay(tryId)}>Replay</button>
                      </div>
                    )
                  })}
                  <div role="listitem" className="patch patch--free-ops" data-state={freeOps ? 'done' : 'standby'}>
                    <span className="patch-ring patch-ring--silhouette" aria-hidden="true">◇</span>
                    <div className="ops-settings__copy"><div className="patch-name">Free Ops</div><div className="patch-status">{freeOps ? 'Unlocked' : 'Locked · After 3'}</div></div>
                  </div>
                </div>
                {!freeOps && <Row>
                  <div className="ops-settings__copy"><div className="ops-settings__name">Skip</div><div className="ops-settings__sub">{confirmSkipTraining ? 'Confirm: mark all tries done' : 'Marks every try done'}</div></div>
                  <button type="button" className="ops-settings__btn ops-settings__btn--mini" data-testid="skip-training" onClick={() => {
                    if (!confirmSkipTraining) { setConfirmSkipTraining(true); return }
                    game.skipFlightPlan(); onClose()
                  }}>{confirmSkipTraining ? 'Confirm' : 'Skip'}</button>
                </Row>}
              </div>
            </section>

            {game.player.placed.length > 0 && !game.player.earthBiomeMoveUsed && <section>
              <h3 className="ops-settings__label">Base landscape</h3>
              <div className="ops-settings__panel">
                <div className="base-biome-move-grid" role="group" aria-label="Choose a new base landscape">
                  {EARTH_BIOMES.map(id => <button key={id} type="button" className="base-biome-option" aria-pressed={moveBiome === id} onClick={() => { setMoveBiome(id); setConfirmMoveBase(false) }}>
                    <img src={biomeLayers(id)[0].src} alt="" draggable={false} />{id}
                  </button>)}
                </div>
                <Row>
                  <div className="ops-settings__copy"><div className="ops-settings__name">Move base</div><div className="ops-settings__sub">Available once</div></div>
                  <button type="button" className="ops-settings__btn" onClick={() => {
                    if (!confirmMoveBase) { setConfirmMoveBase(true); return }
                    game.setPlayer(current => ({ ...current, earthBiome: moveBiome, earthBiomeMoveUsed: true }))
                    setConfirmMoveBase(false)
                  }}>{confirmMoveBase ? 'Confirm move' : 'Move'}</button>
                </Row>
              </div>
            </section>}

            <section>
              <h3 className="ops-settings__label">Sky events</h3>
              <div className="ops-settings__panel" data-testid="sky-event-location-settings">
                <label className="ops-settings__field"><span>City</span><select value={skyCity} onChange={event => {
                  const city = SKY_EVENT_CITIES.find(candidate => candidate.city === event.target.value)
                  setSkyCity(event.target.value)
                  if (city) { setSkyLatitude(String(city.latitude)); setSkyTimeZone(city.timeZone) }
                }}><option value="">Manual</option>{SKY_EVENT_CITIES.map(city => <option key={city.city} value={city.city}>{city.city}</option>)}</select></label>
                <label className="ops-settings__field"><span>Coarse latitude</span><input type="number" min="-90" max="90" step="1" value={skyLatitude} onChange={event => { setSkyCity(''); setSkyLatitude(event.target.value) }} /></label>
                <label className="ops-settings__field"><span>Timezone</span><input value={skyTimeZone} onChange={event => { setSkyCity(''); setSkyTimeZone(event.target.value) }} placeholder="Europe/Tallinn" /></label>
                <p className="ops-settings__sub">Only the city, latitude rounded to 1°, and timezone are saved. No longitude or GPS.</p>
                <div className="ops-settings__actions">
                  <button type="button" className="ops-settings__btn" data-testid="save-sky-event-location" onClick={() => {
                    const next = sanitizePlayerLocation({ city: skyCity || undefined, latitude: Number(skyLatitude), timeZone: skyTimeZone })
                    if (next) game.setPlayer(player => ({ ...player, skyEventLocation: next }))
                  }}>Save</button>
                  <button type="button" className="ops-settings__btn" data-testid="clear-sky-event-location" onClick={() => game.setPlayer(player => ({ ...player, skyEventLocation: null }))}>Clear</button>
                </div>
              </div>
            </section>

            {game.player.freeOperations && <section>
              <h3 className="ops-settings__label">Game</h3>
              <div className="ops-settings__panel">
                <Row>
                  <div className="ops-settings__copy">
                    <div className="ops-settings__name">Mission alerts</div>
                  </div>
                  <div className="ops-settings__alerts">
                    <PushOptIn userId={game.authUserId ?? undefined} />
                  </div>
                </Row>
              </div>
            </section>}

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
