// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it } from 'vitest'
import { STATIC_CATALOG, type Catalog } from '@/lib/catalog'
import { DEFAULT_STATE } from '@/lib/game-state'
import type { GameState } from '@/lib/game-types'
import { useRuntimeCatalog } from './useRuntimeCatalog'

it('reuses the catalog for shots and currency, but invalidates instrument and resource changes', async () => {
  const root = createRoot(document.createElement('div'))
  let result: Catalog = STATIC_CATALOG
  function Harness({ state }: { state: GameState }) { result = useRuntimeCatalog(STATIC_CATALOG, state); return null }
  let state = { ...DEFAULT_STATE, player: { ...DEFAULT_STATE.player, freeOperations: true } }
  const render = () => act(async () => root.render(<Harness state={state} />))
  try {
    await render()
    const initial = result
    for (let i = 0; i < 100; i++) {
      state = { ...state, player: { ...state.player, francs: i, miningLaserCharges: i } }
      await render()
      expect(result).toBe(initial)
    }
    state = { ...state, player: { ...state.player, saturnImagerLaunchedAt: 1 } }
    await render()
    expect(result).not.toBe(initial)
    expect(result.missions.some(m => m.id === 'story-saturn-imager-launch')).toBe(false)
    const beforeFocus = result
    state = { ...state, player: { ...state.player, resourceFocus: { label: 'Refinery', minerals: { iron: 5 } } } }
    await render()
    expect(result).not.toBe(beforeFocus)
    const beforeStash = result
    state = { ...state, player: { ...state.player, stash: { ...state.player.stash, iron: 5 } } }
    await render()
    expect(result).not.toBe(beforeStash)
  } finally { await act(async () => root.unmount()) }
})
