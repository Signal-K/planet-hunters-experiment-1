'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import {
  ACADEMY_DAILY_UPKEEP,
  ACADEMY_RESEARCH_XP_COST,
  ACTOR_ARCHETYPES,
  CREW_DAILY_UPKEEP,
  CREW_MODULE_RESEARCH_XP_COST,
  STRUCTURES,
  TRAINING_SESSIONS_PER_DAY,
  type SkillBranch,
} from '@/lib/data'
import {
  academyAffinityUnlocked,
  academyLevel,
  academyTrainingCapacity,
  availableCrewSources,
  clientAffinityLevel,
  crewHireEligibility,
  hireCost,
  utcDateKey,
} from '@/lib/systems/AcademySystem'
import { crewLevel, crewProgress } from '@/lib/systems/CrewSystem'
import { formatCountdown, formatCurrency } from '@/lib/format'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import AcademyCanvas from './AcademyCanvas'
import AcademyCoach, { useAcademyCoach } from '@/components/game/AcademyCoach'
import styles from './AcademyScreen.module.css'

type Tab = 'roster' | 'training' | 'hire' | 'staffing' | 'partners'
const BRANCHES: SkillBranch[] = ['mining', 'cargo', 'range', 'engineering']

interface AcademyScreenProps {
  player: Player
  catalog: Catalog
  onBack: () => void
  onBuild: () => void
  onOpenHangar: () => void
  onResearch: () => void
  onFunding: (funded: boolean) => void
  onHire: (sourceId: string) => void
  onRehire: (crewId: string) => void
  onTrain: (crewId: string, branch: SkillBranch) => void
  onTrainCandidate: (branch: SkillBranch) => void
  onCollectTraining: (sessionId: string) => void
  onResearchCrewModule: () => void
  onAssign: (structureId: string, crewId: string | null) => void
  onShareCharts: (clientId: string) => void
}

