'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { closesLabel, optionById, policyLabel, voteShare, windowLabel, type Ballot, type BallotOption } from '@/lib/community/ballots'
import type { BallotsState } from '@/lib/community/useBallots'
import styles from './CommunityBallots.module.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function checked(option: BallotOption): string {
  if (!option.verifiedAt) return 'Date not confirmed yet'
  const [, m, d] = option.verifiedAt.split('-').map(Number)
  return `Checked ${d} ${MONTHS[m - 1]}`
}

/** One line for the entry card: what the player should know about this ballot right now. */
function summary(ballot: Ballot, now: number): string {
  const name = ballot.category === 'launch' ? 'Launch' : 'Sky'
  if (ballot.phase === 'pending') return `${name} · following ${optionById(ballot, ballot.defaultOption)?.label.split(':')[0] ?? 'next launch'}`
  if (ballot.phase === 'closed') return `${name} · winner ${optionById(ballot, ballot.winner)?.label ?? 'none'}`
  const mine = optionById(ballot, ballot.myVote)
  return mine ? `${name} · you voted ${mine.label}` : `${name} · ${closesLabel(ballot.closesAt, now).toLowerCase()}`
}

/** One step: one ballot, a few short tiles, and detail only for the option you picked. */
function Step({ ballot, now, onVote }: { ballot: Ballot; now: number; onVote: (option: string) => void }) {
  const mine = optionById(ballot, ballot.myVote)
  if (ballot.phase === 'pending') {
    const following = optionById(ballot, ballot.defaultOption)
    return (
      <div className={styles.body} data-testid={`ballot-following-${ballot.category}`}>
        <span className={styles.eyebrow}>The community is following</span>
        {following && <div className={styles.big}><b>{following.label}</b><span className={styles.when}>{windowLabel(following, now)}</span></div>}
        <p className={styles.line}>The next launch vote opens when launches are confirmed.</p>
        {following && <small className={styles.source}><a href={following.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a> · {checked(following)}</small>}
        <small className={styles.source}>{ballot.disclaimer}</small>
      </div>
    )
  }
  if (ballot.phase === 'closed') {
    const winner = optionById(ballot, ballot.winner)
    return (
      <div className={styles.body}>
        <span className={styles.eyebrow}>Voting closed</span>
        {winner ? (
          <div className={`${styles.big} ${styles.win}`} data-testid={`ballot-winner-${ballot.category}`}>
            <b>{winner.label}</b>
            <span className={styles.when}>{windowLabel(winner, now)}</span>
            <span className={styles.next} data-testid={`ballot-next-${ballot.category}`}>Coming next: {policyLabel(winner.policy)}</span>
          </div>
        ) : <p className={styles.line}>No votes were cast.</p>}
        <ul className={styles.results} aria-label="Final results">
          {ballot.options.map(option => (
            <li key={option.id} data-winner={option.id === ballot.winner || undefined}><span>{option.label}</span><b>{voteShare(ballot, option.id)}%</b></li>
          ))}
        </ul>
      </div>
    )
  }
  const voted = !!ballot.myVote
  return (
    <div className={styles.body}>
      <span className={styles.closes} data-testid={`ballot-closes-${ballot.category}`}>{closesLabel(ballot.closesAt, now)}</span>
      <div role="radiogroup" aria-label={ballot.title} className={styles.options}>
        {ballot.options.map(option => {
          const selected = ballot.myVote === option.id
          const share = voteShare(ballot, option.id)
          return (
            <button key={option.id} type="button" role="radio" aria-checked={selected} className={styles.option} data-selected={selected || undefined}
              data-testid={`ballot-option-${option.id}`} onClick={() => { if (!selected) onVote(option.id) }}>
              <span className={styles.tick} aria-hidden="true">{selected ? '✓' : ''}</span>
              <b>{option.label}</b>
              <span className={styles.when}>{windowLabel(option, now)}</span>
              {voted && (ballot.total ?? 0) > 0 && <span className={styles.share} aria-label={`${share} percent of votes`}><i style={{ width: `${share}%` }} /><em>{share}%</em></span>}
            </button>
          )
        })}
      </div>
      {mine ? (
        <div className={styles.about} data-testid="ballot-about">
          <p className={styles.line}>{mine.detail}</p>
          <small className={styles.source}><a href={mine.sourceUrl} target="_blank" rel="noopener noreferrer">{mine.sourceLabel}</a> · {checked(mine)}</small>
          <small className={styles.source}>{ballot.disclaimer} You can change your vote until it closes.</small>
        </div>
      ) : <p className={styles.hint}>Tap one to vote.</p>}
    </div>
  )
}

/**
 * SSL-757: the community votes. The picker shows one small card; it opens a short flow, one ballot per
 * step. Voting never blocks choosing a path.
 */
export default function CommunityBallots({ state }: { state: BallotsState }) {
  const { ballots, serverNow, queued, problem, vote } = state
  const [step, setStep] = useState<number | null>(null)
  if (!ballots || ballots.length === 0) return null
  const open = ballots.filter(b => b.phase === 'open' && !b.myVote).length
  const ballot = step === null ? null : ballots[Math.min(step, ballots.length - 1)]
  return (
    <>
      <button type="button" className={styles.entry} data-testid="community-ballots" onClick={() => setStep(0)}>
        <span className={styles.entryText}>
          <span className={styles.eyebrow}>Community votes</span>
          <b>{ballots.map(b => summary(b, serverNow)).find((_, i) => ballots[i].phase !== 'pending') ?? summary(ballots[0], serverNow)}</b>
        </span>
        {open > 0 && <span className={styles.badge} aria-label={`${open} to vote on`}>{open}</span>}
        <span className={styles.chevron} aria-hidden="true">›</span>
      </button>
      {ballot && step !== null && createPortal(
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={ballot.title} data-testid="community-ballot-step">
          <header className={styles.head}>
            <button type="button" className={styles.back} aria-label="Close votes" onClick={() => setStep(null)}>‹</button>
            <span className={styles.dots} aria-label={`Step ${step + 1} of ${ballots.length}`}>
              {ballots.map((b, i) => <i key={b.key} data-on={i === step || undefined} />)}
            </span>
          </header>
          <h2 className={styles.title}>{ballot.title}</h2>
          <Step ballot={ballot} now={serverNow} onVote={option => vote(ballot.key, option)} />
          {queued && <p className={styles.note} role="status">Saved on this device. It sends when you are back online.</p>}
          {problem && <p className={styles.note} role="alert">{problem}</p>}
          <footer className={styles.foot}>
            {step > 0 && <button type="button" className={styles.ghost} onClick={() => setStep(step - 1)}>Back</button>}
            {step < ballots.length - 1
              ? <button type="button" className={styles.primary} data-testid="ballot-next" onClick={() => setStep(step + 1)}>Next</button>
              : <button type="button" className={styles.primary} onClick={() => setStep(null)}>Done</button>}
          </footer>
        </div>,
        document.body,
      )}
    </>
  )
}
