import { redirect } from 'next/navigation'
import MissionFlowPreview from '@/components/game/previews/MissionFlowPreview'

// Local-only technical preview of the Open Design "Client Bonus" mockup
// (open-design/.od/projects/00593938-0432-4fe2-ab6f-c5213e91038a/
// landnam-client-bonus.html), ported to React. Not part of any player-facing
// flow and does not replace MissionBoardScreen.tsx/MissionCard.tsx.
export default function MissionFlowPreviewPage() {
  if (process.env.NODE_ENV !== 'development') redirect('/game')
  return <MissionFlowPreview />
}
