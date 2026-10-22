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
const authoredSceneScripts = walk('shared/authoring/scenes', ['.toml']).map(path => {
  const source = read(path)
  const objects = source.split(/^\[\[objects\]\]\s*$/m).slice(1).map(block => ({
    kind: block.match(/^kind\s*=\s*"([^"]+)"/m)?.[1] ?? 'unknown',
    prefab: block.match(/^prefab\s*=\s*"([^"]+)"/m)?.[1] ?? null,
  }))
  return {
    id: source.match(/^id\s*=\s*"([^"]+)"/m)?.[1] ?? path.split('/').at(-1)?.replace(/\.toml$/, '') ?? path,
    path,
    objects: objects.length,
    gameObjects: objects.filter(object => !uiKinds.has(object.kind)).length,
    uiElements: objects.filter(object => uiKinds.has(object.kind)).length,
    prefabs: objects.filter(object => object.prefab !== null).length,
  }
})
const qa = json('qa/scenes.json')
const sceneTypes = json('shared/engine/scene-types.json')
const screenSource = read('web/lib/game-screens.ts')
const screenBlock = screenSource.match(/const SCREEN_LIST = \{([\s\S]*?)\n\}/)?.[1] ?? ''
const webRoutes = [...screenBlock.matchAll(/^\s*(?:'([^']+)'|([a-z][\w-]*)):\s*true,/gm)]
  .map(match => match[1] ?? match[2]).sort()
const nativeScreenSource = read('native/LandnamCore/Sources/LandnamCore/Model/Screen.swift')
const nativeCases = [...nativeScreenSource.matchAll(/^\s*case\s+([a-z][A-Za-z0-9]*)/gm)].map(match => match[1]).sort()

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
    sceneTypes: 'shared/engine/scene-types.json'
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
    qa: qa.scenes,
    authored: authoredScenes,
    scripts: authoredSceneScripts
  },
  components: {
    web: productionFiles(walk('web/components/game', ['.ts', '.tsx'])),
    native: productionFiles([
      ...walk('native/App/Mining', ['.swift']),
      ...walk('native/App/Scenes', ['.swift']),
      ...walk('native/App/Screens', ['.swift'])
    ]).sort(),
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
    scenesWithoutObjects: authoredSceneScripts.filter(scene => scene.objects === 0).map(scene => scene.id)
  }
}

const rendered = `${JSON.stringify(map, null, 2)}\n`
if (check) {
  const current = readFileSync(output, 'utf8')
  if (current !== rendered) {
    console.error('shared/engine/game-map.generated.json is stale; run node scripts/generate-game-map.mjs')
    process.exit(1)
  }
  if (map.gaps.routesWithoutSceneType.length || map.gaps.unknownSlots.length) {
    console.error('Engine map has unmapped routes or unknown slots', map.gaps)
    process.exit(1)
  }
  console.log(`Engine map current: ${map.counts.qaScenes} QA scenes, ${map.counts.webGameComponents} web components, ${map.counts.nativeAppComponents} native components`)
} else {
  writeFileSync(output, rendered)
  console.log(`Wrote ${posix(relative(root, output))}`)
}
