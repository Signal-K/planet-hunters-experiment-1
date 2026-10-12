'use client'

import { useState, type ComponentProps, type ReactNode } from 'react'
import ShipInteriorPreview from '@/components/game/ShipInteriorPreview'
import MarketScreen from '@/components/game/screens/MarketScreen'
import {
  MINERAL_META,
  REFINERY_RECIPES,
  SKILL_NODES,
  STRUCTURES,
  SUBSURFACE_EXCAVATE_COST,
  SUBSURFACE_ROOMS,
  canAffordStructure,
  canAffordSubsurface,
  structureUnlocked,
  type InstalledCustomizerPartsByKind,
  type SubsurfaceRoomId,
} from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import { structureBuildMs } from '@/lib/systems/HubConstructionSystem'
import { captureGameEvent } from '@/lib/posthog'
import styles from './BaseOverlay.module.css'

export type BaseOverlayId = 'launchpad' | 'hangar' | 'silo' | 'exchange' | 'build' | 'refinery' | 'skills' | 'operation'

const SPRITE: Record<string, string> = {
  launchpad: '/game/assets/base/kit/starter-pad.png',
  'surface-silo': '/game/assets/base/kit/starter-silo.png',
  'astronaut-academy': '/game/assets/base/kit/starter-cabin.png',
}

export interface BuildPlayer {
  francs: number
  stash?: Record<string, number>
  placed: string[]
  freeOperations: boolean
  refineryUnlocked?: boolean
  academyResearched?: boolean
  missionsDone?: number
  hasMiningSettlement?: boolean
}

interface BaseOverlayProps {
  id: BaseOverlayId
  anchorLeft: string
  onClose: () => void
  onOpen: (id: BaseOverlayId) => void
  onCreateMission?: () => void
  onResumeMission?: () => void
  onScrubMission?: () => void
  onOpenStation?: () => void
  missionLabel?: string
  francs: number
  stash?: Record<string, number>
  subsurfaceExcavated?: boolean
  subsurfaceBuilt?: string[]
  onExcavate?: () => void
  onBuildRoom?: (roomId: SubsurfaceRoomId) => void
  buildPlayer?: BuildPlayer
  buildCell: number | null
  buildKind: string | null
  onPickKind: (id: string) => void
  onConfirmBuild: () => void
  exchange?: ComponentProps<typeof MarketScreen> | null
  hangar?: {
    francs: number
    missionsDone: number
    installed: InstalledCustomizerPartsByKind
    crewModuleResearched?: boolean
    landingResearched?: boolean
    onConfirm?: (installed: InstalledCustomizerPartsByKind, prev: InstalledCustomizerPartsByKind) => boolean
  } | null
  refinery?: {
    queue: { recipeId: string; startedAt: number; durationMs?: number }[]
    refinedGoods: Record<string, number>
    onStart: (recipeId: string) => void
    onCollect: (recipeId: string) => void
  } | null
  skills?: {
    points: number
    unlocked: string[]
    onUnlock: (id: string) => void
  } | null
  onMissions?: () => void
}

