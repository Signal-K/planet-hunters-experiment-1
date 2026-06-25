import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const getFirstListItem = vi.fn()
const update = vi.fn()
const create = vi.fn()

vi.mock('pocketbase', () => ({
  default: vi.fn(function PocketBaseMock(this: { collection: ReturnType<typeof vi.fn> }) {
    this.collection = vi.fn(() => ({ getFirstListItem, update, create }))
  }),
}))

function scheduleRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/push/schedule', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0]
}

describe('/api/push/schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_LANDNAM_PB_URL = 'http://127.0.0.1:8090'
  })

  it('requires subscription keys so cron can send the scheduled notification', async () => {
    const response = await POST(scheduleRequest({
      endpoint: 'https://push.example/subscription',
      scheduledFor: 1_800_000,
      title: 'ARRIVED',
      body: 'Rocket arrived.',
    }))

    expect(response.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('creates a pending notification when no exact duplicate exists', async () => {
    getFirstListItem.mockRejectedValueOnce(new Error('missing'))

    const response = await POST(scheduleRequest({
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'key', auth: 'auth' },
      scheduledFor: 1_800_000,
      title: 'M4 — ARRIVED',
      body: 'Your rocket has reached Vesta.',
    }))

    expect(response.status).toBe(200)
    expect(getFirstListItem).toHaveBeenCalledWith(
      'endpoint = "https://push.example/subscription" && scheduled_for = 1800000 && title = "M4 — ARRIVED" && sent = false',
    )
    expect(create).toHaveBeenCalledWith({
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'key', auth: 'auth' },
      scheduled_for: 1_800_000,
      title: 'M4 — ARRIVED',
      body: 'Your rocket has reached Vesta.',
      sent: false,
    })
  })

  it('updates only the exact pending duplicate', async () => {
    getFirstListItem.mockResolvedValueOnce({ id: 'scheduled_1' })

    const response = await POST(scheduleRequest({
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'key', auth: 'auth' },
      scheduledFor: 1_800_000,
      title: 'M4 — ARRIVED',
      body: 'Updated copy.',
    }))

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith('scheduled_1', {
      scheduled_for: 1_800_000,
      title: 'M4 — ARRIVED',
      body: 'Updated copy.',
    })
    expect(create).not.toHaveBeenCalled()
  })
})
