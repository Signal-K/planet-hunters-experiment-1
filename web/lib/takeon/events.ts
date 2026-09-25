import type {
  Anomaly,
  EventBus,
  GameEvents,
  ResourceKey,
  Structure,
} from '@takeon/engine'
import type { ScheduledPush } from './push'

export type TakeonHostEvent =
  | { type: 'mined'; payload: { resource: ResourceKey | null; amount: number } }
  | { type: 'scan'; payload: { found: Anomaly[] } }
  | { type: 'built'; payload: { structure: Structure } }
  | { type: 'buildFailed'; payload: GameEvents['buildFailed'] }
  | { type: 'demolished'; payload: GameEvents['demolished'] }
  | { type: 'demolishFailed'; payload: GameEvents['demolishFailed'] }
  | { type: 'rotated'; payload: GameEvents['rotated'] }
  | { type: 'crafted'; payload: GameEvents['crafted'] }
  | { type: 'craftFailed'; payload: GameEvents['craftFailed'] }
  | { type: 'viewChanged'; payload: GameEvents['viewChanged'] }
  | { type: 'batteryEmpty'; payload: GameEvents['batteryEmpty'] }
  | { type: 'roverLost'; payload: GameEvents['roverLost'] }
  | { type: 'anomalyDocumented'; payload: GameEvents['anomalyDocumented'] }

export function notificationForTakeonEvent(
  event: TakeonHostEvent
): ScheduledPush | null {
  switch (event.type) {
    case 'batteryEmpty':
      return {
        title: 'ROVER BATTERY DEPLETED',
        body: 'Surface operations are paused. Return to the mission to recover power.',
      }
    case 'roverLost':
      return {
        title: 'ROVER SIGNAL LOST',
        body: `Surface operations stopped: ${event.payload.reason}.`,
      }
    case 'anomalyDocumented':
      return {
        title: 'ANOMALY DOCUMENTED',
        body: `${event.payload.anomaly.name} has been added to the mission record.`,
      }
    default:
      return null
  }
}

export function bindTakeonHostEvents(
  events: EventBus,
  onEvent: (event: TakeonHostEvent) => void
): () => void {
  const cleanups = [
    events.on('mined', ({ resource, amount }) => {
      onEvent({ type: 'mined', payload: { resource, amount } })
    }),
    events.on('scan', ({ found }) => {
      onEvent({ type: 'scan', payload: { found } })
    }),
    events.on('built', ({ structure }) => {
      onEvent({ type: 'built', payload: { structure } })
    }),
    events.on('buildFailed', payload => {
      onEvent({ type: 'buildFailed', payload })
    }),
    events.on('demolished', payload => {
      onEvent({ type: 'demolished', payload })
    }),
    events.on('demolishFailed', payload => {
      onEvent({ type: 'demolishFailed', payload })
    }),
    events.on('rotated', payload => {
      onEvent({ type: 'rotated', payload })
    }),
    events.on('crafted', payload => {
      onEvent({ type: 'crafted', payload })
    }),
    events.on('craftFailed', payload => {
      onEvent({ type: 'craftFailed', payload })
    }),
    events.on('viewChanged', payload => {
      onEvent({ type: 'viewChanged', payload })
    }),
    events.on('batteryEmpty', payload => {
      onEvent({ type: 'batteryEmpty', payload })
    }),
    events.on('roverLost', payload => {
      onEvent({ type: 'roverLost', payload })
    }),
    events.on('anomalyDocumented', payload => {
      onEvent({ type: 'anomalyDocumented', payload })
    }),
  ]
  return () => cleanups.forEach(cleanup => cleanup())
}
