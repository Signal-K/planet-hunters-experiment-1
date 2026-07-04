'use client'

import React from 'react'
import TopBar from '@/components/ui/TopBar'
import { UI_ZONES } from '@/lib/ui-zones'
import { TUTORIAL_CONTENT_TOP } from '@/lib/tutorial-layout'

interface MissionSetupShellProps {
  eyebrow: string
  title: string
  onBack: () => void
  hasCoach?: boolean
  coachManual?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function MissionSetupShell({
  eyebrow,
  title,
  onBack,
  hasCoach,
  coachManual,
  children,
  actions,
}: MissionSetupShellProps) {
  const contentTop = hasCoach ? (coachManual ? 248 : TUTORIAL_CONTENT_TOP) : 82

  return (
    <div className="game-screen mission-setup-screen">
      <TopBar eyebrow={eyebrow} title={title} onBack={onBack} />
      <div
        className="mission-setup-content"
        data-ui-zone={UI_ZONES.screenContent}
        style={{ paddingTop: contentTop }}
      >
        {children}
      </div>
      {actions && (
        <div className="sticky-actions mission-setup-actions" data-ui-zone={UI_ZONES.bottomActions}>
          {actions}
        </div>
      )}
    </div>
  )
}
