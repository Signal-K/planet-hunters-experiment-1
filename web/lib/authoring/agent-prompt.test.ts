import { describe, expect, it } from 'vitest'
import { buildAgentPrompt } from './agent-prompt.ts'
import type { FeedbackDoc, SceneDoc } from './docs.ts'

const scene: SceneDoc = {
  format: 1, id: 'hangar', type: 'build', name: 'Hangar', runtime: { surface: 'dom' }, preview: { route: 'hangar', state: 'ui-hangar-assembly' },
  objects: [{ id: 'parts-tray', kind: 'panel', rect: { x: 0.05, y: 0.7, w: 0.9, h: 0.25 }, status: 'proposed', note: 'Parts along the bottom' }, { id: 'hud', kind: 'ui', slot: 'hud' }],
}
const feedback: FeedbackDoc = {
  format: 1, scene: 'hangar', mode: 'explore', status: 'open', direction: 'Calm and tactile, like a workshop',
  pins: [
    { kind: 'wrong', note: 'The room slots look like web form fields', at: { x: 0.5, y: 0.62 }, viewport: 'ph', state: 'ui-hangar-assembly' },
    { kind: 'wrong', note: 'Too much text', resolved: true },
    { kind: 'keep', note: 'The ship in the middle is right', object: 'ship' },
  ],
  inspiration: [{ source: 'Dorfromantik', likes: 'soft shadows and the way pieces click into place', image: 'hangar-1.jpg' }],
}

describe('buildAgentPrompt', () => {
  const text = buildAgentPrompt({ scene, feedback, notes: { always: 'Cards are allowed here.', next: 'Start with the room slots' }, origin: 'http://localhost:4320', state: 'ui-hangar-assembly' })

  it('says which scene, how to open it and what to read', () => {
    expect(text).toContain('Work on the Landnam scene "hangar" (Hangar), scene type build.')
    expect(text).toContain('http://localhost:4320/game/studio?scene=hangar&state=ui-hangar-assembly')
    expect(text).toContain('shared/authoring/feedback/hangar.toml')
  })

  it('asks for different directions, not a repeat, when the author does not know what will look good', () => {
    expect(text).toContain('Mode explore:')
    expect(text).toContain('do not iterate on what I already rejected')
    expect(text).toContain('at least two genuinely different directions')
  })

  it('keeps every wrong pin as a standing rule with where it was placed', () => {
    expect(text).toContain('1. The room slots look like web form fields [phone portrait 390x844, fixture ui-hangar-assembly, at 50% across, 62% down]')
    expect(text).toContain('2. Too much text (resolved)')
    expect(text).toContain('never bring them back, even once resolved')
  })

  it('lists what to keep, the inspiration with its image, direction, brief and drawn proposals', () => {
    expect(text).toContain('1. The ship in the middle is right [object ship]')
    expect(text).toContain('Dorfromantik. what I like: soft shadows and the way pieces click into place. image: shared/authoring/feedback/refs/hangar-1.jpg')
    expect(text).toContain('Direction: Calm and tactile, like a workshop')
    expect(text).toContain('Brief for this pass: Start with the room slots')
    expect(text).toContain('- parts-tray (panel) at x 0.05, y 0.7, 0.9 wide, 0.25 tall: Parts along the bottom')
    expect(text).not.toContain('- hud (ui)')
  })

  it('defaults to fix mode and omits empty sections', () => {
    const plain = buildAgentPrompt({ scene: { ...scene, objects: [] }, feedback: null, notes: { always: '', next: '' }, origin: 'http://x' })
    expect(plain).toContain('Mode fix: I know what to do.')
    expect(plain).not.toContain('Wrong (')
    expect(plain).not.toContain('Inspiration')
    expect(plain).not.toContain('feedback/hangar.toml (pins')
  })
})
