'use client'

import Image from 'next/image'
import type { Mission, Part, RocketConfig, Target } from '@/lib/data'
import { validateBuild } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import Panel from '@/components/ui/Panel'
import TopBar from '@/components/ui/TopBar'
import { GhostBtn, PrimaryBtn } from '@/components/ui/Button'

interface AssemblyScreenProps {
  mission: Mission
  target: Target
  rocket: RocketConfig
  parts: Catalog['parts']
  missionsDone: number
  onChange: (slot: keyof RocketConfig, id: string) => void
  onSuggest: () => void
  onLaunch: () => void
  onBack: () => void
  onExplained: () => void
  hasCoach?: boolean
}

function Slot({ label, parts, picked, accent, onPick, missionsDone }: {
  label: string
  parts: Part[]
  picked: Part
  accent: string
  onPick: (id: string) => void
  missionsDone?: number
}) {
  const isUnlocked = (part: Part) => {
    if (part.locked) return false
    if (part.missionsRequired && (missionsDone ?? 0) < part.missionsRequired) return false
    return true
  }
  return (
    <section>
      <div className="ln-section-label">{label}</div>
      <Panel accent={accent} style={{ padding: 'var(--ln-s-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ln-s-3)' }}>
          <div className="part-preview">
            <Image src={picked.img} alt="" width={84} height={60} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ln-card-title">{picked.name}</div>
            <div className="ln-micro">ID · {picked.id.toUpperCase()} · T{picked.tier}</div>
          </div>
        </div>
      </Panel>
      <div className="part-picker">
        {parts.map(part => {
          const unlocked = isUnlocked(part)
          const isActive = part.id === picked.id
          const missionsLocked = !!part.missionsRequired && (missionsDone ?? 0) < part.missionsRequired
          return (
            <button
              key={part.id}
              disabled={!unlocked}
              onClick={() => unlocked && onPick(part.id)}
              className={
                isActive ? 'part-chip part-chip--active' :
                !unlocked ? 'part-chip part-chip--locked' :
                'part-chip'
              }
              title={missionsLocked ? `Unlocks after ${part.missionsRequired} mission${part.missionsRequired === 1 ? '' : 's'}` : part.locked ? 'Locked — complete more missions' : ''}
            >
              {part.name} <span>T{part.tier}</span>
              {missionsLocked && <span className="lock-icon" aria-label="missions-locked">M{part.missionsRequired}</span>}
              {part.locked && !missionsLocked && <span className="lock-icon" aria-label="locked">LOCKED</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function AssemblyScreen(props: AssemblyScreenProps) {
  const check = validateBuild({ mission: props.mission, target: props.target, rocket: props.rocket, parts: props.parts })

  return (
    <div className="game-screen blueprint-screen">
      <TopBar eyebrow="LAUNCHPAD · ASSEMBLY" title="Build Rocket" onBack={props.onBack} />
      <div className="screen-scroll assembly-scroll">
        <Panel accent="var(--ln-amber)" style={{ padding: 'var(--ln-s-3)' }}>
          <div className="context-row">
            <div><span className="ln-micro">Mission</span><strong>{props.mission.title}</strong></div>
            <div><span className="ln-micro">Target</span><strong className="amber">{props.target.name}</strong></div>
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 10, color: 'var(--ln-text-dim)', fontFamily: 'var(--ln-font-mono)' }}>
            <span>Missions Complete · {props.missionsDone}</span>
          </div>
        </Panel>
        <Slot label="01 · Chassis · Hull + Cargo" parts={props.parts.chassis} picked={check.chassis} accent="var(--ln-cyan)" onPick={id => props.onChange('chassis', id)} missionsDone={props.missionsDone} />
        <Slot label="02 · Propulsion · Range" parts={props.parts.propulsion} picked={check.propulsion} accent="var(--ln-amber)" onPick={id => props.onChange('propulsion', id)} missionsDone={props.missionsDone} />
        <Slot label="03 · Mining Drill · Yield" parts={props.parts.drill} picked={check.drill} accent="var(--ln-cyan)" onPick={id => props.onChange('drill', id)} missionsDone={props.missionsDone} />
        <div className={check.ok ? 'compatibility compatibility--ok' : 'compatibility compatibility--bad'}>
          <span />{check.ok ? 'Build compatible · Ready for launch' : check.problems.join(' · ')}
        </div>
      </div>
      <div className="sticky-actions">
        <div style={{ display: 'flex', gap: 'var(--ln-s-2)', marginBottom: 'var(--ln-s-2)' }}>
          <GhostBtn full={false} onClick={() => { props.onSuggest(); props.onExplained() }}>Auto-Suggest</GhostBtn>
        </div>
        <PrimaryBtn kind="amber" disabled={!check.ok} testId="launch-btn" onClick={props.onLaunch}>Confirm Launch</PrimaryBtn>
      </div>
    </div>
  )
}
