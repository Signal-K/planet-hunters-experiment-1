'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { buildAgentPrompt } from '@/lib/authoring/agent-prompt'
import type { FeedbackDoc, Pin, Rect, SceneDoc, SceneObject, ScenePreset } from '@/lib/authoring/docs'
import type { EditOp } from '@/lib/authoring/edit'
import { VIEWPORTS, lineOfId, objectRect, resolveFocusScenes, scriptHref, snap, stageSrc, uniqueId } from '@/lib/authoring/studio-model'
import type { ViewportKey } from '@/lib/authoring/studio-model'
import type { DataDocBundle, DocBundle, FlowSummary, SceneBundle, StudioIndex } from '@/lib/authoring/studio-types'
import type { Path } from '@/lib/authoring/toml'
import Composer from './Composer'
import DeviceIcon from './DeviceIcon'
import Inspector from './Inspector'
import MoreMenu from './MoreMenu'
import PreviewStage from './PreviewStage'
import type { StagePin, Tool } from './PreviewStage'
import PresetPicker from './PresetPicker'
import ProjectInventory from './ProjectInventory'
import type { View } from './PresetPicker'
import ReviewPanel from './ReviewPanel'
import type { ThreadMessage } from './ReviewPanel'
import ScenePicker from './ScenePicker'
import ScriptMenu from './ScriptMenu'
import ScriptPanel from './ScriptPanel'
import SourceView from './SourceView'
import ThingsPanel from './ThingsPanel'
import FlowBar from './FlowBar'
import { composeSetup, defaultSelection, matchingPreset, presetId, presetSelection, sameSelection, setValue, toggleThing } from '@/lib/authoring/things'
import type { Selection } from '@/lib/authoring/things'
import { getData, getFocus, getIndex, getScene, isUnchanged, send } from './studio-api'
import styles from './Studio.module.css'

export type Target = { type: 'scene'; id: string } | { type: 'data'; kind: 'world' | 'mission'; id: string }
type Theme = 'auto' | 'light' | 'dark'
type Tab = 'objects' | 'setup' | 'notes' | 'project'

interface Props {
  initialIndex: StudioIndex
  initialTarget: Target
  initialScene: SceneBundle | null
  initialData: DataDocBundle | null
  initialView: View
  initialSelection: Selection
  initialVp: ViewportKey
  initialTab: Tab
  initialFlow: { id: string; step: number } | null
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
  // Follow is on by default: the editor tracks the scenes agents declare. Picking a scene yourself pauses it.
  const [following, setFollowing] = useState(props.follow)
  const [scene, setScene] = useState(props.initialScene)
  const [data, setData] = useState(props.initialData)
  const [view, setView] = useState<View>(props.initialView)
  const [selection, setSelection] = useState<Selection>(props.initialSelection)
  const [vp, setVp] = useState(props.initialVp)
  const [tab, setTab] = useState<Tab>(props.initialTab)
  const [flowState, setFlowState] = useState(props.initialFlow)
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
  const wanted = useRef<{ view?: View; selection?: Selection } | null>(null)

