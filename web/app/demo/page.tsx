import DemoModeApp from '@/components/demo/DemoModeApp'

// Deliberately outside app/game/(main) — no auth gate wraps this route, so
// it's reachable before/without signing in (KES-264).
export default function DemoPage() {
  return <DemoModeApp />
}
