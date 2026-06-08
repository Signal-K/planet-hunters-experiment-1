'use client'

import type { Mission, Target, MineralMeta } from '@/lib/data'
import { sellCargo } from '@/lib/data'
import Panel from '@/components/ui/Panel'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn } from '@/components/ui/Button'

export default function DebriefScreen({ mission, target, cargo, onDone, minerals }: {
  mission: Mission
  target: Target
  cargo: Record<string, number>
  onDone: (total: number, xp: number, affinity: number) => void
  minerals: Record<string, MineralMeta>
}) {
  const subtotal = sellCargo(cargo, minerals)
  const delivered = Object.entries(mission.requires.minerals).every(([id, amount]) => (cargo[id] ?? 0) >= amount)
  const total = subtotal + (delivered ? mission.payout.francs : 0)
  const xp = delivered ? mission.payout.xp + Math.round(subtotal / 8) : Math.round(subtotal / 8)

  return (
    <div className="game-screen debrief-screen">
      <TopBar eyebrow="MISSION COMPLETE" title="Debrief" />
      <div className="screen-scroll debrief-scroll">
        <div className="success-mark">✓</div>
        <h2>Returned</h2>
        <p>From {target.name} · Sol III orbit re-entry</p>
        <Panel accent="var(--ln-amber)">
          <div className="reward-label">Francs Earned</div>
          <div className="reward-total">▲ {total.toLocaleString()}</div>
          <div className="reward-xp">+{xp} XP</div>
        </Panel>
        <Panel accent={delivered ? 'var(--ln-ok)' : 'var(--ln-crit)'}>
          <div className="order-heading"><span>{mission.title}</span><strong>{delivered ? 'Delivered' : 'Incomplete'}</strong></div>
          {Object.entries(cargo).map(([id, amount]) => (
            <div className="order-row" key={id}><span>{minerals[id].name} ×{amount}</span><strong>▲ {(minerals[id].price * amount).toLocaleString()}</strong></div>
          ))}
        </Panel>
      </div>
      <div className="sticky-actions">
        <PrimaryBtn kind="amber" testId="collect-reward-btn" onClick={() => onDone(total, xp, delivered ? mission.payout.affinity : 0)}>Collect Reward</PrimaryBtn>
      </div>
    </div>
  )
}
