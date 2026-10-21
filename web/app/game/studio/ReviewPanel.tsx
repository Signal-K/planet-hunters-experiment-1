'use client'

import { useEffect, useRef, useState } from 'react'
import type { FeedbackDoc } from '@/lib/authoring/docs'
import type { EditOp } from '@/lib/authoring/edit'
import type { DocBundle } from '@/lib/authoring/studio-types'
import styles from './Studio.module.css'

export interface ThreadMessage {
  id: string
  at: string
  from: 'user' | 'agent'
  text: string
  scene?: string
}

/** Shrinks a pasted or chosen image so references stay small in the repo. */
async function toDataUrl(file: Blob, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

interface Props {
  sceneId: string
  feedback: DocBundle
  notes: { always: string; next: string }
  onOps: (ops: EditOp[], label: string) => void
  onRef: (dataUrl: string) => Promise<string | null>
  onNote: (which: 'always' | 'next', text: string) => void
  onPromote: () => void
  prompt: string
  thread: ThreadMessage[]
  onChat: (text: string) => void
  highlighted: number | null
}

export default function ReviewPanel(p: Props) {
  const doc = (p.feedback.value ?? {}) as Partial<FeedbackDoc>
  const pins = doc.pins ?? []
  const mode = doc.mode ?? 'fix'
  const [copied, setCopied] = useState(false)
  const [source, setSource] = useState('')
  const [likes, setLikes] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [chat, setChat] = useState('')
  const [rules, setRules] = useState({ always: p.notes.always, next: p.notes.next })
  const timers = useRef<Partial<Record<'always' | 'next', ReturnType<typeof setTimeout>>>>({})
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => setRules({ always: p.notes.always, next: p.notes.next }), [p.notes.always, p.notes.next])

  const counts = { wrong: 0, keep: 0 }
  const rows = pins.map((pin, index) => ({ pin, index, n: ++counts[pin.kind] }))
  const reopen: EditOp[] = doc.status === 'addressed' ? [{ op: 'set', path: ['status'], value: 'open' }] : []
  const where = (pin: (typeof pins)[number]) => [pin.at ? 'pinned' : '', pin.viewport === 'ph' ? 'phone' : pin.viewport === 'ls' ? 'wide' : pin.viewport === 'dk' ? 'desktop' : '', pin.state ?? ''].filter(Boolean).join(' · ')

  const take = async (blob: Blob | null | undefined) => {
    if (!blob) return
    try { setPending(await toDataUrl(blob)) } catch { setPending(null) }
  }
  const addInspiration = async () => {
    const image = pending ? await p.onRef(pending) : null
    if (!source.trim() && !likes.trim() && !image) return
    p.onOps([...reopen, { op: 'append', path: ['inspiration'], value: { ...(source.trim() ? { source: source.trim() } : {}), ...(image ? { image } : {}), ...(likes.trim() ? { likes: likes.trim() } : {}) } }], 'Inspiration added')
    setSource(''); setLikes(''); setPending(null)
  }
  const editRule = (which: 'always' | 'next', text: string) => {
    setRules(r => ({ ...r, [which]: text }))
    clearTimeout(timers.current[which])
    timers.current[which] = setTimeout(() => p.onNote(which, text), 600)
  }
  const inspo = doc.inspiration ?? []

  return (
    <div className={styles.stack} data-testid="review-panel" onPaste={e => { const file = [...e.clipboardData.files].find(f => f.type.startsWith('image/')); if (file) { e.preventDefault(); take(file) } }}>
      {rows.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Notes ({rows.length})</h2>
          <div data-testid="notes-list">
            {rows.map(({ pin, index, n }) => (
              <div key={index} className={styles.note} style={p.highlighted === index ? { background: 'var(--soft)' } : undefined} data-testid={`note-${index}`}>
                <span className={`${styles.dot} ${pin.kind === 'keep' ? styles.dotKeep : ''} ${!pin.at ? (pin.kind === 'keep' ? styles.dotPlainKeep : styles.dotPlain) : ''}`} title={pin.kind === 'keep' ? 'Keep' : 'Wrong'}>{n}</span>
                <div style={{ minWidth: 0 }}>
                  <textarea key={pin.note} rows={Math.max(1, Math.ceil(pin.note.length / 44))} className={styles.noteText} defaultValue={pin.note} onBlur={e => { const next = e.target.value.trim(); if (next && next !== pin.note) p.onOps([{ op: 'set', path: ['pins', index, 'note'], value: next }], 'Note edited') }} />
                  <div className={styles.muted}>{where(pin)}{pin.resolved ? ' · fixed, still a rule' : ''}</div>
                </div>
                <div className={styles.line} style={{ gap: 4 }}>
                  {pin.kind === 'wrong' && <button type="button" className={`${styles.btn} ${styles.iconBtn} ${pin.resolved ? styles.btnOn : ''}`} aria-pressed={pin.resolved === true} aria-label={`Mark ${pin.kind} note ${n} fixed`} title="Mark fixed (it stays a rule)" onClick={() => p.onOps([{ op: 'set', path: ['pins', index, 'resolved'], value: pin.resolved !== true }], 'Updated')}>✓</button>}
                  <button type="button" className={`${styles.btn} ${styles.btnQuiet} ${styles.iconBtn}`} title="Delete" aria-label={`Delete ${pin.kind} note ${n}`} onClick={() => p.onOps([{ op: 'remove', path: ['pins', index] }], 'Note deleted')}>×</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.line} style={{ marginBottom: 8 }}>
          <span className={styles.seg} role="group" aria-label="What should the agent do">
            <button type="button" aria-pressed={mode === 'fix'} onClick={() => p.onOps([...reopen, { op: 'set', path: ['mode'], value: 'fix' }], 'Updated')} data-testid="mode-fix" title="Follow my notes exactly.">Fix exactly</button>
            <button type="button" aria-pressed={mode === 'explore'} onClick={() => p.onOps([...reopen, { op: 'set', path: ['mode'], value: 'explore' }], 'Updated')} data-testid="mode-explore" title="Propose different directions and never repeat what I marked wrong.">Give me options</button>
          </span>
        </div>
        <p className={styles.hint}>{mode === 'fix' ? 'The agent follows your notes exactly.' : 'The agent proposes genuinely different directions and never repeats what you marked wrong.'}{doc.status === 'addressed' ? ' It has delivered; add a note to reopen.' : ''}</p>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} data-testid="copy-prompt" onClick={async () => { try { await navigator.clipboard.writeText(p.prompt); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ } }}>{copied ? 'Copied' : 'Copy brief for an agent'}</button>
        <span className={styles.muted} style={{ marginLeft: 8 }}>{rows.length} note{rows.length === 1 ? '' : 's'} · {inspo.length} inspiration</span>

        <details style={{ marginTop: 12 }}>
          <summary data-testid="inspiration-summary">Inspiration {inspo.length ? `(${inspo.length})` : ''}</summary>
          <div className={styles.body}>
            <p className={styles.hint}>Apps or games you like. Paste a screenshot anywhere here.</p>
            {inspo.map((item, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                {item.image && <img className={styles.thumb} alt={item.source ?? 'Inspiration'} src={`/api/dev/studio/ref?name=${encodeURIComponent(item.image)}`} />}
                <div><strong>{item.source}</strong> {item.likes}</div>
                <button type="button" className={`${styles.btn} ${styles.btnQuiet}`} onClick={() => p.onOps([{ op: 'remove', path: ['inspiration', i] }], 'Removed')}>Remove</button>
              </div>
            ))}
            {pending && <img className={styles.thumb} alt="Pending reference" src={pending} data-testid="pending-ref" />}
            <div className={styles.stack}>
              <input className={styles.input} placeholder="App or link" value={source} onChange={e => setSource(e.target.value)} data-testid="inspo-source" />
              <textarea className={styles.input} style={{ minHeight: 64 }} placeholder="What do you like about it?" value={likes} onChange={e => setLikes(e.target.value)} data-testid="inspo-likes" />
              <div className={styles.line}>
                <button type="button" className={styles.btn} onClick={() => fileInput.current?.click()}>Choose image</button>
                <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => take(e.target.files?.[0])} />
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={addInspiration} data-testid="inspo-add">Add</button>
              </div>
            </div>
          </div>
        </details>

        <details>
          <summary>In your own words {doc.direction ? '(written)' : ''}</summary>
          <div className={styles.body}>
            <textarea key={doc.direction ?? ''} className={styles.input} defaultValue={doc.direction ?? ''} placeholder="The feel you want, what it should remind you of." data-testid="direction"
              onBlur={e => { const next = e.target.value.trim(); if (next !== (doc.direction ?? '')) p.onOps(next ? [...reopen, { op: 'set', path: ['direction'], value: next }] : [{ op: 'remove', path: ['direction'] }], 'Saved') }} />
          </div>
        </details>

        <details>
          <summary data-testid="rules-summary">Rules for this scene and next pass</summary>
          <div className={styles.body}>
            <p className={styles.hint}>Always: rules that stay true. Every agent reads them.</p>
            <textarea className={styles.input} value={rules.always} onChange={e => editRule('always', e.target.value)} data-testid="notes-always" />
            <p className={styles.hint} style={{ marginTop: 12 }}>Next pass: what the next agent should do.</p>
            <textarea className={styles.input} value={rules.next} onChange={e => editRule('next', e.target.value)} data-testid="notes-next" />
            <div style={{ marginTop: 8 }}><button type="button" className={styles.btn} disabled={!rules.next.trim()} onClick={p.onPromote}>Move next pass to rules</button></div>
          </div>
        </details>

        <details>
          <summary>Messages with the agent {p.thread.length ? `(${p.thread.length})` : ''}</summary>
          <div className={styles.body}>
            <div className={styles.thread}>{p.thread.slice(-8).map(m => <div key={m.id} className={`${styles.msg} ${m.from === 'agent' ? styles.msgAgent : ''}`}><strong>{m.from === 'agent' ? 'Agent' : 'You'}</strong> {m.text}</div>)}</div>
            <input className={styles.input} placeholder={`Message about ${p.sceneId}, then Enter`} value={chat} onChange={e => setChat(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && chat.trim()) { p.onChat(chat.trim()); setChat('') } }} data-testid="chat-input" />
          </div>
        </details>
      </section>
    </div>
  )
}
