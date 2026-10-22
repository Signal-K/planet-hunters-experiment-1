'use client'

import { useState } from 'react'
import type { SceneObject } from '@/lib/authoring/docs'
import type { EditOp } from '@/lib/authoring/edit'
import { defaultFor, deref, fieldKind, schemaAt } from '@/lib/authoring/schema-path'
import type { Schema } from '@/lib/authoring/schema'
import { buildObjectTree, compositionSummary, descendantsOf, objectDomain, uniqueId } from '@/lib/authoring/studio-model'
import type { ObjectNode } from '@/lib/authoring/studio-model'
import type { Path } from '@/lib/authoring/toml'
import type { Diagnostic } from '@/lib/authoring/validate'
import styles from './Studio.module.css'
import workbench from './ObjectWorkbench.module.css'

export interface InspectorProps {
  kind: 'scene' | 'world' | 'mission'
  schema: Schema
  value: Record<string, unknown>
  diagnostics: Diagnostic[]
  selectedPath: Path
  onSelectPath: (path: Path) => void
  onOps: (ops: EditOp[], label: string, select?: Path) => void
}

const same = (a: Path, b: Path) => a.length === b.length && a.every((p, i) => p === b[i])
const get = (root: unknown, path: Path): unknown => path.reduce<unknown>((cur, part) => (cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[part] : undefined), root)
const isTable = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

interface TreeRow {
  key: string
  label: string
  kindLabel?: string
  path: Path
  depth: number
}

