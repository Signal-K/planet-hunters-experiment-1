'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import TopBar from '@/components/ui/TopBar'
import Panel from '@/components/ui/Panel'
import StatusPill from '@/components/ui/StatusPill'
import { compatibleTargetsFor, contractorAffinityBonus, contractorUnlocked, FREE_OPS_START_MISSIONS_DONE, CONTRACTOR_AFFINITY_MISSION_THRESHOLD, MISSION_TEMPLATES, CONTRACTOR_SLOTS } from '@/lib/data'
import type { DailyContractorPool } from '@/lib/data'
import type { Catalog } from '@/lib/catalog'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'
import { UI_ZONES } from '@/lib/ui-zones'
import MissionCard from '@/components/game/MissionCard'

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
  const now = tick
  const isOnCooldown = (contractor: string) => {
    if (!contractorCooldowns) return false
    const expiry = contractorCooldowns[contractor]
    return expiry && expiry > now
  }
  const isCompletedToday = (id: string) =>
    dailyContractorPool?.completedIds.includes(id) ?? false

  const useDailyPool = freeOperations && !!dailyContractorPool
  const sequence = missionsDone + 1

  // In daily pool mode, the display list is the pool itself (available + completed).
  // In legacy freeops mode, fall back to the catalog freeops- missions with cooldowns.
  const storyMissionPool = freeOperations ? MISSIONS.filter(m => m.tag === 'STORY') : []
  const freeOpsMissionPool = MISSIONS.filter(m => m.id.startsWith('freeops-') || m.id.startsWith('exo-survey-') || m.tag === 'STORY')
  const exoplanetSurveyPool = freeOperations ? MISSIONS.filter(m => m.id.startsWith('exo-survey-')) : []
  const available = useDailyPool
    ? [...storyMissionPool, ...dailyContractorPool!.missions.filter(m => !isCompletedToday(m.id)), ...exoplanetSurveyPool]
    : MISSIONS.filter(m => {
        const contractor = CONTRACTORS[m.contractor]
        if (!contractor) return false
        if (freeOperations) {
          return freeOpsMissionPool.some(item => item.id === m.id) && !isOnCooldown(m.contractor)
        }
        // Onboarding: sequence is the only gate — contractor unlock tiers don't apply
        return m.sequence === sequence
      })

  const completedToday = useDailyPool
    ? dailyContractorPool!.missions.filter(m => isCompletedToday(m.id))
    : []

  const onboardingComplete = !freeOperations && available.length === 0 && missionsDone >= FREE_OPS_START_MISSIONS_DONE

  if (onboardingComplete) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.18) saturate(0.6)' }} />
        </div>
        <TopBar eyebrow="EARTH BASE · COMPLETE" title="Mission Board" onBack={onBack} />
        <div data-ui-zone={UI_ZONES.screenContent} style={{
          position: 'absolute', inset: 0, paddingTop: 72,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '72px 32px 64px',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 999, marginBottom: 24,
            background: 'radial-gradient(circle at 38% 36%, #7ec8ff33, #1a3a5c22)',
            border: '1.5px solid rgba(126,200,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="#7ec8ff" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="14" cy="14" r="3.5" fill="#7ec8ff" opacity="0.7" />
            </svg>
          </div>

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
            Training Arc Complete
          </div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 22, color: '#e6efff', textAlign: 'center', lineHeight: 1.25, marginBottom: 16 }}>
            Three Operations Down
          </div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 14, color: '#7a96b4', textAlign: 'center', lineHeight: 1.6, maxWidth: 280, marginBottom: 32 }}>
            You&apos;ve completed the current build of Landnám. The next phase — Free Ops, contractor board, and the full asteroid belt — is on its way.
          </div>

          <div style={{
            padding: '12px 16px', borderRadius: 10,
            border: '1px solid rgba(126,200,255,0.15)',
            background: 'rgba(8,16,28,0.6)',
            fontFamily: 'var(--ln-font-mono)', fontSize: 11,
            color: '#4a6a88', letterSpacing: '0.14em', textAlign: 'center',
            textTransform: 'uppercase',
          }}>
            More missions loading · Sprint 5
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image src="/earth-day.jpg" alt="" fill style={{ objectFit: 'cover', filter: 'brightness(0.3)' }} />
      </div>
        <TopBar eyebrow={freeOperations ? 'EARTH BASE · FREE OPS' : `EARTH BASE · L${missionsDone + 1}`} title="Mission Board" onBack={onBack} />

      <div data-ui-zone={UI_ZONES.screenContent} style={{ position: 'absolute', inset: 0, paddingTop: hasCoach ? TUTORIAL_CONTENT_TOP : 72, paddingBottom: hasCoach ? 190 : 96, overflowY: 'auto' }}>
        <div style={{ padding: '0 14px 8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>
            Active Contracts · {available.length}
          </span>
          <span style={{ flex: 1 }} />
          <StatusPill kind="amber" dim>Sort · Payout</StatusPill>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              const ctr = CONTRACTORS[m.contractor]
              if (!ctr) return false
              const cr = freeOperations || m.sequence === sequence || contractorUnlocked(ctr, sequence)
              return cr && (freeOperations || available.some(item => item.id === m.id))
            })
            return list.map((m, idx) => {
            const completedToday_ = isCompletedToday(m.id)
            const cooldown = !useDailyPool && isOnCooldown(m.contractor)
            const contractor = CONTRACTORS[m.contractor]
            if (!contractor) return null
            const isStoryMission = m.tag === 'STORY'
            const contractorReady = freeOperations || m.sequence === sequence || contractorUnlocked(contractor, sequence)
            const unlocked = !completedToday_ && !cooldown && contractorReady && (freeOperations || available.some(item => item.id === m.id))
            const mTargets = compatibleTargetsFor(m, targets)
            const affinityMultiplier = isStoryMission ? 0 : contractorAffinityBonus(contractor, contractorMissions?.[contractor.id] ?? 0)
            const affinityBonus = Math.round(m.payout.francs * affinityMultiplier)
            const displayPayout = m.payout.francs + affinityBonus
            const isHighlighted = hasCoach && idx === firstValidIdx
            const cardState = completedToday_ ? 'completed' as const
              : cooldown ? 'cooldown' as const
              : !unlocked ? 'locked' as const
              : 'available' as const
            const lockedDetail = !contractorReady ? `L${contractor.unlockTier}` : m.sequence <= missionsDone ? 'Completed' : m.unlockAt
            const cooldownLabel = cooldown ? formatCooldown(contractorCooldowns![m.contractor] - now) : undefined
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
                onPick={() => onPick(m.id)}
              />
            )
          })
        })()}
        </div>

        {freeOperations && <AffinityAdvancedSection contractors={catalog.contractors} contractorMissions={contractorMissions} />}
      </div>
    </div>
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
    <div style={{ padding: '0 14px', marginTop: 24, marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#6b7fa3', textTransform: 'uppercase', marginBottom: 8 }}>
        Advanced Ops · Affinity Unlock
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {advancedContractors.map(contractor => {
          const done = contractorMissions?.[contractor.id] ?? 0
          const unlocked = done >= CONTRACTOR_AFFINITY_MISSION_THRESHOLD
          const pct = Math.min(100, (done / CONTRACTOR_AFFINITY_MISSION_THRESHOLD) * 100)
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
                  <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#6b7fa3', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                    {uniqueTags.join(' · ')} MISSIONS AVAILABLE AT {CONTRACTOR_AFFINITY_MISSION_THRESHOLD} OPS
                  </div>
                </div>
              </div>
              {!unlocked && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: `${contractor.color}22`, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: contractor.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, color: '#6b7fa3', marginTop: 4, letterSpacing: '0.12em' }}>
                    {CONTRACTOR_AFFINITY_MISSION_THRESHOLD - done} more operation{CONTRACTOR_AFFINITY_MISSION_THRESHOLD - done !== 1 ? 's' : ''} to unlock advanced contracts
                  </div>
                </div>
              )}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
