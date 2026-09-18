import { describe, expect, it } from 'vitest'
import {
  allowedVisitorActions,
  canRemoveComment,
  canReportComment,
  canVisitorAct,
  COMMENT_HIDE_AFTER_REPORTS,
  createSharePost,
  HOST_ONLY_ACTIONS,
  HUB_SECTIONS,
  isCommentHidden,
  isReportReason,
  relationTo,
  REPORT_REASONS,
  SHARE_KIND_CHANNEL,
  SHARE_TITLE_MAX,
  visibleSharePosts,
} from './community'
import { PROGRAMMES } from './programmes'

const ME = { id: 'me', name: 'Me' }
const FRIEND = { id: 'friend', name: 'Friend' }
const STRANGER = { id: 'stranger', name: 'Stranger' }

describe('visitor permissions', () => {
  it('never grants a host-only action to a visitor, whatever the visibility', () => {
    for (const relation of ['friend', 'stranger'] as const) {
      for (const visibility of ['private', 'friends', 'public'] as const) {
        for (const action of HOST_ONLY_ACTIONS) {
          expect(canVisitorAct(action, relation, visibility)).toBe(false)
        }
      }
    }
  })

  it('friends see friends-only shares, strangers only public ones', () => {
    expect(allowedVisitorActions('friend', 'friends')).toContain('view')
    expect(allowedVisitorActions('stranger', 'friends')).toEqual([])
    expect(allowedVisitorActions('stranger', 'public')).toContain('comment')
    expect(allowedVisitorActions('friend', 'private')).toEqual([])
  })

  it('the owner keeps every action', () => {
    expect(allowedVisitorActions('owner', 'private')).toEqual(expect.arrayContaining([...HOST_ONLY_ACTIONS, 'view']))
  })
})

describe('share posts', () => {
  it('clamps copy and defaults to friends visibility', () => {
    const post = createSharePost({ kind: 'creation', programmeId: 'surface-builds', author: ME, title: 'x'.repeat(200), now: 5 })
    expect(post.title).toHaveLength(SHARE_TITLE_MAX)
    expect(post.visibility).toBe('friends')
    expect(post.reactions).toEqual({ signal: 0, build: 0 })
    expect(() => createSharePost({ kind: 'creation', programmeId: 'surface-builds', author: ME, title: '   ' })).toThrow()
  })

  it('filters a feed by relation, visibility and channel, newest first', () => {
    const posts = [
      createSharePost({ kind: 'discovery', programmeId: 'tess-transit-search', author: FRIEND, title: 'friend private', visibility: 'private', now: 1 }),
      createSharePost({ kind: 'discovery', programmeId: 'tess-transit-search', author: FRIEND, title: 'friend friends', now: 2 }),
      createSharePost({ kind: 'base', programmeId: 'base-showcase', author: STRANGER, title: 'stranger friends', now: 3 }),
      createSharePost({ kind: 'base', programmeId: 'base-showcase', author: STRANGER, title: 'stranger public', visibility: 'public', now: 4 }),
      createSharePost({ kind: 'world', programmeId: 'biosphere-seeding', author: ME, title: 'mine private', visibility: 'private', now: 5 }),
    ]
    const viewer = { id: ME.id, friendIds: [FRIEND.id] }
    expect(visibleSharePosts(posts, viewer).map(p => p.title)).toEqual(['mine private', 'stranger public', 'friend friends'])
    expect(visibleSharePosts(posts, viewer, 'discoveries').map(p => p.title)).toEqual(['friend friends'])
    expect(visibleSharePosts(posts, viewer, 'creations').map(p => p.title)).toEqual(['stranger public'])
  })

  it('resolves relations', () => {
    const viewer = { id: ME.id, friendIds: [FRIEND.id] }
    expect(relationTo(viewer, ME.id)).toBe('owner')
    expect(relationTo(viewer, FRIEND.id)).toBe('friend')
    expect(relationTo(viewer, STRANGER.id)).toBe('stranger')
  })
})

describe('comment moderation', () => {
  const post = { authorId: 'host' }
  const comment = { authorId: 'stranger', reportCount: 0 }

  it('lets strangers comment on public posts, never on friends-only ones', () => {
    expect(canVisitorAct('comment', 'stranger', 'public')).toBe(true)
    expect(canVisitorAct('comment', 'stranger', 'friends')).toBe(false)
  })

  it('anyone but the author can report; author or host can remove', () => {
    expect(canReportComment('me', comment)).toBe(true)
    expect(canReportComment('stranger', comment)).toBe(false)
    expect(canRemoveComment('stranger', comment, post)).toBe(true)
    expect(canRemoveComment('host', comment, post)).toBe(true)
    expect(canRemoveComment('me', comment, post)).toBe(false)
  })

  it('hides a comment at the report threshold with fixed reasons only', () => {
    expect(isCommentHidden({ reportCount: COMMENT_HIDE_AFTER_REPORTS - 1 })).toBe(false)
    expect(isCommentHidden({ reportCount: COMMENT_HIDE_AFTER_REPORTS })).toBe(true)
    expect(REPORT_REASONS.length).toBeGreaterThanOrEqual(3)
    expect(isReportReason('spam')).toBe(true)
    expect(isReportReason('I just do not like it')).toBe(false)
  })
})

describe('hub structure', () => {
  it('every programme routes into a hub section that accepts its share kinds', () => {
    const channels = new Set(HUB_SECTIONS.map(s => s.channel))
    for (const programme of PROGRAMMES) {
      expect(channels.has(programme.sharing.hubChannel), programme.id).toBe(true)
    }
    for (const [kind, channel] of Object.entries(SHARE_KIND_CHANNEL)) {
      const section = HUB_SECTIONS.find(s => s.channel === channel)
      expect(section?.kinds, kind).toContain(kind)
    }
  })
})
