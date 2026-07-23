'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { IconBtn } from '@/components/ui/Button'
import { compatibleTargetsFor, contractorAffinityBonus, contractorUnlocked, FREE_OPS_START_MISSIONS_DONE, CONTRACTOR_AFFINITY_MISSION_THRESHOLD, MISSION_TEMPLATES, CONTRACTOR_SLOTS, SELF_DIRECTED_MINING_MISSION_ID } from '@/lib/data'
import type { DailyContractorPool, Mission } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import MissionCard from '@/components/game/MissionCard'
import ClientBonusGuideSheet from '@/components/game/ClientBonusGuideSheet'
import ContractorMark from '@/components/ui/ContractorMark'
import StepFooter from '@/components/game/StepFooter'
import MissionBoardSection from '@/components/game/MissionBoardSection'
import MissionBoardCompleteState from '@/components/game/MissionBoardCompleteState'
import IconBadge from '@/components/ui/IconBadge'
import SegmentedBar from '@/components/ui/SegmentedBar'
import { formatFrancs } from '@/lib/format'

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
// (i-missions/i-sort/i-market/i-note/i-rover/etc.) reinterpreted as plain
// stroke icons rather than a hidden <symbol> sprite sheet.
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h11M4 12h7M4 17h4M17 6v13M17 6l-3 3M17 6l3 3" />
    </svg>
  )
}

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
  contractorMissions?: Record<string, number>
  contractorCooldowns?: Record<string, number>
  dailyContractorPool?: DailyContractorPool
}

// "Custom Missions Unlocked" / "Infrastructure" are one-time explainer copy,
// not live data (unlike the Hot Minerals panel below them) — they used to
// render unconditionally on every Free Ops visit, permanently cluttering the
// board. Dismiss-once, same localStorage-ack pattern as TutorialCompleteSheet.
const EXPLAINER_ACK_KEY = 'ln_missionboard_freeops_explainer_ack'

// `alreadyExperienced` backfills players who reached Free Ops before this
// dismiss tracking existed (i.e. everyone's save at ship time) — anyone who
// has ever completed a contractor mission has plainly already seen how Free
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

