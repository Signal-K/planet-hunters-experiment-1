'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

type BaseDockProps = {
  onPrev: () => void
  onNext: () => void
  onBuild: () => void
  onHub: () => void
  /** Flight reuses this dock with Boost in the Build slot. */
  buildLabel?: string
  buildTestId?: string
  buildIcon?: ReactNode
  hubIcon?: ReactNode
  variant?: 'base' | 'flight'
}

/** Dock controls. Arrows sit at the ends; Build and Hub sit in the middle. */
export const BASE_DOCK_CONTROLS = ['prev', 'build', 'hub', 'next'] as const
export const BASE_DOCK_GAP = 8
export const BASE_DOCK_PADDING = 6

function DockArrow({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'left' ? 'M14 6 L8 12 L14 18' : 'M10 6 L16 12 L10 18'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function DockLaserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v8" />
      <path d="M8 10h8" />
      <path d="M12 10v12" />
    </svg>
  )
}

function HammerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4.5l5 5" />
      <path d="M3 21l8.5-8.5" />
      <path d="M8 3.5l4.5 4.5-6.5 6.5L1.5 10 8 3.5z" />
    </svg>
  )
}

function RadioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 9a7 7 0 0 1 0 6" />
      <path d="M8.2 10.6a3.4 3.4 0 0 1 0 2.8" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <path d="M15.8 10.6a3.4 3.4 0 0 0 0 2.8" />
      <path d="M19 9a7 7 0 0 0 0 6" />
    </svg>
  )
}

function dockClass(base: string, className?: string): string {
  return [base, className].filter(Boolean).join(' ')
}

/** Same arrow button the base dock uses. */
export function DockArrowButton({
  direction,
  className,
  ...rest
}: { direction: 'left' | 'right' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} type="button" className={dockClass('scene-dock-arrow', className)}>
      <DockArrow direction={direction} />
    </button>
  )
}

/** Light dock word button (Build, Hub, order readout). */
export function DockWordButton({
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <button {...rest} type="button" className={dockClass('scene-dock-word', className)}>
      {children}
    </button>
  )
}

/** Coloured primary dock button. Icon plus label, at least 48px tall. */
export function DockPrimaryButton({
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <button {...rest} type="button" className={dockClass('scene-dock-primary', className)}>
      <DockLaserIcon />
      <span>{children}</span>
    </button>
  )
}

/** Floating dock: previous at the far left, Build and Hub in the middle, next at the far right. */
export function BaseDock({
  onPrev,
  onNext,
  onBuild,
  onHub,
  buildLabel = 'Build',
  buildTestId = 'hub-build-btn',
  buildIcon,
  hubIcon,
  variant = 'base',
}: BaseDockProps) {
  const flight = variant === 'flight'
  const label = flight ? buildLabel : 'Build'
  return (
    <nav
      aria-label="Scene dock"
      className="scene-dock"
      data-ui-zone={UI_ZONES.bottomNav}
      data-testid="base-dock"
      data-dock-variant={variant}
      style={{ gap: BASE_DOCK_GAP }}
    >
      <DockArrowButton direction="left" data-testid="hub-dock-prev" onClick={onPrev} aria-label="Previous" />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <DockWordButton data-testid={flight ? buildTestId : 'hub-build-btn'} data-beacon="hub-build-btn" onClick={onBuild}>
          {buildIcon ?? <HammerIcon />}
          <span>{label}</span>
        </DockWordButton>
        <span className="scene-dock-rule" aria-hidden="true" />
        <DockWordButton data-testid="hub-btn" onClick={onHub}>
          {hubIcon ?? <RadioIcon />}
          <span>Hub</span>
        </DockWordButton>
      </div>
      <DockArrowButton direction="right" data-testid="hub-dock-next" onClick={onNext} aria-label="Next" />
    </nav>
  )
}
