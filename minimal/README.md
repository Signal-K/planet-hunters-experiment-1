# Landnam Minimal

Minimal runs at `/minimal/` on Landnam’s origin and uses the existing Landnam account session.

## Play

The flight director opens with a story briefing and a route from the Moon to deep space. Launch from the briefing or select the illuminated launchpad. Watch the descent, then deploy the rover after touchdown. The next chapter opens on your return, and completed chapters persist across visits. On the surface, select a beacon or deposit to send the rover to it. Survey each beacon or collect the requested ore, then select the ship to return. Drag to pan, scroll to zoom, or use the arrow keys to drive. The crosshair recentres the camera.

The cockpit groups the current objective, station instruments, placement tools and camera controls beside the terrain in short landscape views and below it in taller views. During surface operations it shows rover steering, load or survey progress and the ship boarding command.

At the base, select the control station for community research and the scientific instruments, the hangar for the navigation chart, or the exchange for contracts. The sky receiver tunes into Landnam’s event calendar and special missions. Place mode lets you move facilities or add scenery on individual terrain tiles. Layouts are saved per pilot on the device.

## Development

From `web/`, run `npm run dev:minimal` with Landnam’s main web server on port 4320. Open `http://localhost:4330/minimal/`. Add `?stage=1` locally or on staging to use the practice pilot. Run `npm run typecheck:minimal` and `npm run build:minimal` to verify and build into `web/public/minimal/`.

Earth and mission destinations use the vendored Signal-K/TakeOn engine for voxel terrain, projection, pathfinding and rover simulation. The game projects its placeable facilities, resources and mission markers into the same camera.
