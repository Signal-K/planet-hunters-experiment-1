import { redirect } from 'next/navigation'
import TakeonEngineDemo from '@/components/takeon-preview/TakeonEngineDemo'

// Local-only technical preview — not part of any player-facing flow. See
// STS-414: whether/how takeon eventually powers the real mining screen is a
// separate, later decision; this route exists only to prove the vendored
// module renders and simulates in this app's stack.
export default function TakeonPreviewPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  return <TakeonEngineDemo />
}
