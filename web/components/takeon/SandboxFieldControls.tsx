'use client'

import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { Compass, Hammer, Map as MapIcon, RotateCcw, Share2, Sprout, Trash2, X } from 'lucide-react'
import type { Player } from '@/lib/game-types'
import {
  MINERAL_META,
  SANDBOX_STRUCTURE_RECIPES,
  biomeIdsForTarget,
  canSeedBiosphere,
  habitabilityForTarget,
  LIFE_STAGE_LABELS,
  type CraftingRecipe,
  type LifeStage,
  type SurfaceTarget,
} from '@/lib/data'
import type { CreationSnapshot } from '@/lib/data/community'
import {
  factoryRecipes,
  fieldBuildAffordability,
  fieldHasStructure,
  lifeGateFor,
} from '@/lib/systems/SandboxSystem'
import { placementHint } from '@/lib/takeon/sandbox'
import { formatCurrency } from '@/lib/format'
import type { TakeOnFieldOrder, TakeOnMountHandle } from './TakeOnMount'
import styles from './SandboxFieldControls.module.css'

/** How often the panel re-reads rover state from the engine handle. */
const POLL_MS = 250

export interface SandboxFieldControlsProps {
  player: Player
  handle: RefObject<TakeOnMountHandle | null>
  /** Landnam target the field sits on; enables the biosphere control and names the world. */
  target?: SurfaceTarget
  targetId: string
  siteId?: string
  lifeStage?: LifeStage
  /** Called after a build was placed by the engine and needs charging by the host. */
  onFabricate?: (recipeId: string) => void
  onSeedBiosphere?: () => void
  /**
   * Share the current field as a read-only creation snapshot (SSL-320). The
   * snapshot is built here from the engine handle; the host publishes it.
   */
  onShare?: (snapshot: CreationSnapshot) => void
  /** Optional hint the host fills when a build could not be charged. */
  notice?: string | null
}

interface HandleSnapshot {
  order: TakeOnFieldOrder | null
  routeSteps: number
  faced: { id: string; type: string } | null
  view: string | null
}

function readHandle(handle: RefObject<TakeOnMountHandle | null>): HandleSnapshot {
  const h = handle.current
  if (!h) return { order: null, routeSteps: 0, faced: null, view: null }
  return {
    order: h.currentOrder(),
    routeSteps: h.plannedRouteLength(),
    faced: h.facedStructure(),
    view: h.view(),
  }
}

function orderLabel(order: TakeOnFieldOrder | null, routeSteps: number): string {
  if (!order) return routeSteps > 0 ? `${routeSteps} SAFE STEPS PLANNED` : 'IDLE · TAP TERRAIN TO DRIVE'
  const at = `${order.pos.x}, ${order.pos.y}`
  return order.type === 'mine' ? `DRIVING TO MINE AT ${at}` : `DRIVING TO ${at} · ${routeSteps} STEPS`
}

function CostChips({ recipe }: { recipe: CraftingRecipe }) {
  return (
    <span className={styles.costs}>
      {recipe.costFrancs > 0 && <span className={styles.chip}>{formatCurrency(recipe.costFrancs, { compact: true })}</span>}
      {Object.entries(recipe.costMinerals).map(([id, amount]) => (
        <span className={styles.chip} key={id}>
          <span className={styles.dot} style={{ background: MINERAL_META[id]?.color ?? 'var(--ln-text-muted)' }} />
          {amount} {MINERAL_META[id]?.sym ?? id}
        </span>
      ))}
      {Object.entries(recipe.costRefined ?? {}).map(([id, amount]) => (
        <span className={styles.chip} key={id}>{amount} {id.replace('refined-', '').toUpperCase()}</span>
      ))}
    </span>
  )
}

