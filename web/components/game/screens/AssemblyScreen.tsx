'use client'

import { Boxes, Check, Orbit, Pickaxe, Route, X } from 'lucide-react'
import type { CrewMember, Mission, RocketConfig, Target } from '@/lib/data'
import { ROCKET_MODELS, validateBuild } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import Panel from '@/components/ui/Panel'
import TutorialHighlight from '@/components/game/TutorialHighlight'
import StatCard from '@/components/ui/StatCard'
import MissionSetupShell, {
  MissionSetupCard,
  MissionSetupFrame,
} from '@/components/game/screens/MissionSetupShell'
import { rocketModelForConfig } from '@/lib/data/rockets'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'
import { useIsShortViewport } from '@/lib/hooks/useIsShortViewport'
import { useIsNarrowViewport } from '@/lib/hooks/useIsNarrowViewport'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'

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

// Real-data ceilings (drawn from the actual starter-rocket catalog, not
// invented numbers) so the segmented meters reflect true headroom rather
// than a decorative fill.
const MAX_CARGO = Math.max(...ROCKET_MODELS.map(r => r.stats.cargo))
const MAX_ORBIT = Math.max(...ROCKET_MODELS.map(r => r.stats.maxOrbit))
const MAX_DRILL_TIER = Math.max(...ROCKET_MODELS.map(r => r.stats.drillTier))
const METER_SEGMENTS = 8

