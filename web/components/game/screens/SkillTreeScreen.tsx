'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import { UI_ZONES } from '@/lib/ui-zones'
import { SKILL_NODES, canUnlockSkillNode, hasSkill } from '@/lib/data/skills'
import { LICENSE_GRADE_ORDER, LICENSE_GRADE_XP_GATES } from '@/lib/systems/ProgressionSystem'
import type { LicenseGrade } from '@/lib/game-types'
import type { SkillBranch, SkillNodeId } from '@/lib/data/skills'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import SkillTreeCoach, { useSkillTreeCoach } from '@/components/game/SkillTreeCoach'
import styles from './SkillTreeScreen.module.css'

interface Firsts {
  firstMissionDone: boolean
  firstSatelliteLaunched: boolean
  firstTessClassification: boolean
  firstBlueprintUnlocked: boolean
  refineryBuilt: boolean
  launchpadUpgraded: boolean
}

interface SkillTreeScreenProps {
  skillPoints: number
  unlockedSkillNodes: string[]
  onUnlock: (id: string) => void
  onBack: () => void
  researchXP: number
  licenseGrade: LicenseGrade
  onUpgradeLicenseGrade: (grade: Exclude<LicenseGrade, 'Grade I'>) => void
  firsts: Firsts
}

const BRANCHES: Record<SkillBranch, { label: string; short: string; detail: string }> = {
  mining: { label: 'Mining Systems', short: 'MIN', detail: 'Laser output and field yield' },
  cargo: { label: 'Cargo Systems', short: 'CAR', detail: 'Hold capacity and handling' },
  range: { label: 'Range Systems', short: 'RNG', detail: 'Travel time and target reach' },
  engineering: { label: 'Engineering', short: 'ENG', detail: 'Ship configuration and rooms' },
}

