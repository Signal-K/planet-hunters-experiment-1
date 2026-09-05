'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import { feasibleTargetsFor, FREE_OPS_START_MISSIONS_DONE, isMissionBoardMission, tutorialClientMissionOptions } from '@/lib/data'
import type { DailyClientPool } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { TUTORIAL_COMPACT_CONTENT_TOP, TUTORIAL_MANUAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import MissionCard from '@/components/game/MissionCard'
import MissionDetailPanel from '@/components/game/MissionDetailPanel'
import StepFooter from '@/components/game/StepFooter'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import { formatCurrency } from '@/lib/format'
import styles from './MissionBoard.module.css'
import { crewRequirementStatus } from '@/lib/systems/AcademySystem'
import type { CrewMember } from '@/lib/data'
import type { Player } from '@/lib/game-types'
import { filterMissionsForSceneScope } from '@/lib/scene-scope'
import type { SceneScope } from '@/lib/scene-scope'
import { isTutorialMissionInProgress } from '@/lib/mission-flow'

const SHORT_LANDSCAPE_CONTENT_TOP = 142

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const cls = { tl: styles.cornerBracketTl, tr: styles.cornerBracketTr, bl: styles.cornerBracketBl, br: styles.cornerBracketBr }[position]
  return (
    <div className={`${styles.cornerBracket} ${cls}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--ln-hairline-strong)" strokeWidth="1.8">
        <path d="M2 22V2h20" />
      </svg>
    </div>
  )
}

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  freeOperations: boolean
  hasCoach?: boolean
  coachManual?: boolean
  catalog: Catalog
  clientMissions?: Record<string, number>
  clientCooldowns?: Record<string, number>
  dailyClientPool?: DailyClientPool
  francs?: number
  crew?: CrewMember[]
  player?: Player
  sceneScope?: SceneScope
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, coachManual = false, catalog, francs, crew = [], player, sceneScope = { kind: 'earth-base', id: 'earth-base', label: 'Base' } }: MissionBoardScreenProps) {
  const { missions: MISSIONS, clients: CLIENTS, minerals: MINERAL_META, targets, parts } = catalog
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [shortLandscape, setShortLandscape] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(orientation: landscape) and (max-width: 1023px) and (max-height: 600px)')
    const update = () => setShortLandscape(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const sequence = missionsDone + 1
  // Tutorial runs are deliberately single-threaded: finish the authored
  // mission before accepting another contract. Free Ops remains repeatable;
  // completing a run clears activeMission and exposes the next request.
  const tutorialMissionInProgress = isTutorialMissionInProgress(freeOperations, !!player?.activeMission)
  const missionStartBlockedLabel = 'Finish current mission'

  // Free Ops lists the catalog's available client work. The authoritative
  // client/market day will later supply this catalog; do not generate a
  // player-local daily board or add per-client cooldown gates here.
  const rawAvailable = MISSIONS.filter(m => {
    if (!isMissionBoardMission(m, freeOperations)) return false
    if (m.client && !CLIENTS[m.client]) return false
    return freeOperations || m.sequence === sequence
  })

  const available = filterMissionsForSceneScope(rawAvailable, sceneScope, targets, !freeOperations)

  // Never advertise a contract that the current catalog or unlocked rocket
  // parts cannot complete. This is deliberately applied before the board
  // renders, not only when the player reaches Target Picker: an impossible
  // card is already a broken contract from the player's perspective.
  const feasibleCandidates = available.filter(mission => feasibleTargetsFor(
    mission,
    targets,
    parts,
    missionsDone,
    player?.launchpadUpgraded ?? false,
    player?.unlockedSkillNodes ?? [],
  ).length > 0)
  const tutorialOptionIds = new Set(freeOperations
    ? feasibleCandidates.map(mission => mission.id)
    : tutorialClientMissionOptions(feasibleCandidates, sequence).map(mission => mission.id))
  const feasibleAvailable = feasibleCandidates.filter(mission => tutorialOptionIds.has(mission.id))

  const onboardingComplete = !freeOperations && feasibleAvailable.length === 0 && missionsDone >= FREE_OPS_START_MISSIONS_DONE

  if (onboardingComplete) {
    return <MissionBoardCompleteState onBack={onBack} />
  }

  // Never show locked/future missions during onboarding. Free Ops stays a
  // straightforward catalog of client work rather than a per-player slot list.
  const missionList = feasibleAvailable.filter(mission => isMissionBoardMission(mission, freeOperations))
  const firstValidIdx = missionList.findIndex(m => {
    if (m.jointProject && (francs ?? 0) < m.jointProject.playerCost) return false
    const ctr = m.client ? CLIENTS[m.client] : null
    if (m.client && !ctr) return false
    const cr = freeOperations || m.sequence === sequence
    return cr && (freeOperations || available.some(item => item.id === m.id))
  })
  const cardModels = missionList
    .map((m, idx) => {
      const client = m.client ? CLIENTS[m.client] : null
      if (m.client && !client) return null
      const isStoryMission = m.tag === 'STORY' && !m.deliveryTargetId
      const clientReady = freeOperations || m.sequence === sequence
      const jointFundingReady = !m.jointProject || (francs ?? 0) >= m.jointProject.playerCost
      const unlocked = clientReady && jointFundingReady && (freeOperations || available.some(item => item.id === m.id))
      const mTargets = feasibleTargetsFor(m, targets, parts, missionsDone, player?.launchpadUpgraded ?? false, player?.unlockedSkillNodes ?? [])
      const displayPayout = m.payout.francs
      const isHighlighted = hasCoach && idx === firstValidIdx
      const cardState = !unlocked ? 'locked' as const
        : 'available' as const
      const lockedDetail = !jointFundingReady
        ? `Needs ${formatCurrency(m.jointProject!.playerCost)} co-funding`
        : !clientReady
          ? (client ? `L${client.unlockTier}` : 'Locked')
          : m.sequence <= missionsDone
            ? 'Completed'
            : m.unlockAt
      const routeLabel = m.deliveryTargetId
        ? `${targets.find(t => t.id === m.targetId)?.name ?? m.targetId} → ${targets.find(t => t.id === m.deliveryTargetId)?.name ?? m.deliveryTargetId}`
        : undefined
      const crewStatus = crewRequirementStatus(m.requires.crew, crew)
      return {
        mission: m, client, targetCount: mTargets.length, displayPayout,
        unlocked, isStoryMission, cardState, lockedDetail, isHighlighted, routeLabel,
        crewStatus: m.requires.crew
          ? player?.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1'
            ? crewStatus.reason
            : 'Crew Quarters required · research and fit in Hangar'
          : undefined,
        crewReady: crewStatus.met && player?.shipCustomizerParts?.['crew-module'] === 'crew-quarters-t1',
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  // STS-582 makes this a client-only surface in Free Ops. Owned flights are
  // filtered above and live under Launchpad → Your Program instead.
  const sections = [
    {
      key: 'client' as const,
      title: freeOperations ? 'Client Requests' : 'Active Contracts',
      sub: 'Issued by a client · paid on delivery',
      cards: cardModels,
    },
  ].filter(s => s.cards.length > 0)

  const effectivePreviewId = previewId ?? cardModels.find(c => c.unlocked)?.mission.id ?? cardModels[0]?.mission.id ?? null
  const previewModel = cardModels.find(c => c.mission.id === effectivePreviewId) ?? null
  const contentTop = hasCoach
    ? (coachManual ? TUTORIAL_MANUAL_CONTENT_TOP : TUTORIAL_COMPACT_CONTENT_TOP)
    : 82

  return (
    <div className="ln-scene-mission-board theme-blueprint" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div className={styles.spaceBackdrop} style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.3) saturate(0.7)' }} />
      </div>
      <div className={`ln-starfield ${styles.spaceBackdrop}`} style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }} />
        <TopBar
          eyebrow={freeOperations ? `${sceneScope.label.toUpperCase()} · FREE OPS` : `${sceneScope.label.toUpperCase()} · L${missionsDone + 1}`}
          title="Mission Board"
          onBack={onBack}
          solid
          levelBadge={`LV. ${missionsDone + 1}`}
          francs={francs}
        />

      {/* The board content viewport ends above the fixed StepFooter; it does
          not need a guessed bottom padding reserve. */}
      {/* scrollPaddingTop (KES-146): the coach card is a fixed sibling
          overlay, not part of this scroll container, so paddingTop alone
          only protects the at-rest layout. Without scroll-padding-top,
          scrollIntoView (browser-native, and what Cypress/keyboard nav
          trigger before any click) can scroll a list item flush with this
          container's top edge, sliding it out from under the reserved gap
          and underneath the coach overlay. */}
      <div className={`mission-board-screen-content${hasCoach ? ` ${styles.coachCompact}` : ''}${shortLandscape ? ' mission-board-screen-content--short-landscape' : ''}`} data-ui-zone={UI_ZONES.screenContent} style={{ position: 'absolute', top: 0, left: '50%', right: 'auto', width: 'min(100%, 1120px)', transform: 'translateX(-50%)', paddingTop: shortLandscape ? SHORT_LANDSCAPE_CONTENT_TOP : contentTop, overflowY: 'auto', scrollPaddingTop: shortLandscape ? SHORT_LANDSCAPE_CONTENT_TOP : contentTop }}>
        {/* Direct transcription of the OD mockup's `.body-layout` — no
            summary banner above it (the mockup has none; the earlier
            PlayfieldBand strip was this screen's own invention, not in the
            reference, and was cut). */}
        <div style={{ padding: shortLandscape ? '6px 14px 0' : '14px' }} className={styles.layout}>
          <div className={styles.canvas}>
            <CornerBracket position="tl" /><CornerBracket position="tr" />
            <CornerBracket position="bl" /><CornerBracket position="br" />
            {sections.map((section, sectionIdx) => (
              <div
                key={section.key}
                data-testid={`mission-board-section-${section.key}`}
                className={sectionIdx > 0 ? styles.boardSectionFollowing : undefined}
              >
                <div className={styles.boardHeader}>
                  <div>
                    <div className={styles.boardHeaderTitle}>{section.title}</div>
                    <div className={styles.boardHeaderSub}>{section.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={styles.boardHeaderCount}>
                      {section.cards.filter(c => c.unlocked).length} open
                    </span>
                    {sectionIdx === 0 && <span className={styles.sortSelect}>Payout</span>}
                  </div>
                </div>

                <div className={styles.cardList}>
                  {section.cards.map(c => (
                    <MissionCard
                      key={c.mission.id}
                      mission={c.mission}
                      client={c.client}
                      mineralMeta={MINERAL_META}
                      targetCount={c.targetCount}
                      displayPayout={c.displayPayout}
                      unlocked={c.unlocked}
                      isStoryMission={c.isStoryMission}
                      cardState={c.cardState}
                      lockedDetail={c.lockedDetail}
                      startBlocked={tutorialMissionInProgress}
                      startBlockedLabel={missionStartBlockedLabel}
                      highlighted={c.isHighlighted}
                      previewed={c.mission.id === effectivePreviewId}
                      routeLabel={c.routeLabel}
                      crewStatus={c.crewStatus}
                      crewReady={c.crewReady}
                      onPick={() => { if (!tutorialMissionInProgress) onPick(c.mission.id) }}
                      onPreview={() => setPreviewId(c.mission.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}><h3>Selected Contract</h3></div>
            <div className={styles.panelBody}>
              {previewModel ? (
                <MissionDetailPanel
                  mission={previewModel.mission}
                  client={null}
                  mineralMeta={MINERAL_META}
                  targetCount={previewModel.targetCount}
                  displayPayout={previewModel.displayPayout}
                  affinityReward={0}
                  unlocked={previewModel.unlocked}
                  isStoryMission={previewModel.isStoryMission}
                  cardState={previewModel.cardState}
                  lockedDetail={previewModel.lockedDetail}
                  routeLabel={previewModel.routeLabel}
                  startBlocked={tutorialMissionInProgress}
                  startBlockedLabel={missionStartBlockedLabel}
                  onPick={() => { if (!tutorialMissionInProgress) onPick(previewModel.mission.id) }}
                />
              ) : (
                <MissionDetailPanel
                  mission={null}
                  mineralMeta={MINERAL_META}
                  targetCount={0}
                  displayPayout={0}
                  affinityReward={0}
                  unlocked={false}
                  isStoryMission={false}
                  cardState="locked"
                  onPick={() => {}}
                />
              )}
            </div>
          </div>
        </div>

        {freeOperations && <LaunchOptionsPanel />}
      </div>

      <StepFooter
        step="Mission"
        description={
          available.length === 0
            ? 'No client requests are available from this location.'
            : freeOperations
              ? 'Choose client work here. Use Launchpad for own infrastructure, mining, or a test launch.'
              : `Pick a contract to unlock Target, Rocket, and Launch for L${missionsDone + 1}.`
        }
      />

    </div>
  )
}

function LaunchOptionsPanel() {
  const options = [
    ['Client work', 'Select a request on this board.'],
    ['Own infrastructure', 'Launchpad · Your Program'],
    ['Mining', 'Launchpad · Your Program'],
    ['Test launch', 'Launchpad · Your Program'],
  ] as const

  return (
    <div style={{ padding: '0 14px 10px' }} data-testid="freeops-launch-options">
      <Panel accent="var(--ln-cyan)" style={{ padding: 12 }}>
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 8 }}>
          Launch options
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {options.map(([title, detail]) => (
            <div key={title} style={{ border: '1px solid var(--ln-hairline)', borderRadius: 6, padding: 8 }}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, color: 'var(--ln-text)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', lineHeight: 1.35, marginTop: 4 }}>{detail}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
