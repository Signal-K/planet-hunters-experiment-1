'use client'

import { SKILL_NODES, canUnlockSkillNode } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import { UI_ZONES } from '@/lib/ui-zones'

const BRANCH_META = {
  mining: { label: 'Mining', accent: 'var(--ln-cyan)' },
  cargo: { label: 'Cargo', accent: 'var(--ln-amber)' },
  range: { label: 'Range', accent: 'var(--ln-ok)' },
  engineering: { label: 'Engineering', accent: 'var(--ln-cyan-bright)' },
} as const

export default function SkillTreeScreen({ skillPoints, unlockedSkillNodes, onUnlock, onBack }: {
  skillPoints: number
  unlockedSkillNodes: string[]
  onUnlock: (id: string) => void
  onBack: () => void
}) {
  return (
    <div className="game-screen">
      <TopBar eyebrow="EARTH BASE · TRAINING" title="Skill Tree" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent} style={{ padding: '88px 14px 18px', gap: 12 }}>
        <Panel accent="var(--ln-cyan)" variant="compact">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>Available SP</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-muted)', marginTop: 4 }}>Earn 1 skill point when a mission is completed.</div>
            </div>
            <strong data-testid="skill-points-total" style={{ fontFamily: 'var(--ln-font-display)', fontSize: 32, color: 'var(--ln-text)' }}>{skillPoints}</strong>
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 8 }}>
          {SKILL_NODES.map(node => {
            const branch = BRANCH_META[node.branch]
            const unlocked = unlockedSkillNodes.includes(node.id)
            const available = canUnlockSkillNode({ id: node.id, skillPoints, unlockedSkillNodes })
            return (
              <Panel key={node.id} accent={branch.accent} variant="compact">
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: branch.accent, textTransform: 'uppercase' }}>{branch.label} Branch</div>
                      <h2 style={{ margin: '2px 0 0', fontFamily: 'var(--ln-font-display)', fontSize: 16, color: 'var(--ln-text)' }}>{node.name}</h2>
                    </div>
                    <span style={{ padding: '4px 8px', borderRadius: 999, border: `1px solid ${branch.accent}`, color: branch.accent, fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      {unlocked ? 'Unlocked' : `${node.cost} SP`}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.45, color: 'var(--ln-text-muted)' }}>{node.description}</p>
                  <PrimaryBtn kind={available ? 'cyan' : 'amber'} disabled={!available} testId={`skill-node-${node.id}`} onClick={() => onUnlock(node.id)}>
                    {unlocked ? 'Unlocked' : available ? 'Unlock Node' : 'Need SP'}
                  </PrimaryBtn>
                </div>
              </Panel>
            )
          })}
        </div>
      </div>
    </div>
  )
}
