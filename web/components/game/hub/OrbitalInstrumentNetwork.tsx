'use client'

interface OrbitalInstrumentNetworkProps {
  transitOnline: boolean
  deepSpaceOnline: boolean
  readyCount: number
  onOpen?: () => void
  ping?: boolean
}

export function OrbitalInstrumentNetwork({
  transitOnline,
  deepSpaceOnline,
  readyCount,
  onOpen,
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
