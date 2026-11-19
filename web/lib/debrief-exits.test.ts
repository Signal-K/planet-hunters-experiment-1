import { expect, it } from 'vitest'
import { debriefExitScreen, debriefExits } from './debrief-exits'

it('a completed run can view existing community progress without creating a new mission', () => {
  expect(debriefExitScreen('community', { showerRun: false, programOperation: true, hasInstrument: false })).toBe('community-research')
})

it('guided debriefs retain their single default exit', () => {
  expect(debriefExits({ showerRun: false, programOperation: false, hasInstrument: false, guided: true })).toEqual([])
})