  const sceneDoc = (scene?.scene.value ?? null) as SceneDoc | null
  const feedbackDoc = (scene?.feedback.value ?? null) as FeedbackDoc | null
  const objects: SceneObject[] = sceneDoc?.objects ?? []
  const activeDoc: DocBundle | null = target.type === 'scene' ? scene?.scene ?? null : data?.doc ?? null
  const fixtures = scene?.fixtures ?? []
  const things = sceneDoc?.things ?? []
  const presets = sceneDoc?.presets ?? []
  const focusScenes = useMemo(() => resolveFocusScenes(index.scenes, index.focus?.scenes ?? []), [index.scenes, index.focus])
  const editing = tab === 'objects' || target.type === 'data'

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
          const doc = next.scene.value as Partial<SceneDoc> | null
          const nextThings = doc?.things ?? []
          const requested = wanted.current
          setView(requested?.view ?? { kind: 'start' })
          setSelection(requested?.selection ?? defaultSelection(nextThings))
        } else {
          const next = await getData(target.kind, target.id)
          if (!alive || isUnchanged(next)) return
          setData(next); setScene(null)
          setView(next.previewState ? { kind: 'checkpoint', key: next.previewState } : { kind: 'start' })
          setTab('project')
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
    if (view.kind === 'preset') params.set('preset', view.id)
    else if (view.kind === 'checkpoint') params.set('state', view.key)
    else if (view.kind === 'custom') {
      if (selection.on.length) params.set('things', selection.on.join(','))
      const values = Object.entries(selection.values).map(([id, value]) => `${id}:${value}`)
      if (values.length) params.set('values', values.join(','))
    }
    params.set('vp', vp)
    if (target.type === 'scene') params.set('tab', tab)
    if (flowState) { params.set('flow', flowState.id); params.set('step', String(flowState.step + 1)) }
    params.set('follow', following ? '1' : '0')
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [target, view, selection, vp, tab, flowState, following])

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
    if (!following) return
    const timer = setInterval(async () => {
      try {
        const focus = await getFocus()
        const id = resolveFocusScenes(index.scenes, focus?.scenes ?? [])[0]
        const key = (focus?.scenes ?? []).join(',')
        if (id && key !== lastFocus.current) { lastFocus.current = key; setTarget({ type: 'scene', id }) }
      } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [following, index.scenes])

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
  const entry = sceneDoc?.preview?.state
  const checkpoint = view.kind === 'checkpoint' ? view.key : null
  const currentPreset = view.kind === 'preset' ? presets.find(p => p.id === view.id) ?? null : null
  const setup = composeSetup(things, selection)
  const src = checkpoint ? stageSrc(checkpoint, null, bump) : entry ? stageSrc(entry, setup, bump) : null
  const currentStateKey = checkpoint ?? currentPreset?.id
  const flow = flowState ? index.flows.find(candidate => candidate.id === flowState.id) ?? null : null
  const unresolved = (feedbackDoc?.pins ?? []).filter(pin => pin.kind === 'wrong' && !pin.resolved).length
  const objectsOnStage = objects.flatMap((object, i) => { const rect = scene ? objectRect(object, scene.slots) : null; return rect ? [{ object, index: i, rect }] : [] })
  const pins: StagePin[] = useMemo(() => {
    const counts = { wrong: 0, keep: 0 }
    return (feedbackDoc?.pins ?? []).map((pin, index) => ({ pin, index, n: ++counts[pin.kind] })).filter(p => p.pin.at !== undefined && (p.pin.viewport ?? vp) === vp && (!p.pin.state || p.pin.state === currentStateKey))
  }, [feedbackDoc, vp, currentStateKey])

  const prompt = useMemo(() => {
    if (!scene || !sceneDoc) return ''
    return buildAgentPrompt({ scene: sceneDoc, feedback: scene.feedback.exists ? feedbackDoc : null, notes: scene.notes, origin: typeof window === 'undefined' ? '' : window.location.origin, state: currentStateKey, preset: currentPreset ?? undefined, flow: flow ? { name: flow.name, step: flowState?.step ?? 0, instructions: flow.steps[flowState?.step ?? 0]?.instructions } : undefined })
  }, [scene, sceneDoc, feedbackDoc, currentStateKey, currentPreset, flow, flowState])

  const noteLabel = (kind: string) => `Studio ${kind === 'keep' ? 'keep' : 'note'} on ${scene?.id ?? ''} (${VIEWPORTS[vp].label}${currentStateKey ? `, ${currentStateKey}` : ''})`
  const onPin = (kind: 'wrong' | 'keep', at: { x: number; y: number }, note: string) => {
    if (!scene) return
    const pin: Pin = { kind, note, at, viewport: vp, ...(currentStateKey ? { state: currentStateKey } : {}) }
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
    onNoteOps([...reopen, { op: 'append', path: ['pins'], value: { kind, note, viewport: vp, ...(currentStateKey ? { state: currentStateKey } : {}) } }], kind === 'wrong' ? 'Note added' : 'Marked to keep')
    setDraft('')
  }
  const onDraw = (rect: Rect) => {
    const id = uniqueId('ui', objects)
    edit(sceneFile, [{ op: 'append', path: ['objects'], value: { id, kind: 'ui', rect, status: 'proposed' } }], `Drew ${id}`, ['objects', objects.length])
    setTool('select')
  }
  const onRect = (i: number, rect: Rect) => edit(sceneFile, [{ op: 'set', path: ['objects', i, 'rect'], value: rect as unknown as Record<string, unknown> }], 'Moved')
  const setFromView = (next: View) => {
    if (next.kind === 'preset') {
      const preset = presets.find(item => item.id === next.id)
      if (preset) setSelection(presetSelection(preset, things))
    } else if (next.kind === 'start') setSelection(defaultSelection(things))
    setView(next); setBump(value => value + 1)
  }
  const setThing = (id: string) => {
    const next = toggleThing(selection, things, id)
    setSelection(next)
    const match = matchingPreset(next, presets, things)
    setView(match ? { kind: 'preset', id: match.id } : sameSelection(next, defaultSelection(things), things) ? { kind: 'start' } : { kind: 'custom' })
    setBump(value => value + 1)
  }
  const setThingValue = (id: string, value: number) => {
    const next = setValue(selection, id, value)
    setSelection(next)
    const match = matchingPreset(next, presets, things)
    setView(match ? { kind: 'preset', id: match.id } : sameSelection(next, defaultSelection(things), things) ? { kind: 'start' } : { kind: 'custom' })
    setBump(current => current + 1)
  }
  const savePreset = (name: string, instructions: string) => {
    if (!scene) return
    const id = presetId(name, presets.map(item => item.id))
    const value: ScenePreset = { id, name, things: selection.on, ...(Object.keys(selection.values).length ? { values: selection.values } : {}), ...(instructions ? { instructions } : {}) }
    edit(scene.scene.file, [{ op: 'append', path: ['presets'], value: value as unknown as Record<string, unknown> }], 'Preset saved')
    setView({ kind: 'preset', id })
  }
  const updatePreset = (instructions?: string) => {
    if (!scene || !currentPreset) return
    const index = presets.findIndex(item => item.id === currentPreset.id)
    if (index < 0) return
    const ops: EditOp[] = [
      { op: 'set', path: ['presets', index, 'things'], value: selection.on },
      { op: 'set', path: ['presets', index, 'values'], value: selection.values },
    ]
    if (instructions !== undefined) ops.push(instructions ? { op: 'set', path: ['presets', index, 'instructions'], value: instructions } : { op: 'remove', path: ['presets', index, 'instructions'] })
    edit(scene.scene.file, ops, 'Preset saved')
  }
  const pickScene = (id: string, next?: { view?: View; selection?: Selection }) => { wanted.current = next ?? null; setFollowing(false); setTarget({ type: 'scene', id }); setPickerOpen(false) }
  const pickFlow = (id: string, step = 0) => {
    const next = index.flows.find(candidate => candidate.id === id)
    const item = next?.steps[step]
    if (!next || !item) return
    const bundle = item.scene === scene?.id ? scene : null
    const doc = bundle?.scene.value as SceneDoc | null
    const chosen = doc?.presets?.find(p => p.id === item.preset)
    setFlowState({ id, step })
    pickScene(item.scene, chosen && doc ? { view: { kind: 'preset', id: chosen.id }, selection: presetSelection(chosen, doc.things ?? []) } : undefined)
  }
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
  const nativeSrc = checkpoint && scene?.nativeByFixture[checkpoint] ? `/game/storyboard/native/${scene.nativeByFixture[checkpoint]}.png?b=${bump}` : null
  const title = target.type === 'scene' ? sceneDoc?.name ?? target.id : target.kind === 'mission' ? (data?.doc.value as { title?: string } | null)?.title ?? target.id : target.id
  const pinTool = tool === 'wrong' || tool === 'keep'
  const hostRoot = scene?.hostRoot
  const scriptFiles = target.type === 'scene' && scene ? [
    { label: 'Scene script', file: scene.scene.file, line: currentPreset ? lineOfId(scene.scene.text, 'presets', currentPreset.id) : undefined },
    { label: 'Always instructions', file: scene.notes.alwaysFile },
    { label: 'Feedback', file: scene.feedback.file, missing: !scene.feedback.exists },
    ...(flow ? [{ label: 'Mission flow', file: flow.file }] : []),
  ] : data ? [{ label: 'Data file', file: data.doc.file }] : []
  const inspector = activeDoc?.value ? <Inspector kind={target.type === 'scene' ? 'scene' : target.kind} schema={target.type === 'scene' ? scene!.schemas.scene : data!.schema} value={activeDoc.value} diagnostics={activeDoc.diagnostics} selectedPath={selectedPath} onSelectPath={setSelectedPath} onOps={(ops, label, select) => edit(activeDoc.file, ops, label, select)} /> : <section className={styles.card}><p className={styles.hint}>This file has a syntax error. Fix it in the source below or in your editor.</p></section>
  const source = <SourceView docs={target.type === 'scene' && scene ? [{ label: 'Scene', doc: scene.scene }, { label: 'Notes file', doc: scene.feedback }] : data ? [{ label: 'File', doc: data.doc }] : []} hostRoot={hostRoot} onJump={jump} />
  const previewRef = useRef<HTMLElement>(null)
  // The scene fills the first screen above the deck, so it needs the deck's real height: the deck wraps to more rows on a narrow window.
  const deckRef = useRef<HTMLElement>(null)
  const [deckH, setDeckH] = useState(56)
  useEffect(() => {
    const el = deckRef.current
    if (!el) return
    const measure = () => setDeckH(Math.ceil(el.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div className={styles.studio} data-theme={theme} data-testid="studio" style={{ '--deck-h': `${deckH}px` } as CSSProperties}>
      {target.type === 'scene' && <section ref={previewRef} className={styles.stageArea} data-testid="studio-preview-area">
          <PreviewStage
            vp={vp} src={src}
            nativeSrc={nativeSrc}
            showNative={showNative}
            objects={objectsOnStage}
            selected={selectedPath[0] === 'objects' ? objects[selectedPath[1] as number]?.id ?? null : null}
            tool={tool}
            overlayOn={editing && objectsOn && target.type === 'scene'}
            pins={target.type === 'scene' ? pins : []}
            pinNote={pinTool ? draft : ''}
            onReload={() => setBump(value => value + 1)}
            extra={editing && target.type === 'scene' ? <><span className={styles.seg} role="group" aria-label="Tool"><button type="button" aria-pressed={tool === 'select'} onClick={() => setTool('select')} data-testid="tool-select">Select</button><button type="button" aria-pressed={tool === 'draw'} onClick={() => setTool('draw')} data-testid="tool-draw">Draw</button></span><button type="button" className={`${styles.btn} ${objectsOn ? styles.btnOn : ''}`} onClick={() => setObjectsOn(value => !value)} data-testid="toggle-objects">Objects</button></> : undefined}
            onSelect={id => { const i = objects.findIndex(o => o.id === id); setSelectedPath(i >= 0 ? ['objects', i] : []) }}
            onRect={onRect}
            onDraw={onDraw}
            onPin={onPin}
            onPinClick={i => { setHighlightPin(i); setTab('notes') }}
          />
      </section>}
      <header ref={deckRef} className={styles.bar}>
        <ScenePicker index={index} label={title} currentId={target.type === 'scene' ? target.id : ''} focusIds={focusScenes} open={pickerOpen} onOpen={setPickerOpen} onPickScene={pickScene}
          onPickFlow={pickFlow} onPickData={(kind, id) => { setFollowing(false); setTarget({ type: 'data', kind, id }); setPickerOpen(false) }} />
        {target.type === 'scene' && <PresetPicker presets={presets} checkpoints={fixtures} view={view} onChange={setFromView} />}
        <span className={styles.seg} role="group" aria-label="Device size">
          {(Object.keys(VIEWPORTS) as ViewportKey[]).map(k => <button key={k} type="button" aria-pressed={vp === k} aria-label={k === 'ls' ? 'Wide' : VIEWPORTS[k].label} onClick={() => setVp(k)} data-testid={`vp-${k}`} title={VIEWPORTS[k].hint}><DeviceIcon k={k} /><span className={styles.segLabel}>{k === 'ls' ? 'Wide' : VIEWPORTS[k].label}</span></button>)}
        </span>
        {target.type === 'scene' && <button type="button" className={styles.btn} onClick={() => setBump(value => value + 1)} data-testid="studio-reload">Reload</button>}
        <button type="button" className={styles.btn} disabled={!undoStack.length} onClick={() => restore('undo')} data-testid="undo">Undo</button>
        <button type="button" className={styles.btn} disabled={!redoStack.length} onClick={() => restore('redo')} data-testid="redo">Redo</button>
        {target.type === 'scene' && <button type="button" className={`${styles.btn} ${tab === 'objects' ? styles.btnPrimary : ''}`} onClick={() => { setTab('objects'); setTool('select') }} data-testid="header-objects">Objects</button>}
        <button type="button" className={`${styles.btn} ${tab === 'project' ? styles.btnPrimary : ''}`} onClick={() => setTab('project')} data-testid="header-project">Project</button>
        <span className={styles.barEnd}><button type="button" className={`${styles.btn} ${following ? styles.btnPrimary : ''}`} aria-pressed={following} onClick={() => { lastFocus.current = ''; setFollowing(f => !f) }} title="Show the scenes agents are working on." data-testid="studio-follow">Follow</button><ScriptMenu files={scriptFiles} hostRoot={hostRoot} /><MoreMenu theme={theme} onTheme={chooseTheme} showNative={showNative} canNative={vp === 'ph'} onNative={() => setShowNative(n => !n)} openHref={src} /></span>
      </header>
      {flow && flowState && <FlowBar flow={flow} step={flowState.step} onStep={step => pickFlow(flow.id, step)} onClose={() => setFlowState(null)} />}
      <div className={styles.body}>
        <aside className={styles.drawer} data-testid="studio-tools">
          {target.type === 'scene' && <div className={styles.tabs} role="tablist" aria-label="Studio workspace">
            <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'objects'} onClick={() => { setTab('objects'); setTool('select') }}>Objects ({objects.length})</button>
            <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'setup'} onClick={() => setTab('setup')}>Setup ({things.length})</button>
            <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>Notes {unresolved > 0 && <span className={`${styles.count} ${styles.countWrong}`}>{unresolved}</span>}</button>
            <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'project'} onClick={() => setTab('project')}>Project</button>
            {problems > 0 && <button type="button" className={`${styles.chip} ${styles.tabEnd}`} onClick={() => setTab('project')}>{problems} problem{problems === 1 ? '' : 's'}</button>}
          </div>}
          <div className={styles.tabBody}>
          {target.type === 'scene' && tab === 'objects' && inspector}
          {target.type === 'scene' && tab === 'setup' && <ThingsPanel things={things} title={view.kind === 'preset' ? currentPreset?.name ?? 'Preset' : view.kind === 'custom' ? 'Custom' : view.kind === 'checkpoint' ? 'Game checkpoint' : 'Start'} base={currentPreset} dirty={!!currentPreset && !sameSelection(selection, presetSelection(currentPreset, things), things)} selection={selection} onToggle={setThing} onValue={setThingValue} onReset={() => setFromView(currentPreset ? { kind: 'preset', id: currentPreset.id } : { kind: 'start' })} onSave={savePreset} onUpdate={() => updatePreset()} onInstructions={text => updatePreset(text)} scriptHref={hostRoot ? scriptHref(hostRoot, sceneFile, lineOfId(scene?.scene.text ?? '', 'things', things[0]?.id ?? '')) : null} />}
          {target.type === 'scene' && tab === 'notes' && scene && <><Composer draft={draft} onDraft={setDraft} kind={kind} onKind={setKind} tool={tool} onTool={next => { setTool(next); if (next === 'wrong' || next === 'keep') previewRef.current?.scrollIntoView({ block: 'start' }) }} onAdd={addNote} />
            <ReviewPanel
              sceneId={scene.id}
              feedback={scene.feedback}
              onOps={onNoteOps}
              onRef={async dataUrl => { const r = await send({ action: 'ref', scene: scene.id, dataUrl }); if (!r.ok) { say(r.error, true); return null } return r.ref ?? null }}
              prompt={prompt}
              thread={thread}
              onChat={comment}
              highlighted={highlightPin}
            />
          </>}
          {(target.type === 'data' || tab === 'project') && <>
            <ProjectInventory inventory={index.inventory} currentScene={target.type === 'scene' ? target.id : undefined} />
            <ScriptPanel files={scriptFiles} hostRoot={hostRoot} notes={scene ? { always: scene.notes.always, next: scene.notes.next } : undefined} onNote={scene ? async (which, text) => { busy.current = true; const result = await send({ action: 'note', scene: scene.id, which, text }); busy.current = false; say(result.ok ? 'Saved.' : result.error, !result.ok) } : undefined} onPromote={scene ? async () => { const result = await send({ action: 'promote', scene: scene.id }); say(result.ok ? 'Moved to rules.' : result.error, !result.ok) } : undefined} editing={target.type === 'data'} problems={problems} inspector={inspector} source={source} />
          </>}
          </div>
        </aside>
      </div>
      {status.text && <div className={`${styles.toast} ${status.bad ? styles.toastBad : ''}`} role="status" data-testid="status">{status.text}</div>}
    </div>
  )
}
