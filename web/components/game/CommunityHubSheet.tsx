'use client'

// Community Hub (SSL-320): the No Man's Sky style shared space where players
// document and discuss discoveries, creations and worlds. Everything shown is a
// read-only snapshot delivered by the Landnam PocketBase community routes, which
// apply friend/public visibility server-side. Nothing here can change another
// player's world.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useGame } from '@/game-context'
import PageSurface from '@/components/ui/PageSurface'
import ScenePanel from '@/components/game/ScenePanel'
import { HubWorldBackground } from '@/components/game/hub/HubWorldBackground'
import { useTimeOfDay } from '@/lib/hooks/useTimeOfDay'
import { HUB_SECTIONS, type HubChannel, type ShareComment, type SharePost } from '@/lib/data/community'
import { TARGETS, LIFE_STAGE_LABELS, lifeStageForTarget } from '@/lib/data'
import { PROGRAMMES } from '@/lib/data/programmes'
import {
  CommunityApiError,
  fetchHubFeed,
  fetchShareComments,
  postShareComment,
  publishShare,
  reactToShare,
} from '@/lib/community/client'
import styles from './CommunityHubSheet.module.css'

interface CommunityHubSheetProps {
  onClose: () => void
}

function programmeName(id: string): string {
  return PROGRAMMES.find(p => p.id === id)?.title ?? id
}

function timeAgo(ms: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - ms) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

function SnapshotChips({ post }: { post: SharePost }) {
  const chips: string[] = []
  const snap = post.snapshot
  if (post.targetId) chips.push(TARGETS.find(t => t.id === post.targetId)?.name ?? post.targetId)
  if (Array.isArray(snap.structures)) chips.push(`${snap.structures.length} structures`)
  if (Array.isArray(snap.biomes) && snap.biomes.length) chips.push(`${snap.biomes.length} biomes`)
  if (typeof snap.lifeStage === 'string') chips.push(`life: ${snap.lifeStage}`)
  if (typeof snap.candidateId === 'string') chips.push(snap.candidateId)
  if (typeof snap.divisions === 'number') chips.push(`${snap.divisions} divisions claimed`)
  if (chips.length === 0) return null
  return (
    <div className={styles.snapshotList}>
      {chips.map(chip => <span key={chip} className={styles.snapshotChip}>{chip}</span>)}
    </div>
  )
}

