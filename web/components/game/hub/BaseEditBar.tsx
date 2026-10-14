'use client'

import React, { useEffect, useState } from 'react'
import type { Player } from '@/game-context'
import {
  BUILDING_NAMES, MAX_BUILDING_LEVEL, STRUCTURES, buildingLevel, canAffordStructure, isUpgradableBuilding,
  structureAffordabilityGaps, structureUnlocked, upgradeCost,
} from '@/lib/data'
import type { StructureBlueprint, UpgradableBuildingId } from '@/lib/data'
import { mineralSourceHints } from '@/lib/data/mineral-sources'
import { formatCurrency } from '@/lib/format'
import { captureGameEvent } from '@/lib/posthog'
import { structureBuildMs } from '@/lib/systems/HubConstructionSystem'
import styles from './BaseEditBar.module.css'

type Panel = 'none' | 'new' | 'upgrade'

interface BaseEditBarProps {
  player: Player
  /** Empty plot picked on the landscape, or null. */
  plot: number | null
  /** First empty plot, used when New Structure is opened without a marker tap. */
  firstOpenPlot: number | null
  /** Panel to show on mount, when an empty marker opened the editor. */
  openNew: boolean
  onPlotChange: (plot: number | null) => void
  onPreview: (kind: string | null) => void
  onPlace: (kind: string, plot: number) => boolean
  onUpgrade: (id: UpgradableBuildingId) => void
  onDone: () => void
}

function formatCost(structure: StructureBlueprint): string {
  const minerals = Object.entries(structure.costMaterials ?? {}).map(([m, n]) => `${n} ${m}`).join(' · ')
  const francs = structure.cost === 0 ? 'Free' : formatCurrency(structure.cost, { compact: true })
  return minerals ? `${francs} · ${minerals}` : francs
}

/**
 * Base editing controls over the live landscape: one bar with New Structure,
 * Upgrade and Done, and a short tray above it for the current choice.
 */
