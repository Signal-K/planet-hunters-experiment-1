'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import { type RefineryRecipe, REFINERY_RECIPES } from '@/lib/data'

interface RefineryScreenProps {
  player: { francs: number; stash?: Record<string, number>; refineryQueue: { recipeId: string; startedAt: number }[]; refinedGoods: Record<string, number> }
  onBack: () => void
  onStartRefine: (recipeId: string) => void
  onCollect: (recipeId: string) => void
}

export default function RefineryScreen({ player, onBack, onStartRefine, onCollect }: RefineryScreenProps) {
  const now = Date.now()
  const [selected, setSelected] = useState<string | null>(null)
  const stash = player.stash ?? {}

  const running = player.refineryQueue[0] ?? null
  const runningRecipe = running ? REFINERY_RECIPES.find(r => r.id === running.recipeId) : null
  const elapsed = running ? (now - running.startedAt) / 1000 : 0
  const done = runningRecipe ? elapsed >= runningRecipe.time : false

  return (
    <div className="game-screen">
      <TopBar eyebrow="EARTH BASE · INDUSTRY" title="Refinery" onBack={onBack} />
      <div className="screen-scroll">
        <Panel accent="var(--ln-amber)" style={{ padding: 12 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: '#f5a623' }}>On-site Ore Processing</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4 }}>Refine raw minerals into higher-value refined goods.</div>
        </Panel>

        {runningRecipe && (
          <Panel accent={done ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, background: runningRecipe.output.color + '22', border: `1px solid ${runningRecipe.output.color}`, color: runningRecipe.output.color }}>
                {runningRecipe.output.sym}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#e6efff' }}>{runningRecipe.name} {done && '✓'}</div>
                <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#7a8294' }}>
                  {done ? 'Complete — tap to collect' : `${Math.max(0, Math.ceil(runningRecipe.time - elapsed))}s remaining`}
                </div>
              </div>
              {done && (
                <GhostBtn onClick={() => onCollect(running.recipeId)}>Collect</GhostBtn>
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
                  <strong>▲ {(recipe.output.price * amount).toLocaleString()}</strong>
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
                    <div style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, background: recipe.output.color + '22', border: `1px solid ${recipe.output.color}`, color: recipe.output.color }}>
                      {recipe.output.sym}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#e6efff' }}>{recipe.name}</div>
                      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#a9b8ce' }}>
                        {recipe.input.amount}× {recipe.input.mineral} → {recipe.output.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                    <StatusPill kind="info" dim>₣ {recipe.cost.toLocaleString()}</StatusPill>
                    <StatusPill kind="amber" dim>{recipe.time}s</StatusPill>
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
        <div className="sticky-actions">
          <PrimaryBtn onClick={() => { onStartRefine(selected); setSelected(null) }}>Start Refinement</PrimaryBtn>
        </div>
      )}
    </div>
  )
}
