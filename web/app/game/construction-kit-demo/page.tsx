'use client'

import { useState } from 'react'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import MineralChip from '@/components/game/MineralChip'
import {
  Meter,
  Slot,
  ModuleCard,
  TerrainGrid,
  PipeSegment,
  RobotCard,
  RuleCard,
  BuildQueueRow,
  BlueprintCard,
  type TerrainKind,
} from '@/components/construction'

// Dev-only visual QA page for the KES-280 Construction Kit primitives — not a
// real gameplay screen. Mirrors the "04 Scenes in-situ" section of the source
// design kit so the primitives can be eyeballed together before any real
// construction/automation scene consumes them.

const MAP: TerrainKind[] = [
  'viable', 'ore', 'viable', 'rock', 'viable', 'viable',
  'viable', 'ore', 'ore', 'viable', 'water', 'water',
  'rock', 'viable', 'built', 'viable', 'water', 'viable',
  'viable', 'viable', 'viable', 'ore', 'viable', 'rock',
]

const CATALOGUE = [
  { id: 'intake', name: 'Ore intake', cost: 'Fe 40 · Si 12', glyph: '▤', state: 'available' as const },
  { id: 'smelter', name: 'Smelter V2', cost: 'Fe 90 · Si 30', glyph: '◆', state: 'installed' as const },
  { id: 'power', name: 'Power tap', cost: 'Si 25', glyph: '⚡', state: 'available' as const },
  { id: 'cryo', name: 'Cryo separator', cost: '', glyph: '⬡', state: 'locked' as const, lockedNote: 'tier 3' },
]

export default function ConstructionKitDemoPage() {
  const [site, setSite] = useState(13)
  const [ruleActive, setRuleActive] = useState([true, false])

  return (
    <div className="theme-blueprint" style={{ minHeight: '100vh', background: 'var(--ln-void)', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ font: '700 10px var(--ln-font-display)', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ln-cyan)' }}>KES-280 · dev only</div>
        <h1 style={{ font: '800 26px var(--ln-font-display)', color: 'var(--ln-text)', margin: '4px 0 0' }}>Construction Kit primitives</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Panel>
          <div style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)', marginBottom: 12 }}>Site placement</div>
          <div className="ln-con-well ln-con-grid" style={{ padding: 8, marginBottom: 12 }}>
            <TerrainGrid cols={6} tiles={MAP} selected={site} onSelect={setSite} />
          </div>
          <StatusPill kind="ok">viable</StatusPill>
        </Panel>

        <Panel>
          <div style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)', marginBottom: 12 }}>Module assembly</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
            <Slot state="filled" label="smelter" glyph="◆" onClear={() => {}} />
            <Slot state="active" />
            <Slot state="empty" />
            <Slot state="blocked" blockedReason="needs power" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATALOGUE.map((c) => (
              <ModuleCard key={c.id} {...c} onClick={() => {}} />
            ))}
          </div>
        </Panel>

        <Panel>
          <div style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)', marginBottom: 12 }}>Meters</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Meter label="throughput" value="7/10" variant="segmented" segments={{ filled: 7, total: 10 }} />
            <Meter label="buffer · overfull" value="98%" tone="crit" pct={98} />
            <Meter label="build progress" value="64% · 2:40" tone="cyan" variant="build" pct={64} />
            <Meter label="yield ramp" value="+240 /d" tone="ok" variant="sparkline" spark={[0.24, 0.38, 0.32, 0.56, 0.7, 0.64, 0.88, 1]} />
          </div>
        </Panel>

        <Panel>
          <div style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)', marginBottom: 12 }}>Pipeline console</div>
          <div className="ln-con-well" style={{ padding: 8, marginBottom: 12 }}>
            <svg viewBox="0 0 260 150" width="100%" height="120">
              <PipeSegment d="M24 40 H150 V110 H236" state="flowing" />
              <PipeSegment d="M24 76 H92" state="idle" />
              <PipeSegment d="M120 76 H188" state="severed" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RobotCard name="Hauler H-04" glyph="H" task="Unassigned · 100% charge" state="idle" />
            <RobotCard name="Builder B-01" glyph="B" task="Smelter frame · 64%" state="building" />
            <RobotCard name="Drone D-11" glyph="D" task="Stranded · no charge pad" state="fault" />
          </div>
        </Panel>

        <Panel>
          <div style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)', marginBottom: 12 }}>Rules & queue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <RuleCard index={1} active={ruleActive[0]} cond="Depot A iron" test="< 200" act="reroute Line 2" onToggle={() => setRuleActive(([a, b]) => [!a, b])} />
            <RuleCard index={2} active={ruleActive[1]} cond="grid draw" test="> 18 GW" act="throttle smelter" onToggle={() => setRuleActive(([a, b]) => [a, !b])} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <BuildQueueRow index="01" name="Smelter · B4" sub="building" eta="2:40" onCancel={() => {}} />
            <BuildQueueRow index="02" name="Conveyor spur · B4→C5" sub="queued · needs Fe 40" eta="0:50" onCancel={() => {}} />
            <BuildQueueRow index="03" name="Charge pad · C3" sub="complete · day 33" complete />
          </div>
        </Panel>

        <Panel>
          <div style={{ font: '700 9px var(--ln-font-display)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ln-text-muted)', marginBottom: 12 }}>Blueprints & minerals</div>
          <div style={{ marginBottom: 12 }}>
            <BlueprintCard name="Iron starter" sub="6 modules · Fe 210" onClick={() => {}} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <MineralChip mineral="silicon" count={1240} />
            <MineralChip mineral="iron" count={860} />
            <MineralChip mineral="gold" count={32} />
            <MineralChip mineral="ice" count={410} />
          </div>
        </Panel>
      </div>
    </div>
  )
}
