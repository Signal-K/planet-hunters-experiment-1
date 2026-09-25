// Community layer: shared bases, world visits, creations and the hub (SSL-320).
//
// Rules (ZenNotes `projects/landnam/decisions/shared-worlds-and-community-hub.md`):
//  - A visit is always read-only. Visitors never mine, build, demolish, move
//    the host's rover, or change the host's claims. Griefing is impossible by
//    construction, not by moderation.
//  - Friends see each other's bases and worlds by default; strangers only see
//    what a player explicitly shares as `public`.
//  - Strangers may comment on public posts as well as react (decided
//    2026-09-19). The counterweight is a report flow: any viewer can report a
//    comment once with a fixed reason, a comment is hidden after
//    `COMMENT_HIDE_AFTER_REPORTS` distinct reports, and the comment author or
//    the post author can remove it outright.
//  - Every share is a snapshot with provenance (programme id), so a discovery
//    and a creation travel through the same hub with the same shape.

import type { HubChannel, ShareVisibility } from './programmes'

export type { HubChannel, ShareVisibility } from './programmes'

/** Relationship between the viewer and the owner of what they are looking at. */
export type ViewerRelation = 'owner' | 'friend' | 'stranger'

export type VisitorAction =
  | 'view'
  | 'comment'
  | 'react'
  | 'copy-layout'
  | 'mine'
  | 'build'
  | 'demolish'
  | 'drive'
  | 'claim'

/** Actions that mutate the host's world. Never granted to a visitor. */
export const HOST_ONLY_ACTIONS: readonly VisitorAction[] = ['mine', 'build', 'demolish', 'drive', 'claim']

const SOCIAL_ACTIONS: readonly VisitorAction[] = ['view', 'comment', 'react', 'copy-layout']

/** Which actions a viewer may take, by relation and the share's visibility. */
export function allowedVisitorActions(relation: ViewerRelation, visibility: ShareVisibility): VisitorAction[] {
  if (relation === 'owner') return [...SOCIAL_ACTIONS, ...HOST_ONLY_ACTIONS]
  if (visibility === 'private') return []
  if (visibility === 'friends' && relation !== 'friend') return []
  return [...SOCIAL_ACTIONS]
}

export function canVisitorAct(action: VisitorAction, relation: ViewerRelation, visibility: ShareVisibility): boolean {
  return allowedVisitorActions(relation, visibility).includes(action)
}

/** What a viewer of a given relation can see of another player's work. */
function visibleTo(relation: ViewerRelation, visibility: ShareVisibility): boolean {
  return allowedVisitorActions(relation, visibility).includes('view')
}

// ── Share posts ────────────────────────────────────────────────────────────

export type ShareKind = 'base' | 'creation' | 'discovery' | 'world'

export const SHARE_KIND_CHANNEL: Record<ShareKind, HubChannel> = {
  base: 'creations',
  creation: 'creations',
  discovery: 'discoveries',
  world: 'worlds',
}

export interface ShareReactionCounts {
  /** Shape + label reactions only (no emoji in UI). */
  signal: number
  build: number
}

/** A read-only snapshot another player can open. Never a live pointer to the host's state. */
export interface SharePost {
  id: string
  kind: ShareKind
  /** Programme that produced the shared thing (see PROGRAMMES). */
  programmeId: string
  authorId: string
  authorName: string
  title: string
  summary: string
  visibility: ShareVisibility
  /** Target the share is about, for world/creation/discovery shares. */
  targetId?: string
  divisionId?: string
  /** Kind-specific snapshot data, e.g. structures list or candidate id. */
  snapshot: Record<string, unknown>
  reactions: ShareReactionCounts
  commentCount: number
  createdAt: number
}

export interface ShareComment {
  id: string
  postId: string
  authorId: string
  authorName: string
  body: string
  createdAt: number
  /** Distinct reports so far; the server hides the comment at the threshold. */
  reportCount?: number
}

export const SHARE_TITLE_MAX = 64
const SHARE_SUMMARY_MAX = 280

// ── Moderation ─────────────────────────────────────────────────────────────

