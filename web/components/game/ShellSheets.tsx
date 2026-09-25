'use client'

import { useGame } from '@/game-context'
import MenuSheet from '@/components/game/MenuSheet'
import FriendsSheet from '@/components/game/FriendsSheet'
import CommunityHubSheet from '@/components/game/CommunityHubSheet'
import FeedbackSheet from '@/components/ui/FeedbackSheet'

/**
 * SSL-35: the sheets opened from Home's Menu button. One open at a time,
 * tracked as `game.shellSheet`; everything but Menu itself is reached from
 * inside Menu (Garden, Friends, Community, Feedback).
 */
export default function ShellSheets() {
  const game = useGame()
  const close = () => game.setShellSheet(null)
  switch (game.shellSheet) {
    case 'menu': return <MenuSheet onClose={close} onOpen={game.setShellSheet} />
    case 'friends': return <FriendsSheet onClose={close} />
    case 'community': return <CommunityHubSheet onClose={close} />
    case 'feedback': return <FeedbackSheet onClose={close} />
    default: return null
  }
}
