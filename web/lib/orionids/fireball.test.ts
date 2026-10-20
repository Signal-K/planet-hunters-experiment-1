import { describe, expect, it } from 'vitest'
import { MINERAL_META } from '@/lib/data/minerals'
import { FIREBALL_EXCHANGE_MULTIPLE, OPEN_MARKET_SELL_RATE, ORIONID_EXCHANGE_PRICE, ORIONID_FRAGMENT_BOOK } from '@/lib/data/economy'
import {
  FIREBALL_ARTICLE,
  FIREBALL_FRAGMENT_ID,
  FIREBALL_FRAGMENT_PRICE,
  FIREBALL_QUIZ,
  FIREBALL_SPOTTER_BADGE,
  FIREBALL_2026_BADGE,
  fireballDue,
  fireballMomentMs,
  fireballQuizCorrect,
  grantFireballCatch,
  markFireballRead,
  submitFireballQuiz,
  type FireballPlayer,
} from './fireball'

const local = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0, 0, 0).getTime()
const none: FireballPlayer = {}

describe('fireball moment', () => {
  it('is due once, from 02:00 until 06:00 local on 22 Oct', () => {
    expect(fireballMomentMs()).toBe(local(10, 22, 2))
    expect(fireballDue(local(10, 22, 1), null)).toBe(false)
    expect(fireballDue(local(10, 22, 2), null)).toBe(true)
    expect(fireballDue(local(10, 22, 5), null)).toBe(true)
    expect(fireballDue(local(10, 22, 6), null)).toBe(false)
    expect(fireballDue(local(10, 22, 3), local(10, 22, 2))).toBe(false)
  })
})

describe('fireball catch badge', () => {
  it('grants gold once during the window and does not grant a second catch', () => {
    const first = grantFireballCatch(none, local(10, 22, 2))
    expect(first.badge).toMatchObject({ eventId: FIREBALL_2026_BADGE, tier: 'gold' })
    expect(first.player.fireball2026CaughtAt).toBe(local(10, 22, 2))
    const second = grantFireballCatch(first.player, local(10, 22, 3))
    expect(second.badge).toBeNull()
    expect(second.player).toBe(first.player)
  })

  it('is silver after 8 Nov', () => {
    const at = Date.parse('2026-11-20T12:00:00Z')
    expect(grantFireballCatch(none, at).badge?.tier).toBe('silver')
  })

  it('prices the fragment at 15× one Orionid fragment on the Exchange', () => {
    expect(MINERAL_META[FIREBALL_FRAGMENT_ID].price).toBe(FIREBALL_FRAGMENT_PRICE)
    expect(FIREBALL_FRAGMENT_PRICE).toBe(ORIONID_FRAGMENT_BOOK * FIREBALL_EXCHANGE_MULTIPLE)
    expect(Math.round(FIREBALL_FRAGMENT_PRICE * OPEN_MARKET_SELL_RATE)).toBe(ORIONID_EXCHANGE_PRICE * FIREBALL_EXCHANGE_MULTIPLE)
    expect(FIREBALL_EXCHANGE_MULTIPLE).toBe(15)
  })
})

describe('fireball spotter', () => {
  const answers = FIREBALL_QUIZ.map(question => question.answer)

  it('needs the reading and a correct check, gold inside the window', () => {
    expect(FIREBALL_ARTICLE.join(' ')).toContain('fireballsinthesky.com.au')
    expect(fireballQuizCorrect(answers)).toBe(true)
    expect(fireballQuizCorrect([0, 0, 0])).toBe(false)
    const unread = submitFireballQuiz(none, answers, local(10, 22, 2))
    expect(unread.badge).toBeNull()
    const read = markFireballRead(none, local(10, 21, 20))
    const wrong = submitFireballQuiz(read, [0, 0, 0], local(10, 22, 2))
    expect(wrong.badge).toBeNull()
    expect(wrong.player.badges?.[FIREBALL_SPOTTER_BADGE]).toBeUndefined()
    const passed = submitFireballQuiz(read, answers, local(10, 22, 2))
    expect(passed.badge).toMatchObject({ eventId: FIREBALL_SPOTTER_BADGE, tier: 'gold' })
    const again = submitFireballQuiz(passed.player, answers, local(10, 22, 3))
    expect(again.badge).toBeNull()
    expect(again.player).toBe(passed.player)
  })

  it('is silver after 8 Nov', () => {
    const read = markFireballRead(none, Date.parse('2026-11-20T12:00:00Z'))
    const passed = submitFireballQuiz(read, answers, Date.parse('2026-11-20T12:00:00Z'))
    expect(passed.badge?.tier).toBe('silver')
  })
})
