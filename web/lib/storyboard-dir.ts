import { join } from 'node:path'

/**
 * Where the storyboard keeps its focus file, comment thread and native snapshots. Inside web/ on purpose: the Docker
 * web service bind-mounts web/ at /app, so scripts on the host and the dev server in the container see the same files.
 * STORYBOARD_DIR overrides it.
 */
export const storyboardDir = (): string => process.env.STORYBOARD_DIR ?? join(process.cwd(), '.storyboard')
