export interface ScheduledPush {
  title: string
  body: string
  scheduledFor?: number
}

/**
 * Sends Takeon alerts through Landnam's existing scheduled_notifications
 * route. If push is unsupported or not enabled, gameplay continues silently.
 */
export async function scheduleLandnamPush(notification: ScheduledPush): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const response = await fetch('/api/push/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      scheduledFor: notification.scheduledFor ?? Date.now() + 1000,
      title: notification.title,
      body: notification.body,
    }),
  })
  if (!response.ok) {
    throw new Error(`Unable to schedule Landnam notification (${response.status})`)
  }
}