/** Tables and arrays of tables of a document, as a flat list of rows to show in the hierarchy. */
function genericRows(value: unknown, path: Path, depth: number, out: TreeRow[], open: Set<string>): void {
  if (!isTable(value) && !Array.isArray(value)) return
  const entries: [string | number, unknown][] = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value)
  for (const [key, child] of entries) {
    if (!isTable(child) && !(Array.isArray(child) && child.some(isTable))) continue
    const childPath = [...path, key]
    const id = JSON.stringify(childPath)
    const named = isTable(child) ? (child.id ?? child.label ?? child.title) : undefined
    const count = Array.isArray(child) ? ` (${child.length})` : ''
    out.push({ key: id, label: `${typeof key === 'number' ? (typeof named === 'string' ? named : `#${key + 1}`) : key}${count}`, path: childPath, depth })
    if (open.has(id)) genericRows(child, childPath, depth + 1, out, open)
  }
}

function ObjectRows({ nodes, depth, selected, onSelect }: { nodes: ObjectNode[]; depth: number; selected: Path; onSelect: (p: Path) => void }) {
  return (
    <>
      {nodes.map(n => {
        const path: Path = ['objects', n.index]
        return (
          <div key={n.object.id}>
            <button type="button" className={`${styles.node} ${same(selected, path) ? styles.nodeOn : ''}`} style={{ paddingLeft: 8 + depth * 16 }} onClick={() => onSelect(path)} data-testid={`tree-${n.object.id}`}>
              <span className={styles.caret}>{n.children.length ? '▾' : '·'}</span>
              <span>{n.object.label ?? n.object.id}</span>
              {n.object.status === 'proposed' && <span className={`${styles.tag} ${styles.tagNow}`}>proposed</span>}
              {n.object.prefab && <span className={workbench.prefab} title={`Prefab: ${n.object.prefab}`}>{n.object.prefab}</span>}
              <span className={workbench.domain}>{objectDomain(n.object) === 'ui-element' ? 'UI' : 'Object'}</span>
            </button>
            <ObjectRows nodes={n.children} depth={depth + 1} selected={selected} onSelect={onSelect} />
          </div>
        )
      })}
    </>
  )
}

interface FieldsProps {
  schema: Schema
  root: Schema
  value: Record<string, unknown>
  path: Path
  diagnostics: Diagnostic[]
  onOps: (ops: EditOp[], label: string) => void
  options?: Record<string, string[]>
  renameOps?: (next: string) => EditOp[]
  hide?: Set<string>
  /** Show just these keys (and no add-property chooser). */
  only?: Set<string>
}

function ErrorLines({ path, diagnostics }: { path: Path; diagnostics: Diagnostic[] }) {
  return (
    <>
      {diagnostics.filter(d => d.path && same(d.path, path)).map((d, i) => (
        <div key={i} className={d.severity === 'error' ? styles.fieldErr : styles.fieldWarn}>{d.message}</div>
      ))}
    </>
  )
}

function Field({ name, schema, root, value, path, diagnostics, onOps, options, renameOps, removable }: Omit<FieldsProps, 'value' | 'hide' | 'only'> & { name: string; value: unknown; removable: boolean }) {
  const kind = fieldKind(schema, value, name)
  const set = (next: unknown, label = `Set ${name}`) => onOps([{ op: 'set', path, value: next }], label)
  const remove = () => onOps([{ op: 'remove', path }], `Remove ${name}`)
  const text = typeof value === 'string' ? value : value === undefined ? '' : String(value)
  const commitText = (next: string) => {
    if (next === text) return
    if (name === 'id' && renameOps) return onOps(renameOps(next), 'Rename')
    if (next === '' && removable) return remove()
    if (next === '' && !removable) return
    set(next)
  }
  const commitNumber = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || !Number.isFinite(n) || n === value) return
    set(kind === 'integer' ? Math.round(n) : n)
  }

  let control: React.ReactNode
  if (kind === 'enum' || (options && options[name])) {
    const choices = options?.[name] ?? (schema.enum ?? []).map(String)
    control = (
      <select className={styles.select} value={text} onChange={e => (e.target.value === '' ? remove() : set(e.target.value))} data-testid={`field-${name}`}>
        {(removable || options?.[name]) && <option value="">(none)</option>}
        {!choices.includes(text) && text !== '' && <option value={text}>{text}</option>}
        {choices.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    )
  } else if (kind === 'boolean') {
    control = <input type="checkbox" checked={value === true} onChange={e => set(e.target.checked)} data-testid={`field-${name}`} style={{ width: 24, height: 44 }} />
  } else if (kind === 'integer' || kind === 'number') {
    control = <input key={text} className={styles.input} type="number" step={kind === 'integer' ? 1 : 0.005} min={schema.minimum} max={schema.maximum} defaultValue={text} onBlur={e => commitNumber(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} data-testid={`field-${name}`} />
  } else if (kind === 'text') {
    control = <textarea key={text} className={styles.input} defaultValue={text} onBlur={e => commitText(e.target.value)} data-testid={`field-${name}`} />
  } else if (kind === 'string') {
    control = <input key={text} className={styles.input} defaultValue={text} onBlur={e => commitText(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} data-testid={`field-${name}`} />
  } else if (kind === 'strings') {
    const joined = Array.isArray(value) ? value.join(', ') : text
    control = <input key={joined} className={styles.input} defaultValue={joined} placeholder="comma separated" onBlur={e => { const next = e.target.value.split(',').map(s => s.trim()).filter(Boolean); if (next.join(', ') !== joined) set(next) }} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} data-testid={`field-${name}`} />
  } else if (kind === 'rect' && isTable(value)) {
    control = (
      <div className={styles.rectGrid} data-testid={`field-${name}`}>
        {(['x', 'y', 'w', 'h'] as const).map(k => (
          <label key={k}>{k}
            <input key={String(value[k])} className={styles.input} type="number" step={0.005} min={0} max={1} defaultValue={String(value[k] ?? 0)} onBlur={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n !== value[k]) onOps([{ op: 'set', path: [...path, k], value: n }], `Set ${name}.${k}`) }} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
          </label>
        ))}
      </div>
    )
  } else if (kind === 'dictionary' && isTable(value)) {
    control = <DictionaryField value={value} schema={schema} path={path} onOps={onOps} name={name} />
  } else if (kind === 'table' && isTable(value)) {
    control = <div className={styles.nested}><Fields schema={schema} root={root} value={value} path={path} diagnostics={diagnostics} onOps={onOps} /></div>
  } else if (kind === 'list') {
    control = <span className={styles.muted}>{Array.isArray(value) ? `${value.length} items. Select them in the hierarchy.` : 'list'}</span>
  } else {
    control = <code className={styles.muted}>{JSON.stringify(value)}</code>
  }

  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel} title={schema.description}>{name}</div>
      <div className={styles.fieldRow}>
        <div style={{ flex: 1, minWidth: 0 }}>{control}</div>
        {removable && kind !== 'table' && <button type="button" className={`${styles.btn} ${styles.iconBtn}`} onClick={remove} title={`Remove ${name}`} aria-label={`Remove ${name}`}>x</button>}
      </div>
      <ErrorLines path={path} diagnostics={diagnostics} />
    </div>
  )
}

