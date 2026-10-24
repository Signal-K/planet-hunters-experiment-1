'use client'

import type { Tool } from './SceneHarness'
import styles from './Studio.module.css'

interface Props {
  draft: string
  onDraft: (text: string) => void
  kind: 'wrong' | 'keep'
  onKind: (kind: 'wrong' | 'keep') => void
  tool: Tool
  onTool: (tool: Tool) => void
  onAdd: () => void
}

/** The one thing you do most: say what is wrong (or what to keep), optionally pinned on the preview. */
export default function Composer({ draft, onDraft, kind, onKind, tool, onTool, onAdd }: Props) {
  return (
    <div className={styles.composer} data-testid="composer">
      <textarea
        className={styles.input}
        rows={2}
        data-testid="note-input"
        value={draft}
        onChange={e => onDraft(e.target.value)}
        placeholder="What is wrong here? Say it the way you would say it out loud."
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onAdd() } }}
      />
      <div className={styles.line}>
        <span className={styles.seg} role="group" aria-label="Kind of note">
          <button type="button" aria-pressed={kind === 'wrong'} onClick={() => onKind('wrong')} data-testid="kind-wrong">Wrong</button>
          <button type="button" aria-pressed={kind === 'keep'} onClick={() => onKind('keep')} data-testid="kind-keep">Keep</button>
        </span>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAdd} disabled={!draft.trim()} data-testid="add-note">Add note</button>
        <button type="button" className={`${styles.btn} ${kind === 'wrong' ? styles.btnWrong : styles.btnKeep} ${tool === kind ? styles.btnOn : ''}`} onClick={() => onTool(tool === kind ? 'select' : kind)} data-testid="pin-tool" title="Then click the preview where it is">
          {tool === kind ? 'Click the preview…' : 'Pin on preview'}
        </button>
      </div>
    </div>
  )
}
