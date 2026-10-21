import { describe, expect, it } from 'vitest'
import { buildObjectTree, clampRect, descendantsOf, dragRect, objectRect, snap, uniqueId } from './studio-model.ts'
import type { SceneObject } from './docs.ts'

const slots = { hud: { x: 0.02, y: 0.02, w: 0.96, h: 0.1 }, world: { x: 0, y: 0, w: 1, h: 1 } }
const objects: SceneObject[] = [
  { id: 'world', kind: 'world', slot: 'world' },
  { id: 'sites', kind: 'collection', parent: 'world' },
  { id: 'hall', kind: 'structure', parent: 'sites' },
  { id: 'hud', kind: 'ui', slot: 'hud' },
  { id: 'free', kind: 'ui', rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 } },
  { id: 'orphan', kind: 'ui', parent: 'gone' },
]

describe('studio model', () => {
  it('draws an object by its rect, else its slot, and nothing for the world slot', () => {
    expect(objectRect(objects[4], slots)).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.1 })
    expect(objectRect(objects[3], slots)).toEqual(slots.hud)
    expect(objectRect(objects[0], slots)).toBeNull()
    expect(objectRect(objects[1], slots)).toBeNull()
  })

  it('builds the hierarchy from parent links in file order and keeps orphans visible', () => {
    const tree = buildObjectTree(objects)
    expect(tree.map(n => n.object.id)).toEqual(['world', 'hud', 'free', 'orphan'])
    expect(tree[0].children[0].children[0].object.id).toBe('hall')
    expect(tree[0].children[0].children[0].index).toBe(2)
    expect(descendantsOf(objects, 'world')).toEqual(['sites', 'hall'])
  })

  it('makes unique ids', () => {
    expect(uniqueId('ui', objects)).toBe('ui-1')
    expect(uniqueId('ui', [...objects, { id: 'ui-1', kind: 'ui' }, { id: 'ui-2', kind: 'ui' }])).toBe('ui-3')
  })

  it('snaps to short numbers and keeps a rect inside the scene', () => {
    expect(snap(0.1234)).toBe(0.125)
    expect(snap(0.3)).toBe(0.3)
    expect(clampRect({ x: 0.9, y: -0.2, w: 0.3, h: 0.1 })).toEqual({ x: 0.7, y: 0, w: 0.3, h: 0.1 })
    expect(clampRect({ x: 0.5, y: 0.5, w: 0, h: 5 })).toEqual({ x: 0.5, y: 0, w: 0.02, h: 1 })
  })

  it('moves the body and resizes from a corner', () => {
    const start = { x: 0.2, y: 0.2, w: 0.3, h: 0.2 }
    expect(dragRect(start, null, 0.1, -0.05)).toEqual({ x: 0.3, y: 0.15, w: 0.3, h: 0.2 })
    expect(dragRect(start, 'se', 0.1, 0.1)).toEqual({ x: 0.2, y: 0.2, w: 0.4, h: 0.3 })
    expect(dragRect(start, 'nw', 0.1, 0.05)).toEqual({ x: 0.3, y: 0.25, w: 0.2, h: 0.15 })
    expect(dragRect(start, 'nw', 0.5, 0.5)).toEqual({ x: 0.48, y: 0.38, w: 0.02, h: 0.02 })
    expect(dragRect(start, 'se', 2, 2)).toEqual({ x: 0.2, y: 0.2, w: 0.8, h: 0.8 })
  })
})