function DictionaryField({ value, schema, path, onOps, name }: { value: Record<string, unknown>; schema: Schema; path: Path; onOps: (ops: EditOp[], label: string) => void; name: string }) {
  const [draft, setDraft] = useState('')
  const itemSchema = typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined
  return (
    <div>
      {Object.entries(value).map(([k, v]) => (
        <div key={k} className={styles.fieldRow} style={{ marginBottom: 4 }}>
          <span style={{ width: 96, overflowWrap: 'anywhere' }}>{k}</span>
          <input key={String(v)} className={styles.input} type="number" defaultValue={String(v)} onBlur={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n !== v) onOps([{ op: 'set', path: [...path, k], value: n }], `Set ${k}`) }} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
          <button type="button" className={`${styles.btn} ${styles.iconBtn}`} onClick={() => onOps([{ op: 'remove', path: [...path, k] }], `Remove ${k}`)} aria-label={`Remove ${k}`}>x</button>
        </div>
      ))}
      <div className={styles.fieldRow}>
        <input className={styles.input} placeholder={`add to ${name}`} value={draft} onChange={e => setDraft(e.target.value)} />
        <button type="button" className={styles.btn} disabled={!draft.trim() || draft in value} onClick={() => { onOps([{ op: 'set', path: [...path, draft.trim()], value: defaultFor(itemSchema) || 1 }], `Add ${draft.trim()}`); setDraft('') }}>Add</button>
      </div>
    </div>
  )
}

