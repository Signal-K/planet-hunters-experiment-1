'use client'
import { agencyTier } from '@/lib/agency/construction-translation'
import { useEffect, useState } from 'react'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { GalaxyMap } from '@/components/game/MissionBoard'
import { formatCurrency } from '@/lib/format'
import { plannerTargets, plannerMinerals, planQuote, deliveryCache, type MissionPlan, type PlannedWork } from '@/lib/mission-planner'
import { probeSectorHours } from '@/lib/data/building-levels'
import { miningIntelligence } from '@/lib/probes/mining-intelligence'
import { supportsSolarField } from '@/lib/takeon/solarField'
import { MISSION_ZONES, type MissionZone } from '@/lib/data/mission-zone'
import { pendingMiningPlan, clearMiningPlan } from '@/lib/mission-planner-nav'
import { moonParent } from '@/lib/solar-moons'
import board from '@/components/game/MissionBoard.module.css'
import styles from './MissionPlannerScreen.module.css'

const duration = (ms: number) => ms < 60_000 ? `${Math.ceil(ms / 1000)} s` : `${Math.floor(ms / 60_000)} min ${Math.ceil(ms % 60_000 / 1000)} s`
export default function MissionPlannerScreen({ player, catalog, initialPlan, onBack, onSave, onReview }: {
  player: Player; catalog: Catalog; initialPlan?: MissionPlan; onBack: () => void; onSave: (plan: MissionPlan) => void; onReview: (id: string) => void
}) {
  const [mapOpen, setMapOpen] = useState(false)
  useEffect(() => { setMapOpen(window.matchMedia('(min-width: 651px)').matches) }, [])
  const first = plannerTargets(player, catalog, 'mine')
  const [selection] = useState(pendingMiningPlan)
  useEffect(() => { clearMiningPlan() }, [])
  const [draft, setDraft] = useState<MissionPlan>(() => selection
    ? { id: 'self-plan-draft', ...selection, work: 'mine', amount: 3, createdAt: Date.now() }
    : initialPlan ?? { id: 'self-plan-draft', targetId: first.find(target => target.id === 'eros')?.id ?? first[0]?.id ?? '', work: 'mine', mineral: 'nickel', amount: 3, createdAt: Date.now() })
  const [savedId, setSavedId] = useState<string | null>(selection ? null : initialPlan?.id ?? null)
  const mapView = (id: string): 'inner' | 'outer' | 'belt' | 'moons' => { const body = catalog.targets.find(target => target.id === id); return moonParent(id) ? 'moons' : body?.type === 'asteroid' ? 'belt' : (body?.orbit ?? 0) <= 4 ? 'inner' : 'outer' }
  const [view, setView] = useState<'system' | 'inner' | 'outer' | 'belt' | 'moons'>(() => mapView(draft.targetId))
  const [moonParentId, setMoonParentId] = useState<string | null>(() => moonParent(draft.targetId) ?? null)
  const targets = plannerTargets(player, catalog, draft.work)
  const parentIds = new Set(targets.flatMap(body => moonParent(body.id) ?? []))
  const mapTargets = [...targets, ...catalog.targets.filter(body => parentIds.has(body.id) && !targets.some(target => target.id === body.id))]
  const target = targets.find(target => target.id === draft.targetId)
  const minerals = plannerMinerals(player, target, catalog, draft.work)
  const intelligence = target ? miningIntelligence(player, target, id => catalog.minerals[id]?.rarity) : null
  const quote = planQuote(draft, player, catalog)
  const saved = Object.values(player.missionPlans ?? {}).sort((a, b) => b.createdAt - a.createdAt)
  const cache = deliveryCache(player, draft.targetId)
  const change = (patch: Partial<MissionPlan>) => {
    const next = { ...draft, ...patch }
    const bodies = plannerTargets(player, catalog, next.work)
    const body = bodies.find(target => target.id === next.targetId) ?? bodies[0]
    next.targetId = body?.id ?? ''
    if (next.work === 'survey' || !supportsSolarField(next.targetId)) delete next.zone
    const ores = plannerMinerals(player, body, catalog, next.work)
    if (!ores.includes(next.mineral)) next.mineral = ores[0] ?? ''
    if (next.work === 'survey') next.amount = Math.min(24, Math.max(1, next.amount))
    if (next.targetId !== draft.targetId) { setMoonParentId(moonParent(next.targetId) ?? null); setView(mapView(next.targetId)) }
    setDraft(next); setSavedId(null)
  }
  const save = () => { const plan = { ...draft, id: `self-plan-${crypto.randomUUID()}`, createdAt: Date.now() }; onSave(plan); setDraft(plan); setSavedId(plan.id) }
  const probeHours = player.placed.includes('control-station') ? probeSectorHours(agencyTier(player, 'data-hub')) : 2
  return <div className={`${board.scene} ${styles.root}`} data-testid="mission-planner" data-screen="mission-planner">
    <header className={styles.header}><button onClick={onBack}>‹ Mission board</button><div><span>YOUR PROGRAM / FLIGHT PLANNING</span><h1>Plan your mission</h1></div></header>
    <main className={styles.layout}>
      <details className={styles.chart} open={mapOpen} onToggle={event => setMapOpen(event.currentTarget.open)}><summary>Destination map</summary><div className={styles.mapViewport}>
        <GalaxyMap targets={mapTargets} mode="pick" view={view} moonParentId={moonParentId} onOpenMoons={id => { setMoonParentId(id); setView('moons') }} onView={setView} selectedId={draft.targetId} candidates={targets.map(target => target.id)} onPick={targetId => { if (targets.some(body => body.id === targetId)) change({ targetId }) }} />
        <div className={styles.mapLabel}><strong>{target?.name ?? 'Choose a destination'}</strong><span>{target ? `Orbit ${target.orbit} · ${target.type}` : 'Only reachable bodies are offered'}</span></div>
      </div></details>
      <section className={styles.console} aria-label="Mission plan controls">
        <details><summary>Saved plans</summary><label>Saved plans<select aria-label="Saved plans" value={savedId && player.missionPlans?.[savedId] ? savedId : ''} onChange={event => { const plan = player.missionPlans?.[event.target.value]; if (plan) { setDraft(plan); setSavedId(plan.id); setMoonParentId(moonParent(plan.targetId) ?? null); setView(mapView(plan.targetId)) } else setSavedId(null) }}><option value="">New plan</option>{saved.map(plan => <option key={plan.id} value={plan.id}>{plan.work} · {catalog.targets.find(target => target.id === plan.targetId)?.name ?? plan.targetId} · {plan.amount}</option>)}</select></label></details>
        <fieldset><legend>Work</legend><div className={styles.work}>{(['mine', 'survey', 'deliver'] as PlannedWork[]).map(work => <button key={work} data-testid={`planner-work-${work}`} aria-pressed={draft.work === work} onClick={() => change({ work, amount: work === 'survey' ? 6 : 3 })}>{work}</button>)}</div></fieldset>
        <label>Destination<select aria-label="Destination" data-testid="planner-destination" value={draft.targetId} onChange={event => change({ targetId: event.target.value })}>{targets.map(target => <option key={target.id} value={target.id}>{target.name} · orbit {target.orbit}</option>)}</select></label>
        {process.env.NEXT_PUBLIC_TAKEON_SOLAR_PREVIEW === '1' && draft.work !== 'survey' && supportsSolarField(draft.targetId) && <label>Landing site<select aria-label="Landing site" data-testid="planner-zone" value={draft.zone ?? ''} onChange={event => change({ zone: event.target.value ? event.target.value as MissionZone : undefined })}><option value="">Standard site</option>{MISSION_ZONES.map(site => <option key={site} value={site}>{({ prime: 'Prime meridian · 0°', east: 'East · 90°', opposite: 'Far side · 180°', west: 'West · 90°' })[site]}</option>)}</select></label>}
        {draft.work === 'mine' && intelligence && <details className={styles.intelligence} data-testid="planner-probe-findings"><summary>Probe findings</summary>
          <h2>Probe findings</h2>
          {intelligence.sectors.length ? <>
            <p>{intelligence.sectors.length}/{intelligence.totalSectors} sectors on file · {intelligence.personalSectors} downloaded by you · {intelligence.sharedSectors} shared by the community. Coverage counts overlapping sectors once.</p>
            <ul>{intelligence.findings.map(row => <li key={row.mineral}><strong>{catalog.minerals[row.mineral]?.name ?? row.mineral}</strong> · about {row.tonnes.toLocaleString('en-GB')} t across {row.sectors} sector{row.sectors === 1 ? '' : 's'}</li>)}</ul>
            {!intelligence.findings.length && <p>No mineral deposits found in these sectors.</p>}
            <p>Survey estimates describe deposits, not the pieces your rocket can carry. Choose your ore and haul below.</p>
          </> : <p>No probe readings on file for {target?.name}. Ore choices use the body's known composition; you can still plan a flight. Download a probe survey at the Data hub for mapped estimates.</p>}
          {intelligence.sectors.length > 0 && !intelligence.findings.some(row => row.mineral === draft.mineral) && <p>The selected ore has not been found in the mapped sectors. It is listed in the body's composition.</p>}
        </details>}
        {draft.work !== 'survey' && <label>{draft.work === 'deliver' ? 'Ore from Earth stash' : 'Ore to mine'}<select aria-label="Mineral" value={draft.mineral} onChange={event => change({ mineral: event.target.value })}>{minerals.length ? minerals.map(id => <option key={id} value={id}>{catalog.minerals[id].name}{draft.work === 'deliver' ? ` · ${player.stash?.[id] ?? 0} in stash` : ''}</option>) : <option value="">No ore available</option>}</select></label>}
        <label>{draft.work === 'survey' ? 'Sectors to map' : 'Pieces'}<div className={styles.amount}><button aria-label="Decrease amount" onClick={() => change({ amount: Math.max(1, draft.amount - 1) })}>−</button><input aria-label="Amount" type="number" min="1" max={draft.work === 'survey' ? 24 : 999} step="1" value={draft.amount} onChange={event => change({ amount: Number(event.target.value) })} /><button aria-label="Increase amount" onClick={() => change({ amount: draft.amount + 1 })}>+</button></div></label>
        {quote.mission && <details className={styles.readout} data-testid="planner-estimate"><summary>Flight requirements and expected return</summary>
          <h2>Flight brief</h2><dl><div><dt>Cargo required</dt><dd>{quote.mission.requires.cargo_min} U</dd></div><div><dt>Range required</dt><dd>Orbit {target?.orbit}</dd></div><div><dt>Laser required</dt><dd>{draft.work === 'mine' ? `T${quote.mission.requires.drill_tier}` : 'None'}</dd></div><div><dt>Outbound flight</dt><dd>{duration(quote.outboundMs)} · boost can shorten it</dd></div><div><dt>Agency rocket</dt><dd>{quote.rocket?.name ?? 'No available rocket fits'}</dd></div></dl>
          <p data-testid="planner-return">{draft.work === 'mine' ? `${draft.amount} ${catalog.minerals[draft.mineral]?.name ?? 'ore'} home. Market estimate ${formatCurrency(quote.marketEstimate, { compact: true })}; keep or sell on return.` : draft.work === 'survey' ? `One probe stays in orbit and maps ${draft.amount} sectors. First data in ${probeHours} h; coverage in ${probeHours * draft.amount} h. Download it at the Data hub. No franc payout.` : `${draft.amount} ${catalog.minerals[draft.mineral]?.name ?? 'ore'} moves from Earth to your forward cache at ${target?.name}. No franc payout. Cache now: ${Object.entries(cache).map(([id, n]) => `${n} ${catalog.minerals[id]?.name ?? id}`).join(', ') || 'empty'}.`}</p>
        </details>}
        {quote.issues.length > 0 && <ul className={styles.issues} role="status">{quote.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
        {player.activeMission && <p role="status">Your current flight stays active while you plan. Reviewing this saved plan parks that flight so you can resume it later.</p>}
        <footer className={styles.actions}><button data-testid="planner-save" disabled={!!quote.issues.length} onClick={save}>Save plan</button><button className={styles.primary} data-testid="planner-review" disabled={!savedId || !player.missionPlans?.[savedId] || !!quote.issues.length} onClick={() => savedId && onReview(savedId)}>Review & launch →</button></footer>
        {savedId && <p role="status">Plan saved. Review opens the usual rocket and launch checks.</p>}
      </section>
    </main>
  </div>
}
