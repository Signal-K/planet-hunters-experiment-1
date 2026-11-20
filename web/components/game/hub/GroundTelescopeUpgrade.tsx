'use client'

import type { Player } from '@/lib/game-types'
import { groundTelescopeUpgrade } from '@/lib/ground-telescope-upgrades'
import { groundTelescopeObserving } from '@/lib/systems/InstrumentFeedSystem'
import ActionConfirmBar from '../ActionConfirmBar'

export default function GroundTelescopeUpgrade({ player, id, onUpgrade, onDismiss }: {
  player: Player
  id: string
  onUpgrade: (id: string) => void
  onDismiss: () => void
}) {
  const { level, cost, iron, reason } = groundTelescopeUpgrade(player, id)
  const observing = groundTelescopeObserving(player, id)
  return <ActionConfirmBar
    eyebrow={`Level ${level} of 3 · ${observing ? 'Observing' : 'Unplaced'}`}
    title={`Upgrade ground telescope${id.endsWith('-2') ? ' 2' : ''}`}
    description={`Now: ${level} asteroid candidate${level === 1 ? '' : 's'} per day. ${cost === null ? 'Fully upgraded.' : `Next: ${level + 1} candidates per day. Cost: ${cost} U iron; ${iron} U stored. ${reason ?? 'Upgrades are permanent.'}`} ${observing ? '' : 'Place it on a free annex slot to observe. You can upgrade it here before placing it.'}`}
    confirmLabel={cost === null ? 'Max level' : `Upgrade · ${cost} U iron`}
    confirmDisabled={reason !== null}
    onConfirm={() => onUpgrade(id)}
    onDismiss={onDismiss}
  />
}
