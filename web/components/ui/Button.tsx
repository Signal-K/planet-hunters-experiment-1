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

const KIND_TOKENS: Record<ButtonKind, { color: string; border: string }> = {
  cyan: { color: 'var(--ln-cyan)', border: 'var(--ln-cyan-border)' },
  amber: { color: 'var(--ln-amber)', border: 'var(--ln-amber-border)' },
  green: { color: 'var(--ln-ok)', border: 'var(--ln-ok)' },
}

export function PrimaryBtn({ children, onClick, disabled, full = true, kind = 'cyan', testId }: ButtonProps) {
  const { color, border } = KIND_TOKENS[kind]
  return (
    <button
      data-testid={testId}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      style={{
        width: full ? '100%' : 'auto',
        minHeight: 44,
        padding: '10px 16px',
        background: 'transparent',
        color,
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        border: `1px solid ${border}`,
        borderRadius: 8,
        boxShadow: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function GhostBtn({ children, onClick, full = true, testId }: ButtonProps) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      style={{
        width: full ? '100%' : 'auto',
        minHeight: 44, // touch-target floor (Apple HIG / WCAG 2.5.5)
        padding: '12px 18px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(20,20,23,0.6)',
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
  testId,
  color = '#cde4ff',
  size = 44, // touch-target floor (Apple HIG / WCAG 2.5.5) — was 38
}: {
  children: React.ReactNode
  onClick?: () => void
  ariaLabel?: string
  testId?: string
  color?: string
  size?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        background: 'rgba(20,20,23,0.7)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(112,217,234,0.35)',
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
