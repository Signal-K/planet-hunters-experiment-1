'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { parseCursorHref } from '@/lib/authoring/open-href'
import type { OpenResponse } from '@/lib/authoring/studio-types'
import styles from './OpenLinks.module.css'

interface Note {
  text: string
  bad: boolean
  /** Shown on a failure, so the path can be copied or typed into Quick Open by hand. */
  path?: string
  link?: string
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { /* blocked inside a sandboxed frame */ }
  const field = document.createElement('textarea')
  field.value = text
  field.style.cssText = 'position:fixed;opacity:0'
  document.body.appendChild(field)
  field.select()
  try { return document.execCommand('copy') } catch { return false } finally { field.remove() }
}

/**
 * Every cursor:// link in the Studio opens its file through the dev server instead of the browser. Cursor's built-in browser
 * runs pages in a sandboxed frame that will not follow a custom-protocol link, and a link cannot say whether it worked.
 * The link stays a real cursor:// link, so a normal browser (or this page with scripts off) still follows it.
 */
export default function OpenLinks({ children }: { children: ReactNode }) {
  const [note, setNote] = useState<Note | null>(null)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = (next: Note | null) => {
    clearTimeout(timer.current)
    setCopied(false)
    setNote(next)
    if (next && !next.bad) timer.current = setTimeout(() => setNote(null), 4500)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  const onClickCapture = async (event: MouseEvent) => {
    const anchor = (event.target as Element).closest?.('a[href^="cursor://"]:not([data-native])')
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    const target = parseCursorHref(href)
    if (!target) return
    event.preventDefault()
    const name = target.file.split('/').pop() ?? target.file
    show({ text: `Opening ${name}...`, bad: false })
    try {
      const res = await fetch('/api/dev/studio/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(target) })
      const answer = (await res.json()) as OpenResponse
      if (answer.ok) show({ text: `Opened ${name}${answer.line ? ` at line ${answer.line}` : ''} in Cursor.`, bad: false })
      else show({ text: answer.message, bad: true, path: target.file, link: answer.reason === 'helper-offline' ? href : undefined })
    } catch {
      show({ text: 'The Studio server did not answer, so the file was not opened.', bad: true, path: target.file })
    }
  }

  return (
    <div className={styles.root} onClickCapture={onClickCapture}>
      {children}
      {note && (
        <div className={`${styles.toast} ${note.bad ? styles.bad : ''}`} role="status" data-testid="open-toast" data-state={note.bad ? 'failed' : 'ok'}>
          <span>{note.text}</span>
          {note.path && <span className={styles.path}>{note.path}</span>}
          {note.path && (
            <button type="button" className={styles.action} onClick={async () => setCopied(await copyText(note.path ?? ''))}>{copied ? 'Copied' : 'Copy path'}</button>
          )}
          {note.link && <a className={styles.action} href={note.link} data-native="">Try the link</a>}
          {note.bad && <button type="button" className={styles.action} onClick={() => show(null)} aria-label="Dismiss">Dismiss</button>}
        </div>
      )}
    </div>
  )
}
