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
  return (
    <section className={styles.card} data-testid="project-inventory">
      <h2 className={styles.cardTitle}>Game object coverage</h2>
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
    </section>
  )
}
