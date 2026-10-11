'use client'

import { UI_ZONES } from '@/lib/ui-zones'
import { SCENE_NAMES } from '@/lib/ui-strings'

type BaseDockProps = {
  onSwitchOperation: () => void
  onBuild: () => void
  onHub: () => void
}

/** Same three tiles as `shared/layout/base-hud-zones.json` bottom-nav. */
export const BASE_DOCK_CONTROLS = ['switch', 'build', 'hub'] as const
export const BASE_DOCK_GAP = 8
export const BASE_DOCK_PADDING = 6

const CONTROL_STYLE = {
  minHeight: 44,
  background: 'var(--hub-chalk-soft)',
  border: '4px solid var(--hub-chalk)',
  borderRadius: 14,
  padding: '8px 12px',
  fontFamily: 'var(--ln-font-display)',
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--hub-chalk)',
  cursor: 'pointer',
  boxShadow: '0 4px 16px color-mix(in srgb, var(--hub-chalk) 25%, transparent)',
}

/** Visible dock controls. Scene names stay in the accessibility label only. */
export const BASE_DOCK_LABELS = ['« »', 'Build', 'Hub'] as const

/** The home scene's only dock: switch operation, Build, and Hub. */
export function BaseDock({ onSwitchOperation, onBuild, onHub }: BaseDockProps) {
  return (
    <nav
      aria-label={`${SCENE_NAMES.base} dock`}
      data-ui-zone={UI_ZONES.bottomNav}
      data-testid="base-dock"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BASE_DOCK_CONTROLS.length}, minmax(0, 1fr))`,
        gap: BASE_DOCK_GAP,
        padding: BASE_DOCK_PADDING,
      }}
    >
      <button type="button" style={CONTROL_STYLE} data-testid="hub-switch-operation" onClick={onSwitchOperation} aria-label="Switch operation">{BASE_DOCK_LABELS[0]}</button>
      <button type="button" style={CONTROL_STYLE} data-testid="hub-build-btn" data-beacon="hub-build-btn" onClick={onBuild}>{BASE_DOCK_LABELS[1]}</button>
      <button type="button" style={CONTROL_STYLE} data-testid="hub-btn" onClick={onHub}>{BASE_DOCK_LABELS[2]}</button>
    </nav>
  )
}
