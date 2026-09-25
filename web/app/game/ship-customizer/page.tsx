import { redirect } from 'next/navigation'

// Dev-only shortcut into the Hangar ship customiser. It enters the live
// (main) shell through the same preset redirect as /game/ui/*, rather than
// mounting a second app shell with its own GameProvider.
export default function ShipCustomizerPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  redirect('/game/ui/ship-customizer')
}
