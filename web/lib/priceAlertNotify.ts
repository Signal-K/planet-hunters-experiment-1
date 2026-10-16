// Browser notifications for sell alerts. Asked for when the player sets an alert (a user gesture),
// shown only while the tab is in the background. A closed tab cannot be reached without a server push.
import type { PriceAlert } from '@/lib/systems/MarketplaceSystem'
import { MINERAL_META } from '@/lib/data'

const supported = () => typeof window !== 'undefined' && 'Notification' in window

export function requestAlertPermission(): void {
  try {
    if (supported() && Notification.permission === 'default') void Notification.requestPermission()
  } catch { /* notifications are optional */ }
}

export function notifyFiredAlert(alert: PriceAlert): void {
  try {
    if (!supported() || Notification.permission !== 'granted' || !document.hidden) return
    const name = MINERAL_META[alert.mineralId]?.name ?? alert.mineralId
    new Notification(`${name} hit your price`, { body: `Spot reached ${alert.target} francs. Time to sell.`, tag: alert.id })
  } catch { /* notifications are optional */ }
}
