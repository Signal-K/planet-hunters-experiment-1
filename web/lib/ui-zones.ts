export const UI_ZONES = {
  topChrome: 'top-chrome',
  tutorialRail: 'tutorial-rail',
  screenContent: 'screen-content',
  bottomActions: 'bottom-actions',
  bottomNav: 'bottom-nav',
  toastStack: 'toast-stack',
  feedbackLauncher: 'feedback-launcher',
  ambientPrompt: 'ambient-prompt',
  statusUtility: 'status-utility',
  modalOverlay: 'modal-overlay',
} as const

export type UiZone = typeof UI_ZONES[keyof typeof UI_ZONES]

export const UI_ZONE_CONTRACT: Record<UiZone, string> = {
  [UI_ZONES.topChrome]: 'Screen header/back controls. Content starts below this zone.',
  [UI_ZONES.tutorialRail]: 'Dedicated onboarding copy rail. Gameplay controls must not overlap it.',
  [UI_ZONES.screenContent]: 'Scrollable screen-owned content. Must leave room for top chrome and bottom actions.',
  [UI_ZONES.bottomActions]: 'Screen-owned primary/secondary action strip.',
  [UI_ZONES.bottomNav]: 'Global radial navigation strip. Hidden on transactional screens.',
  [UI_ZONES.toastStack]: 'Temporary status messages. Must be pointer-light and never cover primary actions.',
  [UI_ZONES.feedbackLauncher]: 'Passive feedback affordance. Hidden while bottom action/navigation zones are in use.',
  [UI_ZONES.ambientPrompt]: 'Non-critical prompts. Only allowed on safe ambient screens such as the hub.',
  [UI_ZONES.statusUtility]: 'Non-interactive service status indicator.',
  [UI_ZONES.modalOverlay]: 'Blocking full-screen overlay that intentionally owns the whole canvas.',
}
