'use client'

import type { Player, Screen } from '@/lib/game-types'

// Screens that are themselves part of the active-mission flow — the ticker
// would be redundant (or would float over live mining/transit UI) if shown
// on any of these, so it only surfaces once the player has actually
// navigated away to Base/Missions/Atlas/Build/Market.
const MISSION_FLOW_SCREENS: Screen[] = ['transit', 'mining', 'rover-mining', 'delivery', 'debrief']

interface MissionTickerProps {
  player: Player
  screen: Screen
  onResume: (screen: Screen) => void
}

/**
 * Persistent footer bar that lets a player rejoin an in-progress mission
 * (e.g. mid mining-run) after using the back button to check Missions,
 * Atlas, Build, or Market — those screens don't otherwise surface that a
 * mission is still running.
 */
export default function MissionTicker({ player, screen, onResume }: MissionTickerProps) {
  // Hub already owns the active-run banner inside its bottom command dock.
  // Showing this global ticker there as well creates two identical resume
  // surfaces and crowds the terrain/HUD composition.
  if (!player.activeMission || screen === 'hub' || MISSION_FLOW_SCREENS.includes(screen)) return null

  return (
    <button
      data-testid="mission-ticker"
      onClick={() => onResume(player.missionPhase ?? 'transit')}
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 96,
        zIndex: 41,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'linear-gradient(180deg, rgba(24,24,28,0.92), rgba(11,11,13,0.94))',
        border: '1px solid rgba(112,217,234,0.4)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.45), 0 0 16px rgba(112,217,234,0.15)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: 'var(--ln-cyan)', boxShadow: '0 0 8px var(--ln-cyan)',
        animation: 'ln-pulse 1.4s ease-in-out infinite',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
          letterSpacing: '0.2em', color: 'var(--ln-cyan)', textTransform: 'uppercase',
        }}>
          Mission In Progress
        </div>
        <div style={{
          fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
          color: '#e6efff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.activeMission.label}
        </div>
      </div>
      <span style={{
        flexShrink: 0,
        padding: '5px 10px', borderRadius: 8,
        background: 'rgba(112,217,234,0.15)', border: '1px solid rgba(112,217,234,0.5)',
        color: 'var(--ln-cyan)',
        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        Resume ›
      </span>
    </button>
  )
}