export function BaseEditBar({ player, plot, firstOpenPlot, openNew, onPlotChange, onPreview, onPlace, onUpgrade, onDone }: BaseEditBarProps) {
  const [panel, setPanel] = useState<Panel>(openNew ? 'new' : 'none')
  const [picked, setPicked] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const gate = {
    refineryUnlocked: player.refineryUnlocked, academyResearched: player.academyResearched, placed: player.placed,
    freeOperations: player.freeOperations, missionsDone: player.missionsDone,
  }
  const catalog = STRUCTURES.filter(s => s.id !== 'garage' && s.id !== 'astronaut-academy' && !player.placed.includes(s.id))
  const upgradable = player.placed.filter(isUpgradableBuilding)
  const selected = catalog.find(c => c.id === picked) ?? null
  const activePlot = plot ?? firstOpenPlot
  const effectiveOpen = panel === 'new' || (plot != null && panel === 'none') ? 'new' : panel

  // The first structure the player can afford is preselected, so a plot tap then Place is two steps.
  const firstSelectable = catalog.find(c => structureUnlocked(c, gate) && canAffordStructure(c, { francs: player.francs, stash: player.stash }))
  useEffect(() => {
    if (effectiveOpen === 'new' && !picked && activePlot != null && firstSelectable) {
      setPicked(firstSelectable.id)
      onPreview(firstSelectable.id)
    }
  }, [effectiveOpen, picked, activePlot, firstSelectable?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function show(next: Panel) {
    setNote(null)
    if (next === panel) { setPanel('none'); setPicked(null); onPreview(null); onPlotChange(null); return }
    setPanel(next)
    setPicked(null)
    onPreview(null)
    if (next === 'new' && plot == null) onPlotChange(firstOpenPlot)
  }

  function pick(c: StructureBlueprint) {
    const unlocked = structureUnlocked(c, gate)
    const affordable = canAffordStructure(c, { francs: player.francs, stash: player.stash })
    if (unlocked && affordable) { setPicked(c.id); setNote(null); onPreview(c.id); return }
    const shortIds = Object.entries(c.costMaterials ?? {}).filter(([id, need]) => (player.stash?.[id] ?? 0) < need).map(([id]) => id)
    const gaps = structureAffordabilityGaps(c, { francs: player.francs, stash: player.stash })
    setNote(`${c.name}: ${!unlocked ? `unlocks at ${c.unlocksAt}` : `need ${gaps.join(', ')}${shortIds.length ? `. ${mineralSourceHints(shortIds)}` : ''}`}`)
    captureGameEvent('structure_placement_blocked', { structure_kind: c.id, reason: !unlocked ? 'locked' : 'unaffordable' })
  }

  function confirm() {
    if (!selected || activePlot == null) return
    if (onPlace(selected.id, activePlot)) { setPicked(null); onPreview(null); return }
    setNote('Placement could not be confirmed. Check requirements and try again.')
  }

  return (
    <div className={styles.root} data-testid="base-edit-bar">
      {effectiveOpen === 'new' && (
        <div className={styles.tray} data-testid="build-structure-strip" data-beacon="build-structure-strip">
          {catalog.length === 0 ? (
            <p className={styles.line}>Every structure is built. Use Upgrade to improve them.</p>
          ) : (
            <>
              <div className={styles.cards}>
                {catalog.map(c => {
                  const can = structureUnlocked(c, gate) && canAffordStructure(c, { francs: player.francs, stash: player.stash })
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.card}
                      data-on={picked === c.id}
                      data-locked={!can}
                      data-testid={`build-structure-card-${c.id}`}
                      onClick={() => pick(c)}
                    >
                      <span className={styles.cardName}>{c.name}</span>
                      <span className={styles.cardCost}>{structureUnlocked(c, gate) ? formatCost(c) : c.unlocksAt}</span>
                    </button>
                  )
                })}
              </div>
              <p className={styles.line} data-testid="build-edit-status">
                {note ?? (selected
                  ? `${selected.name} · ${formatCost(selected)} · builds in ${Math.round(structureBuildMs(selected.id) / 1000)}s`
                  : activePlot == null ? 'No empty plot left.' : 'Pick a structure, then place it on the open plot.')}
              </p>
              {selected && activePlot != null && (
                <button type="button" className={styles.confirm} data-testid="build-place-confirm" data-coach-id="build-confirm" onClick={confirm}>
                  Place {selected.name}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {effectiveOpen === 'upgrade' && (
        <div className={styles.tray} data-testid="base-edit-upgrades">
          {upgradable.length === 0 && <p className={styles.line}>Nothing to upgrade yet.</p>}
          <div className={styles.cards}>
            {upgradable.map(id => {
              const level = buildingLevel(player, id)
              const cost = upgradeCost(id, level)
              return (
                <button key={id} type="button" className={styles.card} data-locked={cost === null} data-testid={`upgrade-${id}`} disabled={cost === null} onClick={() => onUpgrade(id)}>
                  <span className={styles.cardName}>{BUILDING_NAMES[id]}</span>
                  <span className={styles.cardCost}>
                    {cost === null ? `LV ${level}/${MAX_BUILDING_LEVEL} · MAX` : `LV ${level}/${MAX_BUILDING_LEVEL} · ${formatCurrency(cost, { compact: true })}`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className={styles.bar} role="toolbar" aria-label="Edit base">
        <button type="button" className={styles.btn} data-active={effectiveOpen === 'new'} data-testid="edit-new-structure" onClick={() => show('new')}>
          <span aria-hidden="true">+</span> New Structure
        </button>
        <button type="button" className={styles.btn} data-active={effectiveOpen === 'upgrade'} data-testid="edit-upgrade" onClick={() => show('upgrade')}>
          Upgrade
        </button>
        <button type="button" className={`${styles.btn} ${styles.done}`} data-testid="edit-done" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}