export default function SandboxFieldControls({
  player,
  handle,
  target,
  targetId,
  siteId,
  lifeStage = 'dormant',
  onFabricate,
  onSeedBiosphere,
  onShare,
  notice,
}: SandboxFieldControlsProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<HandleSnapshot>({ order: null, routeSteps: 0, faced: null, view: null })
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setSnapshot(readHandle(handle)), POLL_MS)
    return () => window.clearInterval(timer)
  }, [handle])

  const recipes = useMemo(() => SANDBOX_STRUCTURE_RECIPES.filter(r => r.takeonType), [])
  const selectedRecipe = recipes.find(r => r.id === selected) ?? null
  const affordability = selectedRecipe ? fieldBuildAffordability(player, selectedRecipe, siteId) : null
  const hasFactory = fieldHasStructure(player, targetId, 'factory')
  const fabRecipes = useMemo(() => factoryRecipes(), [])
  const habitability = target ? habitabilityForTarget(target).habitability : 'sterile'
  const seedable = target ? canSeedBiosphere(lifeGateFor(player), habitability) : false
  const alreadySeeded = !!player.biosphereSeeds?.[targetId]

  const build = useCallback(() => {
    if (!selectedRecipe?.takeonType || !affordability?.ok) return
    handle.current?.build(selectedRecipe.takeonType)
    setSnapshot(readHandle(handle))
  }, [affordability?.ok, handle, selectedRecipe])

  const facedRecipe = snapshot.faced ? recipes.find(r => r.takeonType === snapshot.faced?.type) : null

  const share = useCallback(() => {
    if (!onShare) return
    const structures = (handle.current?.structures() ?? []).map(s => ({ type: s.type, x: s.x, y: s.y, facing: s.facing }))
    onShare({
      bodyId: targetId,
      structures,
      biomes: target ? biomeIdsForTarget(target, lifeStage) : [],
      lifeStage,
    })
  }, [handle, lifeStage, onShare, target, targetId])
  const structureCount = handle.current?.structures().length ?? 0

  return (
    <div className={styles.panel} data-testid="sandbox-field-controls">
      <div className={styles.readouts}>
        <div className={styles.readout} data-testid="sandbox-order-readout">
          <span className={styles.eyebrow}>ROVER</span>
          <strong>{orderLabel(snapshot.order, snapshot.routeSteps)}</strong>
        </div>
        <div className={styles.readout} data-testid="sandbox-placement-readout">
          <span className={styles.eyebrow}>PLACING</span>
          <strong>{selectedRecipe ? selectedRecipe.name.toUpperCase() : 'NOTHING SELECTED'}</strong>
        </div>
        <div className={styles.readout} data-testid="sandbox-faced-readout">
          <span className={styles.eyebrow}>AHEAD</span>
          <strong>{facedRecipe ? facedRecipe.name.toUpperCase() : snapshot.faced ? snapshot.faced.type.toUpperCase() : 'OPEN GROUND'}</strong>
        </div>
      </div>

      <p className={styles.hint} data-testid="sandbox-placement-hint">
        {notice ?? placementHint(selectedRecipe?.takeonType ?? null)}
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => setPaletteOpen(open => !open)}
          aria-expanded={paletteOpen}
          data-testid="sandbox-palette-toggle"
        >
          <Hammer size={14} /> {paletteOpen ? 'HIDE STRUCTURES' : 'STRUCTURES'}
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.actionPrimary}`}
          disabled={!selectedRecipe || !affordability?.ok}
          onClick={build}
          data-testid="sandbox-build"
        >
          <Hammer size={14} /> BUILD
        </button>
        <button
          type="button"
          className={styles.action}
          disabled={!snapshot.order && snapshot.routeSteps === 0}
          onClick={() => { handle.current?.cancelOrder(); setSnapshot(readHandle(handle)) }}
          data-testid="sandbox-cancel-route"
        >
          <X size={14} /> CANCEL ROUTE
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={() => handle.current?.rotateView()}
          data-testid="sandbox-rotate-view"
        >
          <Compass size={14} /> ROTATE VIEW
        </button>
        <button
          type="button"
          className={styles.action}
          onClick={() => { handle.current?.toggleView(); setSnapshot(readHandle(handle)) }}
          data-testid="sandbox-toggle-view"
        >
          <MapIcon size={14} /> {snapshot.view === 'iso' ? 'MAP VIEW' : 'DIORAMA VIEW'}
        </button>
        {onShare && (
          <button
            type="button"
            className={styles.action}
            disabled={structureCount === 0}
            onClick={share}
            title="Share a read-only snapshot of this field with your friends"
            data-testid="sandbox-share"
          >
            <Share2 size={14} /> SHARE FIELD
          </button>
        )}
        {snapshot.faced && (
          <>
            <button
              type="button"
              className={styles.action}
              onClick={() => { if (snapshot.faced) handle.current?.rotateStructure(snapshot.faced.id) }}
              data-testid="sandbox-rotate-structure"
            >
              <RotateCcw size={14} /> ROTATE AHEAD
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.actionDanger}`}
              onClick={() => { if (snapshot.faced) handle.current?.demolish(snapshot.faced.id) }}
              data-testid="sandbox-demolish"
            >
              <Trash2 size={14} /> DEMOLISH AHEAD
            </button>
          </>
        )}
      </div>

      {paletteOpen && (
        <div className={styles.palette} role="listbox" aria-label="Structures to build" data-testid="sandbox-palette">
          {recipes.map(recipe => {
            const can = fieldBuildAffordability(player, recipe, siteId)
            const isSelected = recipe.id === selected
            return (
              <button
                type="button"
                key={recipe.id}
                role="option"
                aria-selected={isSelected}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                data-affordable={can.ok}
                onClick={() => setSelected(isSelected ? null : recipe.id)}
                data-testid={`sandbox-recipe-${recipe.id}`}
              >
                <span className={styles.cardName}>{recipe.name}</span>
                <CostChips recipe={recipe} />
                <span className={styles.cardState}>{can.ok ? 'READY' : 'SHORT'}</span>
              </button>
            )
          })}
        </div>
      )}

      {selectedRecipe && affordability && !affordability.ok && (
        <p className={styles.short} data-testid="sandbox-short">
          Short:{' '}
          {[
            affordability.francsShort > 0 ? formatCurrency(affordability.francsShort, { compact: true }) : null,
            ...Object.entries(affordability.mineralsShort).map(([id, n]) => `${n} ${MINERAL_META[id]?.sym ?? id}`),
          ].filter(Boolean).join(' · ')}
        </p>
      )}

      {hasFactory && onFabricate && (
        <div className={styles.section} data-testid="sandbox-factory">
          <span className={styles.eyebrow}>FIELD FACTORY</span>
          <div className={styles.palette}>
            {fabRecipes.map(recipe => {
              const can = fieldBuildAffordability(player, recipe, siteId)
              return (
                <button
                  type="button"
                  key={recipe.id}
                  className={styles.card}
                  data-affordable={can.ok}
                  disabled={!can.ok}
                  onClick={() => onFabricate(recipe.id)}
                  data-testid={`sandbox-fab-${recipe.id}`}
                >
                  <span className={styles.cardName}>{recipe.name}</span>
                  <CostChips recipe={recipe} />
                  <span className={styles.cardState}>{can.ok ? 'FABRICATE' : 'SHORT'}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {target && habitability !== 'sterile' && onSeedBiosphere && (
        <div className={styles.section} data-testid="sandbox-biosphere">
          <span className={styles.eyebrow}>BIOSPHERE · {LIFE_STAGE_LABELS[lifeStage].toUpperCase()}</span>
          <button
            type="button"
            className={styles.action}
            disabled={!seedable || alreadySeeded}
            onClick={onSeedBiosphere}
            data-testid="sandbox-seed-biosphere"
          >
            <Sprout size={14} /> {alreadySeeded ? 'SEEDED' : seedable ? 'SEED BIOSPHERE' : 'LOCKED · SKILL TREE + SETI'}
          </button>
        </div>
      )}
    </div>
  )
}
