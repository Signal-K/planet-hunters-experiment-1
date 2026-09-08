'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import { UI_ZONES } from '@/lib/ui-zones'
import styles from './MissionSetupShell.module.css'

type DivProps = React.ComponentPropsWithoutRef<'div'>

interface MissionSetupStepProps {
  children: React.ReactNode
  actions: React.ReactNode
  className?: string
}

export function MissionSetupStep({ children, actions, className }: MissionSetupStepProps) {
  return (
    <>
      <div className={[styles.body, 'mission-creator-body', className].filter(Boolean).join(' ')}>
        {children}
      </div>
      <div className={[styles.actions, 'mission-creator-actions'].join(' ')} data-ui-zone={UI_ZONES.bottomActions}>
        {actions}
      </div>
    </>
  )
}

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
  levelBadge?: string
  francs?: number
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
  levelBadge,
  francs,
}: MissionSetupShellProps) {
  return (
    <div className={[
      styles.shell,
      'game-screen',
      'theme-deep',
      'ln-scene-launchpad',
      'mission-setup-screen',
      'mission-setup-screen--launchpad',
      hasCoach && 'mission-setup-screen--coached',
      coachManual && 'mission-setup-screen--coach-manual',
      className,
    ].filter(Boolean).join(' ')} data-mission-setup-shell="true">
      {sceneBackground && (
        <div className="mission-setup-scene-background" aria-hidden="true">
          {sceneBackground}
        </div>
      )}
      <TopBar
        eyebrow={eyebrow}
        title={title}
        onBack={onBack}
        scene={false}
        levelBadge={levelBadge}
        francs={francs}
      />
      <div
        className={[styles.content, 'mission-setup-content'].join(' ')}
        data-ui-zone={UI_ZONES.screenContent}
      >
        <div className={[styles.container, 'mission-creator-container'].join(' ')} data-testid="mission-creator-container">
          <div className={styles.coachSlot} data-testid="mission-setup-coach-slot" aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  )
}
