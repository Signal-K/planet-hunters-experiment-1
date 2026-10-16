import site from './base-site.json'
import type { EarthBiomeId, WorldTimeGrade } from './base-world'

/**
 * Base site map (shared/layout/base-site.json, copied here by scripts/sync-base-site.mjs; native reads the
 * same file). The base is a paved launch complex on flat land. Every structure has one home site on a
 * 520-unit strip; a fresh base is the empty paved site with one marked pad site.
 */
export const BASE_SITE = site
export const STRIP_W = site.strip.width
export const ASSET_ROOT = '/game/assets/'

/** CSS `calc()` for a length in kit units (`--px` points per unit, set on the Base root). */
export const units = (n: number) => `calc(${n} * var(--px, 3px))`
/** CSS `calc()` for a height above the ground line (`--hub-ground`), in kit units. */
export const aboveGround = (n: number) => `calc(var(--hub-ground) + ${n} * var(--px, 3px))`

export type SiteId = 'hall' | 'pad' | 'ops' | 'exchange' | 'shaft'
export interface BaseSite { id: SiteId; x: number; half: number; plot: number | null; label: string }
/** `body` is the structure's own width; the sprite (`left`, `width`) is wider by the shadow it casts to the right. */
export interface StructureSprite { site: SiteId; src?: string; body?: number; left?: number; width?: number; height?: number; foot?: number; mount?: { x: number; z: number } }
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

/** Points per kit unit. Portrait fits the hangar and pad across the width (between 1.5 and 2); landscape is 2
 *  under 600 pt tall, else 3. Native uses the same rule. */
export function kitScale(view: { w: number; h: number }): number {
  const k = site.kitScale
  if (view.h > view.w * 1.15) return Math.round(Math.min(k.phone, Math.max(k.portraitMin, view.w / k.portraitFit)) * 100) / 100
  return view.h < k.largeMinHeight ? k.phone : k.large
}

/** Strip x (kit units) the camera starts centred on: the middle of everything built, or the pad site on a fresh
 *  base. When the built span is wider than the view, the pad stays in frame. */
export function homeCenter(kinds: readonly string[], viewUnits: number): number {
  const sites = kinds.map(homeSite).filter((s): s is BaseSite => !!s && s.id !== 'shaft')
  const pad = siteById('pad')
  if (!sites.length) return pad.x
  const l = Math.min(...sites.map(s => s.x - s.half))
  const r = Math.max(...sites.map(s => s.x + s.half))
  if (r - l <= viewUnits) return (l + r) / 2
  return Math.min(Math.max((l + r) / 2, pad.x + pad.half - viewUnits / 2), pad.x - pad.half + viewUnits / 2)
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

/** Offset from the site centre to the sprite centre, in kit units (the sprite carries its shadow on the right). */
export function spriteCenterOffset(sprite: StructureSprite): number {
  if (sprite.body == null || sprite.left == null || sprite.width == null) return 0
  return sprite.left + sprite.width / 2 - sprite.body / 2
}

export const GROUND = site.ground

export interface BackdropBand { id: string; src: string; bottom: number; height: number; parallax: number }

export function backdropFor(biome: EarthBiomeId): BackdropBand[] {
  return (site.backdrop.biomes as Record<string, BackdropBand[]>)[biome] ?? []
}

export function skyGrade(grade: WorldTimeGrade): SkyGrade {
  return (site.sky.grades as Record<string, SkyGrade>)[grade]
}

/** Every problem with the site map: sites overlapping each other or the strip edge, structures wider than
 *  their site, or a structure without a site. Empty when the map is sound. */
export function validateBaseSite(): string[] {
  const problems: string[] = []
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
    if (sprite.body && sprite.body / 2 > home.half) problems.push(`${kind} is wider than site ${home.id}`)
  }
  const ground = site.ground
  if (ground.left > 0 || ground.left + ground.width < STRIP_W) problems.push('the paved ground does not cover the strip')
  for (const [biome, bands] of Object.entries(site.backdrop.biomes as Record<string, BackdropBand[]>)) {
    if (bands.some(b => b.bottom > ground.above)) problems.push(`${biome}: the far ground floats above the paving`)
  }
  return problems
}
