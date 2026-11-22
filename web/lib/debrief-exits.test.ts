import { expect, it } from 'vitest'
import { debriefExitScreen, debriefExits } from './debrief-exits'

it('a completed run can view existing community progress without creating a new mission', () => {
  expect(debriefExitScreen('community', { showerRun: false, programOperation: true, hasInstrument: false })).toBe('community-research')
})

it('the first completed flight can go straight to another flight without offering advanced planning', () => {
  const exits = debriefExits({ showerRun: false, programOperation: false, hasInstrument: false, guided: true })
  expect(exits.map(exit => exit.screen)).toEqual(['missions'])
})

it('players can choose their own flight after any kind of completed run', () => {
  const input = { showerRun: false, programOperation: true, hasInstrument: true }
  expect(debriefExitScreen('again', input)).toBe('missions')
  expect(debriefExitScreen('plan', input)).toBe('mission-planner')
  expect(debriefExitScreen('base', input)).toBe('hub')
  expect(debriefExits({ ...input, guided: false }).map(exit => exit.screen)).toContain('instrument-hub')
})
