'use client'

interface OrbitalInstrumentNetworkProps {
  transitOnline: boolean
  deepSpaceOnline: boolean
  readyCount: number
  onOpen?: () => void
  /** With both per-telescope handlers the network is a group of controls
   * rather than one button: each owned telescope opens its own screen. */
  onOpenTransit?: () => void
  onOpenDeepSpace?: () => void
  ping?: boolean
}

export function OrbitalInstrumentNetwork({
  transitOnline,
  deepSpaceOnline,
  readyCount,
  onOpen,
  onOpenTransit,
  onOpenDeepSpace,
  ping = false,
}: OrbitalInstrumentNetworkProps) {
  const hasWork = readyCount > 0
  const primaryLabel = transitOnline ? 'TESS instrument data' : 'Deep space instrument data'
  const status = hasWork ? `${readyCount} DATA READY` : 'DATA LINKED'
  const pingMark = ping && hasWork

  const body = (
    <>
      <span className="hub-orbital-network__sky" aria-hidden="true">
        <span className="hub-orbital-network__ring hub-orbital-network__ring--outer" />
        <span className="hub-orbital-network__ring hub-orbital-network__ring--inner" />
        {pingMark && <span className="hub-orbital-network__ping" data-testid="hub-orbital-ping" />}
        <span className="hub-orbital-network__earth" />
        {transitOnline && <span className="hub-orbital-network__satellite" />}
        {deepSpaceOnline && <span className="hub-orbital-network__telescope" />}
      </span>
      <span className={`hub-orbital-network__status${hasWork ? ' hub-orbital-network__status--ready' : ''}`}>
        <span className="hub-orbital-network__dot" />
        {status}
      </span>
    </>
  )

  const className = `hub-orbital-network${hasWork ? ' hub-orbital-network--ready' : ''}`
  const label = `${primaryLabel}: ${status}`

  if (onOpenTransit || onOpenDeepSpace) {
    return (
      <div className={className} data-testid="hub-orbital-network" aria-label={label}>
        <span className="hub-orbital-network__sky">
          <span className="hub-orbital-network__ring hub-orbital-network__ring--outer" aria-hidden="true" />
          <span className="hub-orbital-network__ring hub-orbital-network__ring--inner" aria-hidden="true" />
          {pingMark && <span className="hub-orbital-network__ping" data-testid="hub-orbital-ping" aria-hidden="true" />}
          <span className="hub-orbital-network__earth" aria-hidden="true" />
          {transitOnline && <span className="hub-orbital-network__satellite" aria-hidden="true" />}
          {deepSpaceOnline && <span className="hub-orbital-network__telescope" aria-hidden="true" />}
          {transitOnline && onOpenTransit && (
            <button type="button" className="hub-orbital-network__hit hub-orbital-network__hit--transit" data-testid="hub-sky-telescope-transit" aria-label="Transit telescope: open instrument hub" onClick={onOpenTransit} />
          )}
          {deepSpaceOnline && onOpenDeepSpace && (
            <button type="button" className="hub-orbital-network__hit hub-orbital-network__hit--deep-space" data-testid="hub-sky-telescope-deep-space" aria-label="Deep space telescope: open asteroid discovery" onClick={onOpenDeepSpace} />
          )}
        </span>
        <button type="button" className={`hub-orbital-network__status${hasWork ? ' hub-orbital-network__status--ready' : ''}`} data-testid="hub-sky-instrument-status" onClick={onOpen} disabled={!onOpen}>
          <span className="hub-orbital-network__dot" />
          {status}
        </button>
      </div>
    )
  }

  if (!onOpen) {
    return (
      <div className={className} data-testid="hub-orbital-network" aria-label={label}>
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={className}
      data-testid="hub-orbital-network"
      aria-label={label}
      onClick={onOpen}
    >
      {body}
    </button>
  )
}
