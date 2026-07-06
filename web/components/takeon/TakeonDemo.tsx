'use client'

import { useEffect, useMemo, useState } from 'react'
import { Battery, Database, HardDriveDownload, RotateCcw, Satellite, Truck } from 'lucide-react'
import {
  TAKEON_STORAGE_KEY,
  TAKEON_TILES,
  createInitialTakeonState,
  exploreTile,
  parseTakeonState,
  resetTakeonState,
  serializeTakeonState,
  takeonCapacitySummary,
} from '@/lib/takeon'
import type { TakeonWorldState } from '@/lib/takeon'
import styles from './TakeonDemo.module.css'

export function TakeonDemo() {
  const [state, setState] = useState<TakeonWorldState>(() => createInitialTakeonState())
  const [message, setMessage] = useState('Offline demo ready.')
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const stored = parseTakeonState(window.localStorage.getItem(TAKEON_STORAGE_KEY))
    if (stored) {
      setState(stored)
      setMessage('Restored local Takeon state.')
    }
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (!hasLoaded) return
    window.localStorage.setItem(TAKEON_STORAGE_KEY, serializeTakeonState(state))
  }, [hasLoaded, state])

  const capacity = useMemo(() => takeonCapacitySummary(state), [state])
  const currentTile = TAKEON_TILES.find(tile => tile.id === state.rover.tileId) ?? TAKEON_TILES[0]

  function applyExplore(tileId: string) {
    const result = exploreTile(state, tileId)
    setState(result.state)
    setMessage(result.message)
  }

  function applyReset() {
    const next = resetTakeonState()
    setState(next)
    setMessage('Demo state reset locally.')
  }

  return (
    <main className={styles.shell}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Takeon local module demo</p>
          <h1>{state.target.name}</h1>
        </div>
        <div className={styles.offlinePill}>
          <Satellite size={16} />
          Offline-first
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.surface} aria-label="Takeon exploration map">
          {TAKEON_TILES.map(tile => {
            const explored = state.exploredTileIds.includes(tile.id)
            const active = state.rover.tileId === tile.id
            return (
              <button
                key={tile.id}
                type="button"
                className={[
                  styles.tile,
                  styles[`tile_${tile.kind}`],
                  explored ? styles.explored : '',
                  active ? styles.active : '',
                ].join(' ')}
                style={{ left: `${tile.x}%`, top: `${tile.y}%` }}
                onClick={() => applyExplore(tile.id)}
                aria-label={`Survey ${tile.label}`}
              >
                <span>{tile.label}</span>
              </button>
            )
          })}
          <div className={styles.rover} style={{ left: `${currentTile.x}%`, top: `${currentTile.y}%` }}>
            <Truck size={22} />
          </div>
        </div>

        <aside className={styles.panel}>
          <div>
            <p className={styles.eyebrow}>Rover capacity</p>
            <h2>Explorer-01</h2>
          </div>

          <CapacityRow icon={<Battery size={18} />} label="Energy" value={state.rover.energy} max={state.rover.energyCapacity} pct={capacity.energyPct} />
          <CapacityRow icon={<Database size={18} />} label="Data" value={state.rover.data} max={state.rover.dataCapacity} pct={capacity.dataPct} />
          <CapacityRow icon={<HardDriveDownload size={18} />} label="Samples" value={state.rover.samples} max={state.rover.sampleCapacity} pct={capacity.samplePct} />

          <div className={styles.stats}>
            <div>
              <span>Explored</span>
              <strong>{capacity.exploredPct}%</strong>
            </div>
            <div>
              <span>Banked data</span>
              <strong>{state.bankedData}</strong>
            </div>
            <div>
              <span>Banked samples</span>
              <strong>{state.bankedSamples}</strong>
            </div>
          </div>

          <p className={styles.message}>{message}</p>

          <button type="button" className={styles.returnButton} onClick={() => applyExplore('base')}>
            Return to base
          </button>
          <button type="button" className={styles.resetButton} onClick={applyReset}>
            <RotateCcw size={16} />
            Reset local demo
          </button>

          <div className={styles.log}>
            <p className={styles.eyebrow}>Mission log</p>
            <ul>
              {state.missionLog.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  )
}

function CapacityRow({ icon, label, value, max, pct }: { icon: React.ReactNode; label: string; value: number; max: number; pct: number }) {
  return (
    <div className={styles.capacityRow}>
      <div>
        {icon}
        <span>{label}</span>
        <strong>{value}/{max}</strong>
      </div>
      <meter min={0} max={100} value={pct} />
    </div>
  )
}
