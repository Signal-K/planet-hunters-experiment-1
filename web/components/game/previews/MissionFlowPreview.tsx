'use client'

import React, { useState } from 'react'
import styles from './MissionFlowPreview.module.css'
import { JOBS, JOB_ORDER, GUIDE_CARDS, type JobKey, type StageKey } from './missionFlowPreviewData'

// React port of the Open Design prototype at
// open-design/.od/projects/00593938-0432-4fe2-ab6f-c5213e91038a/landnam-client-bonus.html
// Local-only technical preview (mirrors the takeon-preview convention at
// web/app/game/takeon-preview) — proves the OD layout/interactions/assets
// port to real React state. Does not replace MissionBoardScreen.tsx/
// MissionCard.tsx; see the run report for the palette conflict with
// Landnam's real dark tokens in web/app/globals.css.

const FACE_CLASS: Record<string, string> = {
  helios: styles.faceHelios,
  meridian: styles.faceMeridian,
  vanta: styles.faceVanta,
  market: styles.faceMarket,
  orbitex: styles.faceOrbitex,
}

const BIOME_CLASS: Record<string, string> = {
  silicon: styles.biomeSilicon,
  dust: styles.biomeDust,
  metal: styles.biomeMetal,
  market: styles.biomeMarket,
  space: styles.biomeSpace,
}

const STAGE_ORDER: { key: StageKey; label: string }[] = [
  { key: 'mission', label: 'Mission' },
  { key: 'target', label: 'Target' },
  { key: 'rocket', label: 'Rocket' },
  { key: 'relay', label: 'Relay' },
]

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const TILE_ROWS: (keyof typeof TILE_CLASS)[][] = [
  ['block', 'block', 'd', 'r', 'r', 'd', 'block', 'block', 'd'],
  ['d', 'r', 'r', 'l', 'l', 'r', 'r', 'd', 'block'],
  ['r', 'r', 'block', 'block', 'd', 'block', 'block', 'r', 'r'],
  ['d', 'stone', 'stone', 'block', 'd', 'block', 'stone', 'stone', 'd'],
  ['r', 'r', 'block', 'block', 'd', 'block', 'block', 'r', 'r'],
  ['d', 'l', 'l', 'r', 'r', 'l', 'l', 'd', 'block'],
]

const TILE_CLASS = {
  r: 'tileR',
  d: 'tileD',
  l: 'tileL',
  block: 'tileBlock',
  stone: 'tileStone',
} as const