export function Fields({ schema, root, value, path, diagnostics, onOps, options, renameOps, hide, only }: FieldsProps) {
  const props = schema.properties ?? {}
  const required = new Set(schema.required ?? [])
  const known = Object.keys(props)
  const visible = (k: string) => !hide?.has(k) && (!only || only.has(k))
  const present = known.filter(k => k in value && visible(k))
  const extra = only ? [] : Object.keys(value).filter(k => !(k in props) && visible(k))
  const missing = known.filter(k => !(k in value) && visible(k) && !props[k].const)
  const [adding, setAdding] = useState('')
  return (
    <div>
      {[...present, ...extra].map(key => (
        <Field key={key} name={key} schema={deref(props[key] ?? {}, root)} root={root} value={value[key]} path={[...path, key]} diagnostics={diagnostics} onOps={onOps} options={options} renameOps={key === 'id' ? renameOps : undefined} removable={!required.has(key)} />
      ))}
      {missing.length > 0 && (
        <div className={styles.field}>
          <div className={styles.fieldLabel}>add</div>
          <select className={styles.select} value={adding} onChange={e => { const key = e.target.value; setAdding(''); if (key) onOps([{ op: 'set', path: [...path, key], value: defaultFor(deref(props[key], root)) }], `Add ${key}`) }} data-testid="field-add">
            <option value="">(choose a property)</option>
            {missing.map(k => <option key={k} value={k}>{k}{required.has(k) ? ' (required)' : ''}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

const PRIMARY_OBJECT = new Set(['id', 'label', 'note', 'status', 'kind'])
const PRIMARY_SCENE = new Set(['name', 'summary'])
const HIDE_ROOT = new Set(['objects', 'states', 'format', 'sprites', 'entities', 'prefabs', 'biomes'])

export default function Inspector({ kind, schema, value, diagnostics, selectedPath, onSelectPath, onOps }: InspectorProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const objects = (Array.isArray(value.objects) ? value.objects : []) as SceneObject[]
  const composition = compositionSummary(objects)
  const selected = get(value, selectedPath)
  const selectedSchema = schemaAt(schema, selectedPath)

  let hierarchy: React.ReactNode
  if (kind === 'scene') {
    hierarchy = (
      <div className={styles.tree} data-testid="studio-tree">
        <button type="button" className={`${styles.node} ${selectedPath.length === 0 ? styles.nodeOn : ''}`} onClick={() => onSelectPath([])}><span className={styles.caret}>·</span><span>Scene</span></button>
        <ObjectRows nodes={buildObjectTree(objects)} depth={0} selected={selectedPath} onSelect={onSelectPath} />
        {objects.length === 0 && <p className={styles.hint}>No objects yet. Draw one on the preview, or add one below.</p>}
      </div>
    )
  } else {
    const rows: TreeRow[] = []
    genericRows(value, [], 0, rows, open)
    hierarchy = (
      <div className={styles.tree} data-testid="studio-tree">
        <button type="button" className={`${styles.node} ${selectedPath.length === 0 ? styles.nodeOn : ''}`} onClick={() => onSelectPath([])}><span className={styles.caret}>·</span><span>{kind === 'world' ? 'World' : 'Mission'}</span></button>
        {rows.map(r => {
          const expandable = isTable(get(value, r.path)) || Array.isArray(get(value, r.path))
          const isOpen = open.has(r.key)
          return (
            <button key={r.key} type="button" className={`${styles.node} ${same(selectedPath, r.path) ? styles.nodeOn : ''}`} style={{ paddingLeft: 8 + r.depth * 16 }} onClick={() => { onSelectPath(r.path); if (expandable) setOpen(s => { const n = new Set(s); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n }) }}>
              <span className={styles.caret}>{expandable ? (isOpen ? '▾' : '▸') : '·'}</span>
              <span>{r.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const isObject = kind === 'scene' && selectedPath[0] === 'objects' && selectedPath.length === 2
  const current = isObject ? (selected as SceneObject | undefined) : undefined
  const index = isObject ? (selectedPath[1] as number) : -1
  const ids = objects.map(o => o.id)
  const options: Record<string, string[]> | undefined = current ? { parent: ids.filter(id => id !== current.id && !descendantsOf(objects, current.id).includes(id)) } : undefined
  const renameOps = current
    ? (next: string): EditOp[] => [
        { op: 'set', path: ['objects', index, 'id'], value: next },
        ...objects.flatMap((o, i): EditOp[] => (o.parent === current.id ? [{ op: 'set', path: ['objects', i, 'parent'], value: next }] : [])),
      ]
    : undefined

  const remove = () => {
    if (!current) return
    const children = objects.flatMap((o, i) => (o.parent === current.id ? [i] : []))
    const reparent: EditOp[] = children.map(i => (current.parent ? { op: 'set', path: ['objects', i, 'parent'], value: current.parent } : { op: 'remove', path: ['objects', i, 'parent'] }))
    onOps([...reparent, { op: 'remove', path: ['objects', index] }], `Deleted ${current.id}`)
    onSelectPath([])
  }
  const add = (parent?: string) => {
    const id = uniqueId('ui', objects)
    onOps([{ op: 'append', path: ['objects'], value: { id, kind: 'ui', ...(parent ? { parent } : {}), status: 'proposed' } }], `Added ${id}`, ['objects', objects.length])
  }

  const primary = current ? PRIMARY_OBJECT : kind === 'scene' && selectedPath.length === 0 ? PRIMARY_SCENE : undefined
  const fieldProps = { schema: selectedSchema as Schema, root: schema, value: selected as Record<string, unknown>, path: selectedPath, diagnostics, onOps, options, renameOps }
  const title = current ? current.label ?? current.id : selectedPath.length ? selectedPath.join(' / ') : kind === 'scene' ? 'Scene' : kind === 'world' ? 'World' : 'Mission'

  return (
    <div className={workbench.layout} data-testid="object-workbench">
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Hierarchy</h3>
        {kind === 'scene' && <>
          <div className={workbench.density} data-density={composition.density} data-testid="composition-density">
            <strong>{composition.density === 'empty' ? 'Scene composition is empty' : `${composition.density[0].toUpperCase()}${composition.density.slice(1)} composition`}</strong>
            <span>{composition.total} authored node{composition.total === 1 ? '' : 's'}</span>
          </div>
          <div className={workbench.summary} aria-label="Scene composition summary">
            <div className={workbench.metric}><strong>{composition.gameObjects}</strong><span>Game objects</span></div>
            <div className={workbench.metric}><strong>{composition.uiElements}</strong><span>UI elements</span></div>
            <div className={workbench.metric}><strong>{composition.prefabs}</strong><span>Prefabs</span></div>
            <div className={workbench.metric}><strong>{composition.nested}</strong><span>Nested</span></div>
          </div>
        </>}
        {hierarchy}
        {kind === 'scene' && (
          <div className={styles.line} style={{ marginTop: 8 }}>
            <button type="button" className={styles.btn} onClick={() => add()} data-testid="add-object">Add object</button>
            {current && <button type="button" className={styles.btn} onClick={() => add(current.id)}>Add child</button>}
          </div>
        )}
      </section>
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {isTable(selected) && selectedSchema ? (
          <>
            <Fields {...fieldProps} hide={selectedPath.length === 0 ? HIDE_ROOT : undefined} only={primary} />
            {primary && (
              <details>
                <summary>More properties</summary>
                <div className={styles.body}>
                  <Fields {...fieldProps} hide={new Set([...(selectedPath.length === 0 ? HIDE_ROOT : []), ...primary])} />
                </div>
              </details>
            )}
          </>
        ) : (
          <p className={styles.hint}>{Array.isArray(selected) ? 'Pick one of its items in the list above.' : 'Pick something in the list above.'}</p>
        )}
        {current && <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={remove} data-testid="delete-object">Delete object</button>}
      </section>
    </div>
  )
}
