#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = join(root, 'shared/engine/game-map.generated.json')
const check = process.argv.includes('--check')

const posix = value => value.replaceAll('\\', '/')
const read = path => readFileSync(join(root, path), 'utf8')
const json = path => JSON.parse(read(path))
const walk = (path, extensions) => {
  const absolute = join(root, path)
  return readdirSync(absolute).flatMap(name => {
    const child = join(absolute, name)
    return statSync(child).isDirectory()
      ? walk(posix(relative(root, child)), extensions)
      : extensions.includes(extname(name)) ? [posix(relative(root, child))] : []
  }).sort()
}

const productionFiles = files => files.filter(path => !/\.(test|spec)\./.test(path))
const uiKinds = new Set(['ui', 'button', 'panel', 'label', 'marker'])
const compiledSceneGraph = json('shared/engine/authored-scenes.json')
const mechanics = json('shared/engine/mechanics.json').mechanics
const authoredSceneScripts = compiledSceneGraph.scenes.map(scene => {
  const objects = scene.objects
  return {
    id: scene.id,
    path: `shared/authoring/scenes/${scene.id}.toml`,
    objects: objects.length,
    gameObjects: objects.filter(object => !uiKinds.has(object.kind)).length,
    uiElements: objects.filter(object => uiKinds.has(object.kind)).length,
    prefabs: objects.filter(object => object.prefab).length,
    sharedLayoutObjects: objects.filter(object => object.layout === 'shared').length,
    hostLayoutObjects: objects.filter(object => object.layout !== 'shared').length,
    mechanics: [...new Set(objects.flatMap(object => object.mechanics ?? []))].sort(),
    web: scene.runtime.web ?? [],
    native: scene.runtime.native ?? [],
  }
})
const qa = json('qa/scenes.json')
const sceneTypes = json('shared/engine/scene-types.json')
const screenSource = read('web/lib/game-screens.ts')
const screenBlock = screenSource.match(/const SCREEN_LIST = \{([\s\S]*?)\n\}/)?.[1] ?? ''
const webRoutes = [...screenBlock.matchAll(/^\s*(?:'([^']+)'|([a-z][\w-]*)):\s*true,/gm)]
  .map(match => match[1] ?? match[2]).sort()
const nativeScreenSource = read('native/LandnamCore/Sources/LandnamCore/Model/Screen.swift')
// Swift permits several cases per line. Preserve raw values for save/route parity, not only the first name.
const nativeScreens = [...nativeScreenSource.matchAll(/^\s*case\s+([a-z][^\n]*)/gm)]
  .flatMap(match => match[1].split(',').map(value => {
    const item = value.trim().match(/^([a-z][A-Za-z0-9]*)(?:\s*=\s*"([^"]+)")?$/)
    if (!item) throw new Error(`Cannot inventory native screen case: ${value}`)
    return { name: item[1], route: item[2] ?? item[1] }
  })).sort((a, b) => a.route.localeCompare(b.route))
const nativeCases = nativeScreens.map(screen => screen.name).sort()

const authoredSceneFiles = walk('web/public/game/scenes', ['.json'])
const authoredScenes = authoredSceneFiles.map(path => {
  const data = json(path)
  const componentTypes = new Set()
  const visit = entities => entities?.forEach(entity => {
    entity.components?.forEach(component => componentTypes.add(component.type))
    visit(entity.children)
  })
  visit(data.entities)
  return { path, name: data.name, entityCount: data.entities?.length ?? 0, componentTypes: [...componentTypes].sort() }
})

const filesContaining = (files, pattern) => files.filter(path => pattern.test(read(path)))
const webGameFiles = productionFiles(walk('web/components/game', ['.ts', '.tsx']))
const nativeAppFiles = productionFiles([...walk('native/App/Mining', ['.swift']), ...walk('native/App/Scenes', ['.swift']), ...walk('native/App/Screens', ['.swift'])])
const webRuntimeConsumers = filesContaining(
  webGameFiles,
  /\b(?:authoredScene|resolveScene)\s*\(/,
)
const nativeRuntimeConsumers = filesContaining(
  nativeAppFiles,
  /\bAuthoredSceneGraph\./,
)
const referencedScenes = (files, pattern) => [...new Set(files.flatMap(path => [...read(path).matchAll(pattern)].map(match => match[1])))].sort()
const webRuntimeScenes = referencedScenes(webRuntimeConsumers, /authoredScene\('([^']+)'\)/g)
const nativeRuntimeScenes = referencedScenes(nativeRuntimeConsumers, /AuthoredSceneGraph\.scene\("([^"]+)"\)/g)
const webDomainFiles = productionFiles(walk('web/lib/systems', ['.ts']))
const nativeDomainFiles = [...walk('native/LandnamCore/Sources/LandnamCore/Systems', ['.swift']), ...walk('native/LandnamCore/Sources/LandnamCore/Industry', ['.swift'])]
const ownedSources = new Set(mechanics.flatMap(mechanic => [...mechanic.web, ...mechanic.native]))

const routeOwners = Object.entries(sceneTypes.sceneTypes).flatMap(([type, value]) =>
  value.routes.map(route => ({ route, type })))
const mappedRoutes = new Set(routeOwners.map(entry => entry.route))
const allSlots = new Set(Object.keys(sceneTypes.sharedSlots))

const map = {
  generatedBy: 'scripts/generate-game-map.mjs',
  sourceOfTruth: {
    routes: 'web/lib/game-screens.ts',
    nativeScreens: 'native/LandnamCore/Sources/LandnamCore/Model/Screen.swift',
    qaScenes: 'qa/scenes.json',
    sceneTypes: 'shared/engine/scene-types.json',
    compiledScenes: 'shared/engine/authored-scenes.json'
  },
  counts: {
    webRoutes: webRoutes.length,
    nativeScreenCases: nativeCases.length,
    qaScenes: qa.scenes.length,
    authoredSceneFiles: authoredScenes.length,
    authoredSceneScripts: authoredSceneScripts.length,
    authoringSources: walk('shared/authoring', ['.md', '.toml']).length,
    authoredObjectNodes: authoredSceneScripts.reduce((total, scene) => total + scene.objects, 0),
    authoredGameObjects: authoredSceneScripts.reduce((total, scene) => total + scene.gameObjects, 0),
    authoredUiElements: authoredSceneScripts.reduce((total, scene) => total + scene.uiElements, 0),
    authoredPrefabInstances: authoredSceneScripts.reduce((total, scene) => total + scene.prefabs, 0),
    compiledScenes: compiledSceneGraph.scenes.length,
    compiledObjectNodes: compiledSceneGraph.scenes.reduce((total, scene) => total + scene.objects.length, 0),
    webRuntimeSceneConsumers: webRuntimeConsumers.length,
    nativeRuntimeSceneConsumers: nativeRuntimeConsumers.length,
    webRuntimeScenes: webRuntimeScenes.length,
    nativeRuntimeScenes: nativeRuntimeScenes.length,
    mechanics: mechanics.length,
    sharedLayoutObjects: authoredSceneScripts.reduce((n, scene) => n + scene.sharedLayoutObjects, 0),
    hostLayoutObjects: authoredSceneScripts.reduce((n, scene) => n + scene.hostLayoutObjects, 0),
    webGameComponents: productionFiles(walk('web/components/game', ['.ts', '.tsx'])).length,
    nativeAppComponents: productionFiles([
      ...walk('native/App/Mining', ['.swift']),
      ...walk('native/App/Scenes', ['.swift']),
      ...walk('native/App/Screens', ['.swift'])
    ]).length
  },
  scenes: {
    routed: webRoutes.map(route => ({ route, type: routeOwners.find(entry => entry.route === route)?.type ?? null })),
    nativeCases,
    nativeScreens,
    qa: qa.scenes,
    authored: authoredScenes,
    scripts: authoredSceneScripts,
    // Keep this inventory small; the full graph is already in authored-scenes.json.
    compiled: compiledSceneGraph.scenes.map(scene => ({ id: scene.id, objects: scene.objects.length }))
  },
  mechanics: mechanics.map(mechanic => ({ ...mechanic, scenes: authoredSceneScripts.filter(scene => scene.mechanics.includes(mechanic.id)).map(scene => scene.id) })),
  components: {
    web: productionFiles(walk('web/components/game', ['.ts', '.tsx'])),
    native: productionFiles([
      ...walk('native/App/Mining', ['.swift']),
      ...walk('native/App/Scenes', ['.swift']),
      ...walk('native/App/Screens', ['.swift'])
    ]).sort(),
    webSceneConsumers: webRuntimeConsumers,
    nativeSceneConsumers: nativeRuntimeConsumers,
    webRuntimeScenes,
    nativeRuntimeScenes,
    sharedData: productionFiles([
      ...walk('shared/layout', ['.json']),
      ...walk('shared/scenes', ['.json']),
      ...walk('shared/authoring', ['.md', '.toml'])
    ]).sort()
  },
  gaps: {
    routesWithoutSceneType: webRoutes.filter(route => !mappedRoutes.has(route)),
    unknownSlots: Object.values(sceneTypes.sceneTypes).flatMap(value => value.slots).filter(slot => !allSlots.has(slot)),
    qaWithoutWebPreset: qa.scenes.filter(scene => !scene.web).map(scene => scene.id),
    qaWithoutNativeScene: qa.scenes.filter(scene => !scene.native).map(scene => scene.id),
    scenesWithoutObjects: authoredSceneScripts.filter(scene => scene.objects === 0).map(scene => scene.id),
    routesWithoutNativeCase: webRoutes.filter(route => !nativeScreens.some(screen => screen.route === route)),
    scenesWithoutMechanics: authoredSceneScripts.filter(scene => scene.mechanics.length === 0).map(scene => scene.id),
    mechanicsWithoutNativeSources: mechanics.filter(mechanic => mechanic.native.length === 0).map(mechanic => mechanic.id),
    unownedDomainFiles: [...webDomainFiles, ...nativeDomainFiles].filter(path => !ownedSources.has(path)).sort(),
    compiledScenesWithoutRuntimeConsumer: compiledSceneGraph.scenes.filter(scene =>
      scene.objects.length > 0 && (!webRuntimeScenes.includes(scene.id) || !nativeRuntimeScenes.includes(scene.id))
    ).map(scene => scene.id)
  }
}

const rendered = `${JSON.stringify(map, null, 2)}\n`
if (check) {
  const current = readFileSync(output, 'utf8')
  if (current !== rendered) {
    console.error('shared/engine/game-map.generated.json is stale; run node scripts/generate-game-map.mjs')
    process.exit(1)
  }
  if (map.gaps.routesWithoutSceneType.length || map.gaps.unknownSlots.length || map.gaps.scenesWithoutObjects.length || map.gaps.scenesWithoutMechanics.length || map.gaps.unownedDomainFiles.length) {
    console.error('Engine map has unmapped routes or unknown slots', map.gaps)
    process.exit(1)
  }
  console.log(`Engine map current: ${map.counts.qaScenes} QA scenes, ${map.counts.webGameComponents} web components, ${map.counts.nativeAppComponents} native components`)
} else {
  writeFileSync(output, rendered)
  console.log(`Wrote ${posix(relative(root, output))}`)
}
