import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const { authWithPassword, getFullList, update, setVapidDetails, sendNotification } = vi.hoisted(() => ({
  authWithPassword: vi.fn(),
  getFullList: vi.fn(),
  update: vi.fn(),
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock('pocketbase', () => ({
  default: vi.fn(function PocketBaseMock(this: { collection: ReturnType<typeof vi.fn> }) {
    this.collection = vi.fn((name: string) => name === '_superusers'
      ? { authWithPassword }
      : { getFullList, update })
  }),
}))

vi.mock('web-push', () => ({
  default: { setVapidDetails, sendNotification },
}))

function cronRequest() {
  return new Request('http://localhost/api/push/cron') as Parameters<typeof GET>[0]
}

describe('/api/push/cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_LANDNAM_PB_URL = 'http://127.0.0.1:8090'
    process.env.VAPID_SUBJECT = 'mailto:ops@example.test'
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'public-key'
    process.env.VAPID_PRIVATE_KEY = 'private-key'
    process.env.LANDNAM_PB_SERVICE_EMAIL = 'cron@example.test'
    process.env.LANDNAM_PB_SERVICE_PASSWORD = 'cron-password'
    delete process.env.CRON_SECRET
    authWithPassword.mockResolvedValue({})
    getFullList.mockResolvedValue([])
  })

  it('authenticates the server-side client before reading protected due notifications', async () => {
    const response = await GET(cronRequest())

    expect(response.status).toBe(200)
    expect(authWithPassword).toHaveBeenCalledWith('cron@example.test', 'cron-password')
    expect(getFullList).toHaveBeenCalledWith(expect.objectContaining({
      filter: expect.stringMatching(/^scheduled_for <= \d+ && sent = false && endpoint ~ "https:\/\/"$/),
    }))
    expect(await response.json()).toEqual({ sent: 0, failed: 0 })
  })

  it('reports unavailable service credentials without throwing a 500', async () => {
    delete process.env.LANDNAM_PB_SERVICE_PASSWORD

    const response = await GET(cronRequest())

    expect(response.status).toBe(503)
    expect(authWithPassword).not.toHaveBeenCalled()
  })
})