export default function AssemblyScreen(props: AssemblyScreenProps) {
  const highlightContent = props.hasCoach && props.coachManual
  const crewCheck = crewRequirementStatus(props.mission.requires.crew, props.crew ?? [])
  const crewReady = !props.mission.requires.crew || (!!props.crewModuleFitted && crewCheck.met)
  const launchReady = validateBuild({ mission: props.mission, target: props.target, rocket: props.rocket, parts: props.parts, unlockedSkillNodes: props.unlockedSkillNodes }).ok && crewReady
  const selectedRocket = rocketModelForConfig(props.rocket)
  // Portrait preflight has two fixed regions plus the automatic launch handoff. Treat a
  // narrow phone as compact even when it is tall, otherwise the decorative
  // flight-plan block forces the manifest underneath the launch region.
  const compact = useIsShortViewport() || useIsNarrowViewport()
  const { phase: skyPhase } = useTimeOfDay()

  return (
    <MissionSetupShell
      className="mission-setup-screen--assembly theme-deep"
      eyebrow="LAUNCHPAD · PREFLIGHT"
      title="Confirm Rocket"
      onBack={props.onBack}
      hasCoach={props.hasCoach}
      coachManual={props.coachManual}
      hideStepFooter
      sceneBackground={<HubWorldBackground phase={skyPhase} composition="earth-base-pad" />}
    >
      <MissionSetupFrame className="assembly-frame assembly-preflight-scene" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        padding: 12,
          background: 'var(--ln-void)',
      }}>
        {highlightContent && <TutorialHighlight />}
        <LaunchClearance
          mission={props.mission}
          target={props.target}
          deliveryTargetName={props.deliveryTargetName}
          rocket={selectedRocket}
          ready={launchReady}
          onLaunch={props.onLaunch}
          compact={compact}
        />

      </MissionSetupFrame>

      <MissionSetupCard className="assembly-card" scrollStyle={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10 }}>
        <Panel accent="var(--ln-cyan)" style={{ padding: compact ? 8 : 'var(--ln-s-3)', flex: '0 0 auto' }}>
          <div className="context-row">
            <div><span className="ln-micro">Mission</span><strong>{props.mission.title}</strong></div>
            {/* KES-171: target name is informational text, not a payout/reward — was amber. */}
            <div><span className="ln-micro">Target</span><strong className="cyan">{props.target.name}</strong></div>
          </div>
          {props.mission.deliveryTargetId && props.deliveryTargetName && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, font: '700 9px var(--ln-font-mono)', color: 'var(--ln-cyan)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Route size={11} />
              {props.target.name} → {props.deliveryTargetName}
            </div>
          )}
          {/* Redundant with the OPS counter already in the top HUD strip on
              every other screen — dropped on short viewports (STS-612) since
              the manifest card doesn't have room to spare there. */}
          {!compact && (
            <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 10, color: 'var(--ln-text-dim)', fontFamily: 'var(--ln-font-mono)' }}>
              <span>Missions Complete · {props.missionsDone}</span>
            </div>
          )}
        </Panel>
        <section>
          <div className="ln-section-label" style={compact ? { marginBottom: 4 } : undefined}>Launch manifest</div>
          <Panel accent="var(--ln-cyan)" style={{ padding: compact ? 8 : 'var(--ln-s-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 8 }}>
              <ChecklistRow ok label={`Contract confirmed — ${props.mission.title}`} />
              <ChecklistRow ok label={`Target locked — ${props.target.name}`} />
              <ChecklistRow ok label={`${selectedRocket.name} fuelled and ready`} />
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
  onLaunch,
  compact = false,
}: {
  mission: Mission
  target: Target
  deliveryTargetName?: string
  rocket: ReturnType<typeof rocketModelForConfig>
  ready: boolean
  onLaunch: () => void
  compact?: boolean
}) {
  const stops = deliveryTargetName
    ? ['Base', target.name, deliveryTargetName, 'Base']
    : ['Base', target.name]
  return (
    <div data-testid="assembly-rocket-cutaway" style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10 }}>
      {!compact && <PadElevation rocketImageSrc={rocket.img} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div className="ln-micro" style={{ color: 'var(--ln-cyan)' }}>Launch authorization</div>
          <div style={{ marginTop: 3, font: `800 ${compact ? 16 : 22}px var(--ln-font-display)`, color: 'var(--ln-text)', letterSpacing: '-0.02em' }}>Flight cleared</div>
          <div data-testid="assembly-selected-rocket" style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 8px', border: '1px solid var(--ln-cyan-border)', borderRadius: 4, color: 'var(--ln-cyan)', font: '800 10px var(--ln-font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--ln-text-muted)' }}>Vehicle</span>
            {rocket.name}
          </div>
          {!compact && <div style={{ marginTop: 3, font: '11px var(--ln-font-body)', color: 'var(--ln-text-dim)' }}>{mission.title} · single-use vehicle</div>}
          <button
            type="button"
            data-testid="launch-btn"
            disabled={!ready}
            onClick={onLaunch}
            style={{
              marginTop: compact ? 6 : 8,
              padding: compact ? '7px 9px' : '8px 12px',
              border: '1px solid var(--ln-cyan)',
              borderRadius: 4,
              background: ready ? 'var(--ln-cyan)' : 'var(--ln-panel-2)',
              color: ready ? 'var(--ln-void)' : 'var(--ln-text-dim)',
              font: '800 10px var(--ln-font-display)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: ready ? 'pointer' : 'not-allowed',
              opacity: ready ? 1 : 0.55,
            }}
          >
            Start launch sequence
          </button>
        </div>
        <div style={{ width: compact ? 36 : 54, height: compact ? 36 : 54, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, border: `2px solid ${ready ? 'var(--ln-ok)' : 'var(--ln-crimson)'}`, color: ready ? 'var(--ln-ok)' : 'var(--ln-crimson)', background: ready ? 'var(--ln-ok-soft)' : 'var(--ln-crimson-soft)' }}>
          <Check size={compact ? 16 : 24} />
        </div>
      </div>

      {!compact && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--ln-panel-2)', border: '1px solid var(--ln-cyan-border)' }}>
          <div className="ln-micro">Flight plan</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {stops.map((stop, index) => (
              <div key={`${stop}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: index === stops.length - 1 ? 0 : 1 }}>
                <div style={{ minWidth: 0, textAlign: 'center' }}>
                  {index === stops.length - 1 ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block', margin: '0 auto 7px' }} aria-hidden="true">
                      <circle cx="7" cy="7" r="6" fill="none" stroke="var(--ln-bp-pink, var(--ln-cyan))" strokeWidth="1.5" />
                      <line x1="7" y1="0" x2="7" y2="4" stroke="var(--ln-bp-pink, var(--ln-cyan))" strokeWidth="1.5" />
                      <line x1="7" y1="10" x2="7" y2="14" stroke="var(--ln-bp-pink, var(--ln-cyan))" strokeWidth="1.5" />
                      <line x1="0" y1="7" x2="4" y2="7" stroke="var(--ln-bp-pink, var(--ln-cyan))" strokeWidth="1.5" />
                      <line x1="10" y1="7" x2="14" y2="7" stroke="var(--ln-bp-pink, var(--ln-cyan))" strokeWidth="1.5" />
                    </svg>
                  ) : (
                    <div style={{ width: 10, height: 10, margin: '0 auto 7px', borderRadius: 999, border: '2px solid var(--ln-cyan)', background: 'var(--ln-panel)' }} />
                  )}
                  <div style={{ font: '800 10px var(--ln-font-display)', color: 'var(--ln-text)', whiteSpace: 'nowrap' }}>{stop}</div>
                </div>
                {index < stops.length - 1 && <div style={{ flex: 1, height: 1, minWidth: 24, borderTop: '1.5px dashed var(--ln-cyan)' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: compact ? 6 : 8 }}>
        <StatCard
          variant="compact"
          label="Payload"
          value={`${rocket.stats.cargo} units`}
          icon={<Boxes size={15} />}
          meter={{ segments: METER_SEGMENTS, filled: (rocket.stats.cargo / MAX_CARGO) * METER_SEGMENTS }}
        />
        <StatCard
          variant="compact"
          label="Range"
          value={`Orbit ${rocket.stats.maxOrbit}`}
          icon={<Orbit size={15} />}
          meter={{ segments: METER_SEGMENTS, filled: (rocket.stats.maxOrbit / MAX_ORBIT) * METER_SEGMENTS }}
        />
        <StatCard
          variant="compact"
          label="Drill"
          value={`Tier ${rocket.stats.drillTier}`}
          icon={<Pickaxe size={15} />}
          meter={{ segments: METER_SEGMENTS, filled: (rocket.stats.drillTier / MAX_DRILL_TIER) * METER_SEGMENTS }}
        />
      </div>
    </div>
  )
}

// The preflight pad is a physical scene, not a blank drafting placeholder.
// It uses the same Blender exterior sprite as mining, Hangar, and launch;
// the schematic details remain supporting instruments around that vehicle.
function PadElevation({ rocketImageSrc }: { rocketImageSrc: string }) {
  return (
    <svg viewBox="0 0 620 120" fill="none" aria-hidden="true" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect x="0" y="0" width="620" height="120" fill="var(--ln-void)" />
      {/* Ground line + pad. */}
      <line x1="16" y1="108" x2="604" y2="108" stroke="var(--ln-cyan-border)" strokeWidth="1" />
      <path d="M180 108 V96 H420 V108" fill="var(--ln-surface)" stroke="var(--ln-cyan-border)" strokeWidth="1.5" />
      {/* Substantial gantry rails behind the launch vehicle. */}
      <path d="M442 108 V18 H522 V108 M442 38 H522 M442 62 H522 M442 86 H522" stroke="var(--ln-text-muted)" strokeWidth="3" />
      <path d="M450 18 H514 M470 18 V72 M494 18 V54" stroke="var(--ln-cyan)" strokeWidth="1.5" />
      {/* The shared Blender body is upright on the same pad used by launch. */}
      <image href={rocketImageSrc} x="250" y="-51" width="140" height="54" transform="rotate(90 320 59)" preserveAspectRatio="xMidYMid meet" />
      <path d="M320 99 V108 M308 108 H332" stroke="var(--ln-cyan-bright)" strokeWidth="2" />
      <path d="M314 108 L320 115 L326 108" fill="var(--ln-cyan)" opacity=".7" />
    </svg>
  )
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '700 12px var(--ln-font-display)', color: ok ? 'var(--ln-text-dim)' : 'var(--ln-crimson)' }}>
      <span style={{
        width: 18, height: 18, borderRadius: 999, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: ok ? 'var(--ln-ok-soft)' : 'var(--ln-crimson-soft)',
        color: ok ? 'var(--ln-ok)' : 'var(--ln-crimson)',
      }}>
        {ok ? <Check size={11} /> : <X size={11} />}
      </span>
      {label}
    </div>
  )
}
