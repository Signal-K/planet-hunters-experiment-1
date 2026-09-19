/**
 * Dismissible Hub progression prompts (SSL-304). A prompt is stored as the
 * value it showed when dismissed (e.g. skill points banked), so it stays
 * hidden until that value grows past what the player already waved off.
 */
export type DismissedHubPrompts = Record<string, number>

export function isHubPromptDismissed(
  dismissed: DismissedHubPrompts | undefined,
  key: string,
  currentValue: number,
): boolean {
  const seen = dismissed?.[key]
  return typeof seen === 'number' && currentValue <= seen
}

export function dismissHubPrompt(
  dismissed: DismissedHubPrompts | undefined,
  key: string,
  currentValue: number,
): DismissedHubPrompts {
  return { ...(dismissed ?? {}), [key]: Math.max(currentValue, dismissed?.[key] ?? 0) }
}
