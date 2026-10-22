// Things and presets (SSL-641): the part of a scene script that answers "what could be here?".
// Pure logic with no React and no network, shared by the Studio and its tests.
import { fillPlaceholders, mergeState } from '../sandbox.ts'
import type { ScenePreset, Thing } from './docs.ts'

/** Which things are on, and where each slider sits. */
export interface Selection {
  on: string[]
  values: Record<string, number>
}

/** What a selection means to the stage: state layered over the entry fixture, and URL knobs. */
export interface Setup {
  state: Record<string, unknown>
  query: Record<string, string>
}

export const defaultSelection = (things: Thing[]): Selection => ({
  on: things.filter(thing => thing.default && !thing.range).map(thing => thing.id),
  values: Object.fromEntries(things.filter(thing => thing.range).map(thing => [thing.id, thing.range!.value])),
})

/** A preset that lists things is exactly those things. One that does not is the scene's starting point. */
export function presetSelection(preset: ScenePreset, things: Thing[]): Selection {
  const start = defaultSelection(things)
  return { on: preset.things ? preset.things.filter(id => things.some(t => t.id === id && !t.range)) : start.on, values: { ...start.values, ...preset.values } }
}

export function toggleThing(selection: Selection, things: Thing[], id: string): Selection {
  const thing = things.find(t => t.id === id)
  if (!thing || thing.range) return selection
  if (selection.on.includes(id)) return { ...selection, on: selection.on.filter(other => other !== id) }
  const rivals = thing.exclusive ? things.filter(t => t.exclusive === thing.exclusive).map(t => t.id) : []
  return { ...selection, on: [...selection.on.filter(other => !rivals.includes(other)), id] }
}

export const setValue = (selection: Selection, id: string, value: number): Selection => ({ ...selection, values: { ...selection.values, [id]: value } })

export function sameSelection(a: Selection, b: Selection, things: Thing[]): boolean {
  const ids = (s: Selection) => [...s.on].sort().join(',')
  if (ids(a) !== ids(b)) return false
  return things.filter(t => t.range).every(t => (a.values[t.id] ?? t.range!.value) === (b.values[t.id] ?? t.range!.value))
}

export function composeSetup(things: Thing[], selection: Selection): Setup {
  let state: Record<string, unknown> = {}
  const query: Record<string, string[]> = {}
  for (const thing of things) {
    if (!thing.range && !selection.on.includes(thing.id)) continue
    if (thing.state) {
      const value = thing.range ? selection.values[thing.id] ?? thing.range.value : 0
      state = mergeState(state, thing.range ? fillPlaceholders(thing.state, { value, rest: thing.range.max - value }) : thing.state)
    }
    for (const [key, entry] of Object.entries(thing.query ?? {})) {
      const list = (query[key] ??= [])
      if (!list.includes(entry)) list.push(entry)
    }
  }
  return { state, query: Object.fromEntries(Object.entries(query).map(([key, list]) => [key, list.join(',')])) }
}

export interface ThingGroup {
  name: string
  items: Thing[]
}

/** Things under their group headings, in the order the script lists them. */
export function groupThings(things: Thing[]): ThingGroup[] {
  const groups: ThingGroup[] = []
  for (const thing of things) {
    const name = thing.group ?? 'Other'
    const group = groups.find(g => g.name === name) ?? (groups.push({ name, items: [] }), groups[groups.length - 1])
    group.items.push(thing)
  }
  return groups
}

/** The preset a selection equals, if any, so the picker can show its name and the URL can say `preset=`. */
export function matchingPreset(selection: Selection, presets: ScenePreset[], things: Thing[]): ScenePreset | null {
  return presets.find(preset => sameSelection(presetSelection(preset, things), selection, things)) ?? null
}

/** A preset id that is free in this scene, from a name a person typed. */
export function presetId(name: string, taken: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'preset'
  let id = base
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`
  return id
}
