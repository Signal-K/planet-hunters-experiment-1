// A dial is a one-line list of options that each become a Thing (see scene.schema.json "dial").
// Expansion happens when a scene is read, so the Studio, validation and presets see ordinary things.
import type { Thing } from './docs.ts'

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

/** A scene value with its dials turned into things (listed after the hand-written ones). */
export function withDials<T extends { things?: Thing[]; dials?: Record<string, Dial> }>(value: T): T {
  if (!value.dials) return value
  return { ...value, things: [...(value.things ?? []), ...expandDials(value.dials)] }
}
