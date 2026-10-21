'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { resolvePreset } from '@/lib/devPresets'

export interface Registry {
  flows: Record<string, string>
  viewports: Record<string, [number, number]>
  scenes: { id: string; name: string; flow: string; web: string | null; native?: string | null; tickets: string[]; note?: string }[]
}

// Scenes that genuinely need manual opt-in can be listed here. Rover Survey
// mounts safely now that host callback changes no longer reconstruct TakeOn.
const HEAVY = new Set<string>()

export interface FocusState { scenes: string[]; note: string; ticket: string; title: string; description: string; files: string[] }
interface Comment { id: string; at: string; from: 'user' | 'agent'; text: string; re?: string }

const VP_LABEL: Record<string, string> = { ph: 'Phone', ls: 'Landscape', dk: 'Desktop' }

export default function StoryboardClient({ registry }: { registry: Registry }) {
  const [vp, setVp] = useState('ph')
  const [flow, setFlow] = useState('all')
  const [query, setQuery] = useState('')
  const [native, setNative] = useState(true)
  const [cardW, setCardW] = useState(260)
  const [bump, setBump] = useState(0)
  const [copied, setCopied] = useState('')
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [focus, setFocus] = useState<FocusState>({ scenes: [], note: '', ticket: '', title: '', description: '', files: [] })
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    let alive = true
    const poll = async () => {
      try { const r = await fetch('/game/storyboard/focus', { cache: 'no-store' }); if (alive && r.ok) setFocus(await r.json()) } catch { /* server restarting */ }
    }
    poll()
    const t = setInterval(poll, 3000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [missing, setMissing] = useState<Record<string, boolean>>({})
  const [w, h] = registry.viewports[vp]
  const scale = cardW / w
  const q = query.trim().toLowerCase()

  const groups = useMemo(() => Object.entries(registry.flows)
    .filter(([f]) => flow === 'all' || f === flow)
    .map(([f, label]) => ({
      f, label,
      scenes: registry.scenes.filter(s => s.flow === f && (!q || [s.id, s.name, s.web ?? '', s.native ?? '', ...s.tickets].some(x => x.toLowerCase().includes(q)))),
    }))
    .filter(g => g.scenes.length), [registry, flow, q])

  // A scene counts as "being edited" when an agent declared it, or a recently changed file's name contains one of the scene's keywords.
  const keys = (sc: Registry['scenes'][number]) => [sc.id, (sc.web ?? '').replace(/^(ui|m1|storage|transport|telescope)-/, ''), (sc.native ?? '').replace(/-(phone|landscape|desktop)$/, '')]
    .map(k => k.replace(/-/g, '').toLowerCase()).filter(k => k.length > 3)
  const editing = (sc: Registry['scenes'][number]) => {
    if (focus.scenes.includes(sc.id)) return { by: 'declared', files: [] as string[] }
    const ks = keys(sc)
    const files = focus.files.filter(f => { const b = f.split('/').pop()!.toLowerCase().replace(/[-_.]/g, ''); return ks.some(k => b.includes(k)) })
    return files.length ? { by: 'files', files } : null
  }

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 1500) } catch { /* clipboard blocked */ }
  }


  // Focus view: one scene (the one the agent declared), the ticket, a description and a comment box wired to the agent.
  const focusScene = registry.scenes.find(sc => sc.id === focus.scenes[0])
  if (focusScene && !showAll) {
    return <FocusView registry={registry} scene={focusScene} focus={focus} vp={vp} setVp={setVp} bump={bump} onReload={() => setBump(b => b + 1)} onShowAll={() => setShowAll(true)} />
  }

  const btn = (on: boolean): React.CSSProperties => ({
    minHeight: 44, padding: '0 12px', border: '2px solid #0f2436', borderRadius: 6, cursor: 'pointer',
    background: on ? '#0f2436' : '#fff', color: on ? '#fff' : '#0f2436', font: 'inherit', fontSize: 14,
  })

  return (
    <main style={{ background: '#eef4fa', color: '#0f2436', minHeight: '100vh', font: '14px system-ui' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#eef4fa', borderBottom: '2px solid #0f2436', padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {Object.keys(registry.viewports).map(k => (
          <button key={k} style={btn(vp === k)} onClick={() => setVp(k)}>{VP_LABEL[k] ?? k} {registry.viewports[k].join('x')}</button>
        ))}
        <select aria-label="Flow" value={flow} onChange={e => setFlow(e.target.value)} style={{ ...btn(false), minWidth: 140 }}>
          <option value="all">All flows</option>
          {Object.entries(registry.flows).map(([f, label]) => <option key={f} value={f}>{label}</option>)}
        </select>
        <input aria-label="Search" placeholder="Search scene, preset, ticket" value={query} onChange={e => setQuery(e.target.value)} style={{ ...btn(false), minWidth: 200 }} />
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>Size
          <input type="range" min={140} max={700} value={cardW} onChange={e => setCardW(+e.target.value)} />
        </label>
        <button style={btn(native)} onClick={() => setNative(n => !n)}>Native {native ? 'on' : 'off'}</button>
        <button style={btn(false)} onClick={() => { setBump(b => b + 1); setMissing({}) }}>Reload all</button>
      </header>

      {(focus.note || focus.scenes.length > 0) && (
        <div style={{ padding: '8px 12px', background: '#1f6feb', color: '#fff' }}>
          Agent focus: {focus.scenes.join(', ') || 'none'} {focus.note && `| ${focus.note}`}
          {focus.scenes[0] && <a href={`#scene-${focus.scenes[0]}`} style={{ color: '#fff', marginLeft: 12 }}>Jump</a>}
          {focusScene && <button onClick={() => setShowAll(false)} style={{ ...btn(false), marginLeft: 12 }}>Back to focus</button>}
        </div>
      )}

      {groups.map(g => (
        <section key={g.f} style={{ padding: 12 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>{g.label} <small style={{ opacity: 0.6 }}>{g.f}</small></h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
            {g.scenes.map(s => {
              const ref = `${s.id} (${s.web ? `web preset ${s.web}` : 'no web preset'}${s.native ? `, native ${s.native}` : ''}) @ ${VP_LABEL[vp]} ${w}x${h}`
              const nativeSrc = s.native && vp === 'ph' ? `/game/storyboard/native/${s.native}.png?b=${bump}` : null
              const ed = editing(s)
              const live = !!s.web && (!HEAVY.has(s.web) || running[s.id])
              return (
                <figure key={s.id} id={`scene-${s.id}`} style={{ margin: 0, padding: 6, borderRadius: 8, outline: ed ? `4px solid ${ed.by === 'declared' ? '#1f6feb' : '#6ea8fe'}` : '4px solid transparent', background: ed ? 'rgba(31,111,235,0.08)' : 'transparent' }}>
                  <figcaption style={{ marginBottom: 4, maxWidth: cardW * (native ? 2 : 1) + 8 }}>
                    {ed && <span style={{ background: '#1f6feb', color: '#fff', padding: '2px 6px', borderRadius: 4, marginRight: 6, fontSize: 14 }} title={ed.files.join('\n')}>EDITING</span>}
                    <strong>{s.name}</strong> <code>{s.web ?? 'native only'}</code> {s.tickets.join(' ')}
                    {s.web && <a href={`/game/stage?preset=${encodeURIComponent(s.web)}`} target="_blank" rel="noreferrer" style={{ ...btn(false), display: 'inline-grid', placeItems: 'center', marginLeft: 8, textDecoration: 'none' }}>Open</a>}
                    <button style={{ ...btn(false), minHeight: 44, marginLeft: 8 }} onClick={() => copy(ref)}>{copied === ref ? 'Copied' : 'Copy ref'}</button>
                    {s.web && resolvePreset(s.web)?.screen && <a href={`/game/studio?scene=${resolvePreset(s.web)?.screen}&state=${encodeURIComponent(s.web)}`} style={{ ...btn(false), display: 'inline-grid', placeItems: 'center', marginLeft: 8, textDecoration: 'none' }}>Edit in Studio</a>}
                    {s.note && <div style={{ opacity: 0.7 }}>{s.note}</div>}
                  </figcaption>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: cardW, height: h * scale, overflow: 'hidden', border: '2px solid #0f2436', background: '#fff' }}>
                      {!s.web && <span style={{ padding: 8, opacity: 0.6 }}>No web preset yet</span>}
                      {s.web && !live && <button style={{ ...btn(false), margin: 12 }} onClick={() => setRunning(r => ({ ...r, [s.id]: true }))}>Run (heavy)</button>}
                      {live && <iframe
                        key={bump}
                        title={s.name}
                        loading="lazy"
                        src={`/game/stage?preset=${encodeURIComponent(s.web!)}`}
                        style={{ width: w, height: h, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}
                      />}
                    </div>
                    {native && (
                      <div style={{ width: cardW, minHeight: 60, border: '2px dashed #0f2436', background: '#fff', display: 'grid', placeItems: 'center' }}>
                        {mounted && nativeSrc && !missing[s.id]
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={nativeSrc} alt={`${s.name} native`} style={{ width: '100%', display: 'block' }} onError={() => setMissing(m => ({ ...m, [s.id]: true }))} />
                          : <span style={{ padding: 8, opacity: 0.6 }}>{!s.native ? 'No native scene' : vp !== 'ph' ? 'Native snapshots are phone only' : `No snapshot yet for ${s.native}`}</span>}
                      </div>
                    )}
                  </div>
                </figure>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}

const ink = '#0f2436'
const box = (on = false): React.CSSProperties => ({
  minHeight: 44, padding: '0 12px', border: `2px solid ${ink}`, borderRadius: 6, cursor: 'pointer',
  background: on ? ink : '#fff', color: on ? '#fff' : ink, font: 'inherit', fontSize: 14,
})

function FocusView({ registry, scene, focus, vp, setVp, bump, onReload, onShowAll }: {
  registry: Registry; scene: Registry['scenes'][number]; focus: FocusState
  vp: string; setVp: (v: string) => void; bump: number; onReload: () => void; onShowAll: () => void
}) {
  const [w, h] = registry.viewports[vp]
  const [avail, setAvail] = useState({ w: 900, h: 700 })
  useEffect(() => {
    const fit = () => setAvail({ w: window.innerWidth, h: window.innerHeight })
    fit(); window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const wide = avail.w >= 900
  // Scene gets the space left of the side panel (or the full width when stacked) and the height under the header.
  const stageW = wide ? avail.w - 360 - 48 : avail.w - 24
  const stageH = avail.h - (wide ? 150 : 300)
  const nativeOn = vp === 'ph' && !!scene.native
  const scale = Math.max(0.2, Math.min((nativeOn ? stageW / 2 - 8 : stageW) / w, stageH / h, 1))
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [nativeMissing, setNativeMissing] = useState(false)

  const [thread, setThread] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const load = async () => {
    try { const r = await fetch('/game/storyboard/comments', { cache: 'no-store' }); if (r.ok) setThread((await r.json()).thread) } catch { /* server restarting */ }
  }
  useEffect(() => { load(); const t = setInterval(load, 2500); return () => clearInterval(t) }, [])
  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setErr('')
    try {
      const r = await fetch('/game/storyboard/comments', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: body, scene: scene.id, ticket: focus.ticket, viewport: `${vp} ${w}x${h}` }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setText(''); await load()
    } catch { setErr('Not sent. Your text is kept; try again.') } finally { setSending(false) }
  }
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [thread.length])

  const ticketUrl = focus.ticket ? `https://linear.app/issue/${encodeURIComponent(focus.ticket)}` : ''
  const heading = focus.title || scene.name
  return (
    <main style={{ background: '#eef4fa', color: ink, minHeight: '100vh', font: '14px system-ui', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 12px', borderBottom: `2px solid ${ink}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ background: '#1f6feb', color: '#fff', padding: '4px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>EDITING</span>
        {focus.ticket && <a href={ticketUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: ink }}>{focus.ticket}</a>}
        <strong style={{ fontSize: 16 }}>{heading}</strong>
        <span style={{ flex: 1 }} />
        {Object.keys(registry.viewports).map(k => <button key={k} style={box(vp === k)} onClick={() => setVp(k)}>{VP_LABEL[k] ?? k} {registry.viewports[k].join('x')}</button>)}
        <button style={box()} onClick={onReload}>Reload</button>
        <button style={box()} onClick={onShowAll}>All scenes</button>
      </header>

      <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 12, padding: 12, flex: 1, minHeight: 0 }}>
        <section style={{ flex: 1, minWidth: 0 }}>
          {focus.description && <p style={{ margin: '0 0 8px', maxWidth: 760, lineHeight: 1.45 }}>{focus.description}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: w * scale, height: h * scale, overflow: 'hidden', border: `2px solid #1f6feb`, background: '#fff', flex: 'none' }}>
              {scene.web
                ? <iframe key={bump} title={scene.name} src={`/game/stage?preset=${encodeURIComponent(scene.web)}`} style={{ width: w, height: h, border: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }} />
                : <span style={{ padding: 8, opacity: 0.6 }}>No web preset yet</span>}
            </div>
            {nativeOn && (
              <div style={{ width: w * scale, minHeight: 60, border: `2px dashed ${ink}`, background: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
                {mounted && !nativeMissing
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/game/storyboard/native/${scene.native}.png?b=${bump}`} alt={`${scene.name} native`} style={{ width: '100%', display: 'block' }} onError={() => setNativeMissing(true)} />
                  : <span style={{ padding: 8, opacity: 0.6 }}>No native snapshot yet for {scene.native}</span>}
              </div>
            )}
          </div>
        </section>

        <aside style={{ width: wide ? 360 : 'auto', flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, border: `2px solid ${ink}`, borderRadius: 8, background: '#fff', padding: 8, maxHeight: wide ? avail.h - 100 : 'none' }}>
          <strong>Comments to the agent</strong>
          <div style={{ flex: 1, minHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {thread.length === 0 && <span style={{ opacity: 0.6 }}>Nothing yet. Write below; it reaches the agent while it works.</span>}
            {thread.map(c => (
              <div key={c.id} style={{ alignSelf: c.from === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', padding: '6px 10px', borderRadius: 8, background: c.from === 'user' ? ink : '#dbe7f5', color: c.from === 'user' ? '#fff' : ink, whiteSpace: 'pre-wrap' }}>
                {c.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {err && <div role="alert" style={{ color: '#b42318' }}>{err}</div>}
          <textarea
            aria-label="Comment for the agent" value={text} rows={3} placeholder="Comment on this scene. Cmd+Enter to send."
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send() } }}
            style={{ font: 'inherit', fontSize: 14, border: `2px solid ${ink}`, borderRadius: 6, padding: 8, resize: 'vertical' }}
          />
          <button style={box(true)} disabled={sending || !text.trim()} onClick={() => void send()}>{sending ? 'Sending' : 'Send to agent'}</button>
        </aside>
      </div>
    </main>
  )
}
