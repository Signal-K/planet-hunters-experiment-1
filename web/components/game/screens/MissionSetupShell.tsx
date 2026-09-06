'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import { UI_ZONES } from '@/lib/ui-zones'
import { TUTORIAL_MANUAL_CONTENT_TOP } from '@/lib/tutorial-layout'

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
  sceneBackground?: React.ReactNode
  actions?: React.ReactNode
}

type MissionSetupShellProps = MissionSetupShellBaseProps

export default function MissionSetupShell({
  eyebrow,
  title,
  className,
  onBack,
  hasCoach,
  coachManual,
  children,
  sceneBackground,
  actions,
}: MissionSetupShellProps) {
  // Reserve one shared coach rail height for every mission-setup step. The
  // old action/manual split made the main frame move by 10px when the player
  // advanced through the flow, even though the content contract was the same.
  const contentTop = hasCoach ? TUTORIAL_MANUAL_CONTENT_TOP : 82

  return (
    <div className={[
      'game-screen',
      'theme-deep',
      'ln-scene-launchpad',
      'mission-setup-screen',
      'mission-setup-screen--launchpad',
      hasCoach && 'mission-setup-screen--coached',
      coachManual && 'mission-setup-screen--coach-manual',
      className,
    ].filter(Boolean).join(' ')}>
      {sceneBackground && (
        <div className="mission-setup-scene-background" aria-hidden="true">
          {sceneBackground}
        </div>
      )}
      <TopBar eyebrow={eyebrow} title={title} onBack={onBack} scene={false} />
      <div
        className="mission-setup-content"
        data-ui-zone={UI_ZONES.screenContent}
        style={{ paddingTop: contentTop }}
      >
        <div className="mission-creator-container" data-testid="mission-creator-container">
          <div className="mission-creator-body">
            {children}
          </div>
          {actions && (
            <div className="mission-creator-actions" data-ui-zone={UI_ZONES.bottomActions}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
