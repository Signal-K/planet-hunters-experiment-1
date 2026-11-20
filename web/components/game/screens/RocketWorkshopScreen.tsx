'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Player } from '@/lib/game-types'
import type { Mission, RocketConfig, Target } from '@/lib/data'
import { customizerPartById } from '@/lib/data/shipCustomizer'
import { validateBuild } from '@/lib/data/parts'
import { buildingLevel } from '@/lib/data/building-levels'
import { communityBonusRate } from '@/lib/research/marketplace'
import { formatCurrency } from '@/lib/format'
import { BUILDER_SLOTS, allPartsForSlot, asLoadout, installSlot, loadoutBonuses, partEffectLabel, partIdForSlot, rocketBuilderStats, type BuilderLoadout } from '@/lib/launchpad/rocketBuilder'
import { earnedRocketParts, LIVERY_COLORS, LIVERY_DECALS, sanitizeLivery, workshopParts, workshopPartPrice, type RocketLivery } from '@/lib/launchpad/workshop'
import styles from './RocketWorkshopScreen.module.css'

export default function RocketWorkshopScreen({ player, rocket, mission, target, deliveryTarget, onBack, onInstall, onLivery, onResearch }: {
  player: Player; rocket: RocketConfig; mission?: Mission | null; target?: Target | null; deliveryTarget?: Target | null
  onBack: () => void; onInstall: (next: BuilderLoadout, prev: BuilderLoadout) => boolean
  onLivery: (next: RocketLivery) => void; onResearch: () => void
}) {
  const [selected, setSelected] = useState('cargo-hold')
  const [tab, setTab] = useState<'parts' | 'livery'>('parts')
  const [notice, setNotice] = useState('')
  const consoleRef = useRef<HTMLElement>(null)
  useEffect(() => { if (consoleRef.current) consoleRef.current.scrollTop = 0 }, [selected, tab])
  const loadout = asLoadout(player.shipCustomizerParts)
  const livery = sanitizeLivery(player.rocketLivery)
  const active = BUILDER_SLOTS.find(slot => slot.id === selected) ?? BUILDER_SLOTS[2]
  const earned = earnedRocketParts(player)
  const fittedId = partIdForSlot(loadout, active)
  const fuelFraction = communityBonusRate(player).fuel
  const stats = rocketBuilderStats(rocket, loadout, undefined, fuelFraction)
  const problems = mission && target ? validateBuild({ mission, target: deliveryTarget && deliveryTarget.orbit > target.orbit ? deliveryTarget : target, rocket, loadoutBonus: loadoutBonuses(loadout), fuelFraction, launchpadLevel: buildingLevel(player, 'launchpad') }).problems : []
  const style = { '--hull': LIVERY_COLORS[livery.hull], '--trim': LIVERY_COLORS[livery.trim] } as CSSProperties
  const paint = (change: Partial<RocketLivery>) => onLivery({ ...livery, ...change, updatedAt: Date.now() })
  const order = ['mining-laser', 'cargo-hold', 'fuel-tank', 'booster', 'engine']

  return <div className={`game-screen ${styles.root}`} data-testid="rocket-workshop" style={style}>
    <header className={styles.header}>
      <button onClick={onBack}>‹ Launchpad</button>
      <div><span>ASSEMBLY BAY / 01</span><h1>Rocket workshop</h1></div>
      <span>{formatCurrency(player.francs, { compact: true })}</span>
    </header>
    <div className={styles.workbench}>
      <section className={styles.bay} aria-label="Rocket stack">
        <div className={styles.gantry} aria-hidden="true" />
        <div className={styles.stack} data-testid="workshop-rocket" data-hull={livery.hull} data-trim={livery.trim} data-decal={livery.decal}>
          <div className={styles.nose}><span>{livery.decal === 'star' ? '★' : livery.decal === 'orbit' ? '◎' : livery.decal === 'stripes' ? '≋' : ''}</span></div>
          {order.map(id => {
            const slot = BUILDER_SLOTS.find(candidate => candidate.id === id)!
            const partId = partIdForSlot(loadout, slot)
            const part = partId ? customizerPartById(partId) : null
            const variant = part ? allPartsForSlot(slot).findIndex(candidate => candidate.id === part.id) + 1 : 0
            const tier = part?.tier ?? 1
            const ports = part ? Math.min(5, Math.max(tier, Math.ceil(part.power / 4))) : 0
            return <button key={id} className={styles.section} data-section={id} data-tier={tier} data-part={partId ?? 'standard'} data-testid={`workshop-section-${id}`} aria-pressed={selected === id && tab === 'parts'} aria-label={`${slot.label}: ${part?.name ?? 'Standard'}`} onClick={() => { setSelected(id); setTab('parts'); setNotice('') }}>
              <svg viewBox="0 0 180 54" aria-hidden="true" preserveAspectRatio="none">
                <path d={id === 'engine' ? 'M35 2H145L157 48H23Z' : id === 'booster' ? 'M34 2H146V52H34ZM8 8H30V50H8ZM150 8H172V50H150Z' : 'M34 2H146V52H34Z'} fill="var(--hull)" stroke="var(--ln-blueprint-ink)" strokeWidth="3" />
                <path d="M35 5H145V12H35Z" fill="var(--trim)" />
                {Array.from({ length: variant }, (_, index) => <path key={`rib-${index}`} d={`M${42 + index * 9} 14v7`} stroke="var(--trim)" strokeWidth="3" />)}
                {Array.from({ length: ports }, (_, index) => <rect key={index} x={52 + index * 17} y="23" width="10" height="18" rx="2" fill="var(--trim)" />)}
                {id === 'mining-laser' && <path d="M145 22H174V38H145Z" fill="var(--trim)" stroke="var(--ln-blueprint-ink)" strokeWidth="3" />}
                {id === 'engine' && <path d="M47 39 41 52H70L64 39ZM116 39 110 52H139L133 39Z" fill="var(--ln-blueprint-ink)" />}
              </svg>
              <span className={styles.sectionLabel}>{slot.label}<small>{part?.name ?? 'Standard'}</small></span>
            </button>
          })}
        </div>
        <div className={styles.plinth}>TAP A SECTION TO FIT A PART</div>
      </section>
      <section ref={consoleRef} className={styles.console} aria-label="Workshop controls">
        <nav aria-label="Workshop tools"><button aria-pressed={tab === 'parts'} onClick={() => setTab('parts')}>Parts</button><button aria-pressed={tab === 'livery'} onClick={() => setTab('livery')}>Livery</button></nav>
        {tab === 'parts' ? <>
          <h2>{active.label}</h2>
          <p>{earned.length ? `${earned.length} weekly research parts earned · yours to refit` : 'Weekly research earns permanent parts.'} <button className={styles.link} onClick={onResearch}>Research →</button></p>
          <ul className={styles.tray} aria-label={`${active.label} parts`}>
            {workshopParts(active, player).map(part => {
              const fitted = part.id === fittedId
              const reward = earned.includes(part.id)
              const delta = workshopPartPrice(part.id, player) - (fittedId ? workshopPartPrice(fittedId, player) : 0)
              const affordable = delta <= player.francs
              return <li key={part.id}><button disabled={fitted || !affordable} data-testid={`workshop-fit-${part.id}`} data-earned={reward} onClick={() => {
                const ok = onInstall(installSlot(loadout, active, part.id), loadout)
                setNotice(ok ? `Fitted ${part.name}` : 'Could not fit this part. Check your balance and unlocks.')
              }}>
                <img src={part.img ?? active.card} alt="" />
                <span><strong>{part.name}</strong><small>{partEffectLabel(active, part)}</small><small>{reward ? 'Weekly reward · owned' : part.description}</small></span>
                <b>{fitted ? 'Fitted' : !affordable ? `Need ${formatCurrency(delta - player.francs, { compact: true })} more` : delta < 0 ? `Fit · refund ${formatCurrency(-delta, { compact: true })}` : delta === 0 ? 'Fit · free' : `Fit · ${formatCurrency(delta, { compact: true })}`}</b>
              </button></li>
            })}
          </ul>
          {fittedId && <button onClick={() => { const next = { ...loadout }; delete next[active.id === 'mining-laser' ? (next['mining-laser'] ? 'mining-laser' : 'booster') : active.kind]; onInstall(next, loadout); setNotice('Standard section restored') }}>Restore standard section</button>}
        </> : <div className={styles.livery}>
          <h2>Livery</h2><p>Paint and decals are free. Saved as you fit them.</p>
          {(['hull', 'trim'] as const).map(channel => <fieldset key={channel}><legend>{channel === 'hull' ? 'Hull colour' : 'Trim colour'}</legend><div>{Object.entries(LIVERY_COLORS).map(([id, color]) => <button key={id} aria-pressed={livery[channel] === id} onClick={() => paint({ [channel]: id })}><i style={{ background: color }} />{id}</button>)}</div></fieldset>)}
          <fieldset><legend>Decal</legend><div>{LIVERY_DECALS.map(decal => <button key={decal} aria-pressed={livery.decal === decal} onClick={() => paint({ decal })}>{decal}</button>)}</div></fieldset>
        </div>}
        <p role="status" className={styles.notice}>{notice}</p>
      </section>
    </div>
    <footer className={styles.readout}>
      <div data-testid="workshop-stats"><strong>{stats.capacity} U</strong> capacity · <strong>{stats.range}</strong> range · <strong>{stats.laser}</strong> laser charges</div>
      <div data-testid="workshop-mission-check"><strong>{mission?.title ?? 'No mission selected'}</strong>{problems.length ? <ul>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul> : <p>{mission ? 'This build meets the mission limits.' : 'Choose a mission at the launchpad to check its limits.'}</p>}</div>
    </footer>
  </div>
}
