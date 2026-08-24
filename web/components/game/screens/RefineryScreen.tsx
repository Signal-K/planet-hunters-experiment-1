'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import MineralChip from '@/components/game/MineralChip'
import { type RefineryRecipe, REFINERY_RECIPES } from '@/lib/data'
import { UI_ZONES } from '@/lib/ui-zones'
import { formatCurrency } from '@/lib/format'

interface RefineryScreenProps {
  player: { francs: number; stash?: Record<string, number>; refineryQueue: { recipeId: string; startedAt: number; durationMs?: number }[]; refinedGoods: Record<string, number>; staffed?: boolean }
  onBack: () => void
  onStartRefine: (recipeId: string) => void
  onCollect: (recipeId: string) => void
}

export default function RefineryScreen({ player, onBack, onStartRefine, onCollect }: RefineryScreenProps) {
  const [now, setNow] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const stash = player.stash ?? {}

  const running = player.refineryQueue[0] ?? null
  const runningRecipe = running ? REFINERY_RECIPES.find(r => r.id === running.recipeId) : null
  const elapsed = running ? now - running.startedAt : 0
  const durationMs = running && runningRecipe ? (running.durationMs ?? runningRecipe.time * 1000) : 0
  const progressPct = runningRecipe ? Math.min(100, (elapsed / durationMs) * 100) : 0
  const done = runningRecipe ? elapsed >= durationMs : false

  useEffect(() => {
    setNow(Date.now())
    if (!runningRecipe || done) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [done, runningRecipe])

  return (
    <div className="game-screen theme-blueprint">
      <TopBar eyebrow="EARTH BASE · INDUSTRY" title="Refinery" onBack={onBack} />
      <div className="screen-scroll" data-ui-zone={UI_ZONES.screenContent}>
        <Panel accent="var(--ln-amber)" style={{ padding: 12 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: 'var(--ln-text)' }}>On-site Ore Processing</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', marginTop: 4 }}>
            Refine raw minerals into higher-value refined goods. {player.staffed ? 'Crew staffed · cycles 25% faster.' : 'Assign crew at the Academy for faster cycles.'}
          </div>
        </Panel>

        {runningRecipe && (
          <Panel accent={done ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MineralChip meta={runningRecipe.output} variant="avatar" size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: 'var(--ln-text)' }}>{runningRecipe.name} {done && '✓'}</div>
                <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
                  {done ? 'Complete — tap to collect' : `${Math.max(0, Math.ceil((durationMs - elapsed) / 1000))}s remaining`}
                </div>
                {!done && (
                  <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--ln-amber), var(--ln-cyan))', transition: 'width 1s linear' }} />
                  </div>
                )}
              </div>
              {done && (
                <GhostBtn testId="refinery-collect-btn" onClick={() => onCollect(running.recipeId)}>Collect</GhostBtn>
              )}
            </div>
          </Panel>
        )}

        {Object.entries(player.refinedGoods).filter(([, v]) => v > 0).length > 0 && (
          <Panel accent="var(--ln-ok)" style={{ padding: 12, marginTop: 10 }}>
            <div className="order-heading"><span>Finished Goods</span></div>
            {Object.entries(player.refinedGoods).filter(([, v]) => v > 0).map(([id, amount]) => {
              const recipe = REFINERY_RECIPES.find(r => r.id === id)
              if (!recipe) return null
              return (
                <div className="order-row" key={id}>
                  <span><span style={{ color: recipe.output.color }}>■</span> {recipe.output.name} ×{amount}</span>
                  <strong>{formatCurrency(recipe.output.price * amount)}</strong>
                </div>
              )
            })}
          </Panel>
        )}

        <div style={{ marginTop: 16, fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Available Recipes</div>

        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {REFINERY_RECIPES.map(recipe => {
            const hasInput = (stash[recipe.input.mineral] ?? 0) >= recipe.input.amount
            const affordable = player.francs >= recipe.cost
            const canStart = hasInput && affordable && !running
            return (
              <button
                key={recipe.id}
                onClick={() => canStart && setSelected(recipe.id)}
                style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: canStart ? 'pointer' : 'not-allowed', opacity: canStart ? 1 : 0.5 }}
              >
                <Panel accent={selected === recipe.id ? 'var(--ln-amber)' : 'var(--ln-cyan)'} style={{ padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MineralChip meta={recipe.output} variant="avatar" size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: 'var(--ln-text)' }}>{recipe.name}</div>
                      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-dim)' }}>
                        {recipe.input.amount}× {recipe.input.mineral} → {recipe.output.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <StatusPill kind="info" dim>{formatCurrency(recipe.cost)}</StatusPill>
                    <StatusPill kind="amber" dim>{Math.round(recipe.time * (player.staffed ? 0.75 : 1))}s</StatusPill>
                    <span style={{ flex: 1 }} />
                    <StatusPill kind={hasInput ? 'ok' : 'crit'} dim>{hasInput ? `✓` : 'Missing Input'}</StatusPill>
                  </div>
                </Panel>
              </button>
            )
          })}
        </div>
      </div>
      {selected && (
        <div className="sticky-actions" data-ui-zone={UI_ZONES.bottomActions}>
          <PrimaryBtn onClick={() => { onStartRefine(selected); setSelected(null) }}>Start Refinement</PrimaryBtn>
        </div>
      )}
    </div>
  )
}
