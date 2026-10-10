import { describe, expect, it } from 'vitest'
import { VALID_SCREENS } from '@/components/game/GameScreenRouter'
import { advanceRun, completeAction, currentStep, idleRun, startRun, stopRun } from './coach'
import { acquireHelpOpen, isHelpOpen } from './open-state'
import { getHelpTopic, HELP_TOPICS, MAX_HELP_CARDS, MIN_HELP_CARDS } from './topics'

describe('help topic registry (SSL-432)', () => {
  it('is keyed by real screens only', () => {
    for (const screen of Object.keys(HELP_TOPICS)) expect(VALID_SCREENS.has(screen as never), screen).toBe(true)
  })

  it('keeps every topic to 2 to 4 non-empty cards', () => {
    for (const topic of Object.values(HELP_TOPICS)) {
      expect(topic.cards.length).toBeGreaterThanOrEqual(MIN_HELP_CARDS)
      expect(topic.cards.length).toBeLessThanOrEqual(MAX_HELP_CARDS)
      for (const card of topic.cards) {
        expect(card.title.trim()).not.toBe('')
        expect(card.body.trim()).not.toBe('')
      }
    }
  })

  it('writes no em dashes in help copy', () => {
    expect(JSON.stringify(HELP_TOPICS)).not.toContain('—')
  })

  it('has a TESS topic with a Show me run and none for unlisted screens', () => {
    expect(getHelpTopic('galaxy')?.coach?.length).toBeGreaterThan(0)
    expect(getHelpTopic('market')?.title).toBe('Market')
    expect(getHelpTopic('transit')).toBeNull()
  })
})

describe('help coach sequencing (SSL-432)', () => {
  const topic = getHelpTopic('galaxy')

  it('never starts on its own', () => {
    expect(currentStep(idleRun(topic))).toBeNull()
  })

  it('starts on step one, then waits for the named action', () => {
    let run = startRun(idleRun(topic))
    expect(currentStep(run)?.id).toBe('mark')
    run = completeAction(run, 'something-else')
    expect(currentStep(run)?.id).toBe('mark')
    run = completeAction(run, 'mark')
    expect(currentStep(run)?.id).toBe('verdict')
  })

  it('ignores an action for a step that is not current', () => {
    const second = advanceRun(startRun(idleRun(topic)))
    expect(completeAction(second, 'mark')).toEqual(second)
  })

  it('ends after the last step and can be stopped early', () => {
    const run = advanceRun(advanceRun(startRun(idleRun(topic))))
    expect(run.index).toBeNull()
    expect(stopRun(startRun(idleRun(topic))).index).toBeNull()
  })

  it('does nothing for a topic without a coach', () => {
    expect(startRun(idleRun(null)).index).toBeNull()
  })
})

describe('help open state (SSL-432)', () => {
  it('counts owners so one release does not unpause another', () => {
    const a = acquireHelpOpen()
    const b = acquireHelpOpen()
    expect(isHelpOpen()).toBe(true)
    a()
    a()
    expect(isHelpOpen()).toBe(true)
    b()
    expect(isHelpOpen()).toBe(false)
  })
})
