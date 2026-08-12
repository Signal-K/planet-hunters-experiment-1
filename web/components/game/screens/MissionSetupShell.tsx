'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import StepFooter, { type MissionFlowStep } from '@/components/game/StepFooter'
import { UI_ZONES } from '@/lib/ui-zones'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'

type DivProps = React.ComponentPropsWithoutRef<'div'>

export function MissionSetupFrame({ className, ...props }: DivProps) {
  return (
    <div
      className={['mission-setup-frame', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

interface MissionSetupCardProps extends DivProps {
  scrollClassName?: string
  scrollStyle?: React.CSSProperties
}

export function MissionSetupCard({
  children,
  className,
  scrollClassName,
  scrollStyle,
  ...props
}: MissionSetupCardProps) {
  return (
    <div
      className={['mission-setup-card', className].filter(Boolean).join(' ')}
      {...props}
    >
      <div
        className={['mission-setup-card-scroll', scrollClassName].filter(Boolean).join(' ')}
        style={scrollStyle}
      >
        {children}
      </div>
    </div>
  )
}

interface MissionSetupShellBaseProps {
  eyebrow: string
  title: string
  className?: string
  onBack: () => void
  hasCoach?: boolean
  coachManual?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
  hideStepFooter?: boolean
  contentBottom?: number
}

// Wayfinding footer (Craft doc Core Principle #1) — "what to do next"
// shown above the CTA. Keeping step + description as a discriminated pair
// prevents half-configured footers from silently disappearing.
type MissionSetupShellWayfindingProps =
  | { step: MissionFlowStep; stepDescription: string }
  | { step?: never; stepDescription?: never }

type MissionSetupShellProps = MissionSetupShellBaseProps & MissionSetupShellWayfindingProps

export default function MissionSetupShell({
  eyebrow,
  title,
  className,
  onBack,
  hasCoach,
  coachManual,
  children,
  actions,
  hideStepFooter = false,
  contentBottom,
  step,
  stepDescription,
}: MissionSetupShellProps) {
  const contentTop = hasCoach ? (coachManual ? 248 : TUTORIAL_CONTENT_TOP) : 82

  return (
    <div className={['game-screen', 'mission-setup-screen', className].filter(Boolean).join(' ')}>
      <TopBar eyebrow={eyebrow} title={title} onBack={onBack} />
      <div
        className="mission-setup-content"
        data-ui-zone={UI_ZONES.screenContent}
        style={{ paddingTop: contentTop, ...(contentBottom ? { paddingBottom: contentBottom } : {}) }}
      >
        {children}
      </div>
      {(step || actions) && (
        <div className="sticky-actions mission-setup-actions" data-ui-zone={UI_ZONES.bottomActions}>
          {step && !hideStepFooter && (
            <div style={{ marginBottom: 10 }}>
              <StepFooter step={step} description={stepDescription} inline />
            </div>
          )}
          {actions}
        </div>
      )}
    </div>
  )
}
