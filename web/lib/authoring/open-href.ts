// The `cursor://file/<absolute path>[:line[:column]]` links the Studio shows, taken apart again. The page uses this to ask the
// dev server to open the file, because Cursor's built-in browser does not follow custom-protocol links.

export interface CursorTarget {
  /** Absolute path on the machine that runs the editor. */
  file: string
  line?: number
  column?: number
}

export function parseCursorHref(href: string): CursorTarget | null {
  const match = /^cursor:\/\/file(\/.*?)(?::(\d+))?(?::(\d+))?$/.exec(href)
  if (!match) return null
  let file = match[1]
  try { file = decodeURIComponent(file) } catch { /* not encoded */ }
  return { file, line: match[2] ? Number(match[2]) : undefined, column: match[3] ? Number(match[3]) : undefined }
}