function PostCard({ post, now, onReact }: { post: SharePost; now: number; onReact: (id: string, reaction: 'signal' | 'build') => void }) {
  const game = useGame()
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<ShareComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const loadComments = useCallback(async () => {
    try {
      const res = await fetchShareComments(post.id)
      setComments(res.comments)
    } catch {
      setComments([])
    }
  }, [post.id])

  useEffect(() => {
    if (open && comments === null) void loadComments()
  }, [comments, loadComments, open])

  async function submit() {
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    try {
      await postShareComment(post.id, body)
      setDraft('')
      await loadComments()
    } catch (err) {
      game.addToast(err instanceof CommunityApiError ? err.message : 'Could not post comment', 'warn')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={styles.post} data-testid={`hub-post-${post.id}`}>
      <div className={styles.postHead}>
        <span className={styles.kind}><span className={styles.kindDot} />{post.kind}</span>
        <strong className={styles.postTitle}>{post.title}</strong>
      </div>
      <p className={styles.meta}>
        {post.authorName} · {programmeName(post.programmeId)} · {timeAgo(post.createdAt, now)} · {post.visibility}
      </p>
      {post.summary && <p className={styles.summary}>{post.summary}</p>}
      <SnapshotChips post={post} />
      <div className={styles.postActions}>
        <button type="button" className={styles.reaction} onClick={() => onReact(post.id, 'signal')} data-testid="hub-react-signal">
          SIGNAL · {post.reactions.signal}
        </button>
        <button type="button" className={styles.reaction} onClick={() => onReact(post.id, 'build')} data-testid="hub-react-build">
          NICE BUILD · {post.reactions.build}
        </button>
        <button type="button" className={styles.reaction} onClick={() => setOpen(o => !o)} aria-expanded={open} data-testid="hub-comments-toggle">
          {open ? 'HIDE THREAD' : `THREAD · ${post.commentCount}`}
        </button>
      </div>
      {open && (
        <div className={styles.comments}>
          {comments === null && <div className={styles.status}>Loading thread…</div>}
          {comments?.length === 0 && <div className={styles.status}>No replies yet. Start the thread.</div>}
          {comments?.map(c => (
            <div key={c.id} className={styles.comment}>
              <span className={styles.commentAuthor}>{c.authorName} · {timeAgo(c.createdAt, now)}</span>
              <p className={styles.commentBody}>{c.body}</p>
            </div>
          ))}
          <div className={styles.composer}>
            <input
              className={styles.input}
              value={draft}
              maxLength={500}
              placeholder="Reply to this share"
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void submit() }}
              data-testid="hub-comment-input"
            />
            <button type="button" className={styles.button} disabled={busy || !draft.trim()} onClick={submit} data-testid="hub-comment-send">
              REPLY
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

/** Things the player can share from here: discovered bodies (discovery) and claimed worlds (world). */
function ShareFromLog({ onShared }: { onShared: () => void }) {
  const game = useGame()
  const [busyId, setBusyId] = useState<string | null>(null)
  const now = Date.now()

  const discoveries = useMemo(
    () => Object.values(game.player.discoveredExoplanetTargets ?? {}),
    [game.player.discoveredExoplanetTargets],
  )
  const claimedBodies = useMemo(() => {
    const byTarget = new Map<string, number>()
    for (const claim of game.player.territoryClaims ?? []) {
      byTarget.set(claim.targetId, (byTarget.get(claim.targetId) ?? 0) + 1)
    }
    return [...byTarget.entries()]
  }, [game.player.territoryClaims])

  async function share(kind: 'discovery' | 'world', targetId: string, visibility: 'friends' | 'public') {
    const target = TARGETS.find(t => t.id === targetId) ?? discoveries.find(t => t.id === targetId)
    if (!target) return
    setBusyId(targetId)
    try {
      if (kind === 'discovery') {
        await publishShare({
          kind,
          programmeId: 'tess-transit-search',
          title: `${target.name} confirmed`,
          summary: `Transit candidate accepted into the exoplanet catalogue. Period ${target.periodDays ?? '?'} d, radius ${target.planetRadiusEarth ?? '?'} Earth radii.`,
          visibility,
          targetId,
          snapshot: { candidateId: target.id, periodDays: target.periodDays ?? null, radiusEarth: target.planetRadiusEarth ?? null },
        })
      } else {
        const divisions = claimedBodies.find(([id]) => id === targetId)?.[1] ?? 0
        const stage = lifeStageForTarget(target, game.player.biosphereSeeds?.[targetId], now)
        await publishShare({
          kind,
          programmeId: 'biosphere-seeding',
          title: `${target.name} · ${divisions} division${divisions === 1 ? '' : 's'} claimed`,
          summary: `Life stage ${LIFE_STAGE_LABELS[stage]}. Claims are held by beacon; visits are read-only.`,
          visibility,
          targetId,
          snapshot: { divisions, lifeStage: stage },
        })
      }
      game.addToast('Shared to the hub', 'ok')
      onShared()
    } catch (err) {
      game.addToast(err instanceof CommunityApiError ? err.message : 'Sign in to share to the hub', 'warn')
    } finally {
      setBusyId(null)
    }
  }

  if (discoveries.length === 0 && claimedBodies.length === 0) {
    return <div className={styles.status}>Nothing to share yet. Confirm a transit candidate or stake a division with a beacon.</div>
  }

  return (
    <div className={styles.shareGrid} data-testid="hub-share-grid">
      {discoveries.map(target => (
        <div key={`d-${target.id}`} className={styles.shareCard}>
          <span className={styles.kind}><span className={styles.kindDot} />discovery</span>
          <strong>{target.name}</strong>
          <div className={styles.postActions}>
            <button type="button" className={styles.button} disabled={busyId === target.id} onClick={() => share('discovery', target.id, 'friends')}>FRIENDS</button>
            <button type="button" className={styles.button} disabled={busyId === target.id} onClick={() => share('discovery', target.id, 'public')}>PUBLIC</button>
          </div>
        </div>
      ))}
      {claimedBodies.map(([targetId, divisions]) => (
        <div key={`w-${targetId}`} className={styles.shareCard}>
          <span className={styles.kind}><span className={styles.kindDot} />world</span>
          <strong>{TARGETS.find(t => t.id === targetId)?.name ?? targetId} · {divisions} claimed</strong>
          <div className={styles.postActions}>
            <button type="button" className={styles.button} disabled={busyId === targetId} onClick={() => share('world', targetId, 'friends')}>FRIENDS</button>
            <button type="button" className={styles.button} disabled={busyId === targetId} onClick={() => share('world', targetId, 'public')}>PUBLIC</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CommunityHubSheet({ onClose }: CommunityHubSheetProps) {
  const game = useGame()
  const [channel, setChannel] = useState<HubChannel>('discoveries')
  const [posts, setPosts] = useState<SharePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { phase: skyPhase } = useTimeOfDay()

  const section = HUB_SECTIONS.find(s => s.channel === channel) ?? HUB_SECTIONS[0]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchHubFeed(channel)
      setPosts(res.posts)
      setNow(Date.now())
    } catch (err) {
      setError(err instanceof CommunityApiError && err.status === 401
        ? 'Sign in to read the hub.'
        : err instanceof Error ? err.message : 'Could not load the hub')
    } finally {
      setLoading(false)
    }
  }, [channel])

  useEffect(() => { void load() }, [load])

  async function react(postId: string, reaction: 'signal' | 'build') {
    try {
      const res = await reactToShare(postId, reaction)
      setPosts(list => list.map(p => (p.id === postId ? res.post : p)))
    } catch (err) {
      game.addToast(err instanceof CommunityApiError ? err.message : 'Could not react', 'warn')
    }
  }

  return (
    <PageSurface
      className="theme-deep"
      zIndex={210}
      contentTestId="community-hub-page"
      contentStyle={{ background: 'transparent', padding: 0, overflow: 'hidden' }}
    >
      <ScenePanel ambient="survey" scene={<HubWorldBackground phase={skyPhase} />}>
        <div className={styles.shell}>
          <div className={styles.deck}>
            <div className={styles.header}>
              <div>
                <div className={styles.eyebrow}>Earth Base · Community Hub</div>
                <div className={styles.title}>Shared Log</div>
                <p className={styles.lede}>
                  Discoveries, field builds and claimed worlds other crews chose to show. Every entry is a snapshot: you can look, react and discuss, never change.
                </p>
              </div>
              <button type="button" className={styles.close} onClick={onClose} data-testid="community-hub-close">CLOSE</button>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Hub sections">
              {HUB_SECTIONS.map(s => (
                <button
                  key={s.channel}
                  type="button"
                  role="tab"
                  aria-selected={channel === s.channel}
                  className={styles.tab}
                  onClick={() => setChannel(s.channel)}
                  data-testid={`hub-tab-${s.channel}`}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <p className={styles.help}>{section.help}</p>

            <div className={styles.postActions} style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={`${styles.button} ${shareOpen ? styles.buttonActive : ''}`}
                onClick={() => setShareOpen(o => !o)}
                aria-expanded={shareOpen}
                data-testid="hub-share-toggle"
              >
                {shareOpen ? 'HIDE SHARE LOG' : 'SHARE FROM YOUR LOG'}
              </button>
              <button type="button" className={styles.button} onClick={() => void load()} data-testid="hub-refresh">REFRESH</button>
            </div>
            {shareOpen && <div style={{ marginBottom: 24 }}><ShareFromLog onShared={() => void load()} /></div>}

            {loading && <div className={styles.status}>Loading shared log…</div>}
            {error && <div className={`${styles.status} ${styles.statusError}`} data-testid="hub-error">{error}</div>}
            {!loading && !error && posts.length === 0 && (
              <div className={styles.status} data-testid="hub-empty">
                Nothing in {section.title} yet. Friends' shares appear here as soon as they post; public shares reach everyone.
              </div>
            )}
            {!loading && !error && posts.length > 0 && (
              <div className={styles.feed} data-testid="hub-feed">
                {posts.map(post => <PostCard key={post.id} post={post} now={now} onReact={react} />)}
              </div>
            )}
          </div>
        </div>
      </ScenePanel>
    </PageSurface>
  )
}
