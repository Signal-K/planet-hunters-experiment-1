// SSL-792: level 2 and level 3 sprites for the hangar, Exchange and control station. Each level is the level-1
// sprite with additions drawn in the base-kit style (navy outline, cream, blue band, teal and pale-blue glass), with
// extra headroom on top so the width and footprint stay the same. Run from the repo root:
//   node docs/art/building-levels/render.cjs
// It writes <name>-l2.svg/.png and <name>-l3.svg/.png here and copies the PNGs to web/public/game/assets/base/v7/structures/.
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const ROOT = path.resolve(__dirname, '../../..')
const ART = path.join(ROOT, 'web/public/game/assets/base/v7/structures')
const NAVY = '#1b2a44', CREAM = '#efe6d2', SHADE = '#d9cfb8', BLUE = '#2f6db0', TEAL = '#2a9d9b', GLASS = '#9fd3e6', GLOW = '#ffd979', STEEL = '#5f6f86'
const S = `stroke="${NAVY}" stroke-width="4" stroke-linejoin="round"`

// Additions per building and level, in the level-1 sprite's own pixel space (y can go negative into the headroom).
const BUILDINGS = {
  'control-station': {
    src: 'control-station.png', w: 444, h: 279,
    levels: {
      2: { extra: 50, draw: `
        <!-- a second dish on the left mast -->
        <g ${S}><path d="M18 52 Q42 20 74 46 Z" fill="${CREAM}"/><line x1="44" y1="44" x2="42" y2="96" stroke-width="5"/></g>
        <circle cx="46" cy="40" r="5" fill="${TEAL}" ${S}/>
        <!-- a status light strip under the roof band -->
        <rect x="88" y="196" width="128" height="8" fill="${GLOW}" ${S} stroke-width="2"/>` },
      3: { extra: 110, draw: `
        <g ${S}><path d="M18 52 Q42 20 74 46 Z" fill="${CREAM}"/><line x1="44" y1="44" x2="42" y2="96" stroke-width="5"/></g>
        <circle cx="46" cy="40" r="5" fill="${TEAL}" ${S}/>
        <rect x="88" y="196" width="128" height="8" fill="${GLOW}" ${S} stroke-width="2"/>
        <!-- a lattice relay mast with a beacon -->
        <g ${S} fill="none"><path d="M350 236 L366 -90 L382 236"/><path d="M354 180 L378 140 M356 140 L376 100 M358 100 L374 60 M360 60 L372 20 M362 20 L370 -20 M363 -20 L369 -60"/><path d="M354 180 L378 180 M356 140 L376 140 M358 100 L374 100 M360 60 L372 60 M362 20 L370 20 M363 -20 L369 -20"/></g>
        <circle cx="366" cy="-98" r="9" fill="${GLOW}" ${S}/>
        <!-- the dome opens: an observing slit -->
        <rect x="112" y="98" width="14" height="40" fill="${GLASS}" ${S} stroke-width="3"/>` },
    },
  },
  hangar: {
    src: 'hangar.png', w: 408, h: 331,
    levels: {
      2: { extra: 60, draw: `
        <!-- a gantry crane on the roof -->
        <g ${S}><rect x="44" y="-42" width="12" height="62" fill="${STEEL}"/><rect x="196" y="-42" width="12" height="62" fill="${STEEL}"/><rect x="36" y="-54" width="180" height="16" fill="${CREAM}"/><line x1="36" y1="-46" x2="216" y2="-46" stroke="${BLUE}" stroke-width="5"/></g>
        <g ${S}><line x1="128" y1="-38" x2="128" y2="-8"/><rect x="118" y="-8" width="20" height="10" fill="${TEAL}"/></g>` },
      3: { extra: 110, draw: `
        <g ${S}><rect x="44" y="-42" width="12" height="62" fill="${STEEL}"/><rect x="196" y="-42" width="12" height="62" fill="${STEEL}"/><rect x="36" y="-54" width="180" height="16" fill="${CREAM}"/><line x1="36" y1="-46" x2="216" y2="-46" stroke="${BLUE}" stroke-width="5"/></g>
        <g ${S}><line x1="128" y1="-38" x2="128" y2="-8"/><rect x="118" y="-8" width="20" height="10" fill="${TEAL}"/></g>
        <!-- solar on the annex roof -->
        <g ${S}><path d="M222 126 L240 104 L290 104 L272 126 Z" fill="${BLUE}"/><path d="M230 116 L280 116 M256 104 L246 126" stroke-width="2"/></g>
        <!-- a taller beacon tower on the annex -->
        <g ${S}><rect x="300" y="-70" width="12" height="166" fill="${STEEL}"/><rect x="292" y="-86" width="28" height="18" fill="${CREAM}"/></g>
        <circle cx="306" cy="-96" r="8" fill="${GLOW}" ${S}/>
        <!-- lit bay lights -->
        <rect x="52" y="140" width="160" height="6" fill="${GLOW}" ${S} stroke-width="2"/>` },
    },
  },
  exchange: {
    src: 'exchange.png', w: 744, h: 294,
    levels: {
      2: { extra: 50, draw: `
        <!-- a flag over the warehouse and a second price board -->
        <g ${S}><line x1="560" y1="56" x2="560" y2="-36" stroke-width="5"/><path d="M562 -36 L610 -24 L562 -12 Z" fill="${BLUE}"/></g>
        <g ${S}><rect x="160" y="40" width="80" height="50" fill="${BLUE}"/><line x1="200" y1="90" x2="200" y2="148" stroke-width="6"/></g>
        <path d="M172 72 L184 54 L196 72 Z" fill="${TEAL}"/><rect x="204" y="58" width="28" height="7" fill="${GLASS}"/><rect x="204" y="72" width="20" height="7" fill="${GLASS}"/>` },
      3: { extra: 100, draw: `
        <g ${S}><rect x="160" y="40" width="80" height="50" fill="${BLUE}"/><line x1="200" y1="90" x2="200" y2="148" stroke-width="6"/></g>
        <path d="M172 72 L184 54 L196 72 Z" fill="${TEAL}"/><rect x="204" y="58" width="28" height="7" fill="${GLASS}"/><rect x="204" y="72" width="20" height="7" fill="${GLASS}"/>
        <!-- a trading floor on top of the warehouse -->
        <g ${S}><rect x="462" y="-10" width="210" height="70" fill="${CREAM}"/><rect x="462" y="-10" width="210" height="12" fill="${BLUE}"/><path d="M452 -10 L482 -46 L652 -46 L682 -10 Z" fill="${SHADE}"/></g>
        <g ${S} stroke-width="3"><rect x="480" y="12" width="40" height="30" fill="${GLASS}"/><rect x="532" y="12" width="40" height="30" fill="${GLOW}"/><rect x="584" y="12" width="40" height="30" fill="${GLASS}"/><rect x="636" y="12" width="24" height="30" fill="${GLASS}"/></g>
        <g ${S}><line x1="560" y1="-46" x2="560" y2="-96" stroke-width="5"/><path d="M562 -96 L610 -84 L562 -72 Z" fill="${BLUE}"/></g>` },
    },
  },
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const out = {}
  for (const [name, def] of Object.entries(BUILDINGS)) {
    const png = fs.readFileSync(path.join(ART, def.src)).toString('base64')
    for (const [level, lv] of Object.entries(def.levels)) {
      const W = def.w, H = def.h + lv.extra
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <image href="data:image/png;base64,${png}" x="0" y="${lv.extra}" width="${def.w}" height="${def.h}"/>
  <g transform="translate(0 ${lv.extra})">${lv.draw}</g>
</svg>`
      const file = `${name}-l${level}`
      fs.writeFileSync(path.join(__dirname, `${file}.svg`), svg.replace(/data:image\/png;base64,[^"]+/, `../../../web/public/game/assets/base/v7/structures/${def.src}`))
      await page.setViewportSize({ width: W, height: H })
      await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
      const shot = await page.locator('svg').screenshot({ omitBackground: true })
      fs.writeFileSync(path.join(__dirname, `${file}.png`), shot)
      fs.writeFileSync(path.join(ART, `${file}.png`), shot)
      out[file] = { w: W, h: H, heightUnits: +(H / 6).toFixed(3) }
    }
  }
  console.log(JSON.stringify(out, null, 1))
  await browser.close()
})()
