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
  level: number
  onChange: (slot: keyof RocketConfig, id: string) => void
  onSuggest: () => void
  onLaunch: () => void
  onBack: () => void
  onExplained: () => void
  hasCoach?: boolean
}

function Slot({ label, parts, picked, accent, onPick, level }: {
  label: string
  parts: Part[]
  picked: Part
  accent: string
  onPick: (id: string) => void
  level?: number
}) {
  const isUnlocked = (part: Part) => {
    if (part.locked) return false
    if (part.levelRequired && (level ?? 0) < part.levelRequired) return false
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
          const levelLocked = !!part.levelRequired && (level ?? 0) < part.levelRequired
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
              title={levelLocked ? `Unlocks at L${part.levelRequired}` : part.locked ? 'Locked — complete more missions' : ''}
            >
              {part.name} <span>T{part.tier}</span>
              {levelLocked && <span className="lock-icon" aria-label="level-locked">L{part.levelRequired}</span>}
              {part.locked && !levelLocked && <span className="lock-icon" aria-label="locked">LOCKED</span>}
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
        </Panel>
        <Slot label="01 · Chassis · Hull + Cargo" parts={props.parts.chassis} picked={check.chassis} accent="var(--ln-cyan)" onPick={id => props.onChange('chassis', id)} level={props.level} />
        <Slot label="02 · Propulsion · Range" parts={props.parts.propulsion} picked={check.propulsion} accent="var(--ln-amber)" onPick={id => props.onChange('propulsion', id)} level={props.level} />
        <Slot label="03 · Mining Drill · Yield" parts={props.parts.drill} picked={check.drill} accent="var(--ln-cyan)" onPick={id => props.onChange('drill', id)} level={props.level} />
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