export default function MissionBoardScreen({ onBack, onPick, missionsDone, freeOperations, hasCoach, catalog, contractorMissions, contractorCooldowns, dailyContractorPool }: MissionBoardScreenProps) {
  const { missions: MISSIONS, contractors: CONTRACTORS, minerals: MINERAL_META, targets } = catalog
  const [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])
  const [showClientBonusGuide, setShowClientBonusGuide] = useState(false)
  const hasPriorFreeOpsExperience = Object.keys(contractorMissions ?? {}).length > 0
    || (dailyContractorPool?.completedIds.length ?? 0) > 0
  const { show: showFreeOpsExplainer, dismiss: dismissFreeOpsExplainer } = useFreeOpsExplainerAck(hasPriorFreeOpsExperience)
  const now = tick
  const isOnCooldown = (contractor: string | undefined) => {
    if (!contractorCooldowns || !contractor) return false
    const expiry = contractorCooldowns[contractor]
    return expiry && expiry > now
  }
  const isCompletedToday = (id: string) =>
    dailyContractorPool?.completedIds.includes(id) ?? false
  const mineralEntries = Object.values(MINERAL_META)
  const averageMineralPrice = mineralEntries.reduce((sum, mineral) => sum + mineral.price, 0) / Math.max(1, mineralEntries.length)
  const hotMinerals = mineralEntries
    .filter(mineral => mineral.price > averageMineralPrice)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)

  const useDailyPool = freeOperations && !!dailyContractorPool
  const sequence = missionsDone + 1

  // In daily pool mode, the display list is the pool itself (available + completed).
  // In legacy freeops mode, fall back to the catalog freeops- missions with cooldowns.
  const storyMissionPool = freeOperations ? MISSIONS.filter(m => m.tag === 'STORY') : []
  const freeOpsMissionPool = MISSIONS.filter(m => m.id.startsWith('freeops-') || m.id.startsWith('exo-survey-') || m.tag === 'STORY')
  const exoplanetSurveyPool = freeOperations ? MISSIONS.filter(m => m.id.startsWith('exo-survey-')) : []
  // Hand-authored "mine then deliver" logistics jobs are always offered in Free Ops,
  // independent of the daily-rotating contractor pool.
  const logisticsMissionPool = freeOperations ? MISSIONS.filter(m => !!m.deliveryTargetId && !isOnCooldown(m.contractor)) : []
  // Self-directed mining has no contractor, no daily limit, and no cooldown —
  // always launchable from its own dedicated Free Ops panel below (not a card
  // in the regular list, since it isn't tied to a contractor or a pool slot).
  const contractorPoolExhausted = useDailyPool
    && dailyContractorPool!.missions.length > 0
    && dailyContractorPool!.missions.every(m => isCompletedToday(m.id))
  const available = useDailyPool
    ? [...storyMissionPool, ...logisticsMissionPool, ...dailyContractorPool!.missions.filter(m => !isCompletedToday(m.id)), ...exoplanetSurveyPool]
    : MISSIONS.filter(m => {
        if (m.id === SELF_DIRECTED_MINING_MISSION_ID) return false
        const customMission = !m.contractor
        if (m.contractor && !CONTRACTORS[m.contractor]) return false
        if (freeOperations) {
          return customMission || !!m.deliveryTargetId || (freeOpsMissionPool.some(item => item.id === m.id) && !isOnCooldown(m.contractor))
        }
        // Onboarding: sequence is the only gate — contractor unlock tiers don't apply
        return m.sequence === sequence
      })

  const completedToday = useDailyPool
    ? dailyContractorPool!.missions.filter(m => isCompletedToday(m.id))
    : []

  const onboardingComplete = !freeOperations && available.length === 0 && missionsDone >= FREE_OPS_START_MISSIONS_DONE

  if (onboardingComplete) {
    return <MissionBoardCompleteState onBack={onBack} />
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--ln-shell)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.3) saturate(0.7)' }} />
      </div>
        <TopBar
          eyebrow={freeOperations ? 'EARTH BASE · FREE OPS' : `EARTH BASE · L${missionsDone + 1}`}
          title="Mission Board"
          onBack={onBack}
          solid
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
        <PlayfieldBand topMission={available[0]} contractors={CONTRACTORS} mineralMeta={MINERAL_META} activeCount={available.length} freeOperations={freeOperations} />
        {freeOperations && (
          <div style={{ padding: '0 14px 10px 14px' }}>
            <Panel accent={contractorPoolExhausted ? 'var(--ln-ok)' : 'var(--ln-cyan)'} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <IconBadge icon={<MarketIcon />} tone={contractorPoolExhausted ? 'ok' : 'cyan'} active size={26} />
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: contractorPoolExhausted ? 'var(--ln-ok)' : 'var(--ln-cyan)', textTransform: 'uppercase' }}>
                  Free Ops · Self-Directed Mining
                </div>
              </div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45, marginBottom: 10 }}>
                {contractorPoolExhausted
                  ? "Today's client requests are done. Launch a self-directed run — pick any reachable target and sell the haul yourself at market price."
                  : 'No client, no daily limit. Pick any reachable target, mine what looks valuable, and sell the haul yourself at market price.'}
              </div>
              <button
                data-testid="self-directed-mining-btn"
                onClick={() => onPick(SELF_DIRECTED_MINING_MISSION_ID)}
                style={{
                  width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: contractorPoolExhausted ? 'var(--ln-ok)' : 'var(--ln-cyan)',
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
              <Panel accent="var(--ln-amber)" style={{ padding: 12, position: 'relative' }}>
                <button
                  data-testid="dismiss-freeops-explainer"
                  onClick={dismissFreeOpsExplainer}
                  aria-label="Dismiss"
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 6,
                    border: '1px solid rgba(245,166,35,0.4)', background: 'rgba(8,16,28,0.6)',
                    color: 'var(--ln-amber)', fontSize: 12, lineHeight: 1, cursor: 'pointer',
                  }}
                >
                  ×
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <IconBadge icon={<NoteIcon />} tone="amber" active size={22} />
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-amber)', textTransform: 'uppercase' }}>
                    Custom Missions Unlocked
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: 'var(--ln-text-dim)', lineHeight: 1.45, paddingRight: 20 }}>
                  Contractor requests pay fixed bonuses. Infrastructure work grows operations for clients or for you — own infrastructure is where you place your satellite and expand personal operations. Free Ops highlights minerals above average market value so you can choose what is worth mining now.
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

        {/* Contract list, boxed as a single dark panel — the dark-theme
            equivalent of the OD mockup's clipboard/parchment container
            (rejected material, kept IA: a bounded "board" holding the
            header row, the cards, and a single disclaimer line). */}
        <div style={{ padding: '0 14px 14px 14px' }}>
          <Panel accent="var(--ln-cyan)" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <IconBadge icon={<ListIcon />} tone="cyan" active size={30} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: 'var(--ln-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {freeOperations ? 'Client Requests' : 'Active Contracts'}
                </span>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: 'var(--ln-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {available.length} open
                </span>
              </div>
              <span style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--ln-hairline-strong)', background: 'rgba(13,52,104,0.5)', flexShrink: 0 }}>
                <SortIcon />
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ln-amber)', textTransform: 'uppercase' }}>
                  Sort · Payout
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                // During onboarding show only the sequence-matched missions (available).
                // During free-ops show available missions (+ completed-today for daily pool).
                // Never show locked/future missions during onboarding.
                const rawList = useDailyPool
                  ? [...available, ...completedToday]
                  : available
                // In free-ops daily-pool mode, available missions first, completed at the bottom
                const isAvailable = (m: typeof rawList[0]) =>
                  !isCompletedToday(m.id) &&
                  !(!useDailyPool && isOnCooldown(m.contractor)) &&
                  (freeOperations || available.some(item => item.id === m.id))
                const list = useDailyPool
                  ? [...rawList].sort((a, b) => Number(!isAvailable(a)) - Number(!isAvailable(b)))
                  : rawList
                const firstValidIdx = list.findIndex(m => {
                  if (isCompletedToday(m.id)) return false
                  if (!useDailyPool && isOnCooldown(m.contractor)) return false
                  const ctr = m.contractor ? CONTRACTORS[m.contractor] : null
                  if (m.contractor && !ctr) return false
                  const cr = freeOperations || m.sequence === sequence || (!!ctr && contractorUnlocked(ctr, sequence))
                  return cr && (freeOperations || available.some(item => item.id === m.id))
                })
                const hasContractorMission = list.some(m => !!m.contractor)
                const cards = list.map((m, idx) => {
                const completedToday_ = isCompletedToday(m.id)
                const cooldown = !useDailyPool && isOnCooldown(m.contractor)
                const contractor = m.contractor ? CONTRACTORS[m.contractor] : null
                if (m.contractor && !contractor) return null
                const isStoryMission = m.tag === 'STORY' && !m.deliveryTargetId
                const contractorReady = freeOperations || m.sequence === sequence || (!!contractor && contractorUnlocked(contractor, sequence))
                const unlocked = !completedToday_ && !cooldown && contractorReady && (freeOperations || available.some(item => item.id === m.id))
                const mTargets = compatibleTargetsFor(m, targets)
                const affinityMultiplier = isStoryMission || !contractor ? 0 : contractorAffinityBonus(contractor, contractorMissions?.[contractor.id] ?? 0)
                const affinityBonus = Math.round(m.payout.francs * affinityMultiplier)
                const displayPayout = m.payout.francs + affinityBonus
                const isHighlighted = hasCoach && idx === firstValidIdx
                const cardState = completedToday_ ? 'completed' as const
                  : cooldown ? 'cooldown' as const
                  : !unlocked ? 'locked' as const
                  : 'available' as const
                const lockedDetail = !contractorReady ? (contractor ? `L${contractor.unlockTier}` : 'Locked') : m.sequence <= missionsDone ? 'Completed' : m.unlockAt
                const cooldownLabel = cooldown && m.contractor ? formatCooldown(contractorCooldowns![m.contractor] - now) : undefined
                const routeLabel = m.deliveryTargetId
                  ? `${targets.find(t => t.id === m.targetId)?.name ?? m.targetId} → ${targets.find(t => t.id === m.deliveryTargetId)?.name ?? m.deliveryTargetId}`
                  : undefined
                return (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    contractor={contractor}
                    mineralMeta={MINERAL_META}
                    targetCount={mTargets.length}
                    displayPayout={displayPayout}
                    affinityMultiplier={affinityMultiplier}
                    affinityReward={m.payout.affinity}
                    unlocked={unlocked}
                    isStoryMission={isStoryMission}
                    cardState={cardState}
                    lockedDetail={lockedDetail}
                    cooldownLabel={cooldownLabel}
                    highlighted={isHighlighted}
                    routeLabel={routeLabel}
                    onPick={() => onPick(m.id)}
                  />
                )
              })
                return (
                  <>
                    {cards}
                    {hasContractorMission && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, padding: '10px 12px',
                        background: 'rgba(112,217,234,0.05)', border: '1px dashed var(--ln-hairline-strong)', borderRadius: 6,
                      }}>
                        <span style={{ color: 'var(--ln-text-muted)', flexShrink: 0 }}><NoteIcon /></span>
                        <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11.5, fontStyle: 'italic', color: 'var(--ln-text-dim)' }}>
                          Client pay bonuses change this job&apos;s payout only — they never increase how much gets mined.
                        </span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </Panel>
        </div>

        {freeOperations && <AffinityAdvancedSection contractors={catalog.contractors} contractorMissions={contractorMissions} />}
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
          contractorMissions={contractorMissions}
          sequence={sequence}
        />
      )}
    </div>
  )
}

