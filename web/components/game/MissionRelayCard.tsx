'use client'

import { type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, RadioTower } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { MissionRelayCardModel } from '@/lib/hooks/useMissionRelayModels'
import ClientMark from '@/components/ui/ClientMark'

interface MissionRelayCardProps {
  previewModel: MissionRelayCardModel | null
  selectedIndex: number
  totalCount: number
  onPrev: () => void
  onNext: () => void
  onPick: (id: string) => void
  tutorialMissionInProgress: boolean
  missionStartBlockedLabel: string
}

/** The client-relay console itself — cycle buttons either side of the
 * instrument card, client identity, contract summary, and the Lock Contract
 * CTA. Shared by the standalone Mission Dispatch route and Launchpad's
 * embedded contract view (KES-343) so the two never drift out of sync again. */
export default function MissionRelayCard({
  previewModel,
  selectedIndex,
  totalCount,
  onPrev,
  onNext,
  onPick,
  tutorialMissionInProgress,
  missionStartBlockedLabel,
}: MissionRelayCardProps) {
  if (!previewModel) {
    return <div className="mission-relay-yard__empty">No active client signal from this location.</div>
  }
  return (
    <div className="mission-relay-yard__console" aria-live="polite">
      <button
        type="button"
        className="mission-relay-yard__cycle"
        aria-label="Previous client signal"
        onClick={onPrev}
      >
        <ChevronLeft size={24} />
      </button>
      <div
        className="mission-relay-yard__station"
        data-testid={`mission-card-${previewModel.mission.id}`}
        data-mission-id={previewModel.mission.id}
        style={{ '--relay-accent': previewModel.client?.color ?? 'var(--ln-cyan)' } as CSSProperties}
      >
        <div className="mission-relay-yard__station-label"><RadioTower size={16} /> Client relay · {String(selectedIndex + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}</div>
        <div className="mission-relay-yard__identity" data-testid={`mission-card-${previewModel.mission.id}-client-identity`}>
          <ClientMark
            initial={previewModel.client?.initial ?? 'OP'}
            color={previewModel.client?.color ?? 'var(--ln-cyan)'}
            uiRole={previewModel.client?.uiRole ?? 'starter'}
            clientId={previewModel.client?.id}
            size={64}
          />
          <div>
            <span className="mission-relay-yard__identity-label">Client signal</span>
            <strong>{previewModel.client?.name ?? 'Earth base operation'}</strong>
            <small>{previewModel.client?.projectType ?? 'Self-directed program work'}</small>
          </div>
        </div>
        <img src="/parts/comms_relay_t1.png" alt="" aria-hidden="true" />
        <div className="mission-relay-yard__contract">
          <strong>{previewModel.mission.title}</strong>
          <small>{previewModel.targetCount} reachable targets · {Object.values(previewModel.mission.requires.minerals).reduce((total, amount) => total + amount, 0)}U cargo · <b>{formatCurrency(previewModel.displayPayout, { compact: true })}</b></small>
        </div>
      </div>
      <button
        type="button"
        className="mission-relay-yard__cycle"
        aria-label="Next client signal"
        onClick={onNext}
      >
        <ChevronRight size={24} />
      </button>
      <div className="mission-relay-yard__commit">
        <p>{previewModel.mission.brief}</p>
        {previewModel.crewStatus && <span>CREW · {previewModel.crewStatus}</span>}
        <button
          type="button"
          data-testid={`mission-detail-cta-${previewModel.mission.id}`}
          data-mission-card-cta={`mission-card-${previewModel.mission.id}-cta`}
          disabled={!previewModel.unlocked || tutorialMissionInProgress}
          onClick={() => { if (!tutorialMissionInProgress) onPick(previewModel.mission.id) }}
        >
          {tutorialMissionInProgress ? missionStartBlockedLabel : `Lock contract · ${previewModel.targetCount} targets`}
        </button>
      </div>
    </div>
  )
}
