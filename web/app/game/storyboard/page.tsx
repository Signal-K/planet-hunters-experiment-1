import { redirect } from 'next/navigation'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import StoryboardClient, { type Registry } from './StoryboardClient'

export const dynamic = 'force-dynamic'

// Live storyboard (dev/staging only): every scene in qa/scenes.json, grouped by flow, as live
// iframes of /game/stage?preset=KEY at the real viewport size (so media queries are honest),
// with the native snapshot beside each one. Hot reload keeps it current while agents edit.
// Keep it open next to the terminal; "Copy ref" puts a scene reference on the clipboard to paste to an agent.
export default function StoryboardPage() {
  if (!isDevLauncherEnabled()) redirect('/game')
  const registry = JSON.parse(readFileSync(path.join(process.cwd(), '..', 'qa', 'scenes.json'), 'utf8')) as Registry
  return <StoryboardClient registry={registry} />
}
