'use client'

import { useGame } from '@/game-context'
import MenuSheet from '@/components/game/MenuSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import CommunityHubSheet from '@/components/game/CommunityHubSheet'
import FeedbackSheet from '@/components/ui/FeedbackSheet'
import { SurfaceLayout } from '@/components/layout/frame/ScreenLayouts'

/**
 * SSL-35: the sheets opened from Home's Menu button. One open at a time,
 * tracked as `game.shellSheet`; everything but Menu itself is reached from
 * inside Menu (Garden, Friends, Community, Feedback). Market is not here: it
 * is a pop-up in Home's overlay slot.
 */
export default function ShellSheets() {
  const game = useGame()
  const close = () => game.setShellSheet(null)
  switch (game.shellSheet) {
    case 'menu': return <MenuSheet onClose={close} onOpen={game.setShellSheet} />
    case 'friends': return <FriendsSheet onClose={close} />
    // Community Hub is an Instrument-type surface (SSL-35).
    case 'community': return <div className="shell-instrument-layer"><SurfaceLayout surface="instrument"><CommunityHubSheet onClose={close} /></SurfaceLayout></div>
    case 'feedback': return <FeedbackSheet onClose={close} />
    default: return null
  }
}
