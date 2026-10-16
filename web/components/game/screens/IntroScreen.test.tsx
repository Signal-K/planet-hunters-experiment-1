import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import IntroScreen from './IntroScreen'

vi.mock('@/components/game/hub/BaseWorldCanvas', () => ({
  BaseWorldCanvas: ({ biome }: { biome: string }) => <canvas data-testid="base-world-canvas" data-biome={biome} />,
}))

describe('IntroScreen', () => {
  it('says what to do, explains every landscape and never addresses the player as Commander', () => {
    const markup = renderToStaticMarkup(<IntroScreen onBegin={() => {}} />)
    expect(markup).toContain('Choose where to build')
    expect(markup).not.toMatch(/commander/i)
    expect(markup.match(/class="base-biome-option"/g)).toHaveLength(4)
    expect(markup.match(/class="base-biome-trait"/g)).toHaveLength(4)
    for (const label of ['Steppe', 'Desert', 'Tundra', 'Coast']) expect(markup).toContain(label)
    expect(markup).toContain('ESTABLISH BASE')
  })

  it('restoring: shows the saved landscape behind a restoring message and no controls', () => {
    const markup = renderToStaticMarkup(<IntroScreen onBegin={() => {}} awaitingRemoteState savedBiome="coast" />)
    expect(markup).toContain('Restoring your mission data')
    expect(markup).not.toMatch(/commander/i)
    expect(markup).toContain('data-biome="coast"')
    expect(markup).not.toContain('intro-begin-btn')
  })

  it('returning: resume button, stats, no picker', () => {
    const markup = renderToStaticMarkup(<IntroScreen onBegin={() => {}} returning missionsDone={3} totalEarned={4200} savedBiome="desert" />)
    expect(markup).toContain('RESUME OPERATIONS')
    expect(markup).toContain('Missions completed: 3')
    expect(markup).not.toContain('base-biome-choice')
    expect(markup).toContain('data-biome="desert"')
  })
})