// "Playfield" band — ported from the Open Design "Client Bonus" mockup's map
// header (see web/components/game/previews/MissionFlowPreview.tsx for the
// full decorative version with tile-grid/biome art), restyled onto real dark
// --ln-* tokens and driven by the top real mission instead of fake preview
// data. Deliberately skips the OD prototype's animated tile-grid/greeblies —
// this band's job is orienting the player toward the top contract, not
// reproducing the mockup's decorative flourish.
function PlayfieldBand({
  topMission,
  contractors,
  mineralMeta,
  activeCount,
  freeOperations,
}: {
  topMission?: Mission
  contractors: Catalog['contractors']
  mineralMeta: Catalog['minerals']
  activeCount: number
  freeOperations: boolean
}) {
  const contractor = topMission?.contractor ? contractors[topMission.contractor] : null
  const accent = contractor?.color ?? 'var(--ln-amber)'
  const blurb = !topMission
    ? 'No contracts on the board right now.'
    : contractor
      ? `${contractor.name} wants ${contractor.mineralPreferences.map(id => mineralMeta[id]?.name ?? id).join(' / ')}. Premium changes payout, not mined cargo.`
      : 'Self-directed run. Mine what you want and sell at market value.'

  return (
    <div style={{ padding: '0 14px 10px 14px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 12,
        borderRadius: 10, border: `1px solid ${accent}45`,
        background: 'linear-gradient(160deg, var(--ln-surface-2) 0%, var(--ln-void) 100%)',
        boxShadow: 'var(--ln-shadow-card)',
      }}>
        <ContractorMark
          initial={contractor?.initial ?? 'OP'}
          color={accent}
          uiRole={contractor?.uiRole ?? 'starter'}
          contractorId={contractor?.id}
          size={40}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: accent, textTransform: 'uppercase' }}>
              {topMission ? topMission.title : 'Board scan'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11.5, color: 'var(--ln-text-dim)', lineHeight: 1.4, marginTop: 2 }}>
            {blurb}
          </div>
        </div>
        <div style={{ flex: 'none', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
            {freeOperations ? 'Client requests' : 'Active contracts'}
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: 'var(--ln-text)' }}>
            {activeCount}
          </div>
        </div>
      </div>
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
    .map(t => t.contractorRole)
)

