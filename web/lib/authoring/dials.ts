// A dial is a one-line list of options that each become a Thing (see scene.schema.json "dial").
// Expansion happens when a scene is read, so the Studio, validation and presets see ordinary things.
import type { SceneState, Thing } from './docs.ts'

export interface Dial {
  label?: string
  pick?: 'one' | 'any'
  query?: string
  state?: string
  default?: string
  options: string[]
}

const title = (id: string): string => id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())

export function expandDials(dials: Record<string, Dial> | undefined): Thing[] {
  if (!dials) return []
  return Object.entries(dials).flatMap(([name, dial]) => dial.options.map((option): Thing => {
    const [id, sent = id] = option.split('=')
    const thing: Thing = { id, label: title(id), group: dial.label ?? title(name) }
    if (dial.pick !== 'any') thing.exclusive = name
    if (dial.default === id) thing.default = true
    if (dial.query) thing.query = { [dial.query]: sent }
    else if (dial.state) thing.state = dial.state.split('.').reduceRight<unknown>((inner, key) => ({ [key]: inner }), sent) as Record<string, unknown>
    return thing
  }))
}

/** Keyed one-line tables (`[parts]`, `[checkpoints]`) become the arrays the rest of the code reads, with the key as `id`. */
const keyed = <T>(table: Record<string, Omit<T, 'id'>> | undefined): T[] => Object.entries(table ?? {}).map(([id, item]) => ({ id, ...item }) as T)

/** A scene value with parts, dials and checkpoints expanded into things and states (after any hand-written ones). */
export function withDials<T extends { things?: Thing[]; states?: SceneState[]; dials?: Record<string, Dial>; parts?: Record<string, Omit<Thing, 'id'>>; checkpoints?: Record<string, Omit<SceneState, 'id'>> }>(value: T): T {
  if (!value.dials && !value.parts && !value.checkpoints) return value
  return {
    ...value,
    things: [...(value.things ?? []), ...keyed<Thing>(value.parts), ...expandDials(value.dials)],
    states: [...(value.states ?? []), ...keyed<SceneState>(value.checkpoints)],
  }
}