export default function AcademyScreen(props: AcademyScreenProps) {
  const [tab, setTab] = useState<Tab>('roster')
  const [now, setNow] = useState(0)
  const [trainingBranch, setTrainingBranch] = useState<SkillBranch>('mining')
  const academy = STRUCTURES.find(structure => structure.id === 'astronaut-academy')!
  const built = props.player.placed.includes('astronaut-academy')
  const affinityReady = academyAffinityUnlocked(props.player)
  const crew = props.player.crew ?? []
  const sessions = props.player.crewTraining ?? []
  const sources = availableCrewSources(props.player, props.catalog.clients)
  const level = academyLevel(props.player)
  const coach = useAcademyCoach()
  const showCoach = coach.visible && built

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const affinityClients = useMemo(
    () => Object.entries(props.player.clientMissions)
      .map(([id, jobs]) => ({ client: props.catalog.clients[id], jobs, level: clientAffinityLevel(jobs) }))
      .filter(item => item.client)
      .sort((a, b) => b.level - a.level),
    [props.catalog.clients, props.player.clientMissions],
  )

  return (
    <div className={`game-screen theme-light ${styles.screen}`} data-testid="academy-screen">
      <TopBar eyebrow="EARTH BASE · CREW" title="Astronaut Academy" onBack={props.onBack} solid />

      {!built ? (
        <main className={styles.locked}>
          <div className={styles.scenePreview}>
            <AcademyCanvas activeTraining={0} funded={false} />
            <div className={styles.lockVeil}>{props.player.academyResearched ? 'SITE CLEARED' : 'RESEARCH LOCKED'}</div>
          </div>
          <section className={styles.missionCard}>
            <div className={styles.eyebrow}>PROGRAM TASK · TRAIN THE FIRST ASTRONAUT</div>
            <h2>Establish the Academy</h2>
            <Step done={affinityReady} title="Earn client trust" body="Reach affinity level 2 with two clients." />
            <Step done={!!props.player.academyResearched} title="Research the Academy" body={`${ACADEMY_RESEARCH_XP_COST} Research XP`} />
            <Step done={built} title="Build at Earth Base" body={`${formatCurrency(academy.cost)} · 24 aluminium · 12 silicon · 8 copper`} />
            {!affinityReady ? (
              <div className={styles.notice}>Client affinity progress: {affinityClients.filter(item => item.level >= 2).length}/2 trusted partners</div>
            ) : !props.player.academyResearched ? (
              <PrimaryBtn disabled={(props.player.researchXP ?? 0) < ACADEMY_RESEARCH_XP_COST} onClick={props.onResearch}>Research Academy</PrimaryBtn>
            ) : (
              <PrimaryBtn onClick={props.onBuild}>Open Build &amp; Place</PrimaryBtn>
            )}
          </section>
        </main>
      ) : (
        <>
          <div className={styles.scene}>
            <AcademyCanvas activeTraining={sessions.length} funded={!!props.player.academyFunded} />
            <div className={styles.sceneHud}>
              <strong>ACADEMY L{level}</strong>
              <span>{props.player.academyFunded ? `${sessions.length}/${academyTrainingCapacity(props.player)} ACTIVE` : 'FUNDING PAUSED'}</span>
            </div>
          </div>

          <div className={styles.management}>
            <div className={styles.summary}>
              <span>{crew.length} rostered</span>
              <span>{formatCurrency(CREW_DAILY_UPKEEP)} / astronaut / day</span>
              <button onClick={() => props.onFunding(!props.player.academyFunded)}>
                {props.player.academyFunded ? `Funded · ${formatCurrency(ACADEMY_DAILY_UPKEEP)}/day` : 'Restore funding'}
              </button>
            </div>
            <nav className={styles.tabs}>
              {(['roster', 'training', 'hire', 'staffing', 'partners'] as Tab[]).map(item => (
                <button key={item} className={tab === item ? styles.activeTab : ''} onClick={() => setTab(item)}>{item}</button>
              ))}
            </nav>

            <div className={styles.content}>
              {tab === 'roster' && (
                <div className={styles.roster}>
                  {ACTOR_ARCHETYPES.map(archetype => {
                    const members = crew.filter(member => member.crewClass === archetype.id)
                    return (
                      <section key={archetype.id}>
                        <div className={styles.sectionHead}><strong>{archetype.plural}</strong><span>{members.length}{archetype.rosterCap ? `/${archetype.rosterCap}` : ''}</span></div>
                        {members.map(member => {
                          const progress = crewProgress(member)
                          return (
                            <article className={styles.crewCard} key={member.id} data-testid={`crew-${member.id}`}>
                              <div className={`${styles.classMark} ${styles[member.crewClass]}`} />
                              <div className={styles.crewMain}>
                                <div><strong>{member.name}</strong><span>L{crewLevel(member)} · {member.selfTrained ? 'PROGRAM TRAINED' : 'HIRED'}</span></div>
                                <ProgressBar
                                  value={progress.xpIntoLevel}
                                  max={Math.max(1, progress.xpIntoLevel + (progress.xpToNextLevel ?? 0))}
                                  label={`${member.name} XP`}
                                />
                                <div className={styles.specs}>{member.specialisations.length ? member.specialisations.map(spec => `${spec.branch} T${spec.tier}`).join(' · ') : 'No specialisation yet'}</div>
                              </div>
                              {archetype.isPerson && <span className={`${styles.condition} ${styles[member.condition]}`}>{member.condition}</span>}
                            </article>
                          )
                        })}
                      </section>
                    )
                  })}
                </div>
              )}

              {tab === 'training' && (
                <div className={styles.stack}>
                  <div className={styles.notice}>
                    Day-long sessions · {props.player.trainingDate === utcDateKey(now) ? props.player.trainingSessionsUsedToday ?? 0 : 0}/{TRAINING_SESSIONS_PER_DAY} started today · {sessions.length}/{academyTrainingCapacity(props.player)} bays occupied
                  </div>
                  {sessions.map(session => (
                    <article className={styles.actionCard} key={session.id}>
                      <div><strong>{session.candidateName ?? crew.find(member => member.id === session.crewId)?.name}</strong><span>{session.branch} training · {formatCountdown(Math.max(0, session.completesAt - now))}</span></div>
                      <GhostBtn full={false} onClick={() => props.onCollectTraining(session.id)}>
                        {now >= session.completesAt ? 'Collect' : 'In progress'}
                      </GhostBtn>
                    </article>
                  ))}
                  <BranchPicker value={trainingBranch} onChange={setTrainingBranch} />
                  <PrimaryBtn disabled={!props.player.academyFunded} onClick={() => props.onTrainCandidate(trainingBranch)}>Train New Candidate · Level 1</PrimaryBtn>
                  {crew.filter(member => member.crewClass === 'astronaut' && member.condition === 'fit').map(member => (
                    <button className={styles.inlineAction} key={member.id} onClick={() => props.onTrain(member.id, trainingBranch)}>
                      Advance {member.name} in {trainingBranch}
                    </button>
                  ))}
                </div>
              )}

              {tab === 'hire' && (
                <div className={styles.stack}>
                  <div className={styles.notice}>Instant level 3 hires · this week {props.player.crewHiresThisWeek ?? 0}/2 · next {formatCurrency(hireCost(props.player))}</div>
                  {sources.map(source => {
                    const eligibility = crewHireEligibility(props.player, source.id, props.catalog.clients, built, now)
                    return (
                      <article className={styles.actionCard} key={source.id}>
                        <div><strong>{source.name}</strong><span>{source.kind === 'agency' ? 'REAL AGENCY' : 'TRUSTED CLIENT'} · {source.description}</span></div>
                        <GhostBtn full={false} onClick={() => props.onHire(source.id)}>{eligibility.ok ? 'Hire' : eligibility.reason?.replace('-', ' ')}</GhostBtn>
                      </article>
                    )
                  })}
                  {(props.player.formerCrew ?? []).map(offer => (
                    <article className={styles.actionCard} key={offer.member.id}>
                      <div><strong>{offer.member.name}</strong><span>Re-hire at mortgage value · {formatCurrency(offer.rehireCost)}</span></div>
                      <GhostBtn full={false} onClick={() => props.onRehire(offer.member.id)}>Re-hire</GhostBtn>
                    </article>
                  ))}
                </div>
              )}

              {tab === 'staffing' && (
                <div className={styles.stack}>
                  {[
                    ['refinery', 'Refinery', '25% faster processing'],
                    ['scan-station', 'Scanning Station', '+1 scan each day'],
                    ['diplomacy', 'Diplomacy Desk', 'More valuable trusted-client contracts'],
                  ].map(([id, name, effect]) => (
                    <label className={styles.actionCard} key={id}>
                      <div><strong>{name}</strong><span>{effect}</span></div>
                      <select value={props.player.structureCrewAssignments?.[id] ?? ''} onChange={event => props.onAssign(id, event.target.value || null)}>
                        <option value="">Unstaffed</option>
                        {crew.filter(member => member.crewClass === 'astronaut' && member.condition === 'fit').map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              )}

              {tab === 'partners' && (
                <div className={styles.stack}>
                  {!props.player.crewModuleResearched && (
                    <article className={styles.moduleCard}>
                      <div><strong>Crew Quarters T1</strong><span>Research a two-seat module, then purchase and fit it to a larger hull in the Hangar.</span></div>
                      <PrimaryBtn disabled={(props.player.researchXP ?? 0) < CREW_MODULE_RESEARCH_XP_COST} onClick={props.onResearchCrewModule}>Research · {CREW_MODULE_RESEARCH_XP_COST} XP</PrimaryBtn>
                    </article>
                  )}
                  {props.player.crewModuleResearched && <PrimaryBtn onClick={props.onOpenHangar}>Fit Crew Quarters in Hangar</PrimaryBtn>}
                  {Object.values(props.catalog.clients).filter(client => client.suppliesCrew).map(client => (
                    <article className={styles.actionCard} key={client.id}>
                      <div><strong>{client.name}</strong><span>Affinity L{clientAffinityLevel(props.player.clientMissions[client.id] ?? 0)} · {props.player.sharedChartsByClient?.[client.id] ?? 0} charts shared</span></div>
                      <GhostBtn full={false} onClick={() => props.onShareCharts(client.id)}>Share chart</GhostBtn>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
          {showCoach && <AcademyCoach onDismiss={coach.dismiss} />}
        </>
      )}
    </div>
  )
}

function Step({ done, title, body }: { done: boolean; title: string; body: string }) {
  return <div className={styles.step}><span className={done ? styles.stepDone : ''}>{done ? '✓' : ''}</span><div><strong>{title}</strong><p>{body}</p></div></div>
}

function BranchPicker({ value, onChange }: { value: SkillBranch; onChange: (branch: SkillBranch) => void }) {
  return <div className={styles.branchPicker}>{BRANCHES.map(branch => <button key={branch} className={value === branch ? styles.branchActive : ''} onClick={() => onChange(branch)}>{branch}</button>)}</div>
}
