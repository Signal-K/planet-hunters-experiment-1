'use client'

import { Boxes, Check, Gauge, Orbit, Pickaxe, Route, X } from 'lucide-react'
import type { CrewMember, Mission, RocketConfig, Target } from '@/lib/data'
import { ROCKET_MODELS, validateBuild } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import IconBadge from '@/components/ui/IconBadge'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import StatCard from '@/components/ui/StatCard'
import MissionSetupShell, {
  MissionSetupCard,
  MissionSetupFrame,
} from '@/components/game/screens/MissionSetupShell'
import { getRequiredRocketModel } from '@/lib/rockets'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'

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
  deliveryTargetName?: string
  crew?: CrewMember[]
  crewModuleFitted?: boolean
}

// Each ship "compartment" the mockup shows as a clickable cutaway room maps
// 1:1 onto a real, already-computed starter-rocket stat — there is no
// editable-parts system yet (rockets are unibody during onboarding),
// so clicking a compartment just cross-highlights the matching stat card
// below rather than mutating any build state.
type RoomKey = 'payload' | 'fuel' | 'engine' | 'structure'

// Real-data ceilings (drawn from the actual starter-rocket catalog, not
// invented numbers) so the segmented meters reflect true headroom rather
// than a decorative fill.
const MAX_CARGO = Math.max(...ROCKET_MODELS.map(r => r.stats.cargo))
const MAX_ORBIT = Math.max(...ROCKET_MODELS.map(r => r.stats.maxOrbit))
const MAX_DRILL_TIER = Math.max(...ROCKET_MODELS.map(r => r.stats.drillTier))
const METER_SEGMENTS = 8

export default function AssemblyScreen(props: AssemblyScreenProps) {
  const highlightContent = props.hasCoach && props.coachManual
  const highlightLaunch = props.hasCoach && !props.coachManual
  const check = validateBuild({ mission: props.mission, target: props.target, rocket: props.rocket, parts: props.parts, unlockedSkillNodes: props.unlockedSkillNodes })
  const crewCheck = crewRequirementStatus(props.mission.requires.crew, props.crew ?? [])
  const crewReady = !props.mission.requires.crew || (!!props.crewModuleFitted && crewCheck.met)
  const launchReady = check.ok && crewReady
  const starterRocket = getRequiredRocketModel(props.missionsDone)

  return (
    <MissionSetupShell
      className="mission-setup-screen--assembly"
      eyebrow="LAUNCHPAD · PREFLIGHT"
      title="Confirm Rocket"
      onBack={props.onBack}
      hasCoach={props.hasCoach}
      coachManual={props.coachManual}
      hideStepFooter
      actions={
        <div style={{ position: 'relative' }}>
          {highlightLaunch && <TutorialHighlight borderRadius={8} />}
          <PrimaryBtn kind="amber" disabled={!launchReady} testId="launch-btn" onClick={props.onLaunch}>Confirm Launch</PrimaryBtn>
        </div>
      }
    >
      <MissionSetupFrame className="assembly-frame" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        padding: 12,
        background: [
          'repeating-linear-gradient(0deg, rgba(112,217,234,0.05) 0px, rgba(112,217,234,0.05) 1px, transparent 1px, transparent 34px)',
          'repeating-linear-gradient(90deg, rgba(112,217,234,0.05) 0px, rgba(112,217,234,0.05) 1px, transparent 1px, transparent 34px)',
          'radial-gradient(ellipse at 50% 54%, rgba(245,166,35,0.10) 0%, rgba(63,169,255,0.05) 42%, transparent 78%)',
        ].join(', '),
      }}>
        {highlightContent && <TutorialHighlight />}
        <LaunchClearance
          mission={props.mission}
          target={props.target}
          deliveryTargetName={props.deliveryTargetName}
          rocket={starterRocket}
          ready={launchReady}
        />

      </MissionSetupFrame>

      <MissionSetupCard className="assembly-card" scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Panel accent="var(--ln-amber)" style={{ padding: 'var(--ln-s-3)', flex: '0 0 auto' }}>
          <div className="context-row">
            <div><span className="ln-micro">Mission</span><strong>{props.mission.title}</strong></div>
            <div><span className="ln-micro">Target</span><strong className="amber">{props.target.name}</strong></div>
          </div>
          {props.mission.deliveryTargetId && props.deliveryTargetName && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, font: '700 9px var(--ln-font-mono)', color: 'var(--ln-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Route size={11} />
              {props.target.name} → {props.deliveryTargetName}
            </div>
          )}
          <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 10, color: 'var(--ln-text-dim)', fontFamily: 'var(--ln-font-mono)' }}>
            <span>Missions Complete · {props.missionsDone}</span>
          </div>
        </Panel>
        <section>
          <div className="ln-section-label">Launch manifest</div>
          <Panel accent="var(--ln-cyan)" style={{ padding: 'var(--ln-s-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ChecklistRow ok label={`Contract confirmed — ${props.mission.title}`} />
              <ChecklistRow ok label={`Target locked — ${props.target.name}`} />
              <ChecklistRow ok label={`${starterRocket.name} fuelled and ready`} />
              {props.mission.requires.crew && (
                <>
                  <ChecklistRow ok={!!props.crewModuleFitted} label={props.crewModuleFitted ? 'Crew Quarters fitted · 2 seats' : 'Crew Quarters required · research and fit in Hangar'} />
                  <ChecklistRow ok={crewCheck.met} label={crewCheck.reason} />
                </>
              )}
            </div>
          </Panel>
        </section>
      </MissionSetupCard>
    </MissionSetupShell>
  )
}

