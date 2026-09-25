'use client'

import type { MissionRunSummary } from '@/lib/mission-runs'
import { HubClockWidget } from '@/components/game/hub/HubClockWidget'
import { formatCurrency } from '@/lib/format'
import styles from './HomeChrome.module.css'

const ATTENTION_LABEL = { waiting: 'ON PAD · READY', arrived: 'ARRIVED', mining: 'MINING' } as const
const PHASE_LABEL: Record<MissionRunSummary['phase'], string> = {
  transit: 'IN FLIGHT', landing: 'DESCENT', mining: 'MINING', delivery: 'DELIVERY', debrief: 'ARRIVED',
}

function RocketGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2c3 3 4.5 6.5 4.5 11L12 19l-4.5-6C7.5 8.5 9 5 12 2Z" /><circle cx="12" cy="10" r="1.8" /><path d="M9.5 18 8 22M14.5 18 16 22" /></svg>
}
function ChevronGlyph({ direction }: { direction: 'previous' | 'next' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{direction === 'previous' ? <path d="m11 6-6 6 6 6M19 6l-6 6 6 6" /> : <path d="m13 6 6 6-6 6M5 6l6 6-6 6" />}</svg>
}
function HubGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19c1.5-6 4.5-9 8-9s6.5 3 8 9" /><path d="M12 10V4M9 6l3-2 3 2" /><path d="M3 19h18" /></svg>
}
function MarketGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h16l-2-6H6l-2 6z" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>
}
function MenuGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}
function SurfaceGlyph() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
}

/** Top bar: meta + balance, time, Hub. No "Base" label (SSL-340). */
export function HomeTopBar({ opsCount, francs, subsurface, signalCount, devLauncher, onOpenHub }: {
  opsCount: number
  francs: number
  subsurface: boolean
  signalCount: number
  devLauncher: boolean
  onOpenHub: () => void
}) {
  return (
    <div className={styles.topBar} data-testid="home-top-bar" data-dev-launcher={devLauncher}>
      <div className={styles.meta}>
        <span className={styles.eyebrow}>{subsurface ? 'SUBSURFACE' : `OPS ${opsCount}`}</span>
        <p className={styles.title} data-testid="home-balance">{formatCurrency(francs, { compact: true })}</p>
      </div>
      <HubClockWidget />
      <button
        type="button"
        className={styles.hubButton}
        data-testid="home-hub-button"
        data-attention={signalCount > 0}
        aria-label={signalCount > 0 ? `Hub, ${signalCount} new instrument signals` : 'Hub'}
        onClick={onOpenHub}
      >
        <HubGlyph />HUB{signalCount > 0 ? ` · ${signalCount}` : ''}
      </button>
    </div>
  )
}

export interface SkyRocket {
  key: string
  label: string
  attention: Exclude<MissionRunSummary['attention'], null>
}

/** Rockets in the sky that need a tap: mining, arrived, or waiting on the pad. */
export function HomeSkyRockets({ rockets, onTap }: { rockets: SkyRocket[]; onTap: (key: string) => void }) {
  if (rockets.length === 0) return null
  return (
    <div className={styles.sky} data-testid="home-sky-rockets">
      {rockets.map(rocket => (
        <button
          key={rocket.key}
          type="button"
          className={styles.skyRocket}
          data-testid="home-sky-rocket"
          data-attention={rocket.attention}
          onClick={() => onTap(rocket.key)}
        >
          <span className={styles.skyRocketGlyph}><RocketGlyph /></span>
          <span className={styles.skyRocketText}>
            <span>{ATTENTION_LABEL[rocket.attention]}</span>
            <strong>{rocket.label}</strong>
          </span>
        </button>
      ))}
    </div>
  )
}

/** Bottom bar: « mission » switch, Market, Menu. Transparent icons (SSL-340). */
export function HomeBottomBar({ runs, selectedIndex, onSelect, onResume, subsurface, onSurface, showMarket, marketOpen, menuOpen, onMarket, onMenu }: {
  runs: MissionRunSummary[]
  selectedIndex: number
  onSelect: (index: number) => void
  onResume: (run: MissionRunSummary) => void
  subsurface: boolean
  onSurface: () => void
  /** Market is a Free Ops surface; hidden during guided onboarding. */
  showMarket: boolean
  marketOpen: boolean
  menuOpen: boolean
  onMarket: () => void
  onMenu: () => void
}) {
  const run = runs[selectedIndex] ?? runs[0]
  const step = (offset: number) => onSelect((selectedIndex + offset + runs.length) % runs.length)
  return (
    <div className={styles.bottomBar} data-testid="home-bottom-bar">
      <div className={styles.missionSwitch}>
        {subsurface ? (
          <button type="button" className={styles.hubButton} onClick={onSurface} data-testid="home-surface-button"><SurfaceGlyph />SURFACE</button>
        ) : run ? (
          <>
            <button type="button" className={styles.switchButton} aria-label="Previous mission" disabled={runs.length < 2} onClick={() => step(-1)} data-testid="home-mission-prev"><ChevronGlyph direction="previous" /></button>
            <button type="button" className={styles.runChip} onClick={() => onResume(run)} data-testid="hub-resume-mission-btn" aria-label={`Resume ${run.label}`}>
              <span>{run.attention ? ATTENTION_LABEL[run.attention] : PHASE_LABEL[run.phase]}{runs.length > 1 ? ` · ${selectedIndex + 1}/${runs.length}` : ''}</span>
              <strong>{run.label}</strong>
            </button>
            <button type="button" className={styles.switchButton} aria-label="Next mission" disabled={runs.length < 2} onClick={() => step(1)} data-testid="home-mission-next"><ChevronGlyph direction="next" /></button>
          </>
        ) : null}
      </div>
      {showMarket && <button type="button" className={styles.barButton} aria-expanded={marketOpen} onClick={onMarket} data-testid="home-market-button"><MarketGlyph />MARKET</button>}
      <button type="button" className={styles.barButton} aria-expanded={menuOpen} onClick={onMenu} data-testid="settings-button" aria-label="Open menu"><MenuGlyph />MENU</button>
    </div>
  )
}
