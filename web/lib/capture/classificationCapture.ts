// Keeps every classification in full on the shared backend
// (platform_classification_captures): the whole answer, the image the player
// looked at, and that image with their markings. The per-game collections stay
// the consensus feeds. Writes go through the offline outbox.
//
// Zooniverse images (Saturn, radio meteors) cannot be read by the browser (no
// CORS), so those send source_url plus an `overlay` and the server draws the
// marked-up copy. Plots the game draws itself (TESS light curves, the NEOCP
// sky plot) are rendered here.

import { pbShared } from '@/lib/pb'
import { getOutbox } from '@/lib/offline/pbOutbox'
import { newRecordId } from '@/lib/offline/outbox'
import { putCaptureBlob } from './blobStore'
import type { LightcurvePoint } from '@/components/game/LightcurvePlot'
import type { TransitRange } from '@/lib/data'

export const CAPTURE_COLLECTION = 'platform_classification_captures'

export type CaptureKind = 'tess' | 'neocp' | 'saturn' | 'radio-meteor'

/** Markup the server draws onto source_url, in a width x height coordinate space. */
export interface CaptureOverlay {
  width: number
  height: number
  boxes?: Array<{ x: number; y: number; width: number; height: number; color?: string }>
  grid?: { cols: number; rows: number; cells: Array<{ index: number; color?: string }> }
}

export interface CaptureInput {
  kind: CaptureKind
  subject: string
  /** The consensus collection this answer also went to, if any. */
  recordCollection?: string
  annotations: Record<string, unknown>
  overlay?: CaptureOverlay
  sourceUrl?: string
  image?: Blob | null
  annotatedImage?: Blob | null
}

/** Queues the capture; does nothing when no one is signed in. Returns the record id. */
export async function queueClassificationCapture(input: CaptureInput): Promise<string | null> {
  const user = pbShared.authStore.record?.id
  if (!user) return null
  const id = newRecordId()
  const files: Record<string, string> = {}
  for (const [field, blob] of [['image', input.image], ['annotated_image', input.annotatedImage]] as const) {
    if (blob && await putCaptureBlob(`${id}:${field}`, blob)) files[field] = `${id}:${field}`
  }
  await getOutbox().enqueue({
    type: 'shared-create',
    collection: CAPTURE_COLLECTION,
    id,
    data: {
      user,
      game: 'landnam',
      kind: input.kind,
      subject: input.subject,
      record_collection: input.recordCollection ?? '',
      source_url: input.sourceUrl ?? '',
      annotations: { ...input.annotations, ...(input.overlay ? { overlay: input.overlay } : {}), capturedAt: Date.now() },
    },
    ...(Object.keys(files).length ? { files } : {}),
  })
  return id
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'))
}

const PLOT = { w: 1600, h: 700, left: 110, right: 30, top: 70, bottom: 80 }

/**
 * The light curve as the player saw it (image) and with their marked dips
 * shaded (annotated). `ranges` are in the same time units as the points.
 */
export async function renderLightcurveCapture(
  points: LightcurvePoint[],
  ranges: TransitRange[],
  title: string,
  verdict: string,
): Promise<{ image: Blob | null; annotated: Blob | null }> {
  if (typeof document === 'undefined' || points.length < 2) return { image: null, annotated: null }
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [yLo, yHi] = [Math.min(...ys), Math.max(...ys)]
  const pad = (yHi - yLo) * 0.08 || 0.001
  const y0 = yLo - pad
  const y1 = yHi + pad
  const pw = PLOT.w - PLOT.left - PLOT.right
  const ph = PLOT.h - PLOT.top - PLOT.bottom
  const sx = (x: number) => PLOT.left + ((x - x0) / (x1 - x0 || 1)) * pw
  const sy = (y: number) => PLOT.top + (1 - (y - y0) / (y1 - y0 || 1)) * ph

  const draw = (marked: boolean) => {
    const canvas = document.createElement('canvas')
    canvas.width = PLOT.w
    canvas.height = PLOT.h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, PLOT.w, PLOT.h)
    ctx.strokeStyle = 'rgba(160,190,220,0.25)'
    ctx.lineWidth = 1
    ctx.font = '20px system-ui, sans-serif'
    ctx.fillStyle = '#9fb3c8'
    for (let i = 0; i <= 5; i++) {
      const gx = PLOT.left + (pw * i) / 5
      const gy = PLOT.top + (ph * i) / 5
      ctx.beginPath(); ctx.moveTo(gx, PLOT.top); ctx.lineTo(gx, PLOT.top + ph); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(PLOT.left, gy); ctx.lineTo(PLOT.left + pw, gy); ctx.stroke()
      ctx.textAlign = 'center'
      ctx.fillText((x0 + ((x1 - x0) * i) / 5).toFixed(2), gx, PLOT.top + ph + 30)
      ctx.textAlign = 'right'
      ctx.fillText((y1 - ((y1 - y0) * i) / 5).toFixed(4), PLOT.left - 10, gy + 7)
    }
    ctx.textAlign = 'center'
    ctx.fillText('Time (days)', PLOT.left + pw / 2, PLOT.h - 16)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#e6f0fa'
    ctx.font = '26px system-ui, sans-serif'
    ctx.fillText(title, PLOT.left, 44)
    if (marked) {
      for (const r of ranges) {
        const a = sx(Math.min(r.x1, r.x2))
        const b = sx(Math.max(r.x1, r.x2))
        ctx.fillStyle = 'rgba(236,120,60,0.28)'
        ctx.fillRect(a, PLOT.top, Math.max(2, b - a), ph)
        ctx.strokeStyle = '#ec783c'
        ctx.lineWidth = 3
        ctx.strokeRect(a, PLOT.top, Math.max(2, b - a), ph)
      }
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ec783c'
      ctx.fillText(`Verdict: ${verdict} · ${ranges.length} dip${ranges.length === 1 ? '' : 's'} marked`, PLOT.w - PLOT.right, 44)
    }
    ctx.fillStyle = '#70d9ea'
    for (const p of points) ctx.fillRect(sx(p.x) - 1.5, sy(p.y) - 1.5, 3, 3)
    return canvas
  }
  const plain = draw(false)
  const marked = draw(true)
  return {
    image: plain ? await canvasBlob(plain) : null,
    annotated: marked ? await canvasBlob(marked) : null,
  }
}

/**
 * A PNG of an inline SVG as it is on screen. Computed styles are copied onto
 * the clone, since class-based CSS and custom properties do not survive the
 * trip through an <img>.
 */
export async function snapshotSvg(svg: SVGSVGElement | null, width = 1200): Promise<Blob | null> {
  if (!svg || typeof document === 'undefined') return null
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement
    const source = [svg, ...Array.from(svg.querySelectorAll('*'))]
    const target = [clone, ...Array.from(clone.querySelectorAll('*'))]
    const props = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'opacity', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'visibility', 'display']
    source.forEach((el, i) => {
      const cs = getComputedStyle(el)
      const style = props.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';')
      target[i]?.setAttribute('style', style)
    })
    const rect = svg.getBoundingClientRect()
    const aspect = rect.width > 0 ? rect.height / rect.width : 1
    const height = Math.round(width * aspect)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    const xml = new XMLSerializer().serializeToString(clone)
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('svg load')); img.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      const bg = getComputedStyle(svg.parentElement ?? svg).backgroundColor
      ctx.fillStyle = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#0b1220'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      return await canvasBlob(canvas)
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return null
  }
}
