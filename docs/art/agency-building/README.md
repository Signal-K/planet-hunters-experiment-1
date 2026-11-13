# Agency building (SSL-785)

The dedicated Agency landmark uses the completed stage-4 drawing. Liam chose
outlined civic architecture with progressively added detail on 10 November;
this is the explicit exception to the base kit pixel-art rule in `docs/STYLE.md`.
Stage 4 is the completed art for SSL-785.

## Source and runtime art

- `line-drawing.svg` / `.png`: initial front-elevation concept.
- `agency-stage1.svg` / `.png`: transparent line drawing.
- `agency-stage2.svg` / `.png`: cream walls, pale blue glass and dome, cornice,
  pilasters and ground shadow.
- `agency-stage3.svg` / `.png`: lit windows, side shading, dome highlight and lamps.
- `agency-stage4.svg` / `.png`: final drawing, with roof rails, solar panels,
  planters, banners and a small dish; also the level-2 look for SSL-792.
- `sheet.png`: full final sheet (one complete building, no detachable parts).
- `web/public/game/assets/base/v7/structures/agency.png`: the runtime slice,
  byte-identical to the full sheet and stage-4 PNG.
- `native/App/Resources/Art/base/v7/structures/agency.png`: matching bundled
  slice for future iOS parity; native scene wiring remains parked.

The palette is cream, blue and navy, without orange. Preserve the SVG sources
and previous stages when updating the final drawing.

## Scene contract

Open `node scripts/scene-drive.mjs open hub-first-run --size 390x844`.
The Agency is display-only: it appears once the launchpad is built and while
no Control Station is owned. It grants no Control Station gameplay state.
Once the player builds a Control Station, the real station sprite replaces it,
including the station's own level variants. Use `hub-buildings-l2` to inspect
that separate building art.

Fresh-account acceptance uses the local account button on `/game`, then the
first-run launchpad path; a stage fixture alone is not that account check.
