'use client'

import Image from 'next/image'
import type { Mission, RocketConfig, Target } from '@/lib/data'
import { STARTER_ROCKETS, validateBuild } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import Panel from '@/components/ui/Panel'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'

interface AssemblyScreenProps {
  mission: Mission
  target: Target
  rocket: RocketConfig
  parts: Catalog['parts']
  missionsDone: number
  onLaunch: () => void
  onBack: () => void
  hasCoach?: boolean
}

function getRequiredRocket(missionsDone: number) {
  const eligible = STARTER_ROCKETS.filter(r => !r.locked && r.missionsRequired <= missionsDone)
  return eligible.sort((a, b) => b.tier - a.tier)[0] ?? STARTER_ROCKETS[0]
}

export default function AssemblyScreen(props: AssemblyScreenProps) {
  const check = validateBuild({ mission: props.mission, target: props.target, rocket: props.rocket, parts: props.parts })
  const starterRocket = getRequiredRocket(props.missionsDone)

  return (
    <div className="game-screen blueprint-screen">
      <TopBar eyebrow="LAUNCHPAD · PREFLIGHT" title="Confirm Rocket" onBack={props.onBack} />
      <div className={`screen-scroll assembly-scroll${props.hasCoach ? ' screen-scroll--coach' : ''}`}>
        <Panel accent="var(--ln-amber)" style={{ padding: 'var(--ln-s-3)' }}>
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
      <div className="sticky-actions">
        <PrimaryBtn kind="amber" disabled={!check.ok} testId="launch-btn" onClick={props.onLaunch}>Confirm Launch</PrimaryBtn>
      </div>
    </div>
  )
}
