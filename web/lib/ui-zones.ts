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
} as const

export type UiZone = typeof UI_ZONES[keyof typeof UI_ZONES]
