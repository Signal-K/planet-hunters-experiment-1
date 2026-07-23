export function formatFrancs(value: number, options: { compact?: boolean } = {}): string {
  if (options.compact && value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (options.compact && value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`
  return value.toLocaleString()
}

export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return '00:00'
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${formatCountdownUnit(minutes)}:${formatCountdownUnit(seconds)}`
}

export function formatCountdownUnit(value: number): string {
  return String(value).padStart(2, '0')
}