export default function MissionFlowPreview() {
  const [selectedJob, setSelectedJob] = useState<JobKey>('helios')
  const [stage, setStage] = useState<StageKey>('mission')
  const [rocketReady, setRocketReady] = useState(false)
  const [relayReady, setRelayReady] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const job = JOBS[selectedJob]

  function pickJob(key: JobKey) {
    setSelectedJob(key)
    setStage('mission')
    setRocketReady(false)
    setRelayReady(false)
  }

  function stageEnabled(key: StageKey): boolean {
    if (key === 'mission' || key === 'target') return true
    if (key === 'rocket') return rocketReady || stage === 'rocket' || stage === 'relay'
    if (key === 'relay') return relayReady || stage === 'relay'
    return false
  }

  return (
    <div className={styles.wrap}>
      <main
        className={cx(styles.game, BIOME_CLASS[job.biome])}
        data-od-id="mission-board-screen"
      >
        <header className={styles.hud} data-od-id="mission-board-header">
          <div className={styles.pilot}>
            <div className={cx(styles.avatar, FACE_CLASS[job.avatar])} aria-hidden="true" />
            <div className={styles.hudTitle}>
              <h1>Mission board</h1>
              <p>{job.summary}</p>
            </div>
          </div>
          <div className={styles.missionStatus} aria-label="Mission board state" data-od-id="mission-status">
            <span>Board scan</span>
            <strong>{job.jobType}</strong>
          </div>
        </header>

        <section className={styles.stage} data-od-id="mission-stage">
          <aside className={styles.playfield} data-od-id="playfield-map" aria-label="Mission map preview">
            <div className={styles.tileGrid} aria-hidden="true">
              {TILE_ROWS.flat().map((t, i) => (
                <span key={i} className={cx(styles.tile, styles[TILE_CLASS[t]])} />
              ))}
            </div>
            <div className={styles.route} aria-hidden="true" />
            <div className={cx(styles.greeblie, styles.g1)} aria-hidden="true" />
            <div className={cx(styles.greeblie, styles.g2)} aria-hidden="true" />
            <div className={cx(styles.greeblie, styles.g3)} aria-hidden="true" />
            <div className={cx(styles.greeblie, styles.g4)} aria-hidden="true" />
            <div className={cx(styles.npc, FACE_CLASS[job.avatar])} aria-hidden="true">
              <span className={styles.sceneMark} />
              <span className={styles.npcLabel}>{job.sceneLabel}</span>
            </div>
            <div className={styles.mapNote} data-od-id="map-note">
              <div>
                <strong>{job.subline}</strong>
                <small>{job.map}</small>
              </div>
              <button
                className={styles.infoBtn}
                type="button"
                data-od-id="open-client-guide"
                onClick={() => setGuideOpen(true)}
              >
                Info
              </button>
            </div>
          </aside>

          <section className={styles.board}>
            {stage === 'mission' && (
              <section data-step="mission" data-od-id="step-mission">
                <div className={styles.contracts} role="tablist" aria-label="Contracts" data-od-id="contract-list">
                  {JOB_ORDER.map(key => {
                    const j = JOBS[key]
                    const selected = key === selectedJob
                    return (
                      <button
                        key={key}
                        className={cx(styles.contract, selected && styles.contractSelected)}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        data-od-id={`contract-${key}`}
                        onClick={() => pickJob(key)}
                      >
                        <span className={cx(styles.badge, styles.clientFace, FACE_CLASS[j.avatar], j.kind === 'market' && styles.badgeMarket)}>
                          <span>{j.token}</span>
                        </span>
                        <span className={styles.contractMain}>
                          <span className={styles.contractTop}>
                            <span>
                              <span className={styles.contractKicker}>{j.kicker}</span>
                              <strong className={styles.contractTitle}>{j.title}</strong>
                            </span>
                            <span className={styles.state}>{j.kind === 'market' ? 'Market' : 'Ready'}</span>
                          </span>
                          <span className={styles.contractCopy}>{j.copy}</span>
                          <span className={styles.chips}>
                            {j.chips.map(chip => (
                              <span key={chip.label} className={cx(styles.chip, chip.empty && styles.chipEmpty)}>
                                {chip.label}
                                <strong>{chip.value}</strong>
                              </span>
                            ))}
                          </span>
                        </span>
                      </button>
                    )
                  })}

                  <button className={cx(styles.contract, styles.contractDisabled)} type="button" role="tab" aria-selected={false} disabled aria-disabled="true" data-od-id="contract-locked">
                    <span className={cx(styles.badge, styles.clientFace, FACE_CLASS.orbitex, styles.badgeMuted)}>
                      <span>TD</span>
                    </span>
                    <span className={styles.contractMain}>
                      <span className={styles.contractTop}>
                        <span>
                          <span className={styles.contractKicker}>Locked</span>
                          <strong className={styles.contractTitle}>Downlink Survey</strong>
                        </span>
                        <span className={styles.state}>Relay</span>
                      </span>
                      <span className={styles.contractCopy}>Needs relay readiness before this job can be selected.</span>
                      <span className={styles.chips}>
                        <span className={cx(styles.chip, styles.chipEmpty)}>Cargo<strong>--</strong></span>
                        <span className={cx(styles.chip, styles.chipEmpty)}>Premium<strong>--</strong></span>
                        <span className={cx(styles.chip, styles.chipEmpty)}>Affinity<strong>--</strong></span>
                      </span>
                    </span>
                  </button>
                </div>

                <article className={styles.selectedPanel} data-od-id="selected-mission-explainer">
                  <div className={styles.selectedHead}>
                    <div className={cx(styles.selectedToken, FACE_CLASS[job.avatar])}>
                      <span>{job.token}</span>
                    </div>
                    <div>
                      <h2>{job.title}</h2>
                      <p>{job.summary}</p>
                    </div>
                  </div>
                  <div className={styles.rules}>
                    <div className={styles.rule}><span>Cargo</span><strong>{job.cargo}</strong></div>
                    <div className={cx(styles.rule, styles.ruleWarn)}><span>Premium</span><strong>{job.premium}</strong></div>
                    <div className={styles.rule}><span>Affinity</span><strong>{job.affinity}</strong></div>
                    <div className={styles.rule}><span>Not yield</span><strong>{job.yield}</strong></div>
                  </div>
                  <div className={styles.actionRow}>
                    <button className={styles.primary} type="button" data-od-id="continue-to-target" onClick={() => setStage('target')}>
                      Pick target
                    </button>
                    <button className={styles.secondary} type="button" data-od-id="quick-guide" onClick={() => setGuideOpen(true)}>
                      Rules
                    </button>
                  </div>
                </article>
              </section>
            )}

            {stage === 'target' && (
              <section data-step="target" data-od-id="step-target">
                <article className={styles.screenCard}>
                  <h2>Pick target</h2>
                  <p>{job.target}</p>
                  <div className={styles.rules}>
                    <div className={cx(styles.rule, styles.ruleWarn)}><span>Best body</span><strong>4 Vesta · Silicon + Iron</strong></div>
                    <div className={styles.rule}><span>Job lock</span><strong>Target is valid for the selected cargo.</strong></div>
                    <div className={styles.rule}><span>Next</span><strong>Rocket unlocks after target confirmation.</strong></div>
                  </div>
                  <button
                    className={styles.primary}
                    type="button"
                    data-od-id="confirm-target"
                    onClick={() => { setRocketReady(true); setStage('rocket') }}
                  >
                    Confirm target
                  </button>
                </article>
              </section>
            )}

            {stage === 'rocket' && (
              <section data-step="rocket" data-od-id="step-rocket">
                <article className={styles.screenCard}>
                  <h2>Select rocket</h2>
                  <p>The Explorer has enough range and hold space for this client job.</p>
                  <div className={styles.rules}>
                    <div className={cx(styles.rule, styles.ruleWarn)}><span>Hold</span><strong>{job.hold}</strong></div>
                    <div className={styles.rule}><span>Range</span><strong>Clears the selected body.</strong></div>
                    <div className={styles.rule}><span>Relay</span><strong>Unlocks after launch prep.</strong></div>
                  </div>
                  <button
                    className={styles.primary}
                    type="button"
                    data-od-id="confirm-rocket"
                    onClick={() => { setRelayReady(true); setStage('relay') }}
                  >
                    Prep launch
                  </button>
                </article>
              </section>
            )}

            {stage === 'relay' && (
              <section data-step="relay" data-od-id="step-relay">
                <article className={styles.screenCard}>
                  <h2>Check relay</h2>
                  <p>Relay marks show discovery context. They do not add client payout or mined cargo.</p>
                  <div className={styles.rules}>
                    <div className={styles.rule}><span>SMS-01</span><strong>Vesta track ready.</strong></div>
                    <div className={styles.rule}><span>TESS-02</span><strong>Psyche candidate tomorrow.</strong></div>
                    <div className={cx(styles.rule, styles.ruleWarn)}><span>Launch</span><strong>Mission ready.</strong></div>
                  </div>
                  <button className={styles.primary} type="button" data-od-id="launch-mission">
                    Launch mission
                  </button>
                </article>
              </section>
            )}
          </section>
        </section>

        <nav className={styles.stageDock} aria-label="Mission setup stage" data-od-id="mission-stage-dock">
          {STAGE_ORDER.map(({ key, label }) => {
            const enabled = stageEnabled(key)
            const active = stage === key
            const smallLabel = !enabled ? 'Locked' : active ? 'Ready' : key === stage ? 'Ready' : 'Next'
            return (
              <button
                key={key}
                className={cx(styles.stageLink, active && styles.stageLinkActive, !enabled && styles.stageLinkDisabled)}
                type="button"
                disabled={!enabled}
                aria-disabled={!enabled}
                data-od-id={`nav-${key}`}
                onClick={() => enabled && setStage(key)}
              >
                <span>{label}</span>
                <small>{smallLabel}</small>
              </button>
            )
          })}
        </nav>

        <div className={cx(styles.sheet, guideOpen && styles.sheetOpen)} data-od-id="client-bonus-guide-sheet">
          <section className={styles.guide} role="dialog" aria-modal="true" aria-labelledby="guideTitle">
            <h2 id="guideTitle">Client bonus rules</h2>
            {GUIDE_CARDS.map(card => (
              <article key={card.title} className={styles.guideCard} data-od-id={`guide-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className={styles.guideIcon}>{card.icon}</div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              </article>
            ))}
            <button className={styles.primary} type="button" data-od-id="close-client-guide" onClick={() => setGuideOpen(false)}>
              Got it
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
