'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import { PrimaryBtn, GhostBtn } from '@/components/ui/Button'
import MissionCard from '@/components/game/MissionCard'
import { compatibleTargetsFor, missionTypePrimer, partitionByOwner } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { UI_ZONES } from '@/lib/ui-zones'

interface LaunchpadScreenProps {
  onBack: () => void
  /** Commits to a mission — same click-to-commit contract as the Mission Board. */
  onPick: (id: string) => void
  onViewContracts: () => void
  missionsDone: number
  freeOperations: boolean
  catalog: Catalog
  francs?: number
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
  onBack, onPick, onViewContracts, missionsDone, freeOperations, catalog, francs,
}: LaunchpadScreenProps) {
  const { missions: MISSIONS, clients: CLIENTS, minerals: MINERAL_META, targets } = catalog
  const sequence = missionsDone + 1

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
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--ln-shell)' }}>
      <TopBar
        eyebrow="EARTH BASE · LAUNCHPAD"
        title="Your Program"
        onBack={onBack}
        solid
        francs={francs}
      />

      <div
        data-ui-zone={UI_ZONES.screenContent}
        style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 96, overflowY: 'auto' }}
      >
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.5,
            color: 'var(--ln-text-muted)',
          }}>
            Work you launch on your own initiative — your satellites, your
            infrastructure, your own mining runs. Nobody ordered these and
            nobody else owns what they leave behind.
          </div>

          {cards.length > 0 ? (
            <div
              data-testid="launchpad-own-program-list"
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {cards.map(c => (
                <MissionCard
                  key={c.mission.id}
                  mission={c.mission}
                  client={c.client}
                  mineralMeta={MINERAL_META}
                  targetCount={c.targetCount}
                  displayPayout={c.mission.payout.francs}
                  unlocked
                  isStoryMission={c.mission.tag === 'STORY' && !c.mission.deliveryTargetId}
                  cardState="available"
                  onPick={() => onPick(c.mission.id)}
                />
              ))}
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
