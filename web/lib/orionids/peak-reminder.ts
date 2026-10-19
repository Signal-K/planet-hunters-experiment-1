import { ORIONIDS_PEAK_REMINDER, orionidsPeakReminderMs } from '@/lib/data/sky-events'

type PushKeys = { p256dh?: string; auth?: string }

/** Queue the one peak-night Web Push through scheduled_notifications. The cron sends it. */
export async function scheduleOrionidsPeakReminder(subscription: { endpoint?: string; keys?: PushKeys }): Promise<void> {
  const scheduledFor = orionidsPeakReminderMs()
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) return
  if (Date.now() >= scheduledFor) return
  await fetch('/api/push/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      scheduledFor,
      title: ORIONIDS_PEAK_REMINDER.title,
      body: ORIONIDS_PEAK_REMINDER.body,
    }),
  })
}
