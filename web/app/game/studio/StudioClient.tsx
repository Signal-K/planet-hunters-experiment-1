'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildAgentPrompt } from '@/lib/authoring/agent-prompt'
import type { FeedbackDoc, Pin, Rect, SceneDoc, SceneObject } from '@/lib/authoring/docs'
import type { EditOp } from '@/lib/authoring/edit'
import { VIEWPORTS, objectRect, resolveFocusScenes, snap, uniqueId } from '@/lib/authoring/studio-model'
import type { ViewportKey } from '@/lib/authoring/studio-model'
import type { DataDocBundle, DocBundle, SceneBundle, StudioIndex } from '@/lib/authoring/studio-types'
import type { Path } from '@/lib/authoring/toml'
import Composer from './Composer'
import Inspector from './Inspector'
import MoreMenu from './MoreMenu'
import PreviewStage from './PreviewStage'
import type { StagePin, Tool } from './PreviewStage'
import ReviewPanel from './ReviewPanel'
import type { ThreadMessage } from './ReviewPanel'
import ScenePicker from './ScenePicker'
import SourceView from './SourceView'
import { getData, getFocus, getIndex, getScene, isUnchanged, send } from './studio-api'
import styles from './Studio.module.css'

export type Target = { type: 'scene'; id: string } | { type: 'data'; kind: 'world' | 'mission'; id: string }
export type Mode = 'review' | 'edit'
type Theme = 'auto' | 'light' | 'dark'

interface Props {
  initialIndex: StudioIndex
  initialTarget: Target
  initialScene: SceneBundle | null
  initialData: DataDocBundle | null
  initialFixture: string | null
  initialVp: ViewportKey
  initialMode: Mode
  follow: boolean
}

interface History {
  file: string
  text: string
  expectHash: string
}

const isEditing = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

