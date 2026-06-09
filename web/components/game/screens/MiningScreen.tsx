'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'

interface OreNode {
  id: number
  mineral: string
  x: number
  hp: number
  maxHp: number
  collected: boolean
}

interface Laser {
  id: number
  y: number
  x: number
}

const LASER_SPEED = 8
const SCROLL_SPEED = 1.2

export default function MiningScreen({ mission, target, onComplete, onBack, minerals }: {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  minerals: Record<string, MineralMeta>
}) {
  const cargoRef = useRef<Record<string, number>>({})
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const [scrollX, setScrollX] = useState(0)
  const [lasers, setLasers] = useState<Laser[]>([])
  const [ores, setOres] = useState<OreNode[]>(() =>
    Array.from({ length: 20 }, (_, i) => {
      const mineral = target.minerals[i % target.minerals.length]
      return {
        id: i,
        mineral,
        x: 100 + i * 180 + Math.random() * 60,
        hp: 3 + Math.floor(Math.random() * 3),
        maxHp: 3 + Math.floor(Math.random() * 3),
        collected: false,
      }
    })
  )
  const [firing, setFiring] = useState(false)
  const laserIdRef = useRef(0)
  const gameRef = useRef<number>(0)
  const [returnText, setReturnText] = useState('')

  const orderFilled = Object.entries(mission.requires.minerals).every(
    ([id, amount]) => (cargoRef.current[id] ?? 0) >= amount
  )

  useEffect(() => {
    if (orderFilled) setReturnText('RETURN HOME')
  }, [orderFilled])

  const collectMineral = useCallback((mineral: string) => {
    cargoRef.current = {
      ...cargoRef.current,
      [mineral]: (cargoRef.current[mineral] ?? 0) + 1,
    }
    setCargo(cargoRef.current)
  }, [])

  useEffect(() => {
    let stopped = false
    let oreHitCounters: Record<number, number> = {}

    function tick() {
      if (stopped) return
      setScrollX(s => s + SCROLL_SPEED)
      setLasers(prev => {
        const active = prev
          .map(l => ({ ...l, x: l.x + LASER_SPEED }))
          .filter(l => l.x < 420)
        return active
      })
      setOres(prev => {
        const next = prev.filter(o => !o.collected)
        next.forEach(ore => {
          ore.x -= SCROLL_SPEED
        })
        if (next.length === 0 || next[next.length - 1].x < 600) {
          const lastX = next.length > 0 ? next[next.length - 1].x : 0
          const mineral = target.minerals[next.length % target.minerals.length]
          next.push({
            id: Date.now() + next.length,
            mineral,
            x: lastX + 180 + Math.random() * 60,
            hp: 3 + Math.floor(Math.random() * 3),
            maxHp: 3 + Math.floor(Math.random() * 3),
            collected: false,
          })
        }
        return next
      })
      gameRef.current = requestAnimationFrame(tick)
    }
    gameRef.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      cancelAnimationFrame(gameRef.current)
    }
  }, [target.minerals])

  useEffect(() => {
    if (lasers.length === 0) return
    setOres(prev => {
      return prev.map(ore => {
        if (ore.collected) return ore
        for (const laser of lasers) {
          if (
            laser.x >= ore.x - 10 &&
            laser.x <= ore.x + 30 &&
            Math.abs(laser.y - 140) < 40
          ) {
            const newHp = ore.hp - 1
            if (newHp <= 0) {
              collectMineral(ore.mineral)
              return { ...ore, collected: true, hp: 0 }
            }
            return { ...ore, hp: newHp }
          }
        }
        return ore
      })
    })
  }, [lasers, collectMineral])

  function fireLaser() {
    const newLaser: Laser = {
      id: laserIdRef.current++,
      y: 140 + (Math.random() - 0.5) * 20,
      x: 50,
    }
    setLasers(prev => [...prev, newLaser])
    setFiring(true)
    setTimeout(() => setFiring(false), 150)
  }

  function handleReturn() {
    if (orderFilled) onComplete(cargoRef.current)
  }

  const totalNeeded = Object.entries(mission.requires.minerals).reduce((sum, [, v]) => sum + v, 0)
  const totalCollected = Object.entries(cargoRef.current).reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="game-screen mining-screen">
      <TopBar eyebrow={`${target.name.toUpperCase()} · SURFACE`} title="Mining Run" onBack={onBack} />

      <div className="mining-viewport">
        <div className="mining-stars" />

        <div className="mining-ship" data-testid="mining-ship">
          <svg width="40" height="50" viewBox="0 0 40 50">
            <polygon points="0,25 40,0 40,50" fill="#6cc2ff" stroke="#2d8de0" strokeWidth="2" />
            <rect x="10" y="18" width="8" height="14" rx="2" fill="#06121f" />
            <rect x="22" y="18" width="8" height="14" rx="2" fill="#06121f" />
          </svg>
        </div>

        {ores.map(ore => {
          if (ore.collected) return null
          const meta = minerals[ore.mineral]
          const hpPct = ore.hp / ore.maxHp
          return (
            <div
              key={ore.id}
              data-testid={`ore-node-${ore.id}`}
              className="ore-deposit"
              style={{
                left: ore.x,
                top: 110 + Math.sin(ore.id * 1.5) * 30,
                '--ore': meta.color,
              } as React.CSSProperties}
            >
              <span className="ore-icon">{meta.sym}</span>
              <div className="ore-hp-bar">
                <div className="ore-hp-fill" style={{ width: `${hpPct * 100}%` }} />
              </div>
            </div>
          )
        })}

        {lasers.map(laser => (
          <div
            key={laser.id}
            className="mining-laser"
            style={{ left: laser.x, top: laser.y }}
          >
            <div className="laser-beam" />
            <div className="laser-core" />
          </div>
        ))}

        {firing && <div className="laser-flash" style={{ top: 130 }} />}
      </div>

      <div className="mining-controls">
        <Panel accent="var(--ln-amber)" variant="compact">
          <div className="mining-stats-row">
            {Object.entries(mission.requires.minerals).map(([id, amount]) => (
              <div className="mineral-stat" key={id}>
                <span className="mineral-stat-icon" style={{ color: minerals[id]?.color }}>
                  {minerals[id]?.sym}
                </span>
                <span className="mineral-stat-count">
                  {Math.min(cargo[id] ?? 0, amount)}/{amount}
                </span>
              </div>
            ))}
            <div className="mineral-stat total-stat">
              <span>Total</span>
              <span>{totalCollected}/{totalNeeded}</span>
            </div>
          </div>
          <div className="mining-progress-track">
            <div
              className="mining-progress-fill"
              style={{ width: `${Math.min(100, (totalCollected / totalNeeded) * 100)}%` }}
            />
          </div>
        </Panel>

        <div className="mining-actions">
          <PrimaryBtn
            kind="cyan"
            disabled={false}
            testId="fire-laser-btn"
            onClick={fireLaser}
          >
            FIRE LASER
          </PrimaryBtn>
          <PrimaryBtn
            kind="amber"
            disabled={!orderFilled}
            testId="return-home-btn"
            onClick={handleReturn}
          >
            {returnText || 'FILL ORDER TO RETURN'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}
