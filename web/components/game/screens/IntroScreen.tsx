'use client'

import Image from 'next/image'

interface IntroScreenProps {
  onBegin: () => void
  returning?: boolean
  missionsDone?: number
  totalEarned?: number
  awaitingRemoteState?: boolean
}

export default function IntroScreen({
  onBegin,
  returning = false,
  missionsDone = 0,
  totalEarned = 0,
  awaitingRemoteState = false,
}: IntroScreenProps) {
  return (
    <div className="game-screen intro-screen">
      <Image
        src="/earth-dusk.png"
        alt="Earth from orbit"
        fill
        className="intro-earth"
        priority
        style={{ objectFit: 'cover' }}
      />
      <div className="intro-overlay" />

      {awaitingRemoteState ? (
        <div className="intro-content">
          <div className="intro-badge">SPACE MINING OPERATIONS</div>
          <h1 className="intro-title">LANDNAM</h1>
          <p className="intro-welcome">Welcome back, Commander.</p>
          <p className="intro-subtitle">Restoring your mission data&hellip;</p>
          <div className="intro-reconnecting-indicator" aria-label="Connecting to backend">
            <span /><span /><span />
          </div>
        </div>
      ) : (
        <div className="intro-content">
          <div className="intro-badge">SPACE MINING OPERATIONS</div>
          <h1 className="intro-title">LANDNAM</h1>
          <p className="intro-welcome">{returning ? 'Welcome back, Commander.' : 'Welcome, Commander.'}</p>
          <p className="intro-subtitle">
            {returning
              ? `Missions completed: ${missionsDone} · Total earned: ₣${totalEarned.toLocaleString()}`
              : 'Build your base. Mine the asteroids. Fulfill the contract. The belt is waiting.'}
          </p>
          <button className="intro-begin-btn" onClick={onBegin} data-testid="intro-begin-btn">
            {returning ? 'RESUME OPERATIONS' : 'BEGIN OPERATIONS'}
          </button>
        </div>
      )}
    </div>
  )
}
