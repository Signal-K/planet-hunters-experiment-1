'use client'

import { rocketAssetsForId } from '@/lib/rocket-assets'
import { rocketCompositionForId } from '@/lib/data/rocket-composition'

export type RocketRoomKey = 'payload' | 'fuel' | 'engine' | 'structure'

interface RocketCutawayProps {
  rocket: import('@/lib/data').RocketModel
  activeRoom: RocketRoomKey | null
  onToggle: (room: RocketRoomKey) => void
}

interface RoomSpec {
  key: RocketRoomKey
  ariaLabel: string
  caption: string
  /** Hit-area rectangle, in percent of the 760×360 stage. */
  hit: { left: string; top: string; width: string; height: string }
  /** Leader-line anchor on the hull, in viewBox units. */
  anchor: { x: number; y: number }
  /** Caption label position, in viewBox units. */
  label: { x: number; y: number; align: 'start' | 'end' | 'middle' }
}

export default function RocketCutaway({ rocket, activeRoom, onToggle }: RocketCutawayProps) {
  const rocketAssets = rocketAssetsForId(rocket.id)
  const blueprintSrc = rocketAssets.blueprint
  const composition = rocketCompositionForId(rocket.id)
  const stage = composition.stages[0]
  const rooms: RoomSpec[] = [
    {
      key: 'payload',
      ariaLabel: 'Inspect Payload Bay',
      caption: `${composition.payload.label.toUpperCase()} · PAYLOAD`,
      hit: { left: '18%', top: '30%', width: '25%', height: '40%' },
      anchor: { x: 214, y: 108 },
      label: { x: 108, y: 40, align: 'start' },
    },
    {
      key: 'fuel',
      ariaLabel: 'Inspect Fuel Tank',
      caption: `${stage.label.toUpperCase()} · STAGE 1`,
      hit: { left: '46%', top: '34%', width: '14%', height: '32%' },
      anchor: { x: 403, y: 122 },
      label: { x: 403, y: 40, align: 'middle' },
    },
    {
      key: 'engine',
      ariaLabel: 'Inspect Engine',
      caption: stage.propulsion.toUpperCase(),
      hit: { left: '64%', top: '28%', width: '18%', height: '46%' },
      anchor: { x: 578, y: 108 },
      label: { x: 660, y: 40, align: 'end' },
    },
    {
      key: 'structure',
      ariaLabel: 'Inspect Structure Frame',
      caption: `${composition.boosters.label.toUpperCase()} · ${composition.boosters.count}X`,
      hit: { left: '18%', top: '76%', width: '64%', height: '12%' },
      anchor: { x: 380, y: 274 },
      label: { x: 380, y: 344, align: 'middle' },
    },
  ]

  // Decorative dimension figure only — not a gameplay stat, so it is derived
  // from tier rather than sourced from RocketModel (which has no length field).
  const hullLength = (9.4 + rocket.tier * 1.6).toFixed(1)

  const hitStyle = (room: RocketRoomKey, hit: RoomSpec['hit']): React.CSSProperties => {
    const active = activeRoom === room
    return {
      position: 'absolute',
      left: hit.left, top: hit.top, width: hit.width, height: hit.height,
      border: `1px dashed ${active ? 'var(--ln-bp-pink, var(--ln-cyan))' : 'transparent'}`,
      borderRadius: 6,
      background: active ? 'var(--ln-bp-blue-soft, var(--ln-cyan-soft))' : 'transparent',
      cursor: 'pointer',
      transition: 'background .15s, border-color .15s',
    }
  }

  return (
    <div className="rocket-cutaway-inspection" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div data-testid="rocket-cutaway" className="rocket-cutaway-board" style={{ position: 'relative', width: '100%', maxWidth: 760, aspectRatio: '760 / 380' }}>
        {/* The exterior render is a subdued registration silhouette behind the
            Blender cutaway, so the technical view still reads as the same
            substantial vehicle seen at the launchpad and in mining. */}
        <img className="rocket-cutaway-board__silhouette" src={rocketAssets.exterior} alt="" aria-hidden="true" />
        <svg viewBox="0 0 760 380" fill="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {/* Blender render of the same body used by the operational sprite. */}
          <image href={blueprintSrc} x="0" y="0" width="760" height="380" preserveAspectRatio="none" opacity=".96" />

          {/* Leader lines + captions, one per room. */}
          {rooms.map(room => {
            const active = activeRoom === room.key
            const stroke = active ? 'var(--ln-bp-pink, var(--ln-cyan))' : 'var(--ln-bp-ink-mute, var(--ln-text-muted))'
            return (
              <g key={room.key}>
                <circle cx={room.anchor.x} cy={room.anchor.y} r="2.5" fill={stroke} />
                <line
                  x1={room.anchor.x} y1={room.anchor.y}
                  x2={room.label.x} y2={room.label.y + (room.label.y < 180 ? 8 : -8)}
                  stroke={stroke}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text
                  x={room.label.x}
                  y={room.label.y}
                  textAnchor={room.label.align}
                  fill={active ? 'var(--ln-bp-pink, var(--ln-cyan))' : 'var(--ln-bp-ink-dim, var(--ln-text-dim))'}
                  style={{ font: `700 10px var(--ln-font-mono)`, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  {room.caption}
                </text>
              </g>
            )
          })}

          {/* Bottom dimension line + hull length figure. */}
          <line x1="92" y1="340" x2="726" y2="340" stroke="var(--ln-bp-ink-mute, var(--ln-text-muted))" strokeWidth="1" />
          <line x1="92" y1="334" x2="92" y2="346" stroke="var(--ln-bp-ink-mute, var(--ln-text-muted))" strokeWidth="1" />
          <line x1="726" y1="334" x2="726" y2="346" stroke="var(--ln-bp-ink-mute, var(--ln-text-muted))" strokeWidth="1" />
          <text x="409" y="366" textAnchor="middle" fill="var(--ln-bp-ink-dim, var(--ln-text-dim))" style={{ font: '700 10px var(--ln-font-mono)', letterSpacing: '0.08em' }}>
            L {hullLength}M
          </text>
        </svg>

        {rooms.map(room => (
          <button
            key={room.key}
            type="button"
            onClick={() => onToggle(room.key)}
            aria-label={room.ariaLabel}
            aria-pressed={activeRoom === room.key}
            style={hitStyle(room.key, room.hit)}
          />
        ))}
      </div>
      <div style={{ font: '600 10px var(--ln-font-body)', color: 'var(--ln-text-muted)', textAlign: 'center' }}>Select a room to inspect the systems it drives.</div>
      <div data-testid="rocket-composition-summary" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        <CompositionChip label="Stage" value={stage.label} />
        <CompositionChip label="Rooms" value={stage.rooms.map(room => room.label).join(' · ')} />
        <CompositionChip label="Payload" value={composition.payload.label} />
      </div>
    </div>
  )
}

function CompositionChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, padding: '7px 8px', border: '1px solid var(--ln-hairline)', background: 'var(--ln-panel)', color: 'var(--ln-text-dim)' }}>
      <div style={{ color: 'var(--ln-cyan)', font: '800 8px var(--ln-font-display)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: '700 9px var(--ln-font-body)' }}>{value}</div>
    </div>
  )
}
