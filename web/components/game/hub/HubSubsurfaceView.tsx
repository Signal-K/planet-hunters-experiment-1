'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Boxes,
  Dumbbell,
  Hammer,
  LockKeyhole,
  PackageOpen,
  Shovel,
  Warehouse,
} from 'lucide-react'
import {
  CUSTOMIZER_PARTS,
  MINERAL_META,
  MINERAL_SILO_CAPACITY,
  SUBSURFACE_EXCAVATE_COST,
  SUBSURFACE_ROOMS,
  canAffordSubsurface,
  type InstalledCustomizerPartsByKind,
  type SubsurfaceRoomDefinition,
  type SubsurfaceRoomId,
} from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { PrimaryBtn } from '@/components/ui/Button'
import styles from './HubSubsurfaceView.module.css'

interface HubSubsurfaceViewProps {
  stash?: Record<string, number>
  installedParts?: InstalledCustomizerPartsByKind
  trainingEnabled?: boolean
  francs?: number
  subsurfaceExcavated?: boolean
  subsurfaceBuilt?: string[]
  onExcavate?: () => void
  onBuildRoom?: (roomId: SubsurfaceRoomId) => void
}

interface StoredMineral {
  id: string
  amount: number
  name: string
  symbol: string
  color: string
  rarity: string
}

interface RegisteredPart {
  id: string
  name: string
  kind: string
}

export function storedMinerals(stash: Record<string, number> = {}): StoredMineral[] {
  return Object.entries(stash)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => {
      const meta = MINERAL_META[id]
      return {
        id,
        amount,
        name: meta?.name ?? id,
        symbol: meta?.sym ?? id.slice(0, 2).toUpperCase(),
        color: meta?.color ?? 'var(--ln-text-muted)',
        rarity: meta?.rarity ?? 'unclassified',
      }
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
}

export function registeredParts(
  installedParts: InstalledCustomizerPartsByKind = {},
): RegisteredPart[] {
  return Object.entries(installedParts)
    .flatMap(([kind, partId]) => {
      if (!partId) return []
      const part = CUSTOMIZER_PARTS.find(candidate => candidate.id === partId)
      return [{
        id: partId,
        name: part?.name ?? partId,
        kind: part?.kind ?? kind,
      }]
    })
    .sort((a, b) => a.kind.localeCompare(b.kind))
}

function formatRoomCost(room: SubsurfaceRoomDefinition | { cost: number; costMaterials: Record<string, number> }): string {
  const mineralCost = Object.entries(room.costMaterials)
    .map(([mineral, amount]) => `${amount} ${mineral}`)
    .join(' · ')
  const francs = formatCurrency(room.cost)
  return mineralCost ? `${francs} · ${mineralCost}` : francs
}

function RoomScene({
  id,
  minerals,
  parts,
  trainingEnabled,
}: {
  id: SubsurfaceRoomId
  minerals: StoredMineral[]
  parts: RegisteredPart[]
  trainingEnabled: boolean
}) {
  if (id === 'mineral-vault') {
    const displayedMinerals = minerals.slice(0, 4)
    return (
      <div className={styles.roomScene} aria-hidden="true">
        <div className={styles.roomCeiling}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.vaultCrane}><i /></div>
        <div className={styles.oreBins}>
          {Array.from({ length: 4 }, (_, index) => {
            const mineral = displayedMinerals[index]
            return (
              <span
                className={styles.oreBin}
                key={mineral?.id ?? index}
                style={mineral
                  ? { '--stored-mineral': mineral.color } as React.CSSProperties
                  : undefined}
              >
                <b>{mineral?.symbol ?? '—'}</b>
                <i>{mineral ? `${mineral.amount} U` : 'EMPTY'}</i>
              </span>
            )
          })}
        </div>
        <div className={styles.sceneFloorRail} />
      </div>
    )
  }
  if (id === 'parts-locker') {
    const displayedParts = parts.slice(0, 6)
    return (
      <div className={styles.roomScene} aria-hidden="true">
        <div className={styles.roomCeiling}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.rack}>
          {Array.from({ length: 6 }, (_, index) => {
            const part = displayedParts[index]
            return (
              <span className={styles.rackCell} key={part?.id ?? index}>
                <i className={styles.partCrate} />
                <b>{part ? part.kind.slice(0, 3).toUpperCase() : 'OPEN'}</b>
              </span>
            )
          })}
        </div>
        <div className={styles.sceneFloorRail} />
      </div>
    )
  }
  return (
    <div className={`${styles.roomScene} ${styles.trainingScene}`} aria-hidden="true">
      <div className={styles.roomCeiling}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.habitat}>
        <span className={styles.habitatWindow}>
          <i />
          <i />
        </span>
        <span className={styles.airlockWheel} />
      </div>
      <div className={styles.trainingSeal}>
        {trainingEnabled ? 'TRAINING DECK ONLINE' : 'BAY SEALED · COMING SOON'}
      </div>
      <div className={styles.sceneFloorRail} />
    </div>
  )
}

