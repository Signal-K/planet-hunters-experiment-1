'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { formatCurrency } from '@/lib/format'
import { MOON_PARENTS, bodiesWithMissions, missionsAtBody } from '@/lib/missions-at-body'
import { loadPixiGalaxyMap } from '@/components/TargetPicker/loadPixiGalaxyMap'
import styles from './SolarMapScreen.module.css'

// Pixi needs the browser. If the chunk cannot load the place list below still works.
const PixiGalaxyMap = dynamic(
  () => loadPixiGalaxyMap().catch(() => ({ default: MapOffline })),
  { ssr: false },
)

function MapOffline() {
  return <p className={styles.offline}>The map loads when you are back online. Pick a place from the list.</p>
}

interface SolarMapScreenProps {
  catalog: Catalog
  player: Player
  onAccept: (missionId: string, bodyId: string) => void
  onBase: () => void
}

type Mission = Catalog['missions'][number]

/**
 * Map-first entry to the mission loop: pick a planet, moon or asteroid, see the work there, accept it.
 * Agency work and client work are listed apart so a client's order is never mistaken for the agency's own.
 */
export default function SolarMapScreen({ catalog, player, onAccept, onBase }: SolarMapScreenProps) {
  const lit = useMemo(() => bodiesWithMissions(catalog, player), [catalog, player])
  // Moons are not drawn as bodies of their own: their parent glows when the moon has work, and the panel lists the moons.
  const mapTargets = useMemo(() => catalog.targets.filter(t => !MOON_PARENTS[t.id]), [catalog.targets])
  const mapLit = useMemo(() => new Set([...lit].map(id => MOON_PARENTS[id] ?? id)), [lit])
  const firstLit = mapTargets.find(t => mapLit.has(t.id))?.id ?? null
  const [pickedId, setPickedId] = useState<string | null>(firstLit)
  const body = catalog.targets.find(t => t.id === pickedId) ?? null
  const here = useMemo(() => (pickedId ? missionsAtBody(catalog, player, pickedId) : { agency: [], client: [] }), [catalog, player, pickedId])
  // The map needs a reach figure; every orbit is drawn so the whole system is visible.
  const mapMission = useMemo(() => catalog.missions[0] && ({ ...catalog.missions[0], requires: { ...catalog.missions[0].requires, max_orbit: 8 } }), [catalog.missions])
  const moons = body ? catalog.targets.filter(t => MOON_PARENTS[t.id] === body.id && lit.has(t.id)) : []
  const parent = body && MOON_PARENTS[body.id] ? catalog.targets.find(t => t.id === MOON_PARENTS[body.id]) : null

  const row = (m: Mission, kind: 'agency' | 'client') => {
    const client = m.client ? catalog.clients[m.client] : null
    return (
      <li key={m.id}>
        <button type="button" className={styles.mission} data-kind={kind} data-testid={`solar-mission-${m.id}`} onClick={() => body && onAccept(m.id, body.id)}>
          <span className={styles.missionTitle}>{m.title}</span>
          <span className={styles.missionMeta}>{kind === 'client' ? (client?.name ?? 'Client') : 'Your agency'}</span>
          <span className={styles.missionPay}>{m.payout.francs > 0 ? formatCurrency(m.payout.francs, { compact: true }) : 'Kept'}</span>
        </button>
      </li>
    )
  }

  return (
    <div className={styles.screen} data-testid="solar-map">
      <header className={styles.head}>
        <h1>Solar system</h1>
        <button type="button" className={styles.base} data-testid="solar-map-base" onClick={onBase}>Base</button>
      </header>
      <div className={styles.field} data-testid="solar-map-field">
        {mapMission && <PixiGalaxyMap mission={mapMission} targets={mapTargets} compatibleIds={mapLit} pickedId={pickedId ?? ''} onPick={setPickedId} />}
      </div>
      <section className={styles.panel} aria-label={body ? `Missions at ${body.name}` : 'Choose a place'}>
        {body ? (
          <>
            <h2 data-testid="solar-map-place">{body.name}<small>{body.type === 'asteroid' ? 'Asteroid' : MOON_PARENTS[body.id] ? 'Moon' : 'Planet'}{parent ? ` of ${parent.name}` : ''}</small></h2>
            <p className={styles.brief}>{body.brief}</p>
            {moons.length > 0 && (
              <p className={styles.moons}>Moons: {moons.map(m => <button key={m.id} type="button" onClick={() => setPickedId(m.id)}>{m.name}</button>)}</p>
            )}
            {parent && <p className={styles.moons}><button type="button" onClick={() => setPickedId(parent.id)}>Back to {parent.name}</button></p>}
            <div className={styles.group} data-testid="solar-agency">
              <h3>Agency missions</h3>
              <ul>{here.agency.map(m => row(m, 'agency'))}</ul>
              {here.agency.length === 0 && <p className={styles.none}>No agency work here yet.</p>}
            </div>
            <div className={styles.group} data-testid="solar-client">
              <h3>Client missions</h3>
              <ul>{here.client.map(m => row(m, 'client'))}</ul>
              {here.client.length === 0 && <p className={styles.none}>No client orders for this place.</p>}
            </div>
          </>
        ) : (
          <p className={styles.none}>Nothing in reach has a mission yet. Fly from the Base to open the system up.</p>
        )}
      </section>
    </div>
  )
}
