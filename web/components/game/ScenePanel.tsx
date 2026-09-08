'use client'

import React from 'react'

export type SceneAmbient = 'industrial' | 'survey' | 'utility'

interface ScenePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Ambient light color for the backdrop (ZenNotes
   * landnam-scene-panel-background-direction-2026-07-31, principle 2: mood
   * comes from what light a scene is lit by, not one flat shell hue).
   * Pick the closest match until the screen has real Blender/Pixi art:
   * `industrial` — console/machinery glow (Refinery, workshops)
   * `survey` — cool scan/observation light (Scan Station, discovery consoles)
   * `utility` — neutral engineering-bay light (menus, selection screens)
   */
  ambient: SceneAmbient
  /** A real rendered background (e.g. `HubWorldBackground`/`TerrainScene`, a
   * future Pixi canvas). Omit to use the ambient gradient alone. */
  scene?: React.ReactNode
  children: React.ReactNode
}

/**
 * The scene-panel model (KES-61, generalized in KES-289): screen content
 * sits over a lit backdrop, never a flat `--ln-panel`/`--ln-bg` fill.
 * Replaces hand-rolling a one-off `.ln-scene-<screen>` CSS class per screen.
 */
export default function ScenePanel({ ambient, scene, children, className, ...rest }: ScenePanelProps) {
  const classes = ['ln-scene-panel', `ln-scene-panel--${ambient}`, className].filter(Boolean).join(' ')
  return (
    <div className={classes} {...rest}>
      {scene && <div className="ln-scene-panel-backdrop" aria-hidden="true">{scene}</div>}
      {children}
    </div>
  )
}
