/**
 * Currency and time formatting.
 *
 * Francs are the game's only currency. Before this was centralised, the UI
 * marked francs three different ways — a `₣` prefix, a `▲` suffix, and a coin
 * icon — and `▲` did double duty as both a currency glyph and a gain/loss
 * arrow, so a cost and a payout could render identically. `formatCurrency` is
 * now the single way to render a franc amount, and direction is carried by an
 * explicit sign rather than an arrow.
 */

/** The franc mark. Never hardcode `₣` at a call site — go through here. */
export const FRANC = '₣'

const BILLION = 1_000_000_000
const MILLION = 1_000_000

export interface FrancFormatOptions {
  /** Abbreviate to `1.5B` / `250M` above a million. Use in HUD strips, cards, and summary rows. */
  compact?: boolean
}

/** Bare number, no currency mark — for places supplying their own unit label. */
export function formatFrancs(value: number, options: FrancFormatOptions = {}): string {
  if (options.compact && Math.abs(value) >= BILLION) return `${(value / BILLION).toFixed(1)}B`
  if (options.compact && Math.abs(value) >= MILLION) return `${(value / MILLION).toFixed(0)}M`
  return value.toLocaleString()
}

export interface CurrencyFormatOptions extends FrancFormatOptions {
  /** Prefix `+`/`−` to show direction. Use for deltas, never for a balance or a price. */
  signed?: boolean
}

/** A franc amount with its currency mark — `₣1.5B`, `+₣250M`, `−₣1,300`. */
export function formatCurrency(value: number, options: CurrencyFormatOptions = {}): string {
  const magnitude = `${FRANC}${formatFrancs(Math.abs(value), options)}`
  if (!options.signed) return value < 0 ? `−${magnitude}` : magnitude
  return `${value < 0 ? '−' : '+'}${magnitude}`
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
