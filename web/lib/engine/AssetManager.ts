import { Assets, Texture } from 'pixi.js'

/**
 * Logical sprite name -> asset path, e.g. `{ "ship": "/game/assets/ships/starter.png" }`.
 *
 * Path convention: the Ruby sprite-generation pipeline writes PNGs to
 * `public/game/assets/<category>/<name>.png` (category examples: `ships`, `ores`, `parts`, `ui`).
 * Scene JSON references sprites by logical name via `SpriteRendererData.sprite`, so the
 * underlying file can move/be regenerated without touching scene files.
 */
export type AssetManifest = Record<string, string>

/** Visible fallback used when a sprite's logical name is missing from the manifest, or its
 * texture fails to load — a magenta-tinted square, rather than a blank/broken render. */
export const PLACEHOLDER_TINT = 0xff00ff

export interface ResolvedTexture {
  texture: Texture
  /** True if this is the magenta placeholder, not the real sprite. */
  isPlaceholder: boolean
}

/**
 * Loads the asset manifest and resolves logical sprite names to PixiJS textures,
 * caching loaded textures and falling back to a visible placeholder on any miss.
 */
export class AssetManager {
  private manifest: AssetManifest = {}
  private cache = new Map<string, Texture>()

  /** Fetch and store the manifest. Failure leaves the manifest empty (everything resolves
   * to the placeholder) rather than throwing, so a missing manifest never blocks scene load. */
  async loadManifest(url: string): Promise<void> {
    try {
      const res = await fetch(url)
      if (res.ok) this.manifest = (await res.json()) as AssetManifest
    } catch {
      this.manifest = {}
    }
  }

  /** Look up the asset path for a logical sprite name, if the manifest defines one. */
  resolve(name: string): string | undefined {
    return this.manifest[name]
  }

  /** Resolve a logical sprite name to a texture, loading and caching it on first use.
   * Returns the magenta placeholder (with `isPlaceholder: true`) if the name isn't in the
   * manifest or the texture fails to load. */
  async loadTexture(name: string): Promise<ResolvedTexture> {
    const cached = this.cache.get(name)
    if (cached) return { texture: cached, isPlaceholder: false }

    const path = this.resolve(name)
    if (!path) return { texture: Texture.WHITE, isPlaceholder: true }

    try {
      const texture = (await Assets.load(path)) as Texture
      this.cache.set(name, texture)
      return { texture, isPlaceholder: false }
    } catch {
      return { texture: Texture.WHITE, isPlaceholder: true }
    }
  }

  /** Load a texture directly by path (bypassing the manifest), falling back to the
   * placeholder on failure. Used for scene entities that still reference raw URLs. */
  async loadTextureByUrl(url: string): Promise<ResolvedTexture> {
    const cached = this.cache.get(url)
    if (cached) return { texture: cached, isPlaceholder: false }
    try {
      const texture = (await Assets.load(url)) as Texture
      this.cache.set(url, texture)
      return { texture, isPlaceholder: false }
    } catch {
      return { texture: Texture.WHITE, isPlaceholder: true }
    }
  }
}
