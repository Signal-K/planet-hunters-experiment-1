'use client'

import { useEffect, useState } from 'react'
import Panel from '@/components/ui/Panel'
import { pbShared } from '@/lib/pb'
import { fetchComments, postComment, type Comment, type CommentRecordType } from '@/lib/comments'

interface CommentsPanelProps {
  recordType: CommentRecordType
  recordId: string
}

const MAX_BODY_LENGTH = 2000

// Flat comment list for a classification candidate (STS 3qi9bp). No
// websockets/polling loop for v1 (non-goal in the accepted spec) — comments
// are fetched on mount and refreshed after a successful post. No threaded
// replies.
export default function CommentsPanel({ recordType, recordId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // KES-151: must not read authStore synchronously at initial render — the
  // SDK already has localStorage-backed state by the time this module
  // evaluates on the client, but the server always renders as signed-out,
  // producing a hydration mismatch. Deferred to the effect below instead.
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    // onChange only fires on future changes, not the store's current value —
    // set it explicitly once on mount so an already-signed-in device doesn't
    // stay stuck showing isAuthed=false until its next auth event.
    setIsAuthed(pbShared.authStore.isValid)
    return pbShared.authStore.onChange(() => setIsAuthed(pbShared.authStore.isValid))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    fetchComments(recordType, recordId)
      .then(list => { if (!cancelled) setComments(list) })
      .catch(error => {
        console.warn('[comments] fetch failed', error)
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [recordType, recordId])

  const handleSubmit = async () => {
    const body = draft.trim()
    if (!body || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await postComment(recordType, recordId, body)
      setComments(prev => [created, ...prev])
      setDraft('')
    } catch (error) {
      console.warn('[comments] post failed', error)
      setSubmitError('Could not post comment. Try again in a few seconds.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel accent="var(--ln-cyan)" style={{ padding: 12 }}>
      <div className="ln-section-label">Comments</div>

      {loading ? (
        <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
          Loading comments…
        </div>
      ) : loadFailed ? (
        <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
          Could not load comments.
        </div>
      ) : comments.length === 0 ? (
        <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
          No comments yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
          {comments.map(comment => (
            <div
              key={comment.id}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(20,20,23,0.5)',
                border: '1px solid var(--ln-hairline)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ln-cyan-bright)',
                }}>
                  {comment.authorName}
                </span>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)' }}>
                  {new Date(comment.created).toLocaleString()}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#c7d4e6', whiteSpace: 'pre-wrap' }}>
                {comment.body}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        {isAuthed ? (
          <>
            <textarea
              data-testid="comment-input"
              value={draft}
              onChange={event => setDraft(event.target.value.slice(0, MAX_BODY_LENGTH))}
              placeholder="Add a comment…"
              rows={2}
              style={{
                width: '100%',
                resize: 'vertical',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--ln-hairline-strong)',
                background: 'rgba(20,20,23,0.6)',
                color: '#e8f0fe',
                fontFamily: 'var(--ln-font-body)',
                fontSize: 12,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: submitError ? 'var(--ln-crimson)' : 'var(--ln-text-muted)' }}>
                {submitError ?? `${draft.length}/${MAX_BODY_LENGTH}`}
              </span>
              <button
                data-testid="comment-submit"
                onClick={handleSubmit}
                disabled={!draft.trim() || submitting}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(112,217,234,0.6)',
                  background: !draft.trim() || submitting ? 'rgba(20,20,23,0.5)' : 'rgba(112,217,234,0.18)',
                  color: 'var(--ln-cyan-bright)',
                  fontFamily: 'var(--ln-font-display)',
                  fontWeight: 800,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: !draft.trim() || submitting ? 'not-allowed' : 'pointer',
                  opacity: !draft.trim() || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)' }}>
            Sign in to post a comment.
          </div>
        )}
      </div>
    </Panel>
  )
}
