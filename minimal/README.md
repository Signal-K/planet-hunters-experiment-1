# Landnam Minimal

Run the agency from Earth at /minimal/ on Landnam’s origin. Sign in through the existing Landnam account gate.

## Play locally

Start Landnam’s web server on port 4320 for its assets, account gate and research instruments. From `web/`, run `npm run dev:minimal` and open http://localhost:4330/minimal/. Add `?stage=1` to play with the development fixture. Run `npm run typecheck:minimal` and `npm run build:minimal` before shipping. The build goes into `web/public/minimal/`.

## The game

- Select the next mission, launch, complete the job and return. The flight plan leads through the Moon, Mars, the asteroid belt and Europa to a telescope programme. Real discoveries in the pilot’s Landnam save become follow-up destinations.
- Facilities gain levels from completed mission types. Arrange base moves facilities between sites and places individual scenery objects on the ground. The launchpad carries its attached rocket. Placement is saved per pilot on the device.
- The Research console reads Landnam’s monthly project and opens the original scientific instruments on the same origin. The event board reads Landnam’s event definitions and badge-gated special missions. Survey, launch and mining flights use the shared research stamp, fleet and contribution rules.
- World.tsx composes Landnam Scene and GameObject instances for both the spaceport and destinations. The Earth sky uses the shared world simulation. Structures, rockets, scenery, deposits and payloads have independent transforms. New transparent scenery assets live in src/art/props.