function UnbuiltRoomScene({ room }: { room: SubsurfaceRoomDefinition }) {
  return (
    <div className={styles.roomScene} aria-hidden="true">
      <div className={styles.roomCeiling}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.emptyState} style={{ minHeight: 0, border: 'none', padding: 0 }}>
        <div>
          <Hammer size={26} strokeWidth={1.8} />
          <div className={styles.emptyLabel}>UNBUILT · {formatRoomCost(room)}</div>
        </div>
      </div>
      <div className={styles.sceneFloorRail} />
    </div>
  )
}

function RoomIcon({ id, size = 18 }: { id: SubsurfaceRoomId; size?: number }) {
  if (id === 'mineral-vault') return <Warehouse size={size} strokeWidth={2} />
  if (id === 'parts-locker') return <Boxes size={size} strokeWidth={2} />
  return <Dumbbell size={size} strokeWidth={2} />
}

function StorageSilo({ minerals, capacity }: { minerals: StoredMineral[]; capacity: number }) {
  const totalUnits = minerals.reduce((sum, mineral) => sum + mineral.amount, 0)
  const filledPct = capacity > 0 ? Math.min(100, (totalUnits / capacity) * 100) : 0
  const full = totalUnits >= capacity
  return (
    <div className={styles.siloRack} data-testid="subsurface-storage-silo">
      <div className={styles.silo}>
        <div className={styles.siloFill} style={{ height: `${filledPct}%` }}>
          {minerals.map(mineral => (
            <span
              key={mineral.id}
              className={styles.siloSeg}
              title={`${mineral.name} · ${mineral.amount} U`}
              style={{
                flexGrow: mineral.amount,
                '--seg-color': mineral.color,
              } as React.CSSProperties}
            />
          ))}
        </div>
        {[25, 50, 75].map(tick => (
          <i key={tick} className={styles.siloTick} style={{ bottom: `${tick}%` }} />
        ))}
      </div>
      <div className={styles.siloReadout}>
        <div className={styles.siloReadValue}>
          {totalUnits}<span>/ {capacity} U</span>
        </div>
        <div className={`${styles.siloReadState} ${full ? styles.siloReadStateFull : ''}`}>
          {full ? 'Silo full' : `${Math.round(filledPct)}% full · Silo 01`}
        </div>
        <p className={styles.siloReadCopy}>
          One silo, filling by mineral. Overflow past capacity is sold on return.
        </p>
      </div>
    </div>
  )
}