export default function SkillTreeScreen({
  skillPoints,
  unlockedSkillNodes,
  onUnlock,
  onBack,
  researchXP,
  licenseGrade,
  onUpgradeLicenseGrade,
  firsts,
}: SkillTreeScreenProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<SkillNodeId>(SKILL_NODES[0].id)
  const gradeIndex = LICENSE_GRADE_ORDER.indexOf(licenseGrade)
  const nextGrade = LICENSE_GRADE_ORDER[gradeIndex + 1]
  const nextGateXP = nextGrade ? LICENSE_GRADE_XP_GATES[nextGrade] : null
  const canUpgrade = !!nextGrade && researchXP >= (nextGateXP ?? Infinity)
  const selectedNode = SKILL_NODES.find(node => node.id === selectedNodeId) ?? SKILL_NODES[0]
  const selectedUnlocked = hasSkill(unlockedSkillNodes, selectedNode.id)
  const selectedAffordable = canUnlockSkillNode({ id: selectedNode.id, skillPoints, unlockedSkillNodes })
  const coach = useSkillTreeCoach()

  return (
    <div className={styles.screen} data-testid="skill-tree-screen">
      <HubWorldBackground phase="night" composition="earth-base-wide" />
      <div className={styles.sceneWash} aria-hidden="true" />
      <div className={styles.blueprintGrid} aria-hidden="true" />

      <TopBar eyebrow="BASE · ACADEMY" title="Skill Tree" onBack={onBack} glass />
      {coach.visible && <SkillTreeCoach onDismiss={coach.dismiss} />}

      <div data-ui-zone={UI_ZONES.screenContent} className={styles.content}>
        <header className={styles.hero}>
          <div>
            <div className={styles.kicker}>PROGRAM DEVELOPMENT / RESEARCH CONSOLE</div>
            <h2 className={styles.heading}>Build the next capability.</h2>
            <p className={styles.subheading}>Permanent upgrades for the flight program.</p>
          </div>
          <div className={styles.heroReadout}>
            <span className={styles.readoutLabel}>AVAILABLE</span>
            <strong>{skillPoints.toString().padStart(2, '0')} SP</strong>
            <span className={styles.readoutHint}>RESEARCH ALLOCATION</span>
          </div>
        </header>

        <div className={styles.layout}>
          <aside className={styles.branchRail} aria-label="Skill branches">
            <div className={styles.sectionLabel}>SYSTEM BRANCHES</div>
            {(Object.keys(BRANCHES) as SkillBranch[]).map(branch => {
              const branchNodes = SKILL_NODES.filter(node => node.branch === branch)
              const branchUnlocked = branchNodes.filter(node => hasSkill(unlockedSkillNodes, node.id)).length
              return (
                <div className={styles.branchCard} key={branch}>
                  <span className={styles.branchMark}>{BRANCHES[branch].short}</span>
                  <span className={styles.branchCopy}>
                    <strong>{BRANCHES[branch].label}</strong>
                    <small>{BRANCHES[branch].detail}</small>
                  </span>
                  <span className={styles.branchCount}>{branchUnlocked}/{branchNodes.length}</span>
                </div>
              )
            })}
            <div className={styles.branchLegend}>
              <span className={styles.legendDot} />
              <span>Tap a node to inspect</span>
            </div>
          </aside>

          <section className={`${styles.treePanel} ln-glass-panel`} aria-labelledby="skill-nodes-heading">
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.sectionLabel}>PROGRESSION MAP</div>
                <h3 id="skill-nodes-heading">Skill Nodes</h3>
              </div>
              <div className={styles.panelTelemetry}>
                <span>{unlockedSkillNodes.length.toString().padStart(2, '0')} INSTALLED</span>
                <span>{SKILL_NODES.length.toString().padStart(2, '0')} TOTAL</span>
              </div>
            </div>

            <div className={styles.treeCanvas}>
              <svg className={styles.treeLines} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
                <line x1="12.5" y1="10" x2="87.5" y2="10" />
                <line x1="12.5" y1="4" x2="12.5" y2="16" />
                <line x1="37.5" y1="4" x2="37.5" y2="16" />
                <line x1="62.5" y1="4" x2="62.5" y2="16" />
                <line x1="87.5" y1="4" x2="87.5" y2="16" />
              </svg>
              <div className={styles.nodeGrid}>
                {SKILL_NODES.map(node => {
                  const unlocked = hasSkill(unlockedSkillNodes, node.id)
                  const affordable = canUnlockSkillNode({ id: node.id, skillPoints, unlockedSkillNodes })
                  const selected = selectedNode.id === node.id
                  return (
                    <article
                      className={`${styles.nodeCard} ${selected ? styles.nodeCardSelected : ''} ${unlocked ? styles.nodeCardUnlocked : ''}`}
                      key={node.id}
                    >
                      <button
                        className={styles.nodeButton}
                        onClick={() => setSelectedNodeId(node.id)}
                        aria-label={`Inspect ${node.name}`}
                        aria-pressed={selected}
                      >
                        <span className={styles.nodeCore} aria-hidden="true">
                          <span>{BRANCHES[node.branch].short}</span>
                        </span>
                        <span className={styles.nodeTitle}>{node.name}</span>
                        <span className={styles.nodeBranch}>{BRANCHES[node.branch].label}</span>
                      </button>
                      <p className={styles.nodeDescription}>{node.description}</p>
                      <div className={styles.nodeFooter}>
                        <span className={`${styles.nodeStatus} ${unlocked ? styles.nodeStatusUnlocked : ''}`}>
                          <span className={styles.statusDot} />
                          {unlocked ? 'Unlocked' : `${node.cost} SP`}
                        </span>
                        {!unlocked && (
                          <button
                            className={styles.nodeAction}
                            disabled={!affordable}
                            onClick={() => onUnlock(node.id)}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <aside className={styles.inspector} aria-label="Selected skill details">
            <div className={styles.sectionLabel}>NODE INSPECTOR</div>
            <div className={`${styles.inspectorPanel} ln-glass-panel`}>
              <div className={styles.inspectorTopline}>
                <span className={styles.inspectorCode}>{BRANCHES[selectedNode.branch].short} / NODE 01</span>
                <span className={`${styles.inspectorStatus} ${selectedUnlocked ? styles.inspectorStatusUnlocked : ''}`}>
                  {selectedUnlocked ? 'ONLINE' : 'LOCKED'}
                </span>
              </div>
              <h3>{selectedNode.name}</h3>
              <p>{selectedNode.description}</p>
              <div className={styles.specRow}>
                <span>BRANCH</span>
                <strong>{BRANCHES[selectedNode.branch].label}</strong>
              </div>
              <div className={styles.specRow}>
                <span>INSTALL COST</span>
                <strong>{selectedUnlocked ? 'PAID' : `${selectedNode.cost} SP`}</strong>
              </div>
              {!selectedUnlocked && (
                <button
                  className={styles.installButton}
                  disabled={!selectedAffordable}
                  onClick={() => onUnlock(selectedNode.id)}
                >
                  {selectedAffordable ? 'Install Upgrade' : 'Insufficient SP'}
                </button>
              )}
              {selectedUnlocked && <div className={styles.installedStamp}>SYSTEM UPGRADE INSTALLED</div>}
            </div>

            <div className={styles.licensePanel}>
              <div className={styles.panelHeaderCompact}>
                <span className={styles.sectionLabel}>FLIGHT AUTHORITY</span>
                <span className={styles.gradePill}>{licenseGrade}</span>
              </div>
              <div className={styles.gradeTrack} aria-label={`License grade ${licenseGrade}`}>
                {LICENSE_GRADE_ORDER.map((grade, index) => (
                  <span className={index <= gradeIndex ? styles.gradeSegmentActive : styles.gradeSegment} key={grade} />
                ))}
              </div>
              <div className={styles.xpReadout}>
                <span>{researchXP} RESEARCH XP</span>
                <span>{nextGrade ? `${nextGateXP} XP TO ${nextGrade.toUpperCase()}` : 'MAX GRADE REACHED'}</span>
              </div>
              {nextGrade && (
                <button className={styles.gradeButton} disabled={!canUpgrade} onClick={() => onUpgradeLicenseGrade(nextGrade as Exclude<LicenseGrade, 'Grade I'>)}>
                  Upgrade to {nextGrade}
                </button>
              )}
            </div>
          </aside>
        </div>

        <section className={`${styles.firstsPanel} ln-glass-panel`} aria-labelledby="firsts-heading">
          <div className={styles.firstsHeading}>
            <div className={styles.sectionLabel}>PROGRAM MILESTONES</div>
            <h3 id="firsts-heading">Firsts</h3>
          </div>
          <div className={styles.firstsGrid}>
            <FirstRow label="First mission complete" done={firsts.firstMissionDone} />
            <FirstRow label="First satellite launch" done={firsts.firstSatelliteLaunched} />
            <FirstRow label="First TESS classification" done={firsts.firstTessClassification} />
            <FirstRow label="First blueprint unlocked" done={firsts.firstBlueprintUnlocked} />
            <FirstRow label="Refinery built" done={firsts.refineryBuilt} />
            <FirstRow label="Launchpad upgraded" done={firsts.launchpadUpgraded} />
          </div>
        </section>
      </div>

      <div className={styles.bottomRail}>
        <span><i className={styles.railDot} /> ACADEMY LINK ONLINE</span>
        <span>BASE // RESEARCH CONSOLE</span>
      </div>
    </div>
  )
}

function FirstRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={styles.firstRow}>
      <span className={`${styles.firstMarker} ${done ? styles.firstMarkerDone : ''}`} aria-hidden="true" />
      <span>{label}</span>
      <strong className={done ? styles.firstDone : ''}>{done ? 'DONE' : 'PENDING'}</strong>
    </div>
  )
}
