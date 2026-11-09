'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { useGame } from '@/game-context'
import { getLogs } from '@/lib/diagnostics-log'
import { captureGameEvent } from '@/lib/posthog'

type Game = ReturnType<typeof useGame>

interface Props {
  game: Game
  /** The report clears when this changes, so leaving the crashed screen restores the game. */
  resetKey: string
  children: ReactNode
}

interface State {
  error: Error | null
  componentStack: string
}

function facts(game: Game): Record<string, unknown> {
  const run = game.player.activeMission
  return {
    url: window.location.pathname,
    screen: game.screen,
    missionId: game.missionId ?? null,
    targetId: game.targetId ?? null,
    missionFound: !!game.mission,
    targetFound: !!game.target,
    runLabel: run?.label ?? null,
    missionPhase: game.player.missionPhase ?? null,
    cargo: JSON.stringify(game.player.miningCargoInProgress ?? null),
    laserCharges: game.player.miningLaserCharges ?? null,
    online: navigator.onLine,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  }
}

/**
 * A scene that throws used to take the whole page with it and discard the message. This keeps the
 * HUD, shows the real error, and lets the player leave the scene or discard a run that crashes it.
 */
export default class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' })
    console.error('scene crashed', error)
    try {
      captureGameEvent('scene_crashed', {
        ...facts(this.props.game),
        message: error.message.slice(0, 300),
        stack: (error.stack ?? '').split('\n').slice(0, 8).join('\n'),
      })
    } catch { /* reporting must never throw inside the boundary */ }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, componentStack: '' })
    }
  }

  private report(): string {
    const { error, componentStack } = this.state
    if (!error) return ''
    return [
      `${error.name}: ${error.message}`,
      '',
      ...Object.entries(facts(this.props.game)).map(([key, value]) => `${key}: ${String(value)}`),
      '',
      'STACK',
      ...(error.stack ?? '').split('\n').slice(0, 14),
      '',
      'COMPONENT STACK',
      ...componentStack.split('\n').filter(Boolean).slice(0, 12),
      '',
      'LOG',
      ...getLogs(),
    ].join('\n')
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const { game } = this.props
    const report = this.report()
    const button = {
      minHeight: 44, padding: '10px 20px', background: 'transparent', color: '#00e5ff',
      border: '1px solid rgba(0, 229, 255, 0.5)', borderRadius: 4, fontSize: 14, cursor: 'pointer',
    } as const
    return (
      <div role="alert" style={{
        position: 'fixed', inset: 0, zIndex: 50, overflow: 'auto', background: '#070b12',
        color: '#fff', padding: 16, fontFamily: 'ui-monospace, monospace', fontSize: 14,
      }}>
        <h1 style={{ fontSize: 18, color: '#00e5ff', margin: '0 0 8px' }}>THIS SCENE CRASHED</h1>
        <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.7)' }}>
          Your save is intact. Leave the scene, or discard the run if it crashes every time.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" style={button} onClick={() => game.go('hub')}>BACK TO BASE</button>
          {game.player.activeMission && (
            <button type="button" style={button} onClick={() => game.abandonMission({ confirmed: true, waivePenalty: true })}>
              DISCARD THIS RUN
            </button>
          )}
          <button type="button" style={button} onClick={() => { void navigator.clipboard?.writeText(report).catch(() => {}) }}>COPY LOG</button>
          <button type="button" style={button} onClick={() => window.location.reload()}>RELOAD</button>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, userSelect: 'text' }}>{report}</pre>
      </div>
    )
  }
}