function MineralVault({ minerals, capacity }: { minerals: StoredMineral[]; capacity: number }) {
  const totalUnits = minerals.reduce((sum, mineral) => sum + mineral.amount, 0)
  return (
    <div className={styles.detailPanel} data-testid="subsurface-mineral-vault">
      <div className={styles.detailSummary}>
        <div>
          <div className={styles.metricValue}>{totalUnits}</div>
          <div className={styles.metricLabel}>Units in secure storage</div>
          <p className={styles.summaryCopy}>
            Ore you keep sits in the silo until you sell it at the Commodity
            Exchange or spend it on your own builds. Selling later, when prices
            are up, beats the fixed payout for auto-selling on return.
          </p>
        </div>
        <span className={styles.status}>{minerals.length} species catalogued</span>
      </div>
      <StorageSilo minerals={minerals} capacity={capacity} />
      <div className={styles.inventoryList}>
        {minerals.length > 0 ? minerals.map(mineral => (
          <div className={styles.inventoryRow} key={mineral.id}>
            <span
              className={styles.mineralMark}
              style={{ '--mineral-color': mineral.color } as React.CSSProperties}
            >
              {mineral.symbol}
            </span>
            <div>
              <div className={styles.inventoryName}>{mineral.name}</div>
              <div className={styles.inventoryMeta}>{mineral.rarity} · Vaulted ore</div>
            </div>
            <span className={styles.inventoryAmount}>{mineral.amount} U</span>
          </div>
        )) : (
          <div className={styles.emptyState}>
            <div>
              <Warehouse size={32} strokeWidth={1.8} />
              <div className={styles.emptyLabel}>No minerals stored</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PartsLocker({ parts }: { parts: RegisteredPart[] }) {
  return (
    <div className={styles.detailPanel} data-testid="subsurface-parts-locker">
      <div className={styles.detailSummary}>
        <div>
          <div className={styles.metricValue}>{parts.length}</div>
          <div className={styles.metricLabel}>Components in registry</div>
          <p className={styles.summaryCopy}>
            The underground stores mirror the active Hangar loadout. Hardware
            stays identified by room type so later storage and swap operations
            can extend this registry without changing the scene.
          </p>
        </div>
        <span className={styles.status}>{parts.length > 0 ? 'Registry online' : 'Racks available'}</span>
      </div>
      <div className={styles.partsList}>
        {parts.length > 0 ? parts.map(part => (
          <div className={styles.partRow} key={`${part.kind}-${part.id}`}>
            <span className={styles.partKind}><PackageOpen size={17} strokeWidth={2} /></span>
            <div>
              <div className={styles.partName}>{part.name}</div>
              <div className={styles.partMeta}>{part.kind.replaceAll('-', ' ')} module</div>
            </div>
            <span className={styles.partStatus}>In service</span>
          </div>
        )) : (
          <div className={styles.emptyState}>
            <div>
              <Boxes size={32} strokeWidth={1.8} />
              <div className={styles.emptyLabel}>No hardware registered</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HabitatTraining({ enabled }: { enabled: boolean }) {
  return (
    <div className={styles.trainingPanel} data-testid="subsurface-habitat-training">
      <div>
        <span className={styles.trainingLock}>
          {enabled
            ? <Dumbbell size={28} strokeWidth={1.8} />
            : <LockKeyhole size={28} strokeWidth={1.8} />}
        </span>
        <h2 className={styles.trainingTitle}>Habitat Training</h2>
        <p className={styles.trainingCopy}>
          {enabled
            ? 'Feature flag enabled. The below-soil habitat scene is ready for the astronaut-training workflow to be connected.'
            : 'Specialised astronaut rehearsals for enclosed habitats are planned here. Training mechanics remain offline while storage operations ship first.'}
        </p>
        <div className={styles.trainingStatus}>
          {enabled ? 'Feature flag enabled' : 'Coming soon · Feature gated'}
        </div>
      </div>
    </div>
  )
}

function RoomBuildPrompt({
  room,
  francs,
  stash,
  onBuild,
}: {
  room: SubsurfaceRoomDefinition
  francs: number
  stash?: Record<string, number>
  onBuild?: (roomId: SubsurfaceRoomId) => void
}) {
  const affordable = canAffordSubsurface(room, { francs, stash })
  return (
    <div className={styles.trainingPanel} data-testid={`subsurface-room-build-${room.id}`}>
      <div>
        <span className={styles.trainingLock}>
          <Hammer size={28} strokeWidth={1.8} />
        </span>
        <h2 className={styles.trainingTitle}>{room.name} unbuilt</h2>
        <p className={styles.trainingCopy}>{room.description}</p>
        <p className={styles.trainingCopy}>
          Construction cost: <strong>{formatRoomCost(room)}</strong>
        </p>
        <div style={{ marginTop: 24, maxWidth: 320, marginInline: 'auto' }}>
          <PrimaryBtn
            testId={`subsurface-build-${room.id}`}
            onClick={() => onBuild?.(room.id)}
            disabled={!affordable}
          >
            Build {room.name}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

function ExcavatePrompt({
  francs,
  stash,
  onExcavate,
}: {
  francs: number
  stash?: Record<string, number>
  onExcavate?: () => void
}) {
  const affordable = canAffordSubsurface(SUBSURFACE_EXCAVATE_COST, { francs, stash })
  return (
    <div className={styles.trainingPanel} data-testid="subsurface-excavate-prompt">
      <div>
        <span className={styles.trainingLock}>
          <Shovel size={28} strokeWidth={1.8} />
        </span>
        <h2 className={styles.trainingTitle}>Below-grade area unexcavated</h2>
        <p className={styles.trainingCopy}>
          Earth Base only holds so much surface plot — the agency&apos;s
          buildable footprint above ground is fixed. Excavating this deck
          opens space below the soil for storage and habitat facilities
          without needing more land on the surface.
        </p>
        <p className={styles.trainingCopy}>
          Excavation cost: <strong>{formatRoomCost(SUBSURFACE_EXCAVATE_COST)}</strong>
        </p>
        <div style={{ marginTop: 24, maxWidth: 320, marginInline: 'auto' }}>
          <PrimaryBtn
            testId="subsurface-excavate-cta"
            onClick={onExcavate}
            disabled={!affordable}
          >
            Excavate deck
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

export function HubSubsurfaceView({
  stash,
  installedParts,
  trainingEnabled = false,
  francs = 0,
  subsurfaceExcavated = false,
  subsurfaceBuilt = [],
  onExcavate,
  onBuildRoom,
}: HubSubsurfaceViewProps) {
  const [activeRoom, setActiveRoom] = useState<SubsurfaceRoomId | null>(null)
  const minerals = storedMinerals(stash)
  const parts = registeredParts(installedParts)
  const totalMineralUnits = minerals.reduce((sum, mineral) => sum + mineral.amount, 0)
  const activeDefinition = SUBSURFACE_ROOMS.find(room => room.id === activeRoom)
  const builtSet = new Set(subsurfaceBuilt)

  const roomMetric = (room: SubsurfaceRoomDefinition, locked: boolean, built: boolean) => {
    if (locked) return trainingEnabled ? 'FLAG ON' : 'LOCKED'
    if (!built) return formatRoomCost(room)
    if (room.id === 'mineral-vault') return `${totalMineralUnits} U`
    if (room.id === 'parts-locker') return `${parts.length} PARTS`
    return trainingEnabled ? 'FLAG ON' : 'LOCKED'
  }

  return (
    <section className={styles.root} data-testid="hub-subsurface-view" aria-label="Earth Base subsurface">
      <div className={styles.geology} aria-hidden="true">
        <span className={styles.surfaceCap} data-testid="subsurface-surface-continuation" />
        <span className={styles.crust} />
        <span className={`${styles.stratum} ${styles.stratumOne}`} />
        <span className={`${styles.stratum} ${styles.stratumTwo}`} />
        <span className={styles.serviceShaft} />
        <div className={styles.depthRail}>
          {[0, 25, 50, 75, 100].map(depth => (
            <span key={depth}>
              <i className={styles.depthTick} style={{ top: `${depth}%` }} />
              <b className={styles.depthLabel} style={{ top: `${depth}%` }}>{depth * 4}M</b>
            </span>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {!subsurfaceExcavated ? (
          <div className={styles.detailView}>
            <div className={styles.deckHeader}>
              <div>
                <div className={styles.eyebrow}>SUBSURFACE LEVEL 01 · 24 M BELOW GRADE</div>
                <h2 className={styles.deckTitle}>Unexcavated</h2>
              </div>
            </div>
            <ExcavatePrompt francs={francs} stash={stash} onExcavate={onExcavate} />
          </div>
        ) : activeRoom && activeDefinition ? (
          <div className={styles.detailView}>
            <div className={styles.detailHeader}>
              <button
                className={styles.backButton}
                data-testid="subsurface-room-back"
                onClick={() => setActiveRoom(null)}
              >
                <span className={styles.backIcon}><ArrowLeft size={16} strokeWidth={2} /></span>
                Deck
              </button>
              <div className={styles.detailCopy}>
                <div className={styles.eyebrow}>{activeDefinition.eyebrow}</div>
                <h2 className={styles.detailTitle}>{activeDefinition.name}</h2>
              </div>
            </div>
            {activeRoom === 'habitat-training' ? (
              <HabitatTraining enabled={trainingEnabled} />
            ) : !builtSet.has(activeRoom) ? (
              <RoomBuildPrompt room={activeDefinition} francs={francs} stash={stash} onBuild={onBuildRoom} />
            ) : activeRoom === 'mineral-vault' ? (
              <MineralVault minerals={minerals} capacity={MINERAL_SILO_CAPACITY} />
            ) : (
              <PartsLocker parts={parts} />
            )}
          </div>
        ) : (
          <>
            <div className={styles.deckHeader}>
              <div>
                <div className={styles.eyebrow}>SUBSURFACE LEVEL 01 · 24 M BELOW GRADE</div>
                <h2 className={styles.deckTitle}>Storage &amp; habitat deck</h2>
              </div>
              <div className={styles.deckSummary}>
                {totalMineralUnits} mineral units · {parts.length} registered parts
              </div>
            </div>
            <div className={styles.facilityShell} data-testid="subsurface-facility-cutaway">
              <div className={styles.utilityTrunk} aria-hidden="true">
                <span />
                <span />
                <span />
                <b>EARTH BASE · BELOW-SOIL SERVICE TRUNK</b>
              </div>
              <div className={styles.roomGrid}>
                {SUBSURFACE_ROOMS.map((room, index) => {
                  const locked = room.id === 'habitat-training' && !trainingEnabled
                  const built = builtSet.has(room.id)
                  return (
                    <button
                      className={`${styles.roomCard} ${locked ? styles.roomCardLocked : ''}`}
                      data-testid={`subsurface-room-${room.id}`}
                      key={room.id}
                      onClick={() => setActiveRoom(room.id)}
                    >
                      <div className={styles.roomCardTop}>
                        <span className={styles.roomIcon}><RoomIcon id={room.id} /></span>
                        <div>
                          <div className={styles.roomEyebrow}>{room.eyebrow}</div>
                          <div className={styles.roomName}>{room.name}</div>
                        </div>
                        <span className={styles.bayNumber}>0{index + 1}</span>
                      </div>
                      {!locked && built ? (
                        <RoomScene
                          id={room.id}
                          minerals={minerals}
                          parts={parts}
                          trainingEnabled={trainingEnabled}
                        />
                      ) : !locked ? (
                        <UnbuiltRoomScene room={room} />
                      ) : (
                        <RoomScene
                          id={room.id}
                          minerals={minerals}
                          parts={parts}
                          trainingEnabled={trainingEnabled}
                        />
                      )}
                      <p className={styles.roomDescription}>{room.description}</p>
                      <div className={styles.roomCardFooter}>
                        <span className={`${styles.status} ${locked || !built ? styles.statusLocked : ''}`}>
                          {locked ? 'Coming soon' : built ? 'Online' : 'Unbuilt'}
                        </span>
                        <span className={styles.roomMetric}>{roomMetric(room, locked, built)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className={styles.accessCorridor} aria-hidden="true">
                <span className={styles.corridorLine} />
                <span className={styles.corridorCart} />
                <b>ACCESS CORRIDOR · PRESSURE NOMINAL</b>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
