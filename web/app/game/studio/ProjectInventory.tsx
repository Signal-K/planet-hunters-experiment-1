import type { StudioIndex } from '@/lib/authoring/studio-types'
import workbench from './ObjectWorkbench.module.css'
import styles from './Studio.module.css'

interface Props {
  inventory: StudioIndex['inventory']
  currentScene?: string
}

/** Honest whole-game coverage from the generated map. This is an inventory, not a parity claim. */
export default function ProjectInventory({ inventory, currentScene }: Props) {
  const { counts, gaps } = inventory
  const mapped = counts.authoredSceneScripts - gaps.scenesWithoutObjects.length
  const currentMissing = currentScene ? gaps.scenesWithoutObjects.includes(currentScene) : false
  const scene = inventory.scenes.find(item => item.id === currentScene)
  const mechanics = inventory.mechanics.filter(item => scene?.mechanics.includes(item.id))
  return (
    <section className={styles.card} data-testid="project-inventory">
      <h2 className={styles.cardTitle}>Game object coverage</h2>
      {inventory.journey && <details open data-testid="target-journey">
        <summary>Target player flow: five stops</summary>
        <p className={styles.hint}>These groups guide the migration. They do not change live routing yet; old routes remain deep links.</p>
        <ol>{inventory.journey.stages.map(stage => <li key={stage.id}>
          <strong>{stage.name}</strong> · {stage.routes.join(', ')}
          <p className={styles.hint}>{stage.policy}</p>
        </li>)}</ol>
      </details>}
      <div className={workbench.density} data-density={currentMissing ? 'empty' : mapped < counts.authoredSceneScripts ? 'light' : 'composed'}>
        <strong>{mapped} of {counts.authoredSceneScripts} scenes have an object graph</strong>
        <span>{gaps.scenesWithoutObjects.length} still empty</span>
      </div>
      <div className={workbench.summary} aria-label="Whole-game object inventory">
        <div className={workbench.metric}><strong>{counts.authoredGameObjects}</strong><span>Game objects</span></div>
        <div className={workbench.metric}><strong>{counts.authoredUiElements}</strong><span>UI elements</span></div>
        <div className={workbench.metric}><strong>{counts.authoredPrefabInstances}</strong><span>Prefabs</span></div>
        <div className={workbench.metric}><strong>{counts.webRoutes}/{counts.nativeScreenCases}</strong><span>Web/native routes</span></div>
      </div>
      <details>
        <summary>Scenes without objects ({gaps.scenesWithoutObjects.length})</summary>
        <p className={styles.hint}>{gaps.scenesWithoutObjects.join(', ') || 'None'}</p>
      </details>
      <p className={styles.hint} data-testid="engine-migration-status">
        {counts.sharedLayoutObjects} objects use shared geometry; {counts.hostLayoutObjects} still use host-owned layout.
        Object coverage is not rendered or behavioral parity.
      </p>
      <details open={Boolean(scene)}>
        <summary>Current scene: engine ownership</summary>
        {scene && <p className={styles.hint}>{scene.sharedLayoutObjects} shared-layout objects · {scene.hostLayoutObjects} host-layout objects. {scene.native.length ? 'Native source mapped; runtime acceptance is separate.' : 'No native renderer mapped.'}</p>}
        {mechanics.map(mechanic => (
          <div key={mechanic.id} data-testid={`mechanic-${mechanic.id}`}>
            <h3>{mechanic.name}</h3>
            <p className={styles.hint}>{mechanic.native.length ? 'Sources on both platforms; behavior not certified.' : 'Native implementation gap.'} {mechanic.note}</p>
            <details><summary>Source owners</summary>
              <ul>{[...mechanic.web, ...mechanic.native].map(file => <li key={file}><code>{file}</code></li>)}</ul>
            </details>
          </div>
        ))}
      </details>
      <details>
        <summary>Cross-platform gaps</summary>
        <p className={styles.hint}>Missing native routes: {gaps.routesWithoutNativeCase.join(', ') || 'None'}.</p>
        <p className={styles.hint}>Mechanics without native sources: {gaps.mechanicsWithoutNativeSources.join(', ') || 'None'}.</p>
        <p className={styles.hint}>Unowned domain files: {gaps.unownedDomainFiles.join(', ') || 'None in the audited systems/industry directories'}.</p>
      </details>
    </section>
  )
}
