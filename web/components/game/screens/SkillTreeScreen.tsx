'use client'

import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn } from '@/components/ui/Button'
import { UI_ZONES } from '@/lib/ui-zones'
import { SKILL_NODES, canUnlockSkillNode, hasSkill } from '@/lib/data/skills'
import { LICENSE_GRADE_ORDER, LICENSE_GRADE_XP_GATES } from '@/lib/systems/ProgressionSystem'
import type { LicenseGrade } from '@/lib/game-types'

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
  const gradeIndex = LICENSE_GRADE_ORDER.indexOf(licenseGrade)
  const nextGrade = LICENSE_GRADE_ORDER[gradeIndex + 1]
  const nextGateXP = nextGrade ? LICENSE_GRADE_XP_GATES[nextGrade] : null
  const canUpgrade = !!nextGrade && researchXP >= (nextGateXP ?? Infinity)

  return (
    <div className="game-screen" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar eyebrow="EARTH BASE · TRAINING" title="Skill Tree" onBack={onBack} solid />

      <div data-ui-zone={UI_ZONES.screenContent} style={{ flex: 1, overflowY: 'auto', padding: '16px', marginTop: 56, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel accent="var(--ln-cyan)">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff' }}>License Grade</div>
            <StatusPill kind="info">{licenseGrade}</StatusPill>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {LICENSE_GRADE_ORDER.map((grade, i) => (
              <div key={grade} style={{ flex: 1, height: 6, borderRadius: 2, background: i <= gradeIndex ? 'var(--ln-cyan)' : 'rgba(112,217,234,0.15)', border: '1px solid rgba(112,217,234,0.3)' }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: '#a9b8ce', marginBottom: nextGrade ? 12 : 0 }}>
            {researchXP} RESEARCH XP{nextGrade ? ` · ${nextGateXP} NEEDED FOR ${nextGrade.toUpperCase()}` : ' · MAX GRADE REACHED'}
          </div>
          {nextGrade && (
            <PrimaryBtn kind="cyan" disabled={!canUpgrade} onClick={() => onUpgradeLicenseGrade(nextGrade as Exclude<LicenseGrade, 'Grade I'>)}>
              Upgrade to {nextGrade}
            </PrimaryBtn>
          )}
        </Panel>

        <div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#6b7fa3', textTransform: 'uppercase', marginBottom: 8 }}>
            Skill Nodes · {skillPoints} SP available
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SKILL_NODES.map(node => {
              const unlocked = hasSkill(unlockedSkillNodes, node.id)
              const affordable = canUnlockSkillNode({ id: node.id, skillPoints, unlockedSkillNodes })
              return (
                <Panel key={node.id} accent={unlocked ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ opacity: unlocked ? 1 : (affordable ? 1 : 0.5) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', color: '#6b7fa3', textTransform: 'uppercase' }}>{node.branch}</div>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff' }}>{node.name}</div>
                    </div>
                    <StatusPill kind={unlocked ? 'ok' : 'mute'}>{unlocked ? 'Unlocked' : `${node.cost} SP`}</StatusPill>
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginBottom: unlocked ? 0 : 10 }}>{node.description}</div>
                  {!unlocked && (
                    <PrimaryBtn kind="cyan" disabled={!affordable} onClick={() => onUnlock(node.id)}>
                      Unlock
                    </PrimaryBtn>
                  )}
                </Panel>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#6b7fa3', textTransform: 'uppercase', marginBottom: 8 }}>
            Firsts
          </div>
          <Panel accent="#7ec8ff" variant="compact">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FirstRow label="First mission complete" done={firsts.firstMissionDone} />
              <FirstRow label="First satellite launch" done={firsts.firstSatelliteLaunched} />
              <FirstRow label="First TESS classification" done={firsts.firstTessClassification} />
              <FirstRow label="First blueprint unlocked" done={firsts.firstBlueprintUnlocked} />
              <FirstRow label="Refinery built" done={firsts.refineryBuilt} />
              <FirstRow label="Launchpad upgraded" done={firsts.launchpadUpgraded} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function FirstRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: done ? '#e6efff' : '#6b7fa3' }}>{label}</span>
      <StatusPill kind={done ? 'ok' : 'mute'}>{done ? 'Done' : 'Not yet'}</StatusPill>
    </div>
  )
}