function LaunchClearance({
  mission,
  target,
  deliveryTargetName,
  rocket,
  ready,
}: {
  mission: Mission
  target: Target
  deliveryTargetName?: string
  rocket: ReturnType<typeof getRequiredRocketModel>
  ready: boolean
}) {
  const stops = deliveryTargetName
    ? ['Earth Base', target.name, deliveryTargetName, 'Earth Base']
    : ['Earth Base', target.name]
  return (
    <div data-testid="assembly-rocket-cutaway" style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div className="ln-micro" style={{ color: 'var(--ln-amber)' }}>Launch authorization</div>
          <div style={{ marginTop: 3, font: '800 22px var(--ln-font-display)', color: 'var(--ln-text)', letterSpacing: '-0.02em' }}>Flight cleared</div>
          <div style={{ marginTop: 3, font: '11px var(--ln-font-body)', color: 'var(--ln-text-dim)' }}>{mission.title} · {rocket.name} · single-use vehicle</div>
        </div>
        <div style={{ width: 54, height: 54, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, border: `2px solid ${ready ? 'var(--ln-ok)' : 'var(--ln-crimson)'}`, color: ready ? 'var(--ln-ok)' : 'var(--ln-crimson)', background: ready ? 'rgba(90,208,126,0.1)' : 'rgba(200,41,62,0.1)', boxShadow: ready ? '0 0 20px rgba(90,208,126,0.22)' : 'none' }}>
          <Check size={24} />
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(3,10,20,0.62)', border: '1px solid rgba(245,166,35,0.35)' }}>
        <div className="ln-micro">Flight plan</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {stops.map((stop, index) => (
            <div key={`${stop}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: index === stops.length - 1 ? 0 : 1 }}>
              <div style={{ minWidth: 0, textAlign: 'center' }}>
                <div style={{ width: 12, height: 12, margin: '0 auto 7px', borderRadius: 999, background: index === stops.length - 1 ? 'var(--ln-amber)' : 'var(--ln-cyan)', boxShadow: `0 0 12px ${index === stops.length - 1 ? 'rgba(245,166,35,0.55)' : 'rgba(112,217,234,0.55)'}` }} />
                <div style={{ font: '800 10px var(--ln-font-display)', color: 'var(--ln-text)', whiteSpace: 'nowrap' }}>{stop}</div>
              </div>
              {index < stops.length - 1 && <div style={{ flex: 1, height: 1, minWidth: 24, background: 'linear-gradient(90deg, var(--ln-cyan), var(--ln-amber))' }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <ClearanceMetric label="Payload" value={`${rocket.stats.cargo} units`} icon={<Boxes size={16} />} />
        <ClearanceMetric label="Range" value={`Orbit ${rocket.stats.maxOrbit}`} icon={<Orbit size={16} />} />
        <ClearanceMetric label="Drill" value={`Tier ${rocket.stats.drillTier}`} icon={<Pickaxe size={16} />} />
      </div>
    </div>
  )
}

function ClearanceMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 9px', borderRadius: 8, background: 'rgba(112,217,234,0.07)', border: '1px solid rgba(112,217,234,0.2)' }}>
      <div style={{ color: 'var(--ln-cyan)' }}>{icon}</div>
      <div className="ln-micro" style={{ marginTop: 7 }}>{label}</div>
      <div style={{ marginTop: 3, font: '700 11px var(--ln-font-display)', color: 'var(--ln-text)' }}>{value}</div>
    </div>
  )
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '700 12px var(--ln-font-display)', color: ok ? 'var(--ln-text-dim)' : 'var(--ln-crimson)' }}>
      <span style={{
        width: 18, height: 18, borderRadius: 999, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: ok ? 'rgba(90,208,126,0.16)' : 'rgba(200,41,62,0.16)',
        color: ok ? 'var(--ln-ok)' : 'var(--ln-crimson)',
      }}>
        {ok ? <Check size={11} /> : <X size={11} />}
      </span>
      {label}
    </div>
  )
}

function RocketCutaway({
  activeRoom,
  onToggle,
  rocket,
}: {
  activeRoom: RoomKey | null
  onToggle: (room: RoomKey) => void
  rocket: ReturnType<typeof getRequiredRocketModel>
}) {
  const roomStyle = (room: RoomKey, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    border: `1.5px solid ${activeRoom === room ? 'var(--ln-cyan)' : 'rgba(112,217,234,0.5)'}`,
    borderRadius: 6,
    background: activeRoom === room ? 'rgba(112,217,234,0.24)' : 'rgba(112,217,234,0.07)',
    color: 'var(--ln-text)',
    cursor: 'pointer',
    boxShadow: activeRoom === room ? '0 0 0 2px rgba(112,217,234,0.35), 0 0 18px rgba(112,217,234,0.4)' : 'none',
    transition: 'background .15s, border-color .15s, box-shadow .15s',
    ...extra,
  })

  const labelStyle: React.CSSProperties = {
    font: '700 9px var(--ln-font-display)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  }
  const unitsStyle: React.CSSProperties = { font: '600 8px var(--ln-font-mono)', color: 'var(--ln-text-muted)' }

  return (
    <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div
        data-testid="assembly-rocket-cutaway"
        style={{ position: 'relative', width: '100%', aspectRatio: '600 / 260', filter: 'drop-shadow(0 0 26px rgba(63,169,255,0.22))' }}
      >
        <svg viewBox="0 0 600 260" fill="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M18 130 L70 70 L520 70 Q580 130 520 190 L70 190 Z" fill="#0a2a56" stroke="#70d9ea" strokeWidth="2" />
          <path d="M70 70v120M520 70v120M70 130h450" stroke="#70d9ea" strokeOpacity=".22" strokeDasharray="5 8" />
          <ellipse cx="588" cy="130" rx="20" ry="16" fill="#70d9ea" opacity=".55" />
          <ellipse cx="596" cy="130" rx="32" ry="11" fill="#70d9ea" opacity=".22" />
          <circle cx="46" cy="105" r="3" fill="#70d9ea" opacity=".4" />
          <circle cx="46" cy="155" r="3" fill="#70d9ea" opacity=".4" />
        </svg>

        <button type="button" onClick={() => onToggle('payload')} aria-pressed={activeRoom === 'payload'} style={roomStyle('payload', { left: '13%', top: '22%', width: '27%', height: '60%' })}>
          <Boxes size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Payload Bay</strong><small style={unitsStyle}>{rocket.stats.cargo} units</small>
        </button>
        <button type="button" onClick={() => onToggle('fuel')} aria-pressed={activeRoom === 'fuel'} style={roomStyle('fuel', { left: '43%', top: '30%', width: '15%', height: '44%' })}>
          <Orbit size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Fuel</strong><small style={unitsStyle}>L{rocket.stats.maxOrbit}</small>
        </button>
        <button type="button" onClick={() => onToggle('engine')} aria-pressed={activeRoom === 'engine'} style={roomStyle('engine', { left: '61%', top: '18%', width: '21%', height: '68%' })}>
          <Pickaxe size={18} color="var(--ln-cyan)" /><strong style={labelStyle}>Engine</strong><small style={unitsStyle}>T{rocket.stats.drillTier}</small>
        </button>
        <button type="button" onClick={() => onToggle('structure')} aria-pressed={activeRoom === 'structure'} style={roomStyle('structure', { left: '13%', top: '84%', width: '69%', height: '13%', flexDirection: 'row', gap: 6 })}>
          <Gauge size={16} color="var(--ln-cyan)" /><strong style={labelStyle}>Structure Frame</strong><small style={unitsStyle}>Single-use hull</small>
        </button>
      </div>
      <div style={{ font: '600 10px var(--ln-font-body)', color: 'var(--ln-text-muted)', textAlign: 'center' }}>
        Select a room to inspect the systems it drives.
      </div>
    </div>
  )
}
