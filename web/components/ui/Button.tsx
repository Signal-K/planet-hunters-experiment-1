'use client'

import React from 'react'

type ButtonKind = 'cyan' | 'amber' | 'green'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  full?: boolean
  kind?: ButtonKind
  size?: ButtonSize
  variant?: 'primary' | 'secondary' | 'danger'
  testId?: string
}

const GRADS: Record<ButtonKind, [string, string, string, string]> = {
  cyan:  ['#6cc2ff', '#2d8de0', '#06121f', 'rgba(63,169,255,0.4)'],
  amber: ['#ffc25c', '#d68a0d', '#1d0c00', 'rgba(245,166,35,0.4)'],
  green: ['#6cf09a', '#1ea54a', '#02180c', 'rgba(57,211,106,0.4)'],
}

export function PrimaryBtn({ children, onClick, disabled, full = true, kind = 'cyan', testId }: ButtonProps) {
  const [h1, h2, fg, glow] = GRADS[kind]
  return (
    <button
      data-testid={testId}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        width: full ? '100%' : 'auto',
        padding: '16px 22px',
        background: `linear-gradient(180deg, ${h1} 0%, ${h2} 100%)`,
        color: fg,
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        border: 'none',
        borderRadius: 12,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3), 0 0 22px ${glow}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.4 : 1,
        filter: disabled ? 'saturate(0.5)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

export function GhostBtn({ children, onClick, full = true }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: full ? '100%' : 'auto',
        padding: '12px 18px',
        background: 'rgba(8,16,28,0.6)',
        color: '#a9b8ce',
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        border: '1px solid rgba(169,184,206,0.18)',
        borderRadius: 10,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  children,
  onClick,
  ariaLabel,
  color = '#cde4ff',
  size = 38,
}: {
  children: React.ReactNode
  onClick?: () => void
  ariaLabel?: string
  color?: string
  size?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        background: 'rgba(8,16,28,0.7)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(63,169,255,0.35)',
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}

export default PrimaryBtn
