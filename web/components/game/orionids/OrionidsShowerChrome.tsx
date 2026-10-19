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
  markFireballRead,
  submitFireballQuiz,
} from '@/lib/orionids/fireball'
import { queueEventBadge } from '@/lib/orionids/persist'
import styles from './OrionidsShowerChrome.module.css'

export default function OrionidsShowerChrome() {
  const game = useGame()
  const [live, setLive] = useState(false)
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<number[]>(() => FIREBALL_QUIZ.map(() => -1))
  const [note, setNote] = useState('')
  const queued = useRef('')

  useEffect(() => {
    const tick = () => setLive(isOrionidsWindow(debrisNow()))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
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
  const read = !!game.player.fireballSpotter?.readAt

  function finishReading() {
    const now = debrisNow()
    game.setPlayer(player => markFireballRead(player, now))
  }

  function finishCheck() {
    const now = debrisNow()
    const preview = submitFireballQuiz(game.player, answers, now)
    if (!read) {
      setNote('Read the article first.')
      return
    }
    if (!preview.badge && !preview.player.badges?.[FIREBALL_SPOTTER_BADGE]) {
      setNote('Not quite. Try the three questions again.')
      return
    }
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
    game.setPlayer(player => submitFireballQuiz(player, answers, now).player)
    setNote(spotter ? `You hold the ${spotter.tier} Fireball Spotter badge.` : 'Check complete.')
  }

  return (
    <>
      <div className={styles.haze} aria-hidden="true" data-testid="orionids-haze">
        <img className={styles.sky} src={art.sky} alt="" />
        <img className={styles.streak} src={art.streaks[0].file} alt="" />
        <img className={styles.streakLate} src={art.streaks[2].file} alt="" />
      </div>
      <div className={styles.banner} role="status" data-testid="orionids-banner">
        <img src={art.meteorIcon} alt="" width={28} height={28} />
        <p>The Orionids shower is happening. Best after moonset, about 02:00 local on 21–22 Oct.</p>
        <button type="button" onClick={() => setOpen(true)}>Read the sky</button>
      </div>
      {open && (
        <div className={styles.sheet} role="dialog" aria-label="Fireballs in the Sky" data-testid="fireball-reading">
          <h2>Fireballs in the Sky</h2>
          {FIREBALL_ARTICLE.map(paragraph => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
          <p>
            <a href={FIREBALLS_IN_THE_SKY_URL} target="_blank" rel="noreferrer">fireballsinthesky.com.au</a>
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={finishReading} data-testid="fireball-read">
              {read ? 'Reading done' : 'I have read this'}
            </button>
            <button type="button" onClick={() => setOpen(false)}>Close</button>
          </div>
          {FIREBALL_QUIZ.map((question, index) => (
            <fieldset key={question.prompt}>
              <legend>{question.prompt}</legend>
              {question.choices.map((choice, choiceIndex) => (
                <button
                  key={choice}
                  type="button"
                  className={styles.choice}
                  data-on={answers[index] === choiceIndex ? 'true' : 'false'}
                  onClick={() => setAnswers(current => current.map((value, at) => at === index ? choiceIndex : value))}
                >
                  {choice}
                </button>
              ))}
            </fieldset>
          ))}
          <button type="button" onClick={finishCheck} data-testid="fireball-check">Check answers</button>
          {spotter && <p data-testid="fireball-spotter-badge">Fireball Spotter · {spotter.tier}</p>}
          {note && <p role="status">{note}</p>}
        </div>
      )}
    </>
  )
}
