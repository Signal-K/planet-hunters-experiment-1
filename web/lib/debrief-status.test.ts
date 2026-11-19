import { describe, expect, it } from 'vitest'
import { debriefStatus } from './debrief-status'

describe('debrief rocket lifecycle', () => {
  const completed = { shipDestroyed: false, orbitalDeployment: false, homeSettled: false, dismantled: false }

  it('does not infer a docked or stationed rocket from a completed mission', () => {
    expect(debriefStatus(completed)).toEqual({ status: 'Mission complete', destinationLabel: 'Mission destination', canTeardown: true })
  })

  it('a home settlement describes the returned, recycled rocket and prevents another teardown', () => {
    expect(debriefStatus({ ...completed, homeSettled: true })).toEqual({
      status: 'Returned to Earth · rocket recycled', destinationLabel: 'Returned from', canTeardown: false,
    })
  })

  it('a manual teardown records recycling without inventing a location', () => {
    expect(debriefStatus({ ...completed, dismantled: true })).toEqual({
      status: 'Rocket recycled · mission complete', destinationLabel: 'Mission destination', canTeardown: false,
    })
  })

  it('preserves instrument commissioning and hull-loss outcomes', () => {
    expect(debriefStatus({ ...completed, orbitalDeployment: true })).toMatchObject({ status: 'Commissioned · instrument online', canTeardown: false })
    expect(debriefStatus({ ...completed, shipDestroyed: true, homeSettled: true })).toMatchObject({ status: 'Hull lost · cargo recovered', canTeardown: false })
  })
})
