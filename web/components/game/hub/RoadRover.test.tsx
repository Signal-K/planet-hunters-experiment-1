import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RoadRover } from './RoadRover'

describe('RoadRover', () => {
  it('uses the responsive road coordinate and Blender side-on sprite', () => {
    const markup = renderToStaticMarkup(
      <RoadRover
        road={{
          id: 'site-service-road',
          points: [{ x: 12, groundOffset: -7 }, { x: 88, groundOffset: -7 }],
        }}
      />,
    )

    expect(markup).toContain('data-testid="road-rover"')
    expect(markup).toContain('data-road-id="site-service-road"')
    expect(markup).toContain('/game/assets/actors/road_rover.png')
    expect(markup).toContain('left:12%')
    expect(markup).toContain('calc(var(--hub-ground) - 7%)')
  })

  it('does not render without a road path', () => {
    expect(renderToStaticMarkup(<RoadRover />)).toBe('')
  })
})
