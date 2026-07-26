'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { IconBtn } from '@/components/ui/Button'
import { compatibleTargetsFor, clientAffinityBonus, clientUnlocked, FREE_OPS_START_MISSIONS_DONE, CLIENT_AFFINITY_MISSION_THRESHOLD, MISSION_TEMPLATES, CLIENT_SLOTS, SELF_DIRECTED_MINING_MISSION_ID } from '@/lib/data'
import type { DailyClientPool, Mission } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import MissionCard from '@/components/game/MissionCard'
import MissionDetailPanel from '@/components/game/MissionDetailPanel'
import ClientBonusGuideSheet from '@/components/game/ClientBonusGuideSheet'
import StepFooter from '@/components/game/StepFooter'
import MissionBoardSection from '@/components/game/MissionBoardSection'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import IconBadge from '@/components/ui/IconBadge'
import SegmentedBar from '@/components/ui/SegmentedBar'
import { formatFrancs } from '@/lib/format'
import styles from './MissionBoard.module.css'

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const cls = { tl: styles.cornerBracketTl, tr: styles.cornerBracketTr, bl: styles.cornerBracketBl, br: styles.cornerBracketBr }[position]
  return (
    <div className={`${styles.cornerBracket} ${cls}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(112,217,234,0.35)" strokeWidth="1.8">
        <path d="M2 22V2h20" />
      </svg>
    </div>
  )
}

function InfoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

// Out There: Omega Edition icon-language glyphs — bordered white-line marks
// rendered inside <IconBadge>, matching the mockup's symbol sprite
// (i-missions/i-market/i-note/i-rover/etc.) reinterpreted as plain
// stroke icons rather than a hidden <symbol> sprite sheet.

function MarketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8l1-4h14l1 4M4 8h16M4 8v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8M9 12v4M15 12v4" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function RoverIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="16" height="6" rx="1.5" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
      <path d="M8 9V6h8v3" />
    </svg>
  )
}

function ColonyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V11a8 8 0 0 1 16 0v9" />
      <path d="M4 20h16" />
    </svg>
  )
}

function SettlementIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20V9l5-3 5 3v11M13 20v-7l4-2.5 4 2.5v7" />
      <path d="M3 20h18" />
    </svg>
  )
}

interface MissionBoardScreenProps {
  onBack: () => void
  onPick: (id: string) => void
  missionsDone: number
  freeOperations: boolean
  hasCoach?: boolean
  catalog: Catalog
  clientMissions?: Record<string, number>
  clientCooldowns?: Record<string, number>
  dailyClientPool?: DailyClientPool
  francs?: number
}

// "Custom Missions Unlocked" / "Infrastructure" are one-time explainer copy,
// not live data (unlike the Hot Minerals panel below them) — they used to
// render unconditionally on every Free Ops visit, permanently cluttering the
// board. Dismiss-once, same localStorage-ack pattern as TutorialCompleteSheet.
const EXPLAINER_ACK_KEY = 'ln_missionboard_freeops_explainer_ack'

// `alreadyExperienced` backfills players who reached Free Ops before this
// dismiss tracking existed (i.e. everyone's save at ship time) — anyone who
// has ever completed a client mission has plainly already seen how Free
// Ops works and should never see this explainer, not even once. Without
// this, every existing deep-progress save hits the "first time" case on its
// next Mission Board visit purely because the ack key was never set,
// regardless of how many hours they've actually played.
function useFreeOpsExplainerAck(alreadyExperienced: boolean) {
  const [show, setShow] = useState(() => {
    if (alreadyExperienced) return false
    if (typeof window === 'undefined') return true
    return !localStorage.getItem(EXPLAINER_ACK_KEY)
  })
  const dismiss = () => {
    localStorage.setItem(EXPLAINER_ACK_KEY, '1')
    setShow(false)
  }
  return { show, dismiss }
}

function formatCooldown(remaining: number): string {
  if (remaining <= 0) return '0m'
  const mins = Math.ceil(remaining / 60000)
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  const secs = Math.ceil((remaining % 60000) / 1000)
  return `${mins}m ${secs}s`
}

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, catalog, clientMissions, clientCooldowns, dailyClientPool, francs }: MissionBoardScreenProps) {
  const { missions: MISSIONS, clients: CLIENTS, minerals: MINERAL_META, targets } = catalog
  const [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  const [showClientBonusGuide, setShowClientBonusGuide] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const hasPriorFreeOpsExperience = Object.keys(clientMissions ?? {}).length > 0
    || (dailyClientPool?.completedIds.length ?? 0) > 0
  const { show: showFreeOpsExplainer, dismiss: dismissFreeOpsExplainer } = useFreeOpsExplainerAck(hasPriorFreeOpsExperience)
  const now = tick
  const isOnCooldown = (client: string | undefined) => {
    if (!clientCooldowns || !client) return false
    const expiry = clientCooldowns[client]
    return expiry && expiry > now
  }
  const isCompletedToday = (id: string) =>
    dailyClientPool?.completedIds.includes(id) ?? false
  const mineralEntries = Object.values(MINERAL_META)
  const averageMineralPrice = mineralEntries.reduce((sum, mineral) => sum + mineral.price, 0) / Math.max(1, mineralEntries.length)
  const hotMinerals = mineralEntries
    .filter(mineral => mineral.price > averageMineralPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)

  const useDailyPool = freeOperations && !!dailyClientPool
  const sequence = missionsDone + 1

  // In daily pool mode, the display list is the pool itself (available + completed).
  // In legacy freeops mode, fall back to the catalog freeops- missions with cooldowns.
  const storyMissionPool = freeOperations ? MISSIONS.filter(m => m.tag === 'STORY') : []
  const freeOpsMissionPool = MISSIONS.filter(m => m.id.startsWith('freeops-') || m.id.startsWith('exo-survey-') || m.tag === 'STORY')
  const exoplanetSurveyPool = freeOperations ? MISSIONS.filter(m => m.id.startsWith('exo-survey-')) : []
  // Hand-authored "mine then deliver" logistics jobs are always offered in Free Ops,
  // independent of the daily-rotating client pool.
  const logisticsMissionPool = freeOperations ? MISSIONS.filter(m => !!m.deliveryTargetId && !isOnCooldown(m.client)) : []
  // Self-directed mining has no client, no daily limit, and no cooldown —
  // always launchable from its own dedicated Free Ops panel below (not a card
  // in the regular list, since it isn't tied to a client or a pool slot).
  const clientPoolExhausted = useDailyPool
    && dailyClientPool!.missions.length > 0
    && dailyClientPool!.missions.every(m => isCompletedToday(m.id))
  const available = useDailyPool
    ? [...storyMissionPool, ...logisticsMissionPool, ...dailyClientPool!.missions.filter(m => !isCompletedToday(m.id)), ...exoplanetSurveyPool]
    : MISSIONS.filter(m => {
        if (m.id === SELF_DIRECTED_MINING_MISSION_ID) return false
        const customMission = !m.client
        if (m.client && !CLIENTS[m.client]) return false
        if (freeOperations) {
          return customMission || !!m.deliveryTargetId || (freeOpsMissionPool.some(item => item.id === m.id) && !isOnCooldown(m.client))
        }
        // Onboarding: sequence is the only gate — client unlock tiers don't apply
        return m.sequence === sequence
      })

  const completedToday = useDailyPool
    ? dailyClientPool!.missions.filter(m => isCompletedToday(m.id))
    : []

  const onboardingComplete = !freeOperations && available.length === 0 && missionsDone >= FREE_OPS_START_MISSIONS_DONE

  if (onboardingComplete) {
    return <MissionBoardCompleteState onBack={onBack} />
  }

  // During onboarding show only the sequence-matched missions (available).
  // During free-ops show available missions (+ completed-today for daily pool).
  // Never show locked/future missions during onboarding.
  const rawList = useDailyPool ? [...available, ...completedToday] : available
  // In free-ops daily-pool mode, available missions first, completed at the bottom
  const isListedAvailable = (m: typeof rawList[0]) =>
    !isCompletedToday(m.id) &&
    !(!useDailyPool && isOnCooldown(m.client)) &&
    (freeOperations || available.some(item => item.id === m.id))
  const missionList = useDailyPool
    ? [...rawList].sort((a, b) => Number(!isListedAvailable(a)) - Number(!isListedAvailable(b)))
    : rawList
  const firstValidIdx = missionList.findIndex(m => {
    if (isCompletedToday(m.id)) return false
    if (!useDailyPool && isOnCooldown(m.client)) return false
    const ctr = m.client ? CLIENTS[m.client] : null
    if (m.client && !ctr) return false
    const cr = freeOperations || m.sequence === sequence || (!!ctr && clientUnlocked(ctr, sequence))
    return cr && (freeOperations || available.some(item => item.id === m.id))
  })
  const hasClientMission = missionList.some(m => !!m.client)
  const cardModels = missionList
    .map((m, idx) => {
      const completedToday_ = isCompletedToday(m.id)
      const cooldown = !useDailyPool && isOnCooldown(m.client)
      const client = m.client ? CLIENTS[m.client] : null
      if (m.client && !client) return null
      const isStoryMission = m.tag === 'STORY' && !m.deliveryTargetId
      const clientReady = freeOperations || m.sequence === sequence || (!!client && clientUnlocked(client, sequence))
      const unlocked = !completedToday_ && !cooldown && clientReady && (freeOperations || available.some(item => item.id === m.id))
      const mTargets = compatibleTargetsFor(m, targets)
      const affinityMultiplier = isStoryMission || !client ? 0 : clientAffinityBonus(client, clientMissions?.[client.id] ?? 0)
      const affinityBonus = Math.round(m.payout.francs * affinityMultiplier)
      const displayPayout = m.payout.francs + affinityBonus
      const isHighlighted = hasCoach && idx === firstValidIdx
      const cardState = completedToday_ ? 'completed' as const
        : cooldown ? 'cooldown' as const
        : !unlocked ? 'locked' as const
        : 'available' as const
      const lockedDetail = !clientReady ? (client ? `L${client.unlockTier}` : 'Locked') : m.sequence <= missionsDone ? 'Completed' : m.unlockAt
      const cooldownLabel = cooldown && m.client ? formatCooldown(clientCooldowns![m.client] - now) : undefined
      const routeLabel = m.deliveryTargetId
        ? `${targets.find(t => t.id === m.targetId)?.name ?? m.targetId} → ${targets.find(t => t.id === m.deliveryTargetId)?.name ?? m.deliveryTargetId}`
        : undefined
      return {
        mission: m, client, targetCount: mTargets.length, displayPayout, affinityMultiplier,
        affinityReward: m.payout.affinity, unlocked, isStoryMission, cardState, lockedDetail,
        cooldownLabel, isHighlighted, routeLabel,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const effectivePreviewId = previewId ?? cardModels.find(c => c.unlocked)?.mission.id ?? cardModels[0]?.mission.id ?? null
  const previewModel = cardModels.find(c => c.mission.id === effectivePreviewId) ?? null

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--ln-shell)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.3) saturate(0.7)' }} />
      </div>
      <div className="ln-starfield" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }} />
        <TopBar
          eyebrow={freeOperations ? 'EARTH BASE · FREE OPS' : `EARTH BASE · L${missionsDone + 1}`}
          title="Mission Board"
          onBack={onBack}
          solid
          levelBadge={`LV. ${missionsDone + 1}`}
          credits={francs}
          right={
            <IconBtn
              ariaLabel="Client bonus guide"
              testId="client-bonus-guide-btn"
              onClick={() => setShowClientBonusGuide(true)}
            >
              <InfoIcon />
            </IconBtn>
          }
        />

      {/* .bottom-tab-bar now reserves its own flex row above this screen, so
          paddingBottom only needs breathing room plus the coach panel's own
          footprint when it's showing — no more nav-clearance guesswork. */}
      <div data-ui-zone={UI_ZONES.screenContent} style={{ position: 'absolute', inset: 0, paddingTop: hasCoach ? TUTORIAL_CONTENT_TOP : 72, paddingBottom: hasCoach ? 138 : 76, overflowY: 'auto' }}>
        {/* Direct transcription of the OD mockup's `.body-layout` — no
            summary banner above it (the mockup has none; the earlier
            PlayfieldBand strip was this screen's own invention, not in the
            reference, and was cut). */}
        <div style={{ padding: '14px' }} className={styles.layout}>
          <div className={styles.canvas}>
            <CornerBracket position="tl" /><CornerBracket position="tr" />
            <CornerBracket position="bl" /><CornerBracket position="br" />
            <div className={styles.boardHeader}>
              <div>
                <div className={styles.boardHeaderTitle}>{freeOperations ? 'Client Requests' : 'Active Contracts'}</div>
                <div className={styles.boardHeaderSub}>Client jobs &amp; market runs</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.boardHeaderCount}>{available.length} open</span>
                <span className={styles.sortSelect}>Payout</span>
              </div>
            </div>

            <div className={styles.cardList}>
              {cardModels.map(c => (
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
                  cooldownLabel={c.cooldownLabel}
                  highlighted={c.isHighlighted}
                  previewed={c.mission.id === effectivePreviewId}
                  routeLabel={c.routeLabel}
                  onPick={() => onPick(c.mission.id)}
                  onPreview={() => setPreviewId(c.mission.id)}
                />
              ))}
            </div>

            {hasClientMission && (
              <div className={styles.disclaimer}>
                Changes this job&apos;s payout only — does not increase minerals mined.
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}><h3>Contract Detail</h3></div>
            <div className={styles.panelBody}>
              {previewModel ? (
                <MissionDetailPanel
                  mission={previewModel.mission}
                  client={previewModel.client}
                  mineralMeta={MINERAL_META}
                  targetCount={previewModel.targetCount}
                  displayPayout={previewModel.displayPayout}
                  affinityReward={previewModel.affinityReward}
                  unlocked={previewModel.unlocked}
                  isStoryMission={previewModel.isStoryMission}
                  cardState={previewModel.cardState}
                  lockedDetail={previewModel.lockedDetail}
                  cooldownLabel={previewModel.cooldownLabel}
                  routeLabel={previewModel.routeLabel}
                  onPick={() => onPick(previewModel.mission.id)}
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

        {/* Free Ops-only surfaces below the main board — not in the OD
            mockup at all (it has no Free Ops variant), kept below the
            primary contract-board view rather than stacked above it so the
            view that matches the reference is what's on screen first. */}
        {freeOperations && (
          <div style={{ padding: '0 14px 10px 14px' }}>
            <Panel accent={clientPoolExhausted ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <IconBadge icon={<MarketIcon />} tone={clientPoolExhausted ? 'ok' : 'cyan'} active size={26} />
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: clientPoolExhausted ? 'var(--ln-ok)' : 'var(--ln-cyan)', textTransform: 'uppercase' }}>
                  Free Ops · Self-Directed Mining
                </div>
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45, marginBottom: 10 }}>
                {clientPoolExhausted
                  ? "Today's client requests are done. Launch a self-directed run — pick any reachable target and sell the haul yourself at market price."
                  : 'No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.'}
              </div>
              <button
                data-testid="self-directed-mining-btn"
                onClick={() => onPick(SELF_DIRECTED_MINING_MISSION_ID)}
                style={{
                  width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: clientPoolExhausted ? 'var(--ln-ok)' : 'var(--ln-cyan)',
                  color: 'var(--ln-text-on-cyan)', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                }}
              >
                Launch Self-Directed Run
              </button>
            </Panel>
          </div>
        )}
        {freeOperations && (
          <div style={{ padding: '0 14px 10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {showFreeOpsExplainer && (
              <Panel accent="var(--ln-cyan)" style={{ padding: 12, position: 'relative' }}>
                <button
                  data-testid="dismiss-freeops-explainer"
                  onClick={dismissFreeOpsExplainer}
                  aria-label="Dismiss"
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 6,
                    border: '1px solid rgba(112,217,234,0.4)', background: 'rgba(8,16,28,0.6)',
                    color: 'var(--ln-cyan)', fontSize: 12, lineHeight: 1, cursor: 'pointer',
                  }}
                >
                  ×
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <IconBadge icon={<NoteIcon />} tone="cyan" active size={22} />
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase' }}>
                    Custom Missions Unlocked
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45, paddingRight: 20 }}>
                  Client requests pay fixed bonuses. Infrastructure work grows operations for clients or for you — own infrastructure is where you place your satellite and expand personal operations. Free Ops highlights minerals above average market value so you can choose what is worth mining now.
                </div>
              </Panel>
            )}
            <Panel accent="var(--ln-ok)" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <IconBadge icon={<MarketIcon />} tone="ok" active size={22} />
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-ok)', textTransform: 'uppercase' }}>
                  Free Ops · Hot Minerals
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {hotMinerals.map(mineral => (
                  <span key={mineral.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, border: `1px solid ${mineral.color}66`, background: 'rgba(8,16,28,0.72)', fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: mineral.color }}>
                  <strong>{mineral.name}</strong> <span style={{ opacity: 0.65 }}>({mineral.sym})</span> ▲{formatFrancs(mineral.price)}
                  </span>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {freeOperations && <AffinityAdvancedSection clients={catalog.clients} clientMissions={clientMissions} />}
        {freeOperations && <ComingSoonMissionsSection />}
      </div>

      <StepFooter
        step="Mission"
        description={
          available.length === 0
            ? 'No contracts on the board right now — check back after your cooldowns clear.'
            : freeOperations
              ? 'Pick a client request or launch a self-directed run, then choose a target.'
              : `Pick a contract to unlock Target, Rocket, and Relay for L${missionsDone + 1}.`
        }
      />

      {showClientBonusGuide && (
        <ClientBonusGuideSheet
          onClose={() => setShowClientBonusGuide(false)}
          clientMissions={clientMissions}
          sequence={sequence}
        />
      )}
    </div>
  )
}

const FUTURE_MISSION_TYPES = [
  { id: 'rovers', label: 'Rover Deployment', brief: 'Deploy surface rovers to scout and sample landing sites.', icon: <RoverIcon /> },
  { id: 'colonies', label: 'Colonies', brief: 'Establish a permanent surface colony beyond a single outpost.', icon: <ColonyIcon /> },
  { id: 'settlements', label: 'Settlements', brief: 'Grow a colony into a self-sustaining settlement network.', icon: <SettlementIcon /> },
] as const

function ComingSoonMissionsSection() {
  return (
    <MissionBoardSection title="Future Operations">
        {FUTURE_MISSION_TYPES.map(type => (
          <Panel key={type.id} accent="var(--ln-text-muted)" style={{ padding: 12, opacity: 0.6, cursor: 'not-allowed' }}>
            <div
              aria-disabled="true"
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <IconBadge icon={type.icon} tone="mute" size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, color: 'var(--ln-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{type.label}</span>
                  <span style={{ flex: 1 }} />
                  <StatusPill kind="mute">Coming Soon</StatusPill>
                </div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-muted)', lineHeight: 1.45, marginTop: 4 }}>
                  {type.brief}
                </div>
              </div>
            </div>
          </Panel>
        ))}
    </MissionBoardSection>
  )
}

const ADVANCED_ROLES = new Set(
  MISSION_TEMPLATES
    .filter(t => t.tag === 'CONSTRUCT' || t.tag === 'SCAN')
    .map(t => t.clientRole)
)

const SLOT_ROLE_MAP = new Map(CLIENT_SLOTS.map(s => [s.id, s.uiRole]))

function AffinityAdvancedSection({
  clients,
  clientMissions,
}: {
  clients: Catalog['clients']
  clientMissions?: Record<string, number>
}) {
  const advancedClients = Object.values(clients).filter(c => {
    const role = SLOT_ROLE_MAP.get(c.id)
    return role !== undefined && ADVANCED_ROLES.has(role)
  })
  if (advancedClients.length === 0) return null

  return (
    <MissionBoardSection title="Advanced Ops · Affinity Unlock">
        {advancedClients.map(client => {
          const done = clientMissions?.[client.id] ?? 0
          const unlocked = done >= CLIENT_AFFINITY_MISSION_THRESHOLD
          const clientRole = SLOT_ROLE_MAP.get(client.id) ?? ''
          const advancedTags = MISSION_TEMPLATES
            .filter(t => t.clientRole === clientRole && (t.tag === 'CONSTRUCT' || t.tag === 'SCAN'))
            .map(t => t.tag)
          const uniqueTags = [...new Set(advancedTags)]

          return (
            <Panel key={client.id} accent={unlocked ? 'var(--ln-ok)' : client.color} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: `${client.color}22`, border: `1.5px solid ${client.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 12, color: client.color, flexShrink: 0 }}>
                  {client.initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, color: client.color, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{client.name}</span>
                    <span style={{ flex: 1 }} />
                    <StatusPill kind={unlocked ? 'ok' : 'mute'}>{unlocked ? 'UNLOCKED' : `${done}/${CLIENT_AFFINITY_MISSION_THRESHOLD}`}</StatusPill>
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                    {uniqueTags.join(' · ')} MISSIONS AVAILABLE AT {CLIENT_AFFINITY_MISSION_THRESHOLD} OPS
                  </div>
                </div>
              </div>
              {!unlocked && (
                <div style={{ marginTop: 8 }}>
                  <SegmentedBar segments={CLIENT_AFFINITY_MISSION_THRESHOLD} filled={done} tone="amber" height={5} />
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, color: 'var(--ln-text-muted)', marginTop: 4, letterSpacing: '0.12em' }}>
                    {CLIENT_AFFINITY_MISSION_THRESHOLD - done} more operation{CLIENT_AFFINITY_MISSION_THRESHOLD - done !== 1 ? 's' : ''} to unlock advanced contracts
                  </div>
                </div>
              )}
            </Panel>
          )
        })}
    </MissionBoardSection>
  )
}
