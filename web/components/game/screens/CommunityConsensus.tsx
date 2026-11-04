'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { revealConsensus } from '@/lib/community/client'
import { PROJECT_LABEL, stateLabel, type ConsensusProject, type ConsensusQueueItem, type ConsensusReadout, type ConsensusVerdict } from '@/lib/community/consensus'
import { REVIEW_FIXTURE_OWN, REVIEW_FIXTURE_READOUT } from '@/lib/community/consensus.fixtures'
import { consensusFixtureState, type ConsensusHookState } from '@/lib/community/useConsensus'
import styles from './CommunityConsensus.module.css'
import sheet from './CommunityBallots.module.css'

/** A reviewer who has finished their own run of the instrument on someone else's subject. */
export interface PendingConsensusReview {
  requestId: string
  project: ConsensusProject
  subjectId: string
  ownReadout: ConsensusReadout
}

interface Props {
  state: ConsensusHookState
  pendingReview: PendingConsensusReview | null
  /** Opens the instrument on this subject, so the reviewer does their own work first. */
  onStartReview: (item: ConsensusQueueItem) => void
  onFinishReview: () => void
}

function ReadoutColumn({ title, readout }: { title: string; readout: ConsensusReadout }) {
  return (
    <div className={styles.col} data-testid={`consensus-readout-${title.toLowerCase().replace(/\W+/g, '-')}`}>
      <h3>{title}</h3>
      {readout.rows.map(row => <div className={styles.row} key={row.label}><b>{row.label}</b><span>{row.value}</span></div>)}
    </div>
  )
}

