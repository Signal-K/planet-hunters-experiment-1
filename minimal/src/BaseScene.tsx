// Home as the agency's base (Liam, 2026-11-22): four structures standing on the
// outpost, all starting at level 1. Each shows its level and a counter of what
// its next level needs; flying missions fills the counters, and a new level
// hands out new missions, a bigger rocket or better gear. No building, no
// buying, no menus: the base grows because you fly.
//
// The sandbox stays: every unlocked mission can be flown again at any time, in
// any order, and market runs go wherever the rocket reaches. One big button
// names the mission that moves the base forward soonest.
import { useLayoutEffect, useRef, useState } from 'react'
import { BASE_SITE, GROUND, backdropFor, displayX, homeSite, kitScale, skyGrade, spriteCenterOffset, structureSprite } from '@landnam/lib/scene/base-site'
import { CHAPTERS, francs, type Chapter } from './chapters'
import { counterText, rocketReaching, type Base, type StructureId, type StructureState } from './structures'

/**
 * The base is drawn side-on, the camera Landnam's v7 structure art was
 * rendered for (web/lib/scene/base-site.json): sky, the far plain, the paved
 * apron, and each structure standing on it at its authored size and footing.
 * The sprites never go on the iso TakeOn ground, where they read as stickers.
 */
const KIND: Record<StructureId, string> = { launchpad: 'launchpad', exchange: 'market', 'control-station': 'control-station', hangar: 'hangar' }
/** Left to right, as on Landnam's base. */
const ORDER: StructureId[] = ['hangar', 'launchpad', 'control-station', 'exchange']
/** Room each name plate needs on screen, so neighbours' plates never touch. */
const PLATE_W = 156
const PLATE_H = 56
/** The tallest sprite at any level (the launchpad's gantry), plus its footing. */
const TALLEST = 111 + 4.5
const ASSETS = '/game/assets/'
/** The art is 6 px per kit unit: 2 css px per unit is 1:1 on a 3x phone, never upscaled. */
const PORTRAIT_PX = 2

type Layout = { px: number; ground: number; width: number; x: Record<StructureId, number>; scroll: number }

function gradeNow(): keyof typeof BASE_SITE.sky.grades {
  const h = new Date().getHours()
  return h < 5 ? 'night' : h < 7 ? 'dawn' : h < 11 ? 'morning' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 20 ? 'dusk' : 'night'
}

/** Scale, ground line and each structure's centre (screen px) for the view and the footer above the bottom. */
function layout(w: number, h: number, footerTop: number): Layout {
  const ground = footerTop - 12 - PLATE_H
  const fit = (ground - 64) / TALLEST
  // A phone held upright scrolls the base sideways, so the art can be larger than Landnam's
  // fit-the-width rule; it stays under the chips at the top.
  const px = Math.max(1, Math.min(h > w ? PORTRAIT_PX : kitScale({ w, h }), fit))
  const body = (id: StructureId) => structureSprite(KIND[id])?.body ?? 60
  // Landnam's display spacing, pushed apart where plates or bodies would touch.
  const xs: number[] = []
  ORDER.forEach((id, i) => {
    const authored = displayX(homeSite(KIND[id])!.x)
    if (i === 0) return xs.push(authored)
    const prev = ORDER[i - 1]
    const gap = Math.max((body(prev) + body(id)) / 2 + 8, (PLATE_W + 8) / px)
    xs.push(Math.max(authored, xs[i - 1] + gap))
  })
  const left = xs[0] - Math.max(body(ORDER[0]) / 2, PLATE_W / 2 / px)
  const right = xs[xs.length - 1] + Math.max(body(ORDER[ORDER.length - 1]) / 2 + 8, PLATE_W / 2 / px)
  const span = (right - left) * px
  const width = Math.max(w, span + 32)
  const offset = (width - span) / 2 - left * px
  const x = Object.fromEntries(ORDER.map((id, i) => [id, offset + xs[i] * px])) as Record<StructureId, number>
  // Start centred between the pad and the control station: the two most players tap first.
  const scroll = Math.max(0, Math.min(width - w, (x.launchpad + x['control-station']) / 2 - w / 2))
  return { px, ground, width, x, scroll }
}

const VERB: Record<Chapter['verb'], string> = { mine: 'Mine', deliver: 'Deliver', build: 'Build', deploy: 'Launch', survey: 'Survey' }

