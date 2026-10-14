import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RoadRover, VEHICLE_Z_INDEX } from './RoadRover'

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

  const road = { id: 'site-service-road', points: [{ x: 12, groundOffset: -7 }, { x: 88, groundOffset: -7 }] }

  it('rides behind every structure, label, scene button and HUD control', () => {
    // Scene layers: sky/ground 1-4, launchpad scene objects 6, building labels 10, structures 14, HUD 18+.
    expect(VEHICLE_Z_INDEX).toBeLessThan(6)
    expect(VEHICLE_Z_INDEX).toBeGreaterThan(4)
    expect(renderToStaticMarkup(<RoadRover road={road} />)).toContain(`z-index:${VEHICLE_Z_INDEX}`)
  })

  it('lets a scene with lower layers put the vehicle further back', () => {
    expect(renderToStaticMarkup(<RoadRover road={road} zIndex={2} />)).toContain('z-index:2')
  })

  it('does not render without a road path', () => {
    expect(renderToStaticMarkup(<RoadRover />)).toBe('')
  })
})
