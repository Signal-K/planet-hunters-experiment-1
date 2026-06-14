'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import type { Mission, Target, MineralMeta } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'
import MiningCanvas from './MiningCanvas'

export default function MiningScreen({ mission, target, onComplete, onBack, minerals }: {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
  minerals: Record<string, MineralMeta>
}) {
  const cargoRef = useRef<Record<string, number>>({})
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const fireRef = useRef<(() => void) | null>(null)

  const orderFilled = Object.entries(mission.requires.minerals).every(
    ([id, amount]) => (cargoRef.current[id] ?? 0) >= amount
  )

  const collectMineral = useCallback((mineral: string) => {
    cargoRef.current = {
      ...cargoRef.current,
      [mineral]: (cargoRef.current[mineral] ?? 0) + 1,
    }
    setCargo(cargoRef.current)
  }, [])

  function fireLaser() {
    fireRef.current?.()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'KeyF') {
        e.preventDefault()
        fireLaser()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

        <MiningCanvas
          minerals={target.minerals}
          mineralMeta={minerals}
          onCollect={collectMineral}
          fireRef={fireRef}
        />

        <div className="mining-ship" data-testid="mining-ship">
          <svg width="40" height="50" viewBox="0 0 40 50">
            <polygon points="0,25 40,0 40,50" fill="#6cc2ff" stroke="#2d8de0" strokeWidth="2" />
            <rect x="10" y="18" width="8" height="14" rx="2" fill="#06121f" />
            <rect x="22" y="18" width="8" height="14" rx="2" fill="#06121f" />
          </svg>
        </div>
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
            {orderFilled ? 'RETURN HOME' : 'FILL ORDER TO RETURN'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}
