'use client'

import Image from 'next/image'
import type { Mission, RocketConfig, Target } from '@/lib/data'
import { STARTER_ROCKETS, validateBuild } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import MissionSetupShell from '@/components/game/screens/MissionSetupShell'

interface AssemblyScreenProps {
  mission: Mission
  target: Target
  rocket: RocketConfig
  parts: Catalog['parts']
  missionsDone: number
  unlockedSkillNodes: string[]
  onLaunch: () => void
  onBack: () => void
  hasCoach?: boolean
  coachManual?: boolean
}

function getRequiredRocket(missionsDone: number) {
  const eligible = STARTER_ROCKETS.filter(r => !r.locked && r.missionsRequired <= missionsDone)
  return eligible.sort((a, b) => b.tier - a.tier)[0] ?? STARTER_ROCKETS[0]
}

export default function AssemblyScreen(props: AssemblyScreenProps) {
  const highlightContent = props.hasCoach && props.coachManual
  const highlightLaunch = props.hasCoach && !props.coachManual
  const check = validateBuild({ mission: props.mission, target: props.target, rocket: props.rocket, parts: props.parts, unlockedSkillNodes: props.unlockedSkillNodes })
  const starterRocket = getRequiredRocket(props.missionsDone)

  return (
    <MissionSetupShell
      eyebrow="LAUNCHPAD · PREFLIGHT"
      title="Confirm Rocket"
      onBack={props.onBack}
      hasCoach={props.hasCoach}
      coachManual={props.coachManual}
      actions={
        <div style={{ position: 'relative' }}>
          {highlightLaunch && <TutorialHighlight borderRadius={8} />}
          <PrimaryBtn kind="amber" disabled={!check.ok} testId="launch-btn" onClick={props.onLaunch}>Confirm Launch</PrimaryBtn>
        </div>
      }
    >
      <div className="mission-setup-frame" style={{
        display: 'grid',
        alignItems: 'center',
        justifyItems: 'center',
        padding: 18,
        background: 'radial-gradient(ellipse at 50% 54%, rgba(245,166,35,0.10) 0%, rgba(63,169,255,0.05) 42%, transparent 78%)',
      }}>
        {highlightContent && <TutorialHighlight />}
        <Image src={starterRocket.img} alt="" width={240} height={150} style={{ objectFit: 'contain', filter: 'drop-shadow(0 10px 28px rgba(63,169,255,0.32))' }} />
      </div>

      <div className="mission-setup-card">
        <div className="mission-setup-card-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Panel accent="var(--ln-amber)" style={{ padding: 'var(--ln-s-3)', flex: '0 0 auto' }}>
          <div className="context-row">
            <div><span className="ln-micro">Mission</span><strong>{props.mission.title}</strong></div>
            <div><span className="ln-micro">Target</span><strong className="amber">{props.target.name}</strong></div>
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 10, color: 'var(--ln-text-dim)', fontFamily: 'var(--ln-font-mono)' }}>
            <span>Missions Complete · {props.missionsDone}</span>
          </div>
        </Panel>
        <section>
          <div className="ln-section-label">Single-use prebuilt vehicle</div>
          <Panel accent="var(--ln-cyan)" style={{ padding: 'var(--ln-s-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ln-s-3)' }}>
              <div className="part-preview">
                <Image src={starterRocket.img} alt="" width={84} height={60} style={{ objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="ln-card-title">{starterRocket.name}</div>
                <div className="ln-micro">PREBUILT · CARGO {starterRocket.stats.cargo} · ORB {starterRocket.stats.maxOrbit} · DRILL T{starterRocket.stats.drillTier}</div>
              </div>
            </div>
          </Panel>
          <div style={{ marginTop: 8, fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45 }}>
            Starter rockets are unibody vehicles during onboarding. Parts are not editable until the post-onboarding rocket system is redesigned.
          </div>
        </section>
        <div className={check.ok ? 'compatibility compatibility--ok' : 'compatibility compatibility--bad'}>
          <span />{check.ok ? 'Build compatible · Ready for launch' : check.problems.join(' · ')}
        </div>
        </div>
      </div>
    </MissionSetupShell>
  )
}
