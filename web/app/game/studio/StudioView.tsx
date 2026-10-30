'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import styles from './Studio.module.css'

export interface StudioPreset {
  /** What to say to an agent: `scene`, `scene/preset` or `scene@checkpoint`. */
  ref: string
  name: string
  checks: string[]
  src: string | null
  /** Line in the script where this preset starts. */
  line?: number
}

interface Props {
  scenes: { id: string; name: string }[]
  sceneId: string
  presets: StudioPreset[]
  initial: string
  /** Repo-relative script that holds the presets. */
  file: string
}

const REFRESH_MS = 2000
const DEVICES = {
  ph: { w: 390, h: 844, label: 'Phone' },
  ls: { w: 926, h: 428, label: 'Wide' },
  dk: { w: 1440, h: 900, label: 'Desktop' },
} as const
type Device = keyof typeof DEVICES

export default function StudioView({ scenes, sceneId, presets, initial, file }: Props) {
  const router = useRouter()
  const [ref, setRef] = useState(initial)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [device, setDevice] = useState<Device>('ph')
  const [frameWidth, setFrameWidth] = useState(0)
  const frame = useRef<HTMLDivElement>(null)
  const current = presets.find(p => p.ref === ref) ?? presets[0]

  // The frame keeps the real size of the device and is scaled down to the room there is, so the scene is always as large as it can be.
  useEffect(() => {
    try { const saved = localStorage.getItem('studio-device'); if (saved === 'ph' || saved === 'ls' || saved === 'dk') setDevice(saved) } catch { /* the default is fine */ }
    const el = frame.current
    if (!el) return
    const watch = new ResizeObserver(() => setFrameWidth(el.clientWidth))
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  const pick = (next: Device) => { setDevice(next); try { localStorage.setItem('studio-device', next) } catch { /* not remembered */ } }
  const { w, h } = DEVICES[device]
  const scale = frameWidth / w

  // The script is edited in the editor. Look for its changes so the scene follows what you save.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), REFRESH_MS)
    return () => clearInterval(t)
  }, [router])

  const choose = (next: StudioPreset) => {
    setRef(next.ref)
    setNote(null)
    const query = next.ref.includes('@') ? `&state=${next.ref.split('@')[1]}` : next.ref.includes('/') ? `&preset=${next.ref.split('/')[1]}` : ''
    window.history.replaceState(null, '', `?scene=${sceneId}${query}`)
  }
  const copy = () => { void navigator.clipboard?.writeText(current.ref).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) }) }
  const open = async () => {
    try {
      const response = await fetch('/api/dev/studio/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, line: current.line }) })
      const body = (await response.json()) as { ok: boolean; message?: string }
      setNote(body.ok ? null : body.message ?? 'The editor did not open.')
    } catch { setNote('The editor did not open.') }
  }

  return (
    <main className={styles.page}>
      <header className={styles.bar}>
        <select className={styles.scene} value={sceneId} aria-label="Scene" onChange={e => router.push(`/game/studio?scene=${e.target.value}`)}>
          {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className={styles.presets} role="tablist">
          {presets.map(p => <button key={p.ref} type="button" role="tab" aria-selected={p.ref === ref} className={p.ref === ref ? styles.on : ''} onClick={() => choose(p)}>{p.name}</button>)}
        </div>
        <div className={styles.devices} role="group" aria-label="Screen size">
          {(Object.keys(DEVICES) as Device[]).map(d => <button key={d} type="button" aria-pressed={d === device} className={d === device ? styles.on : ''} onClick={() => pick(d)}>{DEVICES[d].label}</button>)}
        </div>
      </header>
      <div className={styles.stage}>
        <div className={styles.frame} ref={frame} style={{ aspectRatio: `${w} / ${h}`, width: `min(100cqw, calc(100cqh * ${w / h}))` }}>
          {current.src ? <iframe key={current.src} title={current.ref} src={current.src} style={{ width: w, height: h, transform: `scale(${scale})` }} /> : <p>This scene has no fixture.</p>}
        </div>
      </div>
      <footer className={styles.foot}>
        <button type="button" className={styles.ref} onClick={copy} title="Copy this name for a prompt">{copied ? 'Copied' : current.ref}</button>
        <button type="button" className={styles.open} onClick={() => void open()} title={`Open ${file} in the editor`}>Open script</button>
        {note && <span className={styles.note}>{note}</span>}
        {current.checks.length > 0 && <ol className={styles.checks}>{current.checks.map(c => <li key={c}>{c}</li>)}</ol>}
      </footer>
    </main>
  )
}
