'use client'

import type { ButtonHTMLAttributes, MouseEvent, PointerEvent, ReactNode } from 'react'
import { UI_ZONES } from '@/lib/ui-zones'

type BaseDockProps = {
  /** When set, a New mission button sits between Build and the Hub/Menu button. */
  onMission?: () => void

  onPrev: () => void
  onNext: () => void
  onBuild: (event?: MouseEvent<HTMLButtonElement>) => void
  onHub: () => void
  /** Flight reuses this dock with Boost in the Build slot. Mining uses Fire. */
  buildLabel?: string
  buildTestId?: string
  buildIcon?: ReactNode
  buildBeacon?: string
  buildDisabled?: boolean
  buildCharging?: boolean
  onBuildPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  onBuildPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void
  onBuildPointerLeave?: (event: PointerEvent<HTMLButtonElement>) => void
  onBuildPointerCancel?: (event: PointerEvent<HTMLButtonElement>) => void
  hubIcon?: ReactNode
  hubLabel?: string
  hubTestId?: string
  variant?: 'base' | 'flight'
  /** Base scene location selector. When present, navigation and actions split
   * into compact edge plates instead of one centered navigation capsule. */
  locationLabel?: string
  locationNavigationDisabled?: boolean
  showLocationBuild?: boolean
  /** Base camera controls live in the location toolbar, not as a floating overlay. */
  onOverview?: () => void
  overviewPosition?: number
  onOverviewPositionChange?: (position: number) => void
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

function MissionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 3 3 10l7 3 3 7z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5S14.4 18 12 20.5C9.6 18 8.5 15.2 8.5 12S9.6 6 12 3.5z" />
    </svg>
  )
}

function BuildSiteIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 20h18M5 20v-8l7-4 7 4v8M9 20v-5h6v5M12 4v4" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  )
}

function OverviewIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
      <path d="m3 3 5 5M21 3l-5 5M3 21l5-5M21 21l-5-5" opacity=".55" />
    </svg>
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
  buildBeacon = 'hub-build-btn',
  buildDisabled = false,
  buildCharging = false,
  onBuildPointerDown,
  onBuildPointerUp,
  onBuildPointerLeave,
  onBuildPointerCancel,
  hubIcon,
  hubLabel = 'Hub',
  hubTestId = 'hub-btn',
  variant = 'base',
  onMission,
  locationLabel,
  locationNavigationDisabled = false,
  showLocationBuild = true,
  onOverview,
  overviewPosition = 0,
  onOverviewPositionChange,
}: BaseDockProps) {
  const flight = variant === 'flight'
  const label = buildLabel
  if (locationLabel) {
    return (
      <nav aria-label="Location and scene actions" className="scene-location-dock" data-ui-zone={UI_ZONES.bottomNav} data-testid="base-dock">
        <div className="scene-location-selector" aria-label={`Selected location ${locationLabel}`}>
          <DockArrowButton direction="left" data-testid="hub-dock-prev" onClick={onPrev} aria-label={locationNavigationDisabled ? 'Previous location' : 'Scroll left'} disabled={locationNavigationDisabled} />
          <span className="scene-location-label"><LocationIcon /><span>{locationLabel}</span></span>
          <DockArrowButton direction="right" data-testid="hub-dock-next" onClick={onNext} aria-label={locationNavigationDisabled ? 'Next location' : 'Scroll right'} disabled={locationNavigationDisabled} />
        </div>
        <div className="scene-location-actions">
          {onOverview && onOverviewPositionChange && <div className="scene-location-overview" aria-label="Base camera controls">
            <button type="button" onClick={onOverview} data-testid="base-overview-button" aria-label="Show whole base" title="Show whole base"><OverviewIcon /></button>
            <input type="range" min="0" max="1" step="0.001" value={overviewPosition} onChange={event => onOverviewPositionChange(Number(event.target.value))} data-testid="base-overview-slider" aria-label="Base position" />
          </div>}
          {showLocationBuild && <DockWordButton data-testid={buildTestId} data-beacon={buildBeacon} onClick={onBuild}>
            {buildIcon ?? <BuildSiteIcon />}<span>{buildLabel}</span>
          </DockWordButton>}
          {onMission && <DockWordButton className="scene-location-action--mission" data-testid="hub-new-mission-btn" onClick={onMission}>
            <MissionIcon /><span>Find mission</span>
          </DockWordButton>}
          <DockWordButton className="scene-location-action--menu" data-testid={hubTestId} onClick={onHub}>
            {hubIcon ?? <MenuIcon />}<span>{hubLabel === 'Hub' ? 'Menu' : hubLabel}</span>
          </DockWordButton>
        </div>
      </nav>
    )
  }
  return (
    <nav
      aria-label="Scene dock"
      className={onMission ? 'scene-dock scene-dock--mission' : 'scene-dock'}
      data-ui-zone={UI_ZONES.bottomNav}
      data-testid="base-dock"
      data-dock-variant={variant}
      style={{ gap: BASE_DOCK_GAP }}
    >
      <DockArrowButton direction="left" data-testid="hub-dock-prev" onClick={onPrev} aria-label="Previous" />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <DockWordButton
          data-testid={flight ? buildTestId : 'hub-build-btn'}
          data-beacon={buildBeacon}
          data-coach-target={flight ? buildBeacon : undefined}
          data-charging={buildCharging || undefined}
          disabled={buildDisabled}
          onClick={onBuild}
          onPointerDown={onBuildPointerDown}
          onPointerUp={onBuildPointerUp}
          onPointerLeave={onBuildPointerLeave}
          onPointerCancel={onBuildPointerCancel}
        >
          {buildIcon ?? <HammerIcon />}
          <span>{label}</span>
        </DockWordButton>
        {onMission ? (
          <>
            <span className="scene-dock-rule" aria-hidden="true" />
            <DockWordButton className="scene-dock-word--mission" data-testid="hub-new-mission-btn" onClick={onMission}>
              <MissionIcon />
              <span>Mission</span>
            </DockWordButton>
          </>
        ) : null}
        <span className="scene-dock-rule" aria-hidden="true" />
        <DockWordButton data-testid={hubTestId} onClick={onHub}>
          {hubIcon ?? <RadioIcon />}
          <span>{hubLabel}</span>
        </DockWordButton>
      </div>
      <DockArrowButton direction="right" data-testid="hub-dock-next" onClick={onNext} aria-label="Next" />
    </nav>
  )
}
