'use client'

import { useEffect, useMemo, useState } from 'react'

export interface Registry {
  flows: Record<string, string>
  viewports: Record<string, [number, number]>
  scenes: { id: string; name: string; flow: string; web: string | null; native?: string | null; tickets: string[]; note?: string }[]
}

// Scenes that mount a heavy engine start paused: click Run. (ui-rover-survey currently kills headless Chrome.)
const HEAVY = new Set(['ui-rover-survey'])

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
  const [focus, setFocus] = useState<{ scenes: string[]; note: string; files: string[] }>({ scenes: [], note: '', files: [] })
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