const SLOT_ROLE_MAP = new Map(CONTRACTOR_SLOTS.map(s => [s.id, s.uiRole]))

function AffinityAdvancedSection({
  contractors,
  contractorMissions,
}: {
  contractors: Catalog['contractors']
  contractorMissions?: Record<string, number>
}) {
  const advancedContractors = Object.values(contractors).filter(c => {
    const role = SLOT_ROLE_MAP.get(c.id)
    return role !== undefined && ADVANCED_ROLES.has(role)
  })
  if (advancedContractors.length === 0) return null

  return (
    <MissionBoardSection title="Advanced Ops · Affinity Unlock">
        {advancedContractors.map(contractor => {
          const done = contractorMissions?.[contractor.id] ?? 0
          const unlocked = done >= CONTRACTOR_AFFINITY_MISSION_THRESHOLD
          const contractorRole = SLOT_ROLE_MAP.get(contractor.id) ?? ''
          const advancedTags = MISSION_TEMPLATES
            .filter(t => t.contractorRole === contractorRole && (t.tag === 'CONSTRUCT' || t.tag === 'SCAN'))
            .map(t => t.tag)
          const uniqueTags = [...new Set(advancedTags)]

          return (
            <Panel key={contractor.id} accent={unlocked ? 'var(--ln-ok)' : contractor.color} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: `${contractor.color}22`, border: `1.5px solid ${contractor.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 12, color: contractor.color, flexShrink: 0 }}>
                  {contractor.initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, color: contractor.color, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{contractor.name}</span>
                    <span style={{ flex: 1 }} />
                    <StatusPill kind={unlocked ? 'ok' : 'mute'}>{unlocked ? 'UNLOCKED' : `${done}/${CONTRACTOR_AFFINITY_MISSION_THRESHOLD}`}</StatusPill>
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: 'var(--ln-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                    {uniqueTags.join(' · ')} MISSIONS AVAILABLE AT {CONTRACTOR_AFFINITY_MISSION_THRESHOLD} OPS
                  </div>
                </div>
              </div>
              {!unlocked && (
                <div style={{ marginTop: 8 }}>
                  <SegmentedBar segments={CONTRACTOR_AFFINITY_MISSION_THRESHOLD} filled={done} tone="amber" height={5} />
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, color: 'var(--ln-text-muted)', marginTop: 4, letterSpacing: '0.12em' }}>
                    {CONTRACTOR_AFFINITY_MISSION_THRESHOLD - done} more operation{CONTRACTOR_AFFINITY_MISSION_THRESHOLD - done !== 1 ? 's' : ''} to unlock advanced contracts
                  </div>
                </div>
              )}
            </Panel>
          )
        })}
    </MissionBoardSection>
  )
}
