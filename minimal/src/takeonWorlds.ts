// Which TakeOn world each Minimal scene stands on, dressed the way Landnam
// dresses its own TakeOn fields (sandbox.ts + terrainColour.ts): Landnam's
// biomes, ground colours and sky. Lives in the lazy chunk with the engine.
import * as engine from '@takeon/engine'
import type { BodyDef } from '@takeon/engine'
import type { Target } from '@landnam/lib/data/types'
import { takeonBodyForTarget } from '@landnam/lib/takeon/bodies'
import { buildLandnamBody, registerLandnamSandbox, type SandboxEngine } from '@landnam/lib/takeon/sandbox'
import { applyTerrainLook, mixHex, terrainLookForTarget, type TerrainLook } from '@landnam/lib/takeon/terrainColour'

const sandbox = engine as unknown as SandboxEngine
const ramp = (top: string) => [top, mixHex(top, '#000000', 0.34), mixHex(top, '#000000', 0.58)] as const

/** Home: Landnam's cold steppe (lichen and grass on dark volcanic ground) under a pale northern sky. */
const HOME_LOOK: TerrainLook = {
  profileId: 'landnam-home',
  atmosphere: 'thick',
  ground: ramp('#7c7a63'),
  rock: ramp('#4a4d52'),
  sky: '#9cb8cf',
  skyNight: '#141c2a',
  tint: [1, 1, 1],
}
const HOME_BIOMES = ['lichen-steppe', 'grassland-plains']
export const HOME_SEED = 4180

export function homeBody(): BodyDef {
  registerLandnamSandbox(sandbox)
  const base = engine.getBody('terra')
  if (!base) throw new Error('TakeOn has no terra body')
  const parent = engine.getBodyKind(base.kind ?? '') ?? engine.listBodyKinds()[0]
  engine.registerBodyKind({ ...parent, id: 'landnam-minimal:home', label: 'Landnam home', help: 'Landnam Minimal home outpost.', allowedBiomes: HOME_BIOMES })
  const body = engine.cloneBody(base)
  body.id = 'terra--landnam-home'
  body.kind = 'landnam-minimal:home'
  body.terrain = { ...body.terrain, biomes: true }
  body.climate = { temperature: 4, tempVariance: 6 }
  applyTerrainLook(engine, HOME_LOOK)
  body.palette = { sky: HOME_LOOK.sky, skyNight: HOME_LOOK.skyNight, tint: HOME_LOOK.tint }
  return body
}

/** A destination exactly as Landnam's own TakeOn field mounts it (TakeOnMount). */
export function destinationBody(target: Target): BodyDef {
  const body = engine.cloneBody(buildLandnamBody(sandbox, takeonBodyForTarget(target), target))
  const look = terrainLookForTarget(target)
  applyTerrainLook(engine, look)
  body.palette = { sky: look.sky, skyNight: look.skyNight, tint: look.tint }
  return body
}
