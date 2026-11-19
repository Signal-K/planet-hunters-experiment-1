// Deploy, seen from orbit: Landnam's own flight sky, the world below and the
// rocket's upper stage. DEPLOY lets the payload go; it drifts clear and opens
// its panels. Kit sprites only, drawn pixelated like Landnam's flight scene.
import { FlightSky } from '@landnam/components/game/screens/FlightSky'

const KIT = '/game/assets/base/kit'

export function OrbitScene({ world, released }: {
  /** `earth` for Earth orbit, else the rocky body sprite. */
  world: 'earth' | 'rock'
  /** The payload has been let go. */
  released: boolean
}) {
  return (
    <div className="mn-orbit" aria-hidden="true" data-released={released || undefined}>
      <FlightSky />
      <img className="mn-orbit-world" src={`${KIT}/${world === 'earth' ? 'earth-pixel' : 'asteroid-pixel'}.png`} alt="" draggable={false} />
      <img className="mn-orbit-stage" src={`${KIT}/space-rocket.png`} alt="" draggable={false} />
      <svg className="mn-orbit-payload" viewBox="0 0 24 12" shapeRendering="crispEdges">
        <rect className="mn-orbit-panel" x="0" y="4" width="8" height="4" fill="#3d6fb8" />
        <rect className="mn-orbit-panel" x="16" y="4" width="8" height="4" fill="#3d6fb8" />
        <rect x="8" y="5.5" width="8" height="1" fill="#9aa0ab" />
        <rect x="9" y="2" width="6" height="8" fill="#e9edf2" />
        <rect x="10" y="3" width="4" height="2" fill="#7fd4ff" />
        <rect x="9" y="9" width="6" height="1" fill="#c9a24a" />
      </svg>
    </div>
  )
}