/** The reviewer's own readout beside the requester's, then Support, Dispute or Unsure. */
function Compare({ pending, state, onFinish }: { pending: PendingConsensusReview; state: ConsensusHookState; onFinish: () => void }) {
  const [theirs, setTheirs] = useState<ConsensusReadout | null>(null)
  const [failed, setFailed] = useState(false)
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (consensusFixtureState()) { setTheirs(REVIEW_FIXTURE_READOUT); return }
    let live = true
    revealConsensus(pending.requestId, pending.ownReadout)
      .then(res => { if (live) setTheirs(res.request.readout) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [pending])

  const send = async (verdict: ConsensusVerdict) => {
    if (await state.vote(pending.requestId, verdict, verdict === 'dispute' ? reason : undefined)) onFinish()
  }

  if (failed) return <p className={styles.problem}>The other readout could not be opened. Check your connection and try again.</p>
  if (!theirs) return <p className={styles.note}>Opening their readout…</p>
  return (
    <div className={styles.wrap} data-testid="consensus-compare">
      <span className={styles.eyebrow}>{PROJECT_LABEL[pending.project]} · {pending.subjectId}</span>
      <div className={styles.compare}>
        <ReadoutColumn title="Yours" readout={pending.ownReadout} />
        <ReadoutColumn title="Theirs" readout={theirs} />
      </div>
      {disputing ? (
        <>
          <textarea className={styles.reason} data-testid="consensus-reason" aria-label="Why do you dispute it?" placeholder="Why do you dispute it?" maxLength={400} value={reason} onChange={e => setReason(e.target.value)} />
          <div className={styles.verdicts}>
            <button type="button" onClick={() => setDisputing(false)}>Back</button>
            <button type="button" data-verdict="dispute" data-testid="consensus-send-dispute" disabled={reason.trim().length < 3} onClick={() => void send('dispute')}>Send dispute</button>
          </div>
        </>
      ) : (
        <div className={styles.verdicts}>
          <button type="button" data-verdict="support" data-testid="consensus-support" onClick={() => void send('support')}>Support</button>
          <button type="button" data-verdict="dispute" data-testid="consensus-dispute" onClick={() => setDisputing(true)}>Dispute</button>
          <button type="button" data-verdict="unsure" data-testid="consensus-unsure" onClick={() => void send('unsure')}>Unsure</button>
        </div>
      )}
      {state.problem && <p className={styles.problem}>{state.problem}</p>}
    </div>
  )
}

function ConsensusBody({ state, pendingReview, onStartReview, onFinishReview }: Props) {
  const fixture = consensusFixtureState()
  const review: PendingConsensusReview | null = pendingReview ?? (fixture === 'review'
    ? { requestId: 'q1', project: 'tess', subjectId: 'TIC 150428135', ownReadout: REVIEW_FIXTURE_OWN }
    : null)

  if (review) return <Compare pending={review} state={state} onFinish={onFinishReview} />

  const { overview } = state
  if (!overview) return <p className={styles.note} data-testid="consensus-empty">Sign in and go online to review other players' work.</p>
  return (
    <div className={styles.wrap} data-testid="consensus-area">
      <p className={styles.note}>{overview.required} supports verify a result right now. Do the work yourself first; their readout opens after.</p>
      <section className={styles.group} aria-label="Needs review">
        <span className={styles.eyebrow}>Needs review</span>
        {overview.queue.length === 0 && <p className={styles.note}>Nothing waiting. Ask for consensus from any classify scene.</p>}
        {overview.queue.map(item => (
          <div className={styles.item} key={item.id} data-testid="consensus-queue-item">
            <span className={styles.itemText}><b>{item.subjectId}</b><span>{PROJECT_LABEL[item.project]}</span></span>
            <button type="button" className={styles.go} data-testid="consensus-review" onClick={() => onStartReview(item)}>Review</button>
          </div>
        ))}
      </section>
      <section className={styles.group} aria-label="Your requests">
        <span className={styles.eyebrow}>Your requests</span>
        {overview.mine.length === 0 && <p className={styles.note}>You have not asked for consensus yet.</p>}
        {overview.mine.map(req => (
          <div className={styles.item} key={req.id} data-state={req.state} data-testid="consensus-mine">
            <span className={styles.itemText}><b>{req.subjectId}</b><span>{PROJECT_LABEL[req.project]}{req.disputes > 0 ? ` · ${req.disputes} dispute${req.disputes === 1 ? '' : 's'}` : ''}</span></span>
            <span className={styles.state}>{stateLabel(req)}</span>
          </div>
        ))}
      </section>
      {state.queued && <p className={styles.note}>Your review will send when you are back online.</p>}
    </div>
  )
}

/** The picker card and sheet. Reachable whether or not a weekly path is chosen. */
export default function CommunityConsensus(props: Props) {
  const [open, setOpen] = useState(() => !!props.pendingReview || consensusFixtureState() === 'review')
  const waiting = props.state.overview?.queue.length ?? 0
  // Back from the instrument with a finished run: open straight on the comparison.
  useEffect(() => { if (props.pendingReview) setOpen(true) }, [props.pendingReview])
  return (
    <>
      <button type="button" className={sheet.entry} data-testid="community-consensus" onClick={() => setOpen(true)}>
        <span className={sheet.entryText}>
          <span className={sheet.eyebrow}>Review</span>
          <b>{waiting > 0 ? `${waiting} classification${waiting === 1 ? '' : 's'} to check` : 'Check classifications, ask for consensus'}</b>
        </span>
        {waiting > 0 && <span className={sheet.badge} aria-label={`${waiting} to review`}>{waiting}</span>}
        <span className={sheet.chevron} aria-hidden="true">›</span>
      </button>
      {open && createPortal(
        <div className={sheet.backdrop} onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
          <div className={sheet.sheet} role="dialog" aria-modal="true" aria-label="Review" data-testid="community-consensus-sheet">
            <header className={sheet.head}>
              <button type="button" className={sheet.back} aria-label="Close review" onClick={() => setOpen(false)}>×</button>
            </header>
            <h2 className={sheet.title}>Review</h2>
            <ConsensusBody {...props} onStartReview={item => { setOpen(false); props.onStartReview(item) }} onFinishReview={() => { props.onFinishReview(); }} />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