function Card({ title, kicker, onClose, testId, children }: { title: string; kicker?: string; onClose: () => void; testId?: string; children: ReactNode }) {
  return (
    <section className={styles.card} data-testid={testId ?? 'structure-overlay'} aria-label={title}>
      <div className={styles.head}>
        <div>
          {kicker && <p className={styles.kicker}>{kicker}</p>}
          <h2 className={styles.title}>{title}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>Close</button>
      </div>
      {children}
    </section>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}

export function BaseOverlay(props: BaseOverlayProps) {
  const [fitOpen, setFitOpen] = useState(false)
  // Sit in the sky, clamped on screen, so the structure and its plot stay visible on the ground.
  const place = (left: string) => ({
    top: '72px',
    left: `clamp(16px, calc(${left} - min(180px, 50vw - 16px)), calc(100% - min(360px, 100% - 32px) - 16px))`,
    width: 'min(360px, calc(100% - 32px))',
  })

  if (props.id === 'exchange' && props.exchange) {
    return (
      <div className={styles.anchor} style={place(props.anchorLeft)} data-testid="structure-overlay" data-overlay="exchange">
        <MarketScreen {...props.exchange} presentation="card" onBack={props.onClose} />
      </div>
    )
  }

  if (props.id === 'build' && props.buildPlayer) {
    const player = props.buildPlayer
    const catalog = STRUCTURES.filter(structure => structure.id !== 'astronaut-academy' && !player.placed.includes(structure.id))
    const unlockOpts = {
      refineryUnlocked: player.refineryUnlocked,
      academyResearched: player.academyResearched,
      placed: player.placed,
      freeOperations: player.freeOperations,
      missionsDone: player.missionsDone,
      hasMiningSettlement: player.hasMiningSettlement,
    }
    return (
      <section className={styles.tray} data-overlay="build" data-testid="structure-overlay" aria-label="Choose a structure">
        <div className={styles.picks} data-testid="build-structure-strip">
          {catalog.map(structure => {
            const unlocked = structureUnlocked(structure, unlockOpts)
            const affordable = canAffordStructure(structure, { francs: player.francs, stash: player.stash })
            return (
              <button
                key={structure.id}
                type="button"
                className={styles.pick}
                data-on={props.buildKind === structure.id}
                data-testid={`build-structure-card-${structure.id}`}
                disabled={!unlocked || !affordable}
                onClick={() => props.onPickKind(structure.id)}
              >
                <img src={SPRITE[structure.id] ?? SPRITE.launchpad} alt="" />
                <span>
                  {structure.name}
                  <small>{!unlocked ? structure.unlocksAt : structure.cost === 0 ? 'Free' : formatCurrency(structure.cost, { compact: true })}</small>
                </span>
              </button>
            )
          })}
        </div>
        <div className={styles.trayFoot}>
          <p className={styles.note}>
            {props.buildKind && props.buildCell != null
              ? `On the highlighted plot. Finishes in ${Math.round(structureBuildMs(props.buildKind) / 1000)}s.`
              : 'Pick a structure, then a free plot.'}
          </p>
          <button type="button" className={styles.close} onClick={props.onClose}>Close</button>
          <button type="button" className={styles.confirm} data-testid="build-place-confirm" data-beacon={props.buildCell != null ? 'build-confirm' : undefined} disabled={props.buildCell == null || !props.buildKind} onClick={props.onConfirmBuild}>
            Confirm
          </button>
        </div>
      </section>
    )
  }

  if (fitOpen && props.hangar) {
    const hangar = props.hangar
    return (
      <div className={styles.fit} data-testid="hangar-customizer-overlay">
        <ShipInteriorPreview
          rocketId="explorer"
          startingFrancs={hangar.francs}
          missionsDone={hangar.missionsDone}
          installedParts={hangar.installed}
          crewModuleResearched={hangar.crewModuleResearched}
          landingResearched={hangar.landingResearched}
          onConfirm={hangar.onConfirm ? (installed, prev) => {
            const ok = hangar.onConfirm?.(installed, prev) ?? false
            captureGameEvent('hangar_customizer_build_confirmed', { success: ok })
            return ok
          } : undefined}
          onClose={() => setFitOpen(false)}
        />
      </div>
    )
  }

  const frame = (title: string, body: ReactNode, testId?: string) => (
    <div className={styles.anchor} style={place(props.anchorLeft)} data-overlay={props.id}>
      <Card title={title} onClose={props.onClose} testId={testId}>{body}</Card>
    </div>
  )

  if (props.id === 'launchpad') {
    return frame('Launchpad', (
      <Actions>
        <button type="button" className={styles.action} data-testid="launchpad-new-mission-btn" onClick={props.onCreateMission}>Create a mission</button>
        <button type="button" className={styles.action} data-testid="launchpad-new-mission-mining-btn" onClick={props.onCreateMission}>Mine on your own</button>
        <button type="button" className={styles.action} data-testid="launchpad-new-mission-contracts-btn" onClick={props.onCreateMission}>Client contracts</button>
        <button type="button" className={styles.action} data-testid="launchpad-new-mission-build-btn" onClick={() => props.onOpen('build')}>Build a structure</button>
        <button type="button" className={styles.action} data-testid="launchpad-new-mission-market-btn" onClick={() => props.onOpen('exchange')}>Open the Exchange</button>
        <button type="button" className={styles.action} data-testid="launchpad-new-mission-control-station-btn" onClick={props.onOpenStation}>Open the station</button>
        {props.onResumeMission && <button type="button" className={styles.action} data-testid="launchpad-resume-mission-btn" onClick={props.onResumeMission}>Resume {props.missionLabel ?? 'mission'}</button>}
        {props.onScrubMission && <button type="button" className={styles.action} data-testid="launchpad-scrub-run" onClick={props.onScrubMission}>Scrub the run</button>}
      </Actions>
    ), 'launchpad-focus-screen')
  }

  if (props.id === 'hangar') {
    return frame('Hangar', (
      <Actions>
        <button type="button" className={styles.action} data-testid="open-ship-customizer" onClick={() => { captureGameEvent('hangar_customizer_opened'); setFitOpen(true) }}>Fit the ship</button>
        <button type="button" className={styles.action} onClick={() => props.onOpen('launchpad')}>Back to the pad</button>
      </Actions>
    ))
  }

  if (props.id === 'silo') {
    const held = Object.entries(props.stash ?? {}).filter(([, amount]) => amount > 0)
    const used = held.reduce((sum, [, amount]) => sum + amount, 0)
    const excavated = !!props.subsurfaceExcavated
    const built = new Set(props.subsurfaceBuilt ?? [])
    return frame('Silo', (
      <>
        <p className={styles.note}>{used} U stored in the lift.</p>
        {held.length > 0 && (
          <ul className={styles.actions}>
            {held.slice(0, 6).map(([id, amount]) => (
              <li key={id} className={styles.note}>{MINERAL_META[id]?.name ?? id} · {amount}</li>
            ))}
          </ul>
        )}
        <Actions>
          {!excavated && (
            <button type="button" className={styles.action} data-testid="subsurface-excavate-cta" disabled={!canAffordSubsurface(SUBSURFACE_EXCAVATE_COST, { francs: props.francs, stash: props.stash })} onClick={props.onExcavate}>
              Excavate
            </button>
          )}
          {excavated && SUBSURFACE_ROOMS.filter(room => !built.has(room.id)).map(room => (
            <button key={room.id} type="button" className={styles.action} disabled={!canAffordSubsurface(room, { francs: props.francs, stash: props.stash })} onClick={() => props.onBuildRoom?.(room.id)}>
              Build {room.name}
            </button>
          ))}
        </Actions>
      </>
    ))
  }

  if (props.id === 'refinery' && props.refinery) {
    const running = props.refinery.queue[0]
    const recipe = running ? REFINERY_RECIPES.find(item => item.id === running.recipeId) : null
    const done = recipe ? Date.now() - running.startedAt >= (running.durationMs ?? recipe.time * 1000) : false
    return frame('Ore processing', (
      <Actions>
        {recipe && <p className={styles.note}>{recipe.name} · {done ? 'Ready to collect' : 'Running'}</p>}
        {recipe && done && <button type="button" className={styles.action} data-testid="refinery-collect-btn" onClick={() => props.refinery?.onCollect(running.recipeId)}>Collect {recipe.name}</button>}
        {REFINERY_RECIPES.map(item => (
          <button key={item.id} type="button" className={styles.action} disabled={!!running} onClick={() => props.refinery?.onStart(item.id)}>{item.name}</button>
        ))}
      </Actions>
    ))
  }

  if (props.id === 'skills' && props.skills) {
    return frame('Research', (
      <>
        <p className={styles.note}>{props.skills.points} points ready.</p>
        <Actions>
          {SKILL_NODES.map(node => {
            const unlocked = props.skills?.unlocked.includes(node.id)
            return (
              <button key={node.id} type="button" className={styles.action} disabled={!!unlocked || (props.skills?.points ?? 0) < node.cost} onClick={() => props.skills?.onUnlock(node.id)}>
                {unlocked ? `${node.name} installed` : node.name}
              </button>
            )
          })}
        </Actions>
      </>
    ))
  }

  if (props.id === 'operation') {
    return frame('This launch', (
      <Actions>
        <button type="button" className={styles.action} onClick={props.onMissions}>Choose mining</button>
        <button type="button" className={styles.action} onClick={() => props.onOpen('build')}>Build on the base</button>
        <button type="button" className={styles.action} onClick={props.onMissions}>Browse client contracts</button>
      </Actions>
    ), 'free-ops-build-screen')
  }

  return null
}
