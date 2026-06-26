'use client'

import React, { useState } from 'react'
import { useGame } from '@/game-context'
import { pbShared } from '@/lib/pb'
import { UI_ZONES } from '@/lib/ui-zones'
import { DEV_GROUPS } from '@/lib/devPresets'

interface SettingsSheetProps {
  onClose: () => void
}

const IS_DEV = process.env.NODE_ENV === 'development'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
        letterSpacing: '0.22em', color: '#3fa9ff', textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid rgba(63,169,255,0.08)',
    }}>
      {children}
    </div>
  )
}

function Btn({
  label, onClick, variant = 'ghost', disabled,
}: { label: string; onClick: () => void; variant?: 'ghost' | 'danger' | 'primary'; disabled?: boolean }) {
  const colors = {
    ghost:   { bg: 'rgba(63,169,255,0.08)',  border: 'rgba(63,169,255,0.25)',  color: '#87cffa' },
    primary: { bg: 'rgba(63,169,255,0.15)',  border: 'rgba(63,169,255,0.45)',  color: '#3fa9ff' },
    danger:  { bg: 'rgba(255,59,48,0.10)',   border: 'rgba(255,59,48,0.35)',   color: '#ff6b5b' },
  }
  const c = colors[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 14px', borderRadius: 8,
        background: c.bg, border: `1px solid ${c.border}`, color: c.color,
        fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

export default function SettingsSheet({ onClose }: SettingsSheetProps) {
  const game = useGame()
  const [confirmReset, setConfirmReset] = useState(false)
  const email = pbShared.authStore.record?.email as string | undefined
  const isGuest = !email

  function handleSignOut() {
    onClose()
    game.signOut()
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return }
    onClose()
    game.resetGame()
  }

  function jumpPreset(key: string) {
    const url = new URL(window.location.href)
    url.searchParams.set('preset', key)
    window.location.href = url.toString()
  }

  return (
    <div data-ui-zone={UI_ZONES.modalOverlay} style={{ position: 'absolute', inset: 0, zIndex: 89, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.7)' }} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(180deg, #0d1c30, #060d18)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: '1px solid rgba(63,169,255,0.2)',
        padding: '18px 20px 32px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        animation: 'gate-up 360ms cubic-bezier(.16,1,.3,1)',
        maxHeight: '80dvh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#3fa9ff', textTransform: 'uppercase' }}>Landnam</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: '#e6efff', marginTop: 2 }}>Settings</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: '#5d7390', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
          }}>✕</button>
        </div>

        <Section label="Account">
          <Row>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#e6efff' }}>
                {isGuest ? 'Guest session' : email}
              </div>
              {isGuest && (
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#5d7390', marginTop: 2 }}>
                  Progress saved on this device only
                </div>
              )}
            </div>
            {!isGuest && <Btn label="Sign Out" onClick={handleSignOut} variant="ghost" />}
          </Row>
        </Section>

        <Section label="Data">
          <Row>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#e6efff' }}>Reset game</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#5d7390', marginTop: 2 }}>
                {confirmReset ? 'This will erase all progress. Tap again to confirm.' : 'Erase all local progress and start over'}
              </div>
            </div>
            <Btn
              label={confirmReset ? 'Confirm' : 'Reset'}
              onClick={handleReset}
              variant="danger"
            />
          </Row>
        </Section>

        {IS_DEV && (
          <Section label="Debug">
            <Row>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#e6efff' }}>Free Ops mode</div>
              <button
                onClick={() => game.setPlayer(p => ({ ...p, freeOperations: !p.freeOperations }))}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  background: game.player.freeOperations ? 'rgba(90,255,90,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${game.player.freeOperations ? 'rgba(90,255,90,0.35)' : 'rgba(255,255,255,0.12)'}`,
                  color: game.player.freeOperations ? '#5aff5a' : '#5d7390',
                  fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {game.player.freeOperations ? 'On' : 'Off'}
              </button>
            </Row>

            {DEV_GROUPS.map((group, gi) => (
              <div key={group.label} style={{ marginTop: gi === 0 ? 10 : 6 }}>
                <div style={{
                  fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
                  letterSpacing: '0.18em', color: group.color, textTransform: 'uppercase', marginBottom: 6,
                }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.shots.map(shot => (
                    <button
                      key={shot.key}
                      onClick={() => jumpPreset(shot.key)}
                      title={shot.hint}
                      style={{
                        padding: '5px 10px', borderRadius: 6,
                        background: '#0a1624', border: `1px solid ${group.color}44`,
                        color: group.color, fontFamily: 'var(--ln-font-display)',
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
                      }}
                    >
                      {shot.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}
