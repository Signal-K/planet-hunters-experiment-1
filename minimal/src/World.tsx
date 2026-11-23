import { useEffect, useRef, useState } from 'react'
import { Scene } from '@landnam/lib/engine/Scene'
import { GameObject } from '@landnam/lib/engine/GameObject'
import { BaseWorldCanvas } from '@landnam/components/game/hub/BaseWorldCanvas'
import { BASE_CAMERA_HOME } from '@landnam/lib/scene/base-camera'
import { terrainLookForTarget } from '@landnam/lib/takeon/terrainColour'
import { MINERAL_META } from '@landnam/lib/data/minerals'
import type { Target } from '@landnam/lib/data/types'
import type { Base, StructureState } from './structures'

const kit = '/game/assets/base/kit/'
const images = new Map<string, HTMLImageElement>()
function texture(src: string) {
  if (!images.has(src)) {
    const img = new Image()
    img.src = src
    images.set(src, img)
  }
  return images.get(src)!
}
class Sprite extends GameObject {
  constructor(
    id: string,
    public src: string,
    x: number,
    y: number,
    public width: number,
    public height: number,
    public action?: () => void,
    public drift = 0,
    public tint?: string,
  ) {
    super(id, id, { position: { x, y } })
  }
}
export interface Deposit {
  key: number
  mineral: string
  col: number
  row: number
  cut: boolean
  locked: boolean
}
type Props = {
  base: Base
  pilotId?: string
  phase?: 'launch' | 'land' | 'away' | 'leaving'
  target?: Target
  deposits?: Deposit[]
  onCut?: (key: number) => void
  inspect?: (s: StructureState) => void
  payload?: string
  raising?: number
  crates?: boolean
  beam?: number
  event?: boolean
}
const slots = [155, 345, 545, 740]
const initial = ['hangar', 'control-station', 'launchpad', 'exchange']
const furnishings = {
  pine: { name: 'Pine', src: kit + 'prop-tree-a.png', w: 30, h: 52 },
  rock: { name: 'Boulder', src: kit + 'prop-rock.png', w: 23, h: 14 },
  pylon: { name: 'Power pylon', src: kit + 'pylon.png', w: 32, h: 50 },
  tank: { name: 'Water tower', src: kit + 'water-tower.png', w: 42, h: 65 },
}
type PropKind = keyof typeof furnishings
type Placed = { id: string; kind: PropKind; x: number; y: number }
function savedProps(id?: string): Placed[] {
  try {
    const value = JSON.parse(localStorage.getItem('landnam-minimal:props:' + id) || '[]')
    return Array.isArray(value)
      ? value.filter((p) => p && p.kind in furnishings && Number.isFinite(p.x) && Number.isFinite(p.y))
      : []
  } catch {
    return []
  }
}
const positionsKey = (id: string) => 'landnam-minimal:positions:' + id
function placements(id?: string): string[] {
  try {
    const p = JSON.parse(localStorage.getItem(positionsKey(id || '')) || 'null')
    if (Array.isArray(p) && p.length === 4 && initial.every((i) => p.includes(i))) return p
  } catch {
    /* Default authored layout. */
  }
  return initial
}
const propFiles = import.meta.glob('./art/props/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
export function World(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null),
    latest = useRef(props)
  latest.current = props
  const [edit, setEdit] = useState(false),
    [selected, select] = useState('launchpad')
  const [layout, setLayout] = useState(() => placements(props.pilotId))
  const [tool, setTool] = useState<PropKind | 'facilities'>('facilities')
  const [propsList, setPropsList] = useState(() => savedProps(props.pilotId))
  const commitProps = (next: Placed[]) => {
    setPropsList(next)
    try {
      localStorage.setItem('landnam-minimal:props:' + props.pilotId, JSON.stringify(next))
    } catch {
      /* Session placement remains visible. */
    }
  }
  const [scale, setScale] = useState(1)
  const picking = useRef<(x: number, y: number) => void>(() => {})
  function place(index: number) {
    const current = layout.indexOf(selected)
    if (current < 0 || index === current) return
    const next = [...layout]
    ;[next[current], next[index]] = [next[index], next[current]]
    setLayout(next)
    if (props.pilotId)
      try {
        localStorage.setItem(positionsKey(props.pilotId), JSON.stringify(next))
      } catch {
        /* session layout */
      }
  }
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext('2d')!
    const root = new GameObject('world', 'Mission world')
    const scene = new Scene(targetName())
    function targetName() {
      return props.target?.name || 'Earth station'
    }
    scene.add(root)
    const sprites: Sprite[] = []
    function add(
      id: string,
      src: string,
      x: number,
      y: number,
      w: number,
      h: number,
      action?: () => void,
      drift = 0,
      tint?: string,
      parent: GameObject = root,
    ) {
      const s = new Sprite(id, src, x, y, w, h, action, drift, tint)
      parent.addChild(s)
      sprites.push(s)
      return s
    }
    const target = props.target
    let seed = 17
    for (const c of target?.id || 'earth') seed = (seed * 31 + c.charCodeAt(0)) >>> 0
    const random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296
    const prop = (name: string) => propFiles['./art/props/' + name + '.png']
    if (!target) {
      const peaks = prop('mountain')
      if (peaks) for (let i = 0; i < 7; i++) add('peak-' + i, peaks, i * 170 - 60, 197, 280, 100 + random() * 58)
      const hill = prop('hill')
      if (hill) for (let i = 0; i < 7; i++) add('hill-' + i, hill, i * 160, 209, 255, 55 + random() * 30)
      for (let i = 0; i < 72; i++) {
        const h = 10 + random() * 22
        add(
          'tree-' + i,
          prop('pine') || kit + 'prop-tree-a.png',
          random() * 1000 - 50,
          199 + random() * 13,
          h * 0.6,
          h,
        )
      }
      for (let i = 0; i < 20; i++) add('apron-' + i, kit + 'concrete.png', i * 51 - 25, 265, 52, 67)
      for (let i = 0; i < 15; i++) add('road-' + i, kit + 'road-a.png', i * 73, 282, 74, 20)
      for (let i = 0; i < 14; i++) add('verge-' + i, kit + 'grass.png', i * 80, 326, 82, 50)
      for (const [i, id] of layout.entries()) {
        const s = props.base.structures.find((x) => x.def.id === id)!
        const pad = id === 'launchpad',
          w = pad ? 175 : id === 'exchange' ? 165 : 125
        const h = pad ? 153 : id === 'exchange' ? 73 : 86
        const building = add(id, s.def.art[s.level - 1], slots[i], 227, w, h, () =>
          edit ? select(id) : latest.current.inspect?.(s),
        )
        if (pad) {
          const rocket = add(
            'rocket',
            kit + 'pad-rocket.png',
            5,
            -19,
            41,
            113,
            building.action,
            0,
            undefined,
            building,
          )
          if (props.phase) add('engine-plume', kit + 'flame-0.png', 0, 24, 20, 25, undefined, 0, undefined, rocket)
        }
      }
      for (const entry of [...propsList].sort((a, b) => a.y - b.y)) {
        const def = furnishings[entry.kind]
        add(entry.id, entry.kind === 'pine' ? prop('pine') || def.src : def.src, entry.x, entry.y, def.w, def.h)
      }
      add('supply-truck', kit + 'truck-a.png', 80, 276, 37, 18)
    } else {
      const palette = terrainLookForTarget(target)
      for (let i = 0; i < 60; i++)
        add('star-' + i, 'star', random() * 900, random() * 130, 1 + random() * 2, 2, undefined, 0, '#d7eef1')
      if (target.id === 'moon') add('earthrise', kit + 'earth-pixel.png', 692, 86, 54, 54)
      for (let i = 0; i < 24; i++)
        add('ridge-' + i, 'ridge', i * 46 - 20, 166, 90, 22 + random() * 33, undefined, 0, palette.ground[0])
      for (let i = 0; i < 24; i++)
        add('ground-' + i, 'tile', i * 43 - 20, 335, 44, 171, undefined, 0, palette.ground[1])
      for (let i = 0; i < 66; i++)
        add(
          'rock-' + i,
          kit + 'prop-rock.png',
          random() * 940,
          162 + random() * 160,
          4 + random() * 14,
          3 + random() * 7,
        )
      const ore = props.deposits || [],
        cols = Math.max(3, ...ore.map((d) => d.col + 1))
      for (const d of ore.filter((d) => !d.cut)) {
        const meta = MINERAL_META[d.mineral]
        add(
          'ore-' + d.key,
          props.event ? 'fragment' : 'ore',
          70 + ((d.col + 0.5) * 760) / cols,
          props.event ? 68 + 55 * d.row : 205 + d.row * 54,
          46,
          36,
          () => latest.current.onCut?.(d.key),
          0,
          meta?.color || '#dde5eb',
        )
      }
      add('ship', kit + 'space-rocket.png', 446, 133, 32, 76)
      if (props.payload) add('payload', props.payload === 'satellite' ? 'satellite' : 'probe', 492, 100, 41, 16)
      if (props.raising !== undefined)
        add('outpost', kit + 'starter-cabin.png', 550, 169, 72, Math.max(1, props.raising * 57))
      if (props.crates) add('cargo', 'tile', 550, 166, 40, 23, undefined, 0, '#d2a569')
    }
    scene.start()
    let raf = 0,
      last = performance.now(),
      t = 0
    let hits: { s: Sprite; x: number; y: number; w: number; h: number }[] = []
    const resize = new ResizeObserver(() => setScale(Math.max(0.6, canvas.clientWidth / 520)))
    resize.observe(canvas)
    function draw(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      scene.update(dt)
      const w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(2, devicePixelRatio || 1)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const sx = w / 900,
        sy = h / 310
      const unit = Math.min(sx, sy * 1.18)
      if (target) {
        const look = terrainLookForTarget(target)
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, look.skyNight)
        grad.addColorStop(1, look.sky)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }
      hits = []
      const origin = new Map<GameObject, { x: number; y: number }>()
      for (const s of sprites) {
        let { x, y } = s.transform.position
        const p = s.parent && origin.get(s.parent)
        x = p ? p.x + x * unit : x * sx
        y = p ? p.y + y * unit : y * sy
        if (s.id === 'supply-truck') x = (((t * 12 + 80) % 980) - 40) * sx
        if (s.id === 'rocket' && props.phase === 'launch') y -= Math.pow(t / 1.5, 2) * h * 1.6
        if (s.id === 'rocket' && props.phase === 'land') y -= Math.pow(Math.max(0, 1 - t / 1.5), 2) * h * 1.6
        if (s.id === 'ship') y += props.phase === 'leaving' ? -Math.pow(t / 0.9, 2) * h : Math.sin(t * 2) * 3
        if (s.id === 'payload') y -= Math.min(1, t / 1.6) * h * 0.34
        if (s.src === 'fragment') {
          x += Math.sin(t + s.transform.position.x) * 7
          y += Math.sin(t * 1.2 + s.transform.position.x) * 5
        }
        origin.set(s, { x, y })
        const tile = /^(apron|road|verge|ground|ridge)-/.test(s.id)
        const sw = s.width * (tile ? sx : unit),
          sh = s.height * (tile ? sy : unit),
          left = x - sw / 2,
          top = y - sh
        ctx.fillStyle = s.tint || '#d2d9df'
        if (s.src === 'star' || s.src === 'tile') ctx.fillRect(left, top, sw + 0.5, sh + 0.5)
        else if (['ridge', 'ore', 'fragment'].includes(s.src)) {
          ctx.beginPath()
          ctx.moveTo(left, y)
          ctx.lineTo(left + sw * 0.18, top + sh * 0.44)
          ctx.lineTo(left + sw * 0.52, top)
          ctx.lineTo(left + sw * 0.79, top + sh * 0.2)
          ctx.lineTo(left + sw, y)
          ctx.closePath()
          ctx.fill()
          if (s.src !== 'ridge') {
            ctx.strokeStyle = '#f2f7da'
            ctx.stroke()
            ctx.fillStyle = '#ffffff7a'
            ctx.fillRect(left + sw * 0.4, top + sh * 0.32, sw * 0.23, sh * 0.13)
          }
        } else if (s.src === 'satellite' || s.src === 'probe') {
          ctx.fillStyle = '#8196ad'
          ctx.fillRect(left, top + sh * 0.2, sw, sh * 0.6)
          ctx.fillStyle = '#f1bd61'
          ctx.fillRect(x - sw * 0.12, top, sw * 0.24, sh)
        } else {
          const img = texture(s.src)
          if (img.complete && img.naturalWidth) ctx.drawImage(img, left, top, sw, sh)
        }
        if (s.action) hits.push({ s, x, y: y - sh / 2, w: Math.max(44, sw), h: Math.max(44, sh) })
        if (edit && s.id === selected) {
          ctx.strokeStyle = '#f9bf60'
          ctx.setLineDash([4, 4])
          ctx.strokeRect(left - 3, top - 3, sw + 6, sh + 6)
          ctx.setLineDash([])
        }
        if (s.id === 'ore-' + props.beam) {
          ctx.strokeStyle = '#90ecff'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(w * 0.495, sy * 128)
          ctx.lineTo(x, y - sh * 0.5)
          ctx.stroke()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    picking.current = (x, y) => {
      if (edit && tool !== 'facilities') {
        const wx = Math.max(15, Math.min(885, (x / canvas.clientWidth) * 900))
        const wy = Math.max(214, Math.min(302, (y / canvas.clientHeight) * 310))
        commitProps([...propsList, { id: crypto.randomUUID(), kind: tool, x: wx, y: wy }])
        return
      }
      const hit = hits
        .slice()
        .reverse()
        .find((v) => Math.abs(v.x - x) < v.w / 2 && Math.abs(v.y - y) < v.h / 2)
      hit?.s.action?.()
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      scene.destroy()
    }
  }, [
    layout,
    edit,
    selected,
    tool,
    propsList,
    props.base,
    props.phase,
    props.target,
    props.deposits,
    props.payload,
    props.raising,
    props.crates,
    props.beam,
    props.event,
  ])
  return (
    <div className={'sim ' + (props.target ? 'sim-away' : '')}>
      {!props.target && (
        <BaseWorldCanvas px={scale} camera={BASE_CAMERA_HOME} time="morning" biome="mountains" groundLine={0.34} />
      )}
      <canvas
        ref={ref}
        aria-label={props.target ? 'Mission surface' : 'Spaceport. Select a facility to inspect it.'}
        onClick={(e) => {
          const b = e.currentTarget.getBoundingClientRect()
          picking.current(e.clientX - b.left, e.clientY - b.top)
        }}
      />
      {props.target && (
        <div className="sr-controls">
          {props.deposits
            ?.filter((d) => !d.cut)
            .map((d) => (
              <button key={d.key} onClick={() => props.onCut?.(d.key)}>
                {MINERAL_META[d.mineral]?.name || d.mineral}
              </button>
            ))}
        </div>
      )}
      {props.pilotId && !props.phase && !props.target && (
        <div className="sim-tools">
          {edit && (
            <>
              <select
                aria-label="Placement tool"
                value={tool}
                onChange={(e) => setTool(e.target.value as typeof tool)}
              >
                <option value="facilities">Move facility</option>
                {Object.entries(furnishings).map(([key, f]) => (
                  <option key={key} value={key}>
                    Place {f.name}
                  </option>
                ))}
              </select>
              {tool !== 'facilities' ? (
                <>
                  <span>Tap the ground</span>
                  <button disabled={!propsList.length} onClick={() => commitProps(propsList.slice(0, -1))}>
                    Undo last prop
                  </button>
                </>
              ) : (
                <>
                  <select aria-label="Facility to place" value={selected} onChange={(e) => select(e.target.value)}>
                    {props.base.structures.map((s) => (
                      <option key={s.def.id} value={s.def.id}>
                        {s.def.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Facility site"
                    value={layout.indexOf(selected)}
                    onChange={(e) => place(Number(e.target.value))}
                  >
                    {slots.map((_, i) => (
                      <option key={i} value={i}>
                        Site {i + 1}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
          <button onClick={() => setEdit(!edit)}>{edit ? 'Finish placement' : 'Arrange base'}</button>
        </div>
      )}
    </div>
  )
}
