'use client'

import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/game-context'
import { isOrionidsWindow } from '@/lib/data/sky-events'
import { debrisNow } from '@/lib/hooks/useDebrisEvent'
import { ORIONIDS_VARIANTS } from '@/lib/orionids/theme'
import {
  FIREBALL_2026_BADGE,
  FIREBALL_ARTICLE,
  FIREBALL_QUIZ,
  FIREBALL_SPOTTER_BADGE,
  FIREBALL_SUBJECT_ID,
  FIREBALLS_IN_THE_SKY_URL,
  fireballQuizCorrect,
  markFireballRead,
  submitFireballQuiz,
} from '@/lib/orionids/fireball'
import { queueEventBadge } from '@/lib/orionids/persist'
import { OPEN_ORIONIDS_READING_EVENT, type OrionidsReadingDetail } from '@/lib/orionids/reading'
import styles from './OrionidsShowerChrome.module.css'

const ENTRY_LABELS = ['DEFINITIONS', 'HOW THE NETWORK WORKS', 'IF YOU SEE ONE'] as const
const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const

export default function OrionidsShowerChrome() {
  const game = useGame()
  const [live, setLive] = useState(false)
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<number[]>(() => FIREBALL_QUIZ.map(() => -1))
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<'notes' | 'check'>('check')
  const [entry, setEntry] = useState(0)
  const [step, setStep] = useState(0)
  const queued = useRef('')
  const onPass = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const tick = () => setLive(isOrionidsWindow(debrisNow()))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const showReading = (event: Event) => {
      onPass.current = (event as CustomEvent<OrionidsReadingDetail>).detail?.onPass
      setTab('check')
      setStep(0)
      setEntry(0)
      setNote('')
      setAnswers(FIREBALL_QUIZ.map(() => -1))
      setOpen(true)
    }
    window.addEventListener(OPEN_ORIONIDS_READING_EVENT, showReading)
    return () => window.removeEventListener(OPEN_ORIONIDS_READING_EVENT, showReading)
  }, [])

  useEffect(() => {
    const badges = [FIREBALL_SPOTTER_BADGE, FIREBALL_2026_BADGE]
      .map(id => game.player.badges?.[id])
      .filter((badge): badge is NonNullable<typeof badge> => !!badge)
    const key = badges.map(badge => `${badge.eventId}:${badge.tier}:${badge.earnedAt}`).join('|')
    if (!key || queued.current === key) return
    queued.current = key
    for (const badge of badges) {
      queueEventBadge({
        eventId: badge.eventId,
        tier: badge.tier,
        earnedAt: badge.earnedAt,
        subjectId: FIREBALL_SUBJECT_ID,
        marker: badge.eventId,
      })
    }
  }, [game.player.badges])

  if (!live) return null
  const art = ORIONIDS_VARIANTS.blueprint
  const spotter = game.player.badges?.[FIREBALL_SPOTTER_BADGE]

  function finishCheck() {
    const now = debrisNow()
    if (!fireballQuizCorrect(answers)) {
      setNote('Not quite. Check the field notes if you need a hint, then try again.')
      return
    }
    // The check comes first, so passing it also records the file as read.
    const preview = submitFireballQuiz(markFireballRead(game.player, now), answers, now)
    if (preview.badge) {
      game.addToast(`Fireball Spotter ${preview.badge.tier} badge`, 'ok')
      queueEventBadge({
        eventId: FIREBALL_SPOTTER_BADGE,
        tier: preview.badge.tier,
        earnedAt: preview.badge.earnedAt,
        subjectId: FIREBALL_SUBJECT_ID,
        marker: FIREBALL_SPOTTER_BADGE,
      })
    }
    game.setPlayer(player => submitFireballQuiz(markFireballRead(player, now), answers, now).player)
    const next = onPass.current
    onPass.current = undefined
    setOpen(false)
    next?.()
  }

  return (
    <>
      <div className={styles.haze} aria-hidden="true" data-testid="orionids-haze">
        <img className={styles.sky} src={art.sky} alt="" />
        <img className={styles.streak} src={art.streaks[0].file} alt="" />
        <img className={styles.streakLate} src={art.streaks[2].file} alt="" />
      </div>
      {open && (
        <div className={styles.scrim} data-testid="fireball-reading-scrim">
          <section className={styles.pad} aria-label="Fireballs in the Sky" data-testid="fireball-reading">
            <header className={styles.strip}>
              <span className={styles.led} data-on={spotter ? 'true' : 'false'} aria-hidden="true" />
              <span className={styles.stripTitle}>FIREBALLS IN THE SKY</span>
              <span className={styles.stripMeta}>{spotter ? 'PASSED' : 'OPEN'}</span>
              <button type="button" className={styles.close} onClick={() => setOpen(false)}>Close</button>
            </header>
            <div className={styles.tabs} role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'check'} data-on={tab === 'check' ? 'true' : 'false'} onClick={() => setTab('check')}>SIGHTING CHECK</button>
              <button type="button" role="tab" aria-selected={tab === 'notes'} data-on={tab === 'notes' ? 'true' : 'false'} onClick={() => setTab('notes')}>FIELD NOTES</button>
            </div>
            <div className={styles.screen}>
              {tab === 'notes' ? (
                <article className={styles.entry} key={`entry-${entry}`}>
                  <p className={styles.kicker}>ENTRY {entry + 1} OF {FIREBALL_ARTICLE.length} · {ENTRY_LABELS[entry]}</p>
                  <p className={styles.body}>{FIREBALL_ARTICLE[entry]}</p>
                  {entry === FIREBALL_ARTICLE.length - 1 && (
                    <a className={styles.link} href={FIREBALLS_IN_THE_SKY_URL} target="_blank" rel="noreferrer">fireballsinthesky.com.au</a>
                  )}
                </article>
              ) : (
                <fieldset className={styles.entry} key={`question-${step}`}>
                  <legend className={styles.kicker}>QUESTION {step + 1} OF {FIREBALL_QUIZ.length}</legend>
                  <p className={styles.body}>{FIREBALL_QUIZ[step].prompt}</p>
                  <div className={styles.choices}>
                    {FIREBALL_QUIZ[step].choices.map((choice, choiceIndex) => (
                      <button
                        key={choice}
                        type="button"
                        className={styles.choice}
                        data-on={answers[step] === choiceIndex ? 'true' : 'false'}
                        onClick={() => setAnswers(current => current.map((value, at) => at === step ? choiceIndex : value))}
                      >
                        <span className={styles.key} aria-hidden="true">{CHOICE_KEYS[choiceIndex]}</span>
                        <span>{choice}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {(note || spotter) && (
                <div className={styles.readout} data-testid={spotter && !note ? 'fireball-spotter-badge' : undefined}>
                  {note ? <p role="status">{note}</p> : spotter ? <p>FIREBALL SPOTTER · {spotter.tier.toUpperCase()}</p> : null}
                </div>
              )}
            </div>
            <footer className={styles.foot}>
              <div className={styles.progress} aria-hidden="true">
                {(tab === 'notes' ? FIREBALL_ARTICLE : FIREBALL_QUIZ).map((_, at) => (
                  <span key={at} data-on={at <= (tab === 'notes' ? entry : step) ? 'true' : 'false'} />
                ))}
              </div>
              <div className={styles.nav}>
                {tab === 'notes' ? (
                  <>
                    <button type="button" className={styles.ghost} disabled={entry === 0} onClick={() => setEntry(entry - 1)}>BACK</button>
                    {entry < FIREBALL_ARTICLE.length - 1 ? (
                      <button type="button" onClick={() => setEntry(entry + 1)}>NEXT</button>
                    ) : (
                      <button type="button" onClick={() => setTab('check')} data-testid="fireball-read">BACK TO THE CHECK</button>
                    )}
                  </>
                ) : (
                  <>
                    <button type="button" className={styles.ghost} disabled={step === 0} onClick={() => setStep(step - 1)}>BACK</button>
                    {step < FIREBALL_QUIZ.length - 1 ? (
                      <button type="button" onClick={() => setStep(step + 1)}>NEXT</button>
                    ) : (
                      <button type="button" onClick={finishCheck} data-testid="fireball-check">CHECK AND ENTER</button>
                    )}
                  </>
                )}
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
