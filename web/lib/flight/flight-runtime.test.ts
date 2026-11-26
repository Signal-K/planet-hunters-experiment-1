import { describe, expect, it } from 'vitest'
import { FlightSim } from '@takeon/flight-engine'

describe('flight runtime', () => {
  it('creates, advances and disposes a flight with the shipped Go bridge', () => {
    const flight = new FlightSim({ seed: 42, hostPaced: true })
    expect(flight.state.phase).toBe('departure')
    flight.setProgress(0.5)
    expect(() => flight.step(1 / 60)).not.toThrow()
    expect(() => flight.dispose()).not.toThrow()
  })
})
