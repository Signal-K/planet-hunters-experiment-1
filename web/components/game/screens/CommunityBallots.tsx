'use client'

import { closesLabel, optionById, policyLabel, voteShare, windowLabel, type Ballot, type BallotOption } from '@/lib/community/ballots'
import type { BallotsState } from '@/lib/community/useBallots'
import styles from './CommunityBallots.module.css'

function verifiedLabel(option: BallotOption): string {
  if (!option.verifiedAt) return 'Date not confirmed by the operator yet'
  const [, m, d] = option.verifiedAt.split('-').map(Number)
  return `Dates checked ${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}`
}

function Source({ option }: { option: BallotOption }) {
  return (
    <small className={styles.source}>
      <a href={option.sourceUrl} target="_blank" rel="noopener noreferrer">{option.sourceLabel}</a> · {verifiedLabel(option)}
    </small>
  )
}

function OpenBallot({ ballot, now, onVote }: { ballot: Ballot; now: number; onVote: (option: string) => void }) {
  const voted = !!ballot.myVote
  return (
    <>
      <div className={styles.closes} data-testid={`ballot-closes-${ballot.category}`}>{closesLabel(ballot.closesAt, now)}{voted ? ' · you can change your vote' : ''}</div>
      <div role="radiogroup" aria-label={ballot.title} className={styles.options}>
        {ballot.options.map(option => {
          const selected = ballot.myVote === option.id
          const share = voteShare(ballot, option.id)
          return (
            <button key={option.id} type="button" role="radio" aria-checked={selected} className={styles.option} data-selected={selected || undefined}
              data-testid={`ballot-option-${option.id}`} onClick={() => { if (!selected) onVote(option.id) }}>
              <span className={styles.optionHead}>
                <b>{option.label}</b>
                <span className={styles.when}>{windowLabel(option, now)}</span>
              </span>
              <span className={styles.detail}>{option.detail}</span>
              {voted && (ballot.total ?? 0) > 0 && <span className={styles.share} aria-label={`${share} percent of votes`}><i style={{ width: `${share}%` }} /><em>{share}%</em></span>}
              <span className={styles.mark} aria-hidden="true">{selected ? '✓ Your vote' : ''}</span>
            </button>
          )
        })}
      </div>
      <Source option={optionById(ballot, ballot.myVote) ?? ballot.options[0]} />
    </>
  )
}

function ClosedBallot({ ballot, now }: { ballot: Ballot; now: number }) {
  const winner = optionById(ballot, ballot.winner)
  return (
    <>
      {winner ? (
        <div className={styles.winner} data-testid={`ballot-winner-${ballot.category}`}>
          <span className={styles.eyebrow}>Winner</span>
          <b>{winner.label}</b>
          <span>{windowLabel(winner, now)}</span>
          <span className={styles.next} data-testid={`ballot-next-${ballot.category}`}>Coming next: {policyLabel(winner.policy)}</span>
        </div>
      ) : <div className={styles.closes}>Voting closed. No votes were cast.</div>}
      <ul className={styles.results} aria-label="Final results">
        {ballot.options.map(option => (
          <li key={option.id} data-winner={option.id === ballot.winner || undefined}>
            <span>{option.label}{ballot.myVote === option.id ? ' · your vote' : ''}</span>
            <b>{voteShare(ballot, option.id)}%</b>
          </li>
        ))}
      </ul>
    </>
  )
}

function PendingBallot({ ballot, now }: { ballot: Ballot; now: number }) {
  const following = optionById(ballot, ballot.defaultOption)
  if (!following) return null
  return (
    <div className={styles.following} data-testid={`ballot-following-${ballot.category}`}>
      <span className={styles.eyebrow}>The community is following</span>
      <b>{following.label}</b>
      <span className={styles.when}>{windowLabel(following, now)}</span>
      <span className={styles.detail}>{following.detail}</span>
      <Source option={following} />
      <span className={styles.soon}>The vote for the launch after this one opens once the next launches are confirmed.</span>
    </div>
  )
}

/** SSL-757: the community votes, shown beside the weekly path choice. They never block it. */
export default function CommunityBallots({ state }: { state: BallotsState }) {
  const { ballots, serverNow, queued, problem, vote } = state
  if (!ballots || ballots.length === 0) return null
  return (
    <div className={styles.panel} data-testid="community-ballots">
      {ballots.map(ballot => (
        <section key={ballot.key} className={styles.ballot} data-phase={ballot.phase} data-testid={`ballot-${ballot.category}`} aria-label={ballot.title}>
          <span className={styles.eyebrow}>{ballot.category === 'launch' ? 'Launch vote' : 'Sky vote'}</span>
          <h3>{ballot.title}</h3>
          <p className={styles.blurb}>{ballot.blurb}</p>
          {ballot.phase === 'open' && <OpenBallot ballot={ballot} now={serverNow} onVote={option => vote(ballot.key, option)} />}
          {ballot.phase === 'closed' && <ClosedBallot ballot={ballot} now={serverNow} />}
          {ballot.phase === 'pending' && <PendingBallot ballot={ballot} now={serverNow} />}
          <small className={styles.disclaimer}>{ballot.disclaimer}</small>
        </section>
      ))}
      {queued && <p className={styles.note} role="status">Saved on this device. It will send when you are back online.</p>}
      {problem && <p className={styles.note} role="alert">{problem}</p>}
    </div>
  )
}