/** A mission is out of reach when its fixed world is past the rocket's orbit. Market runs pick a world in range. */
export function outOfReach(chapter: Chapter, base: Base): string | undefined {
  if (chapter.destinations?.length) return undefined
  const far = Math.max(chapter.target?.orbit ?? 0, chapter.deliveryTarget?.orbit ?? 0)
  return far > base.rocket.maxOrbit ? rocketReaching(far) ?? 'a bigger rocket' : undefined
}

/**
 * The mission to suggest: one never flown first (each teaches something), then
 * whichever counts toward the structure closest to its next level.
 */
export function suggested(base: Base, done: ReadonlySet<number>): Chapter {
  const open = CHAPTERS.filter(c => base.chapters.has(c.number) && c.mission && !outOfReach(c, base))
  const fresh = open.find(c => !done.has(c.number))
  if (fresh) return fresh
  const closest = base.structures
    .filter(s => !s.max)
    .sort((a, b) => (a.need - a.have) - (b.need - b.have))
  for (const s of closest) {
    const pick = open.find(c => !s.def.counts || s.def.counts.includes(c.type))
    if (pick) return pick
  }
  return open[0] ?? CHAPTERS[0]
}

export function BaseScene({ base, done, money, fresh, onOpen }: {
  base: Base
  /** Chapters flown at least once. */
  done: ReadonlySet<number>
  money: number
  /** Structures that just went up a level: they glow once. */
  fresh: ReadonlySet<StructureId>
  onOpen: (chapter: Chapter) => void
}) {
  const [sheet, setSheet] = useState<StructureState | null>(null)
  const footerRef = useRef<HTMLElement>(null)
  const siteRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<Layout | null>(null)
  const scrolled = useRef(false)
  // Lay the base out for the screen and the footer's height (load, resize, turn, tray wrap).
  useLayoutEffect(() => {
    const measure = () => {
      const footer = footerRef.current
      if (!footer) return
      setView(layout(window.innerWidth, window.innerHeight, footer.getBoundingClientRect().top))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (footerRef.current) ro.observe(footerRef.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  useLayoutEffect(() => {
    if (!view || !siteRef.current || scrolled.current) return
    siteRef.current.scrollLeft = view.scroll
    scrolled.current = true
  }, [view])
  const sky = skyGrade(gradeNow())
  const plain = backdropFor('mountains')[0]
  const next = suggested(base, done)
  // The suggestion first, then missions never flown, then the rest: what is new is never scrolled off.
  const rank = (c: Chapter) => (c === next ? 0 : !done.has(c.number) && !outOfReach(c, base) ? 1 : outOfReach(c, base) ? 3 : 2)
  const open = CHAPTERS.filter(c => base.chapters.has(c.number) && c.mission).sort((a, b) => rank(a) - rank(b) || a.number - b.number)
  return (
    <main className="mn-scene" data-scene="minimal-base">
      <div className="mn-site" ref={siteRef} aria-label="Your base">
        {view && (
          <div
            className="mn-site-strip"
            style={{
              width: view.width,
              '--px': `${view.px}px`,
              '--ground': `${view.ground}px`,
              '--sky-top': sky.top, '--sky-mid': sky.mid, '--sky-horizon': sky.horizon,
              '--deep': GROUND.deep,
            } as React.CSSProperties}
          >
            <div className="mn-site-sky" aria-hidden />
            {BASE_SITE.sky.clouds.map((c, i) => (
              <img
                key={c.src}
                className="mn-site-cloud"
                src={`${ASSETS}${c.src}`}
                alt=""
                aria-hidden
                style={{ top: `calc(var(--ground) * ${c.y + 0.12})`, left: `${((c.x * view.px + i * 140) % view.width)}px`, width: `calc(${c.width} * var(--px))`, opacity: sky.clouds, animationDuration: `${c.seconds}s` }}
              />
            ))}
            {plain && <div className="mn-site-plain" aria-hidden style={{ backgroundImage: `url(${ASSETS}${plain.src})`, bottom: `calc(100% - var(--ground) + ${plain.bottom} * var(--px))`, height: `calc(${plain.height} * var(--px))` }} />}
            <div className="mn-site-ground" aria-hidden style={{ backgroundImage: `url(${ASSETS}${GROUND.src})`, top: `calc(var(--ground) - ${GROUND.above} * var(--px))`, height: `calc(${GROUND.above + GROUND.below} * var(--px))` }} />
            <div className="mn-site-deep" aria-hidden style={{ top: `calc(var(--ground) + ${GROUND.below - 1} * var(--px))` }} />
            <ul className="mn-base">
              {ORDER.map(id => {
                const s = base.structures.find(st => st.def.id === id)!
                const sprite = structureSprite(KIND[id])!
                const lv = sprite.levels?.[String(s.level)]
                const height = lv?.height ?? sprite.height!
                const foot = lv?.foot ?? sprite.foot ?? 0
                return (
                  <li key={id} className="mn-structure-spot" style={{ left: view.x[id] }}>
                    <button
                      className={`mn-structure${fresh.has(id) ? ' mn-fresh' : ''}`}
                      onClick={() => setSheet(s)}
                      aria-label={`${s.def.name}, level ${s.level}. ${counterText(s)}.`}
                    >
                      <img
                        src={s.def.art[s.level - 1]}
                        alt=""
                        draggable={false}
                        style={{
                          width: `calc(${sprite.width} * var(--px))`,
                          height: `calc(${height} * var(--px))`,
                          bottom: `calc(100% + ${foot} * var(--px))`,
                          marginLeft: `calc(${spriteCenterOffset(sprite)} * var(--px))`,
                        }}
                      />
                      <span className="mn-plate">
                        <span className="mn-structure-name">{s.def.name}</span>
                        <span className="mn-structure-level">LV {s.level}</span>
                        <span className="mn-bar" aria-hidden><i style={{ width: `${s.max ? 100 : (s.have / s.need) * 100}%` }} /></span>
                        <span className="mn-structure-count">{s.max ? 'Top level' : `${s.have}/${s.need}`}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      <header className="mn-scene-top">
        <span className="mn-chip" aria-label={`Rocket: ${base.rocket.name}, hold ${base.rocket.hold}`}>{base.rocket.name.toUpperCase()} · HOLD {base.rocket.hold}</span>
        <span className="mn-chip mn-money" aria-label="Your francs">{francs(money)}</span>
      </header>

      <footer className="mn-scene-bottom" ref={footerRef}>
        <nav className="mn-missions" aria-label="Missions you can fly">
          {open.map(c => {
            const needs = outOfReach(c, base)
            return (
              <button key={c.number} className={`mn-mission${c === next ? ' mn-mission-next' : ''}`} disabled={!!needs} onClick={() => onOpen(c)}>
                <span className="mn-mission-name">{c.name}</span>
                <span className="mn-mission-verb">{needs ? `Needs ${needs}` : done.has(c.number) ? `${VERB[c.verb]} again` : `${VERB[c.verb]} · new`}</span>
              </button>
            )
          })}
        </nav>
        <button className="mn-cta" onClick={() => onOpen(next)}>
          <span className="mn-cta-kicker">NEXT</span>
          {next.name.toUpperCase()}
        </button>
      </footer>

      {sheet && <StructureSheet state={sheet} base={base} onClose={() => setSheet(null)} />}
    </main>
  )
}

function StructureSheet({ state, base, onClose }: { state: StructureState; base: Base; onClose: () => void }) {
  const { def, level } = state
  const counts = def.counts
    ? `Levels up from ${def.unit[1]}.`
    : 'Levels up from every mission you fly.'
  // When none of the missions this structure counts is open yet, say which level opens one.
  const countsOpen = !def.counts || CHAPTERS.some(c => base.chapters.has(c.number) && def.counts!.includes(c.type))
  const opener = countsOpen ? undefined : base.structures.flatMap(s => s.def.unlocks.map((u, i) => ({ s, u, level: i + 1 })))
    .find(({ u }) => u.chapters?.some(n => def.counts!.includes(CHAPTERS.find(c => c.number === n)!.type)))
  return (
    <div className="mn-sheet-backdrop" onClick={onClose}>
      <section className="mn-card mn-sheet" role="dialog" aria-label={def.name} onClick={e => e.stopPropagation()}>
        <div className="mn-sheet-head">
          <img src={def.art[level - 1]} alt="" draggable={false} />
          <div>
            <p className="mn-title">{def.name}</p>
            <p>Level {level} · {counterText(state)}</p>
          </div>
        </div>
        <p>{counts}{opener && ` The first opens when the ${opener.s.def.name} reaches level ${opener.level}.`}</p>
        <ol className="mn-levels">
          {def.unlocks.map((u, i) => (
            <li key={i} className={i < level ? 'mn-level-have' : i === level ? 'mn-level-next' : ''}>
              <span className="mn-level-num">{i < level ? '✓' : `LV ${i + 1}`}</span>
              <span>{u.line}</span>
            </li>
          ))}
        </ol>
        <button className="mn-cta" onClick={onClose}>OK</button>
      </section>
    </div>
  )
}
