'use client'

import { useMemo, useState } from 'react'
import type { Mission, Target } from '@/lib/data'
import { MINERAL_META } from '@/lib/data'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { PrimaryBtn } from '@/components/ui/Button'

export default function MiningScreen({ mission, target, onComplete, onBack }: {
  mission: Mission
  target: Target
  onComplete: (cargo: Record<string, number>) => void
  onBack: () => void
}) {
  const [cargo, setCargo] = useState<Record<string, number>>({})
  const ore = useMemo(() => Array.from({ length: 12 }, (_, index) => ({
    id: index,
    mineral: target.minerals[index % target.minerals.length],
    x: 10 + ((index * 31) % 78),
    y: 24 + ((index * 23) % 54),
  })), [target.minerals])
  const [mined, setMined] = useState<Record<number, boolean>>({})
  const orderFilled = Object.entries(mission.requires.minerals).every(([id, amount]) => (cargo[id] ?? 0) >= amount)

  function mine(id: number, mineral: string) {
    if (mined[id]) return
    setMined(value => ({ ...value, [id]: true }))
    setCargo(value => ({ ...value, [mineral]: (value[mineral] ?? 0) + 2 }))
  }

  return (
    <div className="game-screen mining-screen">
      <TopBar eyebrow={`${target.name.toUpperCase()} · SURFACE`} title="Mining Run" onBack={onBack} />
      <div className="asteroid-field">
        {ore.map(node => {
          const meta = MINERAL_META[node.mineral]
          return (
            <button
              key={node.id}
              aria-label={`Mine ${meta.name}`}
              className="ore-node"
              disabled={mined[node.id]}
              onClick={() => mine(node.id, node.mineral)}
              style={{ left: `${node.x}%`, top: `${node.y}%`, '--ore': meta.color } as React.CSSProperties}
            ><span>{meta.sym}</span></button>
          )
        })}
      </div>
      <div className="mining-order">
        <Panel accent={orderFilled ? 'var(--ln-ok)' : 'var(--ln-amber)'}>
          <div className="order-heading"><span>Contract Order</span><strong>{orderFilled ? 'Filled' : 'Mining'}</strong></div>
          {Object.entries(mission.requires.minerals).map(([id, amount]) => (
            <div className="order-row" key={id}>
              <span>{MINERAL_META[id].name}</span>
              <strong>{Math.min(cargo[id] ?? 0, amount)} / {amount}</strong>
            </div>
          ))}
        </Panel>
        <PrimaryBtn kind="amber" disabled={!orderFilled} onClick={() => onComplete(cargo)}>Return Home</PrimaryBtn>
      </div>
    </div>
  )
}