export default function StudioClient(props: Props) {
  const [index, setIndex] = useState(props.initialIndex)
  const [target, setTarget] = useState(props.initialTarget)
  const [scene, setScene] = useState(props.initialScene)
  const [data, setData] = useState(props.initialData)
  const [fixture, setFixture] = useState(props.initialFixture)
  const [vp, setVp] = useState(props.initialVp)
  const [mode, setMode] = useState<Mode>(props.initialTarget.type === 'data' ? 'edit' : props.initialMode)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedPath, setSelectedPath] = useState<Path>([])
  const [objectsOn, setObjectsOn] = useState(true)
  const [showNative, setShowNative] = useState(true)
  const [bump, setBump] = useState(0)
  const [status, setStatus] = useState<{ text: string; bad?: boolean; at: number }>({ text: '', at: 0 })
  const [undoStack, setUndoStack] = useState<History[]>([])
  const [redoStack, setRedoStack] = useState<History[]>([])
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [highlightPin, setHighlightPin] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [theme, setTheme] = useState<Theme>('auto')
  const [kind, setKind] = useState<'wrong' | 'keep'>('wrong')
  const busy = useRef(false)
  const wanted = useRef<string | null>(props.initialFixture)

  const sceneDoc = (scene?.scene.value ?? null) as SceneDoc | null
  const feedbackDoc = (scene?.feedback.value ?? null) as FeedbackDoc | null
  const objects: SceneObject[] = sceneDoc?.objects ?? []
  const activeDoc: DocBundle | null = target.type === 'scene' ? scene?.scene ?? null : data?.doc ?? null
  const fixtures = scene?.fixtures ?? []
  const focusScenes = useMemo(() => resolveFocusScenes(index.scenes, index.focus?.scenes ?? []), [index.scenes, index.focus])
  const editing = mode === 'edit' || target.type === 'data'

  const say = useCallback((text: string, bad = false) => setStatus({ text, bad, at: Date.now() }), [])
  useEffect(() => {
    if (!status.text) return
    const timer = setTimeout(() => setStatus(s => (s.at === status.at ? { ...s, text: '' } : s)), status.bad ? 6000 : 2800)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    try { const saved = window.localStorage.getItem('studio-theme'); if (saved === 'light' || saved === 'dark') setTheme(saved) } catch { /* storage blocked */ }
  }, [])
  const chooseTheme = (next: Theme) => {
    setTheme(next)
    try { window.localStorage.setItem('studio-theme', next) } catch { /* storage blocked */ }
  }

  // Load whatever the target points at.
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (target.type === 'scene') {
          const next = await getScene(target.id)
          if (!alive || isUnchanged(next)) return
          setScene(next); setData(null)
          const preview = (next.scene.value as Partial<SceneDoc> | null)?.preview?.state
          const keys = next.fixtures.map(f => f.key)
          setFixture(wanted.current && keys.includes(wanted.current) ? wanted.current : preview && keys.includes(preview) ? preview : keys[0] ?? null)
        } else {
          const next = await getData(target.kind, target.id)
          if (!alive || isUnchanged(next)) return
          setData(next); setScene(null)
          setFixture(next.previewState ?? null)
          setMode('edit')
        }
        wanted.current = null
        setSelectedPath([]); setUndoStack([]); setRedoStack([]); setTool('select'); setDraft('')
      } catch (error) {
        if (alive) say(error instanceof Error ? error.message : String(error), true)
      }
    }
    const skip = (target.type === 'scene' && scene?.id === target.id) || (target.type === 'data' && data?.id === target.id)
    if (!skip) load()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // Keep the URL shareable: any agent can open exactly this view.
  useEffect(() => {
    const params = new URLSearchParams()
    params.set(target.type === 'scene' ? 'scene' : 'data', target.type === 'scene' ? target.id : `${target.kind}:${target.id}`)
    if (fixture) params.set('state', fixture)
    params.set('vp', vp)
    if (target.type === 'scene' && mode === 'edit') params.set('mode', 'edit')
    if (props.follow) params.set('follow', '1')
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [target, fixture, vp, mode, props.follow])

  // Pick up edits made in the code editor, and the focus an agent declares.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (busy.current || document.hidden) return
      try {
        if (target.type === 'scene' && scene) {
          const next = await getScene(target.id, scene.sig)
          if (!isUnchanged(next)) { setScene(next); say('Reloaded: the files changed on disk.') }
        } else if (target.type === 'data' && data) {
          const next = await getData(target.kind, target.id, data.sig)
          if (!isUnchanged(next)) { setData(next); say('Reloaded: the file changed on disk.') }
        }
        setIndex(await getIndex())
      } catch { /* server restarting */ }
    }, 2500)
    return () => clearInterval(timer)
  }, [target, scene, data, say])

  // Follow mode: jump to whatever an agent declares it is working in.
  const lastFocus = useRef('')
  useEffect(() => {
    if (!props.follow) return
    const timer = setInterval(async () => {
      try {
        const focus = await getFocus()
        const id = resolveFocusScenes(index.scenes, focus?.scenes ?? [])[0]
        const key = (focus?.scenes ?? []).join(',')
        if (id && key !== lastFocus.current) { lastFocus.current = key; setTarget({ type: 'scene', id }) }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [props.follow, index.scenes])

  // The storyboard's comment thread, shown with the notes.
  useEffect(() => {
    const read = async () => {
      try { const r = await fetch('/game/storyboard/comments', { cache: 'no-store' }); if (r.ok) setThread(((await r.json()).thread as ThreadMessage[]).filter(m => !m.scene || m.scene === (scene?.id ?? ''))) } catch { /* ignore */ }
    }
    read()
    const timer = setInterval(read, 4000)
    return () => clearInterval(timer)
  }, [scene?.id])

  const adopt = (doc: DocBundle) => {
    if (scene && doc.file === scene.scene.file) setScene({ ...scene, scene: doc })
    else if (scene && doc.file === scene.feedback.file) setScene({ ...scene, feedback: doc })
    else if (data && doc.file === data.doc.file) setData({ ...data, doc })
  }
  const docFor = (file: string): DocBundle | null => (scene && file === scene.scene.file ? scene.scene : scene && file === scene.feedback.file ? scene.feedback : data && file === data.doc.file ? data.doc : null)

  const edit = useCallback(async (file: string, ops: EditOp[], label: string, select?: Path) => {
    const doc = docFor(file)
    if (!doc) return
    busy.current = true
    const result = await send({ action: 'edit', file, ops, expectHash: doc.exists ? doc.hash : undefined })
    busy.current = false
    if (!result.ok || !result.doc) { say(result.ok ? 'No result' : result.error, true); return }
    adopt(result.doc)
    setUndoStack(s => [...s, { file, text: result.before ?? '', expectHash: result.doc!.hash }])
    setRedoStack([])
    const errors = result.doc.diagnostics.filter(d => d.severity === 'error').length
    if (result.compile?.written.length) {
      say(`${label}. Compiled ${result.compile.written.length} runtime file${result.compile.written.length === 1 ? '' : 's'}.`)
      setTimeout(() => setBump(b => b + 1), 1800)
    } else say(errors ? `${label}, but there ${errors === 1 ? 'is a problem' : `are ${errors} problems`}: see Source.` : `${label}.`, errors > 0)
    if (select) setSelectedPath(select)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, data])

  const restore = async (from: 'undo' | 'redo') => {
    const entry = (from === 'undo' ? undoStack : redoStack).at(-1)
    if (!entry) return
    const current = docFor(entry.file)
    busy.current = true
    const result = await send({ action: 'write', file: entry.file, text: entry.text, expectHash: entry.expectHash })
    busy.current = false
    if (!result.ok || !result.doc) { say(result.ok ? 'No result' : result.error, true); return }
    adopt(result.doc)
    const counter: History = { file: entry.file, text: current?.text ?? '', expectHash: result.doc.hash }
    if (from === 'undo') { setUndoStack(s => s.slice(0, -1)); setRedoStack(s => [...s, counter]) } else { setRedoStack(s => s.slice(0, -1)); setUndoStack(s => [...s, counter]) }
    say(from === 'undo' ? 'Undone.' : 'Redone.')
    if (result.compile?.written.length) setTimeout(() => setBump(b => b + 1), 1800)
  }

  const comment = async (text: string) => {
    try {
      await fetch('/game/storyboard/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, scene: scene?.id ?? '', viewport: vp }) })
      const r = await fetch('/game/storyboard/comments', { cache: 'no-store' })
      if (r.ok) setThread(((await r.json()).thread as ThreadMessage[]).filter(m => !m.scene || m.scene === (scene?.id ?? '')))
    } catch { /* ignore */ }
  }

  const sceneFile = scene?.scene.file ?? ''
  const objectsOnStage = objects.flatMap((object, i) => { const rect = scene ? objectRect(object, scene.slots) : null; return rect ? [{ object, index: i, rect }] : [] })
  const pins: StagePin[] = useMemo(() => {
    const counts = { wrong: 0, keep: 0 }
    return (feedbackDoc?.pins ?? []).map((pin, index) => ({ pin, index, n: ++counts[pin.kind] })).filter(p => p.pin.at !== undefined && (p.pin.viewport ?? vp) === vp && (!p.pin.state || p.pin.state === fixture))
  }, [feedbackDoc, vp, fixture])

  const prompt = useMemo(() => {
    if (!scene || !sceneDoc) return ''
    return buildAgentPrompt({ scene: sceneDoc, feedback: scene.feedback.exists ? feedbackDoc : null, notes: scene.notes, origin: typeof window === 'undefined' ? '' : window.location.origin, state: fixture ?? undefined })
  }, [scene, sceneDoc, feedbackDoc, fixture])

  const noteLabel = (kind: string) => `Studio ${kind === 'keep' ? 'keep' : 'note'} on ${scene?.id ?? ''} (${VIEWPORTS[vp].label}${fixture ? `, ${fixture}` : ''})`
  const onPin = (kind: 'wrong' | 'keep', at: { x: number; y: number }, note: string) => {
    if (!scene) return
    const pin: Pin = { kind, note, at, viewport: vp, ...(fixture ? { state: fixture } : {}) }
    const reopen: EditOp[] = feedbackDoc?.status === 'addressed' ? [{ op: 'set', path: ['status'], value: 'open' }] : []
    edit(scene.feedback.file, [...reopen, { op: 'append', path: ['pins'], value: pin as unknown as Record<string, unknown> }], kind === 'wrong' ? 'Pinned' : 'Marked to keep')
    comment(`${noteLabel(kind)}: ${note}`)
    setDraft(''); setTool('select')
  }
  const onNoteOps = (ops: EditOp[], label: string) => {
    if (!scene) return
    edit(scene.feedback.file, ops, label)
    const added = ops.find(o => o.op === 'append' && o.path[0] === 'pins')
    if (added && added.op === 'append') comment(`${noteLabel(String(added.value.kind))}: ${String(added.value.note ?? '')}`)
  }
  const addNote = () => {
    const note = draft.trim()
    if (!note || !scene) return
    const reopen: EditOp[] = feedbackDoc?.status === 'addressed' ? [{ op: 'set', path: ['status'], value: 'open' }] : []
    onNoteOps([...reopen, { op: 'append', path: ['pins'], value: { kind, note, viewport: vp, ...(fixture ? { state: fixture } : {}) } }], kind === 'wrong' ? 'Note added' : 'Marked to keep')
    setDraft('')
  }
  const onDraw = (rect: Rect) => {
    const id = uniqueId('ui', objects)
    edit(sceneFile, [{ op: 'append', path: ['objects'], value: { id, kind: 'ui', rect, status: 'proposed' } }], `Drew ${id}`, ['objects', objects.length])
    setTool('select')
  }
  const onRect = (i: number, rect: Rect) => edit(sceneFile, [{ op: 'set', path: ['objects', i, 'rect'], value: rect as unknown as Record<string, unknown> }], 'Moved')
  const pickScene = (id: string) => { setTarget({ type: 'scene', id }); setPickerOpen(false) }
  const jump = (file: string, line: number) => { setTimeout(() => document.getElementById(`src-${file}-${line}`)?.scrollIntoView({ block: 'center' }), 50) }

  // Keyboard: Ctrl/Cmd+K picks a scene; in edit mode V/D tools, nudge, delete and undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setPickerOpen(o => !o); return }
      if (isEditing(e.target)) return
      if (meta && e.key.toLowerCase() === 'z' && editing) { e.preventDefault(); restore(e.shiftKey ? 'redo' : 'undo'); return }
      if (meta || !editing || target.type !== 'scene') { if (e.key === 'Escape') setTool('select'); return }
      const k = e.key.toLowerCase()
      if (k === 'v' || k === 'escape') setTool('select')
      else if (k === 'd') setTool('draw')
      else if (selectedPath[0] === 'objects' && selectedPath.length === 2) {
        const i = selectedPath[1] as number
        const object = objects[i]
        if (!object) return
        if (k === 'delete' || k === 'backspace') { e.preventDefault(); edit(sceneFile, [{ op: 'remove', path: ['objects', i] }], `Deleted ${object.id}`); setSelectedPath([]) }
        const step = e.shiftKey ? 0.02 : 0.005
        const delta: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }
        const rect = scene ? objectRect(object, scene.slots) : null
        if (delta[k] && rect) { e.preventDefault(); const [dx, dy] = delta[k]; onRect(i, { ...rect, x: snap(Math.min(1 - rect.w, Math.max(0, rect.x + dx))), y: snap(Math.min(1 - rect.h, Math.max(0, rect.y + dy))) }) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  const problems = [...(scene?.scene.diagnostics ?? []), ...(scene?.feedback.diagnostics ?? []), ...(data?.doc.diagnostics ?? [])].filter(d => d.severity === 'error').length
  const nativeSrc = fixture && scene?.nativeByFixture[fixture] ? `/game/storyboard/native/${scene.nativeByFixture[fixture]}.png?b=${bump}` : null
  const title = target.type === 'scene' ? sceneDoc?.name ?? target.id : target.kind === 'mission' ? (data?.doc.value as { title?: string } | null)?.title ?? target.id : target.id
  const summary = target.type === 'scene' ? sceneDoc?.summary : target.kind === 'world' ? 'The data the base world is built from. Saving recompiles it for web and native.' : (data?.doc.value as { brief?: string } | null)?.brief
  const pinTool = tool === 'wrong' || tool === 'keep'

  return (
    <div className={styles.studio} data-theme={theme} data-testid="studio">
      <header className={styles.bar}>
        <ScenePicker index={index} label={title} currentId={target.type === 'scene' ? target.id : ''} focusIds={focusScenes} open={pickerOpen} onOpen={setPickerOpen} onPickScene={pickScene}
          onPickData={(kind, id) => { setTarget({ type: 'data', kind, id }); setPickerOpen(false) }} />
        <select className={styles.select} value={fixture ?? ''} onChange={e => { setFixture(e.target.value); setBump(b => b + 1) }} aria-label="State" title="Which setup of this scene to show" data-testid="fixture-select" disabled={target.type === 'scene' && !fixtures.length}>
          {target.type === 'data' && fixture && <option value={fixture}>{fixture}</option>}
          {fixtures.map(f => <option key={f.key} value={f.key} title={f.hint}>{f.label}{f.group && f.group !== 'Curated' ? ` (${f.group})` : ''}</option>)}
        </select>
        <span className={styles.seg} role="group" aria-label="Device size">
          {(Object.keys(VIEWPORTS) as ViewportKey[]).map(k => <button key={k} type="button" aria-pressed={vp === k} onClick={() => setVp(k)} data-testid={`vp-${k}`} title={VIEWPORTS[k].hint}>{k === 'ls' ? 'Wide' : VIEWPORTS[k].label}</button>)}
        </span>
      </header>

      <div className={styles.page}>
        <div className={styles.gHead}>
          <div className={styles.head}>
            <h1 data-testid="scene-title">{title}</h1>
            {target.type === 'scene' && sceneDoc && <span className={styles.muted}>{sceneDoc.id} · {sceneDoc.type}</span>}
            <span className={styles.headRight}>
              {target.type === 'scene' && (
                <span className={styles.seg} role="group" aria-label="Mode">
                  <button type="button" aria-pressed={mode === 'review'} onClick={() => { setMode('review'); setTool('select') }} data-testid="mode-review">Review</button>
                  <button type="button" aria-pressed={mode === 'edit'} onClick={() => { setMode('edit'); setTool('select') }} data-testid="mode-edit">Edit</button>
                </span>
              )}
            </span>
            {problems > 0 && <button type="button" className={styles.chip} style={{ borderColor: 'var(--wrong)', color: 'var(--wrong)' }} onClick={() => { setMode('edit'); setTimeout(() => document.querySelector('[data-testid="source-details"]')?.setAttribute('open', ''), 50) }}>{problems} problem{problems === 1 ? '' : 's'}</button>}
          </div>
          {index.focus && (focusScenes.length > 0 || index.focus.ticket) && (
            <div className={styles.working} data-testid="working-in">
              <span className={styles.muted}>Working in</span>
              {focusScenes.map(id => <button key={id} type="button" className={`${styles.chip} ${target.type === 'scene' && target.id === id ? styles.chipOn : ''}`} onClick={() => pickScene(id)}>{id}</button>)}
              {index.focus.ticket && <span className={styles.muted}>{index.focus.ticket}{index.focus.title ? `: ${index.focus.title}` : ''}</span>}
            </div>
          )}
          {summary && <p className={styles.summary}>{summary}</p>}
        </div>
        {!editing && scene && <div className={styles.gTop}><Composer draft={draft} onDraft={setDraft} kind={kind} onKind={setKind} tool={tool} onTool={setTool} onAdd={addNote} /></div>}
        <section className={styles.gStage}>
          <div className={styles.stageBar}>
            {editing && (
              <>
                {target.type === 'scene' && (
                  <span className={styles.seg} role="group" aria-label="Tool">
                    <button type="button" aria-pressed={tool === 'select'} onClick={() => setTool('select')} data-testid="tool-select" title="Select and move (V)">Select</button>
                    <button type="button" aria-pressed={tool === 'draw'} onClick={() => setTool('draw')} data-testid="tool-draw" title="Draw a UI element (D)">Draw</button>
                  </span>
                )}
                <button type="button" className={styles.btn} disabled={!undoStack.length} onClick={() => restore('undo')} data-testid="undo">Undo</button>
                <button type="button" className={styles.btn} disabled={!redoStack.length} onClick={() => restore('redo')} data-testid="redo">Redo</button>
                {target.type === 'scene' && <button type="button" className={`${styles.btn} ${objectsOn ? styles.btnOn : ''}`} aria-pressed={objectsOn} onClick={() => setObjectsOn(o => !o)} data-testid="toggle-objects" title="Show the scene's objects over the preview">Objects</button>}
              </>
            )}
            <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => setBump(b => b + 1)} data-testid="reload">Reload</button>
            <MoreMenu theme={theme} onTheme={chooseTheme} showNative={showNative} canNative={vp === 'ph'} onNative={() => setShowNative(n => !n)} openHref={fixture ? `/game/stage?preset=${fixture}` : null} />
          </div>
          <PreviewStage
            vp={vp}
            fixture={fixture}
            bump={bump}
            nativeSrc={nativeSrc}
            showNative={showNative}
            objects={objectsOnStage}
            selected={selectedPath[0] === 'objects' ? objects[selectedPath[1] as number]?.id ?? null : null}
            tool={tool}
            overlayOn={editing && objectsOn && target.type === 'scene'}
            reserveWide={270}
            reserveNarrow={editing ? 270 : 480}
            pins={target.type === 'scene' ? pins : []}
            pinNote={pinTool ? draft : ''}
            onSelect={id => { const i = objects.findIndex(o => o.id === id); setSelectedPath(i >= 0 ? ['objects', i] : []) }}
            onRect={onRect}
            onDraw={onDraw}
            onPin={onPin}
            onPinClick={i => { setHighlightPin(i); setMode('review') }}
          />
        </section>

        <aside className={styles.gSide}>
          {!editing && scene && (
            <ReviewPanel
              sceneId={scene.id}
              feedback={scene.feedback}
              notes={scene.notes}
              onOps={onNoteOps}
              onRef={async dataUrl => { const r = await send({ action: 'ref', scene: scene.id, dataUrl }); if (!r.ok) { say(r.error, true); return null } return r.ref ?? null }}
              onNote={async (which, text) => { busy.current = true; const r = await send({ action: 'note', scene: scene.id, which, text }); busy.current = false; say(r.ok ? 'Saved.' : r.error, !r.ok) }}
              onPromote={async () => { const r = await send({ action: 'promote', scene: scene.id }); say(r.ok ? 'Moved to rules.' : r.error, !r.ok); const next = await getScene(scene.id); if (!isUnchanged(next)) setScene(next) }}
              prompt={prompt}
              thread={thread}
              onChat={comment}
              highlighted={highlightPin}
            />
          )}
          {editing && activeDoc?.value && (
            <Inspector
              kind={target.type === 'scene' ? 'scene' : target.kind}
              schema={target.type === 'scene' ? scene!.schemas.scene : data!.schema}
              value={activeDoc.value}
              diagnostics={activeDoc.diagnostics}
              selectedPath={selectedPath}
              onSelectPath={setSelectedPath}
              onOps={(ops, label, select) => edit(activeDoc.file, ops, label, select)}
            />
          )}
          {editing && !activeDoc?.value && <section className={styles.card}><p className={styles.hint}>This file has a syntax error. Fix it in the source below or in your editor.</p></section>}
          {editing && (
            <section className={styles.card}>
              <details data-testid="source-details" open={problems > 0}>
                <summary>Source{problems ? ` (${problems} problem${problems === 1 ? '' : 's'})` : ''}</summary>
                <div className={styles.body}>
                  <SourceView
                    docs={target.type === 'scene' && scene ? [{ label: 'Scene', doc: scene.scene }, { label: 'Notes file', doc: scene.feedback }] : data ? [{ label: 'File', doc: data.doc }] : []}
                    hostRoot={scene?.hostRoot}
                    onJump={jump}
                  />
                </div>
              </details>
            </section>
          )}
        </aside>
      </div>
      {status.text && <div className={`${styles.toast} ${status.bad ? styles.toastBad : ''}`} role="status" data-testid="status">{status.text}</div>}
    </div>
  )
}
