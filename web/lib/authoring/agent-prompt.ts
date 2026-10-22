// Turns a scene's feedback into one brief an agent can act on. Everything it says comes from files under shared/authoring/,
// so an agent that never sees this prompt can reach the same facts by reading them.
import type { FeedbackDoc, SceneDoc, SceneObject, ScenePreset } from './docs.ts'

export const VIEWPORT_NAMES = { ph: 'phone portrait 390x844', ls: 'phone landscape 926x428', dk: 'desktop 1440x900' } as const

const MODES = {
  fix: 'I know what to do. Follow the pins and notes exactly and do not redesign anything I did not mention.',
  explore:
    'I do not know what will look good, so do not iterate on what I already rejected. Propose at least two genuinely different directions that fix every pin marked wrong, borrow what the inspiration does well (name the specific traits you borrowed) and keep everything marked keep. Show each direction at phone portrait 390x844, phone landscape 926x428 and desktop 1440x900 and let me choose.',
} as const

export interface PromptInput {
  scene: SceneDoc
  feedback: FeedbackDoc | null
  notes: { always: string; next: string }
  origin: string
  state?: string
  preset?: ScenePreset
  flow?: { name: string; step: number; instructions?: string }
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export function buildAgentPrompt({ scene, feedback, notes, origin, state, preset, flow }: PromptInput): string {
  const base = `shared/authoring`
  const lines: string[] = []
  lines.push(`Work on the Landnam scene "${scene.id}" (${scene.name}), scene type ${scene.type}.`)
  lines.push(`Open it in the Scene Studio: ${origin}/game/studio?scene=${scene.id}${preset ? `&preset=${preset.id}` : state ? `&state=${state}` : ''}`)
  lines.push('')
  lines.push('Read first:')
  lines.push(`- ${base}/scenes/${scene.id}.toml (the scene script; objects with status = "proposed" are requests to build)`)
  if (feedback) lines.push(`- ${base}/feedback/${scene.id}.toml (pins, inspiration, direction)`)
  lines.push(`- ${base}/instructions/scenes/${scene.id}.md and ${scene.id}.next.md (plain-language notes)`)
  lines.push(`- ${base}/instructions/persistent.md (rules for every scene)`)

  const mode = feedback?.mode ?? 'fix'
  lines.push('')
  lines.push(`Mode ${mode}: ${MODES[mode]}`)

  if (scene.presets?.length) {
    lines.push('')
    lines.push('Saved presets:')
    for (const item of scene.presets) lines.push(`- ${item.name} (${item.id})${item.instructions ? `: ${item.instructions}` : ''}`)
  }
  if (preset) {
    lines.push('')
    lines.push(`Current preset: ${preset.name} (${preset.id})${preset.instructions ? `. Instructions: ${preset.instructions}` : ''}`)
  }
  if (flow) {
    lines.push('')
    lines.push(`Mission flow: ${flow.name}, step ${flow.step + 1}${flow.instructions ? `. Instructions: ${flow.instructions}` : ''}`)
  }

  const pins = feedback?.pins ?? []
  const where = (pin: (typeof pins)[number]) => {
    const parts = [pin.viewport ? VIEWPORT_NAMES[pin.viewport] : '', pin.state ? `fixture ${pin.state}` : '', pin.at ? `at ${pct(pin.at.x)} across, ${pct(pin.at.y)} down` : '', pin.object ? `object ${pin.object}` : ''].filter(Boolean)
    return parts.length ? ` [${parts.join(', ')}]` : ''
  }
  const wrong = pins.filter(p => p.kind === 'wrong')
  if (wrong.length) {
    lines.push('')
    lines.push('Wrong (fix these and never bring them back, even once resolved):')
    wrong.forEach((pin, i) => lines.push(`${i + 1}. ${pin.note}${where(pin)}${pin.resolved ? ' (resolved)' : ''}`))
  }
  const keep = pins.filter(p => p.kind === 'keep')
  if (keep.length) {
    lines.push('')
    lines.push('Keep (do not touch):')
    keep.forEach((pin, i) => lines.push(`${i + 1}. ${pin.note}${where(pin)}`))
  }
  const inspiration = feedback?.inspiration ?? []
  if (inspiration.length) {
    lines.push('')
    lines.push('Inspiration (apps and games I like):')
    for (const item of inspiration) {
      const bits = [item.source, item.likes ? `what I like: ${item.likes}` : '', item.image ? `image: ${base}/feedback/refs/${item.image.replace(/^.*\//, '')}` : ''].filter(Boolean)
      lines.push(`- ${bits.join('. ')}`)
    }
  }
  if (feedback?.direction?.trim()) {
    lines.push('')
    lines.push(`Direction: ${feedback.direction.trim()}`)
  }
  if (notes.next.trim()) {
    lines.push('')
    lines.push(`Brief for this pass: ${notes.next.trim()}`)
  }
  if (notes.always.trim()) {
    lines.push('')
    lines.push(`Standing notes for this scene: ${notes.always.trim()}`)
  }
  const proposed: SceneObject[] = (scene.objects ?? []).filter(o => o.status === 'proposed')
  if (proposed.length) {
    lines.push('')
    lines.push('Drawn in the Studio as proposals:')
    for (const o of proposed) {
      const at = o.rect ? ` at x ${o.rect.x}, y ${o.rect.y}, ${o.rect.w} wide, ${o.rect.h} tall` : o.slot ? ` in the ${o.slot} slot` : ''
      lines.push(`- ${o.id} (${o.kind})${at}${o.note ? `: ${o.note}` : ''}`)
    }
  }
  lines.push('')
  lines.push(`When done: update the scene script, set status = "addressed" in ${base}/feedback/${scene.id}.toml, write the handoff in the Linear ticket, and show screenshots at phone portrait 390x844, phone landscape 926x428 and desktop 1440x900. Web and native must match.`)
  return lines.join('\n')
}
