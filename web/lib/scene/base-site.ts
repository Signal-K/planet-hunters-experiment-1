import site from './base-site.json'
import type { EarthBiomeId, WorldTimeGrade } from './base-world'

/**
 * Base site map (shared/layout/base-site.json, copied here by scripts/sync-base-site.mjs; native reads the
 * same file). Every structure has one home site on a 520-unit strip, props sit only in the gaps, and the
 * concrete apron exists only once the pad is built. A fresh base is empty land with one pad site.
 */
export const BASE_SITE = site
export const STRIP_W = site.strip.width
export const ASSET_ROOT = '/game/assets/'

/** CSS `calc()` for a length in kit units (`--px` points per unit, set on the Base root). */
export const units = (n: number) => `calc(${n} * var(--px, 3px))`
/** CSS `calc()` for a height above the ground line (`--hub-ground`), in kit units. */
export const aboveGround = (n: number) => `calc(var(--hub-ground) + ${n} * var(--px, 3px))`

export type SiteId = 'hall' | 'pad' | 'exchange' | 'shaft'
export interface BaseSite { id: SiteId; x: number; half: number; plot: number | null; label: string }
export interface StructureSprite { site: SiteId; src?: string; width?: number; height?: number; foot?: number; mount?: { x: number; z: number } }
export interface PropPlacement { sprite: string; x: number }
export interface PropSprite { src: string; width: number; height: number; foot: number }
export interface SkyGrade {
  top: string
  mid: string
  horizon: string
  luminary: { kind: 'sun' | 'moon'; x: number; y: number }
  stars: number
  clouds: number
  shade: number
}

export const SITES = site.sites as BaseSite[]
const STRUCTURES = site.structures as Record<string, StructureSprite>
const PROP_SPRITES = site.props.sprites as Record<string, PropSprite>

/** Points per kit unit: 2 on phones (portrait, or under 600 pt tall), else 3. Native uses the same rule. */
export function kitScale(view: { w: number; h: number }): number {
  const portrait = view.h > view.w * 1.15
  return portrait || view.h < site.kitScale.largeMinHeight ? site.kitScale.phone : site.kitScale.large
}

export function structureSprite(kind: string): StructureSprite | null {
  return STRUCTURES[kind === 'garage' ? 'hangar' : kind] ?? null
}

/** The one site a kind may stand on, or null for kinds that are not drawn on the base. */
export function homeSite(kind: string): BaseSite | null {
  const sprite = structureSprite(kind)
  return sprite ? SITES.find(s => s.id === sprite.site) ?? null : null
}

export function siteById(id: SiteId): BaseSite {
  return SITES.find(s => s.id === id)!
}

export function propsFor(biome: EarthBiomeId): Array<PropPlacement & PropSprite> {
  const list = (site.props.biomes as Record<string, PropPlacement[]>)[biome] ?? []
  return list.map(p => ({ ...p, ...PROP_SPRITES[p.sprite] }))
}

export interface GroundRun { from: number; to: number; style: string; src: string; above: number; below: number; deep: string }

/** Ground runs across the strip for a biome: the biome tile everywhere, the apron under the pad once it is built. */
export function groundRuns(biome: EarthBiomeId, placed: readonly string[]): GroundRun[] {
  const styles = site.ground.styles as Record<string, { src: string; above: number; below: number; deep: string }>
  const overlays = site.ground.segments.filter(seg => !seg.builtWith || placed.includes(seg.builtWith)).sort((a, b) => a.from - b.from)
  const runs: GroundRun[] = []
  let x = 0
  const push = (from: number, to: number, style: string) => { if (to > from) runs.push({ from, to, style, ...styles[style] }) }
  for (const seg of overlays) {
    push(x, seg.from, biome)
    push(seg.from, seg.to, seg.style)
    x = seg.to
  }
  push(x, STRIP_W, biome)
  return runs
}

export function backdropFor(biome: EarthBiomeId): Array<{ id: string; src: string; height: number; parallax: number }> {
  return (site.backdrop.biomes as Record<string, Array<{ id: string; src: string; height: number; parallax: number }>>)[biome] ?? []
}

export function skyGrade(grade: WorldTimeGrade): SkyGrade {
  return (site.sky.grades as Record<string, SkyGrade>)[grade]
}

/** Every problem with the site map: sites overlapping each other or the strip edge, structure sprites wider
 *  than their site, props off the strip, on a site, or on a paved segment. Empty when the map is sound. */
export function validateBaseSite(): string[] {
  const problems: string[] = []
  const margin = site.strip.propMargin
  const sorted = SITES.slice().sort((a, b) => a.x - b.x)
  for (const s of sorted) {
    if (s.x - s.half < 0 || s.x + s.half > STRIP_W) problems.push(`site ${s.id} runs off the strip`)
  }
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1]
    const b = sorted[i]
    if (a.x + a.half > b.x - b.half) problems.push(`sites ${a.id} and ${b.id} overlap`)
  }
  for (const [kind, sprite] of Object.entries(STRUCTURES)) {
    const home = SITES.find(s => s.id === sprite.site)
    if (!home) { problems.push(`${kind} has no site ${sprite.site}`); continue }
    if (sprite.width && sprite.width / 2 > home.half) problems.push(`${kind} is wider than site ${home.id}`)
  }
  for (const seg of site.ground.segments) {
    const owner = seg.builtWith ? homeSite(seg.builtWith) : null
    if (owner && (seg.from > owner.x - owner.half || seg.to < owner.x + owner.half)) problems.push(`${seg.style} does not cover the ${owner.id} site`)
  }
  for (const [biome, list] of Object.entries(site.props.biomes as Record<string, PropPlacement[]>)) {
    for (const p of list) {
      const sprite = PROP_SPRITES[p.sprite]
      if (!sprite) { problems.push(`${biome}: unknown prop ${p.sprite}`); continue }
      const l = p.x - sprite.width / 2
      const r = p.x + sprite.width / 2
      if (l < 0 || r > STRIP_W) problems.push(`${biome}: ${p.sprite} at ${p.x} runs off the strip`)
      for (const s of SITES) {
        if (l < s.x + s.half + margin && r > s.x - s.half - margin) problems.push(`${biome}: ${p.sprite} at ${p.x} stands on site ${s.id}`)
      }
      for (const seg of site.ground.segments) {
        if (l < seg.to && r > seg.from) problems.push(`${biome}: ${p.sprite} at ${p.x} stands on the ${seg.style}`)
      }
    }
  }
  return problems
}
