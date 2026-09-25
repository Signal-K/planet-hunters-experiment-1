'use client'

import { useEffect, useState } from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

export interface Toast {
  id: string
  message: string
  kind?: 'info' | 'ok' | 'warn'
}

interface ToastLayerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export default function ToastLayer({ toasts, onDismiss }: ToastLayerProps) {
  return (
    <div data-ui-zone={UI_ZONES.toastStack} className="toast-stack">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 16)
    const hide = setTimeout(() => setVisible(false), 3200)
    const remove = setTimeout(() => onDismiss(toast.id), 3700)
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(remove) }
  }, [toast.id, onDismiss])

  const accent = toast.kind === 'ok' ? '#39d36a' : toast.kind === 'warn' ? '#f5a623' : 'rgba(112,217,234,0.8)'

  return (
    <div className="toast-item" style={{
      pointerEvents: 'auto',
      padding: '8px 12px',
      background: 'rgba(6,13,24,0.92)',
      border: `1px solid ${accent}44`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      backdropFilter: 'blur(8px)',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: '#d0dce8',
      cursor: 'pointer',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-6px)',
      transition: 'opacity 0.25s, transform 0.25s',
    }} onClick={() => onDismiss(toast.id)}>
      <span>{toast.message}</span>
      <button type="button" className="toast-dismiss" aria-label={`Dismiss ${toast.message}`} onClick={event => { event.stopPropagation(); onDismiss(toast.id) }}>×</button>
    </div>
  )
}
