'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import MissionCard from '@/components/game/MissionCard'
import { ACADEMY_INTRO_MISSION_ID, compatibleTargetsFor, missionTypePrimer, partitionByOwner } from '@/lib/data'
import { ROCKET_MODELS } from '@/lib/data/rockets'
import { SATELLITE_MODELS } from '@/lib/data/satellites'
import { formatCurrency } from '@/lib/format'
import type { Catalog } from '@/lib/catalog'
import type { Player } from '@/lib/game-types'
import { academyAffinityUnlocked } from '@/lib/systems/AcademySystem'
import { UI_ZONES } from '@/lib/ui-zones'

interface LaunchpadScreenProps {
  onBack: () => void
  /** Commits to a mission — same click-to-commit contract as the Mission Board. */
  onPick: (id: string) => void
  onViewContracts: () => void
  onOpenHangar: () => void
  onBuildMonitoring: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  player: Player
  francs?: number
}

const infoCardStyle: React.CSSProperties = {
  padding: 16, borderRadius: 12,
  border: '1px solid var(--ln-hairline)',
  background: 'var(--ln-panel)',
  display: 'flex', flexDirection: 'column', gap: 10,
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--ln-font-display)', fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--ln-text-muted)',
}

/**
 * The launchpad's own screen, and the first thing a player sees when they tap
 * the launchpad — their own program before anybody else's order.
 *
 * Tapping the launchpad used to drop straight onto the Mission Board, which is
 * a wall of client requests: the player's read was "this pad exists to serve
 * other people". Own-initiative work (launching your own satellite, a
 * self-directed run, raising your own infrastructure) had no home of its own.
 * This screen is that home; the Mission Board is one press away and unchanged.
 *
 * The own/client split is `isOwnProgramMission` via `partitionByOwner` — the
 * same authority the Mission Board's grouping uses, so the two surfaces can
 * never disagree about whose job something is.
 */
