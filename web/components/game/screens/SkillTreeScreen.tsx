'use client'

import TopBar from '@/components/ui/TopBar'
import { ComingSoonSheet, NEXT_SPRINT_UTC } from '@/components/game/ComingSoonSheet'

export default function SkillTreeScreen({ skillPoints, onBack }: {
  skillPoints: number
  unlockedSkillNodes: string[]
  onUnlock: (id: string) => void
  onBack: () => void
}) {
  // Full-screen coming soon — skill tree is a future sprint feature.
  // Render as a full-screen sheet with no close action (back nav exits instead).
  return (
    <div className="game-screen" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100%' }}>
      <TopBar eyebrow="EARTH BASE · TRAINING" title="Skill Tree" onBack={onBack} />
      <ComingSoonSheet
        feature="Skill Tree"
        description={`You have ${skillPoints} skill point${skillPoints !== 1 ? 's' : ''} banked. Training will unlock upgraded drilling, cargo capacity, and orbital reach.`}
        onClose={onBack}
        target={NEXT_SPRINT_UTC}
      />
    </div>
  )
}