/** Fixed report reasons: no free text, so a report cannot itself be abuse. */
export const REPORT_REASONS = [
  { id: 'abuse', label: 'Abusive or harassing' },
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'off-topic', label: 'Not about the share' },
  { id: 'personal', label: 'Personal information' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['id']

/** A comment disappears from every thread once this many different players report it. */
export const COMMENT_HIDE_AFTER_REPORTS = 3

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.some(r => r.id === value)
}

/** Anyone but the comment's own author may report it, once. */
export function canReportComment(viewerId: string, comment: Pick<ShareComment, 'authorId'>): boolean {
  return viewerId !== comment.authorId
}

/** The comment author and the post author can remove a comment; nobody else. */
export function canRemoveComment(
  viewerId: string,
  comment: Pick<ShareComment, 'authorId'>,
  post: Pick<SharePost, 'authorId'>,
): boolean {
  return viewerId === comment.authorId || viewerId === post.authorId
}

/** True once a comment has crossed the hide threshold. Mirrors the server rule. */
export function isCommentHidden(comment: Pick<ShareComment, 'reportCount'>): boolean {
  return (comment.reportCount ?? 0) >= COMMENT_HIDE_AFTER_REPORTS
}

export interface NewShareInput {
  kind: ShareKind
  programmeId: string
  author: { id: string; name: string }
  title: string
  summary?: string
  visibility?: ShareVisibility
  targetId?: string
  divisionId?: string
  snapshot?: Record<string, unknown>
  now?: number
}

/** Build a share post, clamping copy to the hub limits. */
export function createSharePost(input: NewShareInput): SharePost {
  const now = input.now ?? Date.now()
  const title = input.title.trim().slice(0, SHARE_TITLE_MAX)
  if (!title) throw new Error('A share needs a title.')
  return {
    id: `share:${input.author.id}:${input.kind}:${now}`,
    kind: input.kind,
    programmeId: input.programmeId,
    authorId: input.author.id,
    authorName: input.author.name,
    title,
    summary: (input.summary ?? '').trim().slice(0, SHARE_SUMMARY_MAX),
    visibility: input.visibility ?? 'friends',
    targetId: input.targetId,
    divisionId: input.divisionId,
    snapshot: input.snapshot ?? {},
    reactions: { signal: 0, build: 0 },
    commentCount: 0,
    createdAt: now,
  }
}

/** Posts a viewer may see, newest first, optionally narrowed to one hub channel. */
export function visibleSharePosts(
  posts: readonly SharePost[],
  viewer: { id: string; friendIds: readonly string[] },
  channel?: HubChannel,
): SharePost[] {
  return posts
    .filter(post => {
      if (channel && SHARE_KIND_CHANNEL[post.kind] !== channel) return false
      const relation = relationTo(viewer, post.authorId)
      return visibleTo(relation, post.visibility)
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function relationTo(viewer: { id: string; friendIds: readonly string[] }, ownerId: string): ViewerRelation {
  if (viewer.id === ownerId) return 'owner'
  return viewer.friendIds.includes(ownerId) ? 'friend' : 'stranger'
}

// ── Hub structure ──────────────────────────────────────────────────────────

export interface HubSection {
  channel: HubChannel
  title: string
  help: string
  /** Share kinds that appear in this section. */
  kinds: readonly ShareKind[]
}

/**
 * The long-term community hub (No Man's Sky style): one place to document,
 * share and discuss. Sections are fixed; programmes route into them via
 * `ProgrammeSharing.hubChannel`.
 */
export const HUB_SECTIONS: readonly HubSection[] = [
  { channel: 'discoveries', title: 'Discoveries', help: 'Accepted citizen-science results, with provenance and who contributed.', kinds: ['discovery'] },
  { channel: 'creations', title: 'Creations', help: 'Bases and field builds other players chose to show.', kinds: ['base', 'creation'] },
  { channel: 'worlds', title: 'Worlds', help: 'Discovered and claimed bodies: owner, divisions, biomes and life stage.', kinds: ['world'] },
  { channel: 'discussion', title: 'Discussion', help: 'Threads on any shared post. Read-only visits, nothing here changes a world.', kinds: ['discovery', 'creation', 'base', 'world'] },
]

/** Snapshot shape for a shared field build. Only what a visitor needs to render, never live sim state. */
export interface CreationSnapshot {
  bodyId: string
  structures: { type: string; x: number; y: number; facing: number }[]
  biomes: string[]
  lifeStage: string
}