export default function LaunchpadScreen({
  onBack, onPick, onViewContracts, onOpenHangar, onBuildMonitoring, missionsDone, freeOperations, catalog, player, francs,
}: LaunchpadScreenProps) {
  const { missions: MISSIONS, clients: CLIENTS, minerals: MINERAL_META, targets } = catalog
  const sequence = missionsDone + 1

  // Defensive, not the normal path: GameScreenRouter already resolves an
  // active/pending build to the transit/fab screen before the player ever
  // lands here. Kept so a rocket mid-build is never silently hidden if this
  // screen is ever reached another way.
  const rocketInProgress = player.activeMission
    ? { label: player.activeMission.label, status: 'In flight' }
    : player.pendingLaunch
      ? { label: 'Rocket', status: 'Fabrication in progress' }
      : null

  const fleet = ROCKET_MODELS.map(m => ({
    model: m,
    unlocked: missionsDone >= m.missionsRequired && !m.locked,
  }))

  // Satellites unlock off the Satellite Monitoring Station structure and are
  // launched once — not the rocket fleet's missionsRequired axis.
  const satellites = SATELLITE_MODELS.map(m => {
    const launched = !!player.transitSatelliteLaunchedAt
    const available = !!player.satelliteMonitoringBuilt && !launched
    return {
      model: m,
      launched,
      available,
    }
  })

  // Own-program work carries no client, so none of the board's client gating
  // applies: no daily pool slot, no cooldown, no affinity tier. During
  // onboarding the sequence gate still holds; in Free Ops everything the
  // player owns is theirs to fly whenever they like.
  const { own } = partitionByOwner(MISSIONS, m => m)
  const launchables = own.filter(m => freeOperations || m.sequence === sequence)

  const cards = launchables.map(m => ({
    mission: m,
    client: m.client ? CLIENTS[m.client] ?? null : null,
    targetCount: compatibleTargetsFor(m, targets).length,
    primer: missionTypePrimer(m),
  }))

  return (
    <div
      className="ln-scene-launchpad"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <TopBar
        eyebrow="EARTH BASE · LAUNCHPAD"
        title="Your Program"
        onBack={onBack}
        solid
        francs={francs}
      />

      <div
        data-ui-zone={UI_ZONES.screenContent}
        className="launchpad-scroll"
        style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 96, overflowY: 'auto' }}
      >
        <div className="launchpad-content">
          {rocketInProgress && (
            <div style={{ ...infoCardStyle, borderColor: 'var(--ln-cyan)' }} data-testid="launchpad-rocket-in-progress">
              <div style={sectionLabelStyle}>Rocket In Progress</div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, color: 'var(--ln-text)' }}>
                {rocketInProgress.label}
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-cyan)' }}>
                {rocketInProgress.status}
              </div>
            </div>
          )}

          <section className="launchpad-infrastructure" data-testid="launchpad-infrastructure">
            <div className="launchpad-section-heading">
              <div>
                <div className="ln-instrument-label">Owned Infrastructure</div>
                <h2>Flight &amp; telemetry assets</h2>
              </div>
              <p>Your program's operational hardware, independent of client contracts.</p>
            </div>
            <div className="launchpad-infrastructure-grid">
              <div className="ln-instrument-card launchpad-asset-card" data-testid="launchpad-monitoring-card">
                <div className="launchpad-asset-title-row">
                  <div>
                    <div className="ln-instrument-label">Ground Systems</div>
                    <div className="ln-instrument-value">Satellite Monitoring Station</div>
                  </div>
                  <span className={`launchpad-status ${player.satelliteMonitoringBuilt ? 'is-online' : 'is-required'}`}>
                    <span />
                    {player.satelliteMonitoringBuilt ? 'BUILT' : 'REQUIRED'}
                  </span>
                </div>
                <p>
                  {player.satelliteMonitoringBuilt
                    ? 'Telemetry and daily instrument downlinks are online.'
                    : 'Build the ground station to launch and operate your first transit telescope.'}
                </p>
                {!player.satelliteMonitoringBuilt && (
                  <PrimaryBtn testId="launchpad-build-monitoring-btn" onClick={onBuildMonitoring}>
                    Build Monitoring Station →
                  </PrimaryBtn>
                )}
              </div>

              <div className="ln-instrument-card launchpad-asset-card" data-testid="launchpad-satellites-card">
                <div className="ln-instrument-label">Satellite Fleet</div>
                <div className="launchpad-row-list">
                  {satellites.map(({ model, launched, available }) => (
                    <div key={model.id} className="launchpad-data-row" data-enabled={available || launched}>
                      <div>
                        <strong>{model.name}</strong>
                        <span>EARTH ORBIT · SCIENCE INSTRUMENT</span>
                      </div>
                      <code>{launched ? 'DEPLOYED' : available ? 'READY TO LAUNCH' : 'STATION REQUIRED'}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="launchpad-secondary-grid">
            <div className="ln-instrument-card" data-testid="launchpad-status-card">
              <div className="ln-instrument-label">Launchpad Status</div>
              <div className="launchpad-asset-title-row">
                <div className="ln-instrument-value">
                  {player.launchpadUpgraded ? 'Upgraded Pad' : 'Standard Pad'}
                </div>
                <code className="launchpad-inline-status">
                  {player.launchpadUpgraded ? 'ONLINE' : 'UPGRADE AVAILABLE ON HUB'}
                </code>
              </div>
            </div>

            <div className="ln-instrument-card" data-testid="launchpad-fleet-card">
              <div className="ln-instrument-label">Rocket Fleet</div>
              <div className="launchpad-row-list">
                {fleet.map(({ model, unlocked }) => (
                  <div key={model.id} className="launchpad-data-row" data-enabled={unlocked}>
                    <strong>{model.name}</strong>
                    <code>
                      {unlocked
                        ? model.costFrancs > 0 ? formatCurrency(model.costFrancs, { compact: true }) : 'FREE'
                        : model.unlockHint.toUpperCase()}
                    </code>
                  </div>
                ))}
              </div>
              <GhostBtn testId="launchpad-open-hangar-btn" onClick={onOpenHangar}>
                Open Hangar →
              </GhostBtn>
            </div>
          </div>

          <div className="launchpad-program-copy">
            Work you launch on your own initiative — your satellites, your
            infrastructure, your own mining runs. Nobody ordered these and
            nobody else owns what they leave behind.
          </div>

          {cards.length > 0 ? (
            <div
              data-testid="launchpad-own-program-list"
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {cards.map(c => {
                const isAcademyTask = c.mission.id === ACADEMY_INTRO_MISSION_ID
                const academyUnlocked = academyAffinityUnlocked(player)
                  || !!player.academyResearched
                  || player.placed.includes('astronaut-academy')
                const academyCompleted = isAcademyTask
                  && player.placed.includes('astronaut-academy')
                  && (player.crew ?? []).some(member =>
                    member.crewClass === 'astronaut'
                    && member.selfTrained
                    && member.specialisations.length > 0,
                  )
                const unlocked = !isAcademyTask || (academyUnlocked && !academyCompleted)
                return (
                  <MissionCard
                    key={c.mission.id}
                    mission={c.mission}
                    client={c.client}
                    mineralMeta={MINERAL_META}
                    targetCount={c.targetCount}
                    displayPayout={c.mission.payout.francs}
                    unlocked={unlocked}
                    isStoryMission={c.mission.tag === 'STORY' && !c.mission.deliveryTargetId}
                    cardState={academyCompleted ? 'completed' : unlocked ? 'available' : 'locked'}
                    lockedDetail={isAcademyTask && !academyCompleted ? 'Reach L2 affinity with two clients' : undefined}
                    onPick={() => onPick(c.mission.id)}
                  />
                )
              })}
            </div>
          ) : (
            <div
              data-testid="launchpad-own-program-empty"
              style={{
                padding: 24, borderRadius: 12,
                border: '1px solid var(--ln-hairline)',
                background: 'var(--ln-panel)',
                fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.5,
                color: 'var(--ln-text-muted)',
              }}
            >
              Nothing of your own is ready to fly yet. Client contracts are what
              pay for the program that gets you there.
            </div>
          )}
        </div>
      </div>

      <div
        className="sticky-actions"
        data-ui-zone={UI_ZONES.bottomActions}
        data-coach-id="launchpad-view-contracts"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}
      >
        {cards.length > 0 ? (
          <GhostBtn testId="launchpad-view-contracts-btn" onClick={onViewContracts}>
            View All Contracts →
          </GhostBtn>
        ) : (
          <PrimaryBtn testId="launchpad-view-contracts-btn" onClick={onViewContracts}>
            View All Contracts →
          </PrimaryBtn>
        )}
      </div>
    </div>
  )
}
