'use client'

import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import FreeOpsBuildCoach, { useFreeOpsBuildCoach } from '@/components/game/FreeOpsBuildCoach'

interface FreeOpsBuildScreenProps {
  onBack: () => void
  onMissions: () => void
  onInfrastructure: () => void
}

export default function FreeOpsBuildScreen({ onBack, onMissions, onInfrastructure }: FreeOpsBuildScreenProps) {
  const coach = useFreeOpsBuildCoach()

  return (
    <div className="game-screen" data-testid="free-ops-build-screen" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <TopBar eyebrow="FREE OPS · LAUNCH SETUP" title="Build an Operation" onBack={onBack} />
      {coach.visible && <FreeOpsBuildCoach onDismiss={coach.dismiss} />}
      <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
        <Panel accent="var(--ln-cyan)" style={{ padding: 14 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 17, fontWeight: 800, color: 'var(--ln-text)' }}>
            Start with an objective
          </div>
          <div style={{ marginTop: 6, fontFamily: 'var(--ln-font-body)', fontSize: 13, lineHeight: 1.45, color: 'var(--ln-text-dim)' }}>
            Build does not assume a mission. Choose what this launch is for, then assemble the rocket that fits it.
          </div>
        </Panel>

        <Panel accent="var(--ln-ok)" style={{ padding: 14 }}>
          <div className="ln-section-label">Your own operation</div>
          <div style={{ margin: '6px 0 12px', fontFamily: 'var(--ln-font-body)', fontSize: 13, lineHeight: 1.45, color: 'var(--ln-text-dim)' }}>
            Launch infrastructure such as satellites, or run a self-directed mining mission and sell the haul yourself.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryBtn full={false} kind="green" onClick={onInfrastructure}>Build Infrastructure</PrimaryBtn>
            <PrimaryBtn full={false} kind="cyan" onClick={onMissions}>Choose Mining</PrimaryBtn>
          </div>
        </Panel>

        <Panel accent="var(--ln-amber)" style={{ padding: 14 }}>
          <div className="ln-section-label">Client work</div>
          <div style={{ margin: '6px 0 12px', fontFamily: 'var(--ln-font-body)', fontSize: 13, lineHeight: 1.45, color: 'var(--ln-text-dim)' }}>
            Find a client request first. Once you accept it, Build will show the selected target, mission, and the rocket needed to launch.
          </div>
          <PrimaryBtn kind="amber" onClick={onMissions}>Browse Client Missions</PrimaryBtn>
        </Panel>
      </div>
    </div>
  )
}
