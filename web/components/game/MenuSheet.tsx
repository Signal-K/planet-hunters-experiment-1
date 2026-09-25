'use client'

import React, { useState } from 'react'
import { useGame } from '@/game-context'
import { pbShared } from '@/lib/pb'
import { DEV_GROUPS } from '@/lib/devPresets'
import PageSurface from '@/components/ui/PageSurface'
import { gardenCampLabel, getSuiteHops } from '@/lib/suite-hops'
import { LAUNCHPAD_UPGRADE_COST } from '@/lib/data'
import { formatCurrency } from '@/lib/format'
import type { ShellSheet } from '@/lib/game-types'

interface MenuSheetProps {
  onClose: () => void
  /** Open another shell sheet (Friends, Community, Feedback) from the menu. */
  onOpen: (sheet: ShellSheet) => void
}

const IS_DEV = process.env.NODE_ENV === 'development'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
        letterSpacing: '0.22em', color: 'var(--ln-cyan-press)', textTransform: 'uppercase',
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
      padding: 'var(--ln-s-2) 0',
      borderBottom: '1px solid var(--ln-cyan-soft)',
    }}>
      {children}
    </div>
  )
}

function Btn({
  label, onClick, variant = 'ghost', disabled,
}: { label: string; onClick: () => void; variant?: 'ghost' | 'danger' | 'primary'; disabled?: boolean }) {
  const colors = {
    ghost:   { bg: 'var(--ln-cyan-soft)',   border: 'var(--ln-cyan-border)',      color: 'var(--ln-cyan)' },
    primary: { bg: 'var(--ln-cyan-soft)',   border: 'var(--ln-cyan-border)',      color: 'var(--ln-cyan-press)' },
    danger:  { bg: 'var(--ln-crit-soft)',   border: 'var(--ln-crimson-border)',   color: 'var(--ln-crit)' },
  }
  const c = colors[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 'var(--ln-s-2) var(--ln-s-4)', borderRadius: 8,
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

function NavRow({ label, detail, onClick, href, testId }: { label: string; detail?: string; onClick?: () => void; href?: string; testId?: string }) {
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--ln-s-3)',
    width: '100%', minHeight: 44, padding: 'var(--ln-s-2) 0',
    background: 'transparent', border: 0, borderBottom: '1px solid var(--ln-cyan-soft)',
    color: 'var(--ln-text)', textAlign: 'left', textDecoration: 'none', cursor: 'pointer',
  }
  const content = <>
    <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ln-s-1)', minWidth: 0 }}>
      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
      {detail && <span style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)' }}>{detail}</span>}
    </span>
    <span aria-hidden="true" style={{ color: 'var(--ln-cyan)', fontFamily: 'var(--ln-font-display)', fontWeight: 800 }}>{href ? '↗' : '›'}</span>
  </>
  return href
    ? <a href={href} data-testid={testId} style={style}>{content}</a>
    : <button type="button" onClick={onClick} data-testid={testId} style={style}>{content}</button>
}

export default function MenuSheet({ onClose, onOpen }: MenuSheetProps) {
  const game = useGame()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmUpgrade, setConfirmUpgrade] = useState(false)
  const suiteHops = getSuiteHops()
  const suiteChip = gardenCampLabel(!!game.authUserId)
  const canUpgradeLaunchpad = game.player.placed.includes('launchpad') && !game.player.launchpadUpgraded

  function goTo(screen: Parameters<typeof game.go>[0]) {
    onClose()
    game.go(screen)
  }

  function openSubsurface() {
    onClose()
    if (game.screen === 'hub' || game.screen === 'hub-subsurface') game.setSubsurfaceView(true)
    else game.go('hub-subsurface')
  }

  function handleUpgrade() {
    if (!confirmUpgrade) { setConfirmUpgrade(true); return }
    setConfirmUpgrade(false)
    game.upgradeLaunchpad()
  }
  const email = pbShared.authStore.record?.email as string | undefined

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
    <PageSurface
      contentStyle={{
        background: 'linear-gradient(180deg, var(--ln-panel-2), var(--ln-void))',
        border: '1px solid var(--ln-cyan-soft)',
        padding: 'var(--ln-s-4) var(--ln-s-5) var(--ln-s-6)',
        overflowY: 'auto',
      }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--ln-cyan-press)', textTransform: 'uppercase' }}>Landnam</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: 'var(--ln-text)', marginTop: 2 }}>Menu</div>
          </div>
          <button onClick={onClose} aria-label="Close menu" data-testid="menu-close" style={{
            background: 'var(--ln-divider)', border: '1px solid var(--ln-divider)',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: 'var(--ln-text-muted)', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
          }}>✕</button>
        </div>

        <Section label="Base">
          <NavRow label="Build" detail="Place a new structure on a free plot" onClick={() => goTo('build')} testId="menu-build" />
          <NavRow label="Subsurface" detail="Rooms and stores below the base" onClick={openSubsurface} testId="hub-subsurface-btn" />
          <NavRow label="Mission Log" detail="Completed runs" onClick={() => goTo('mission-history')} testId="menu-mission-log" />
          {game.player.freeOperations && (
            <NavRow label="Sites" detail="Off-world surface operations" onClick={() => goTo('surface-ops')} testId="hub-surface-ops" />
          )}
          {canUpgradeLaunchpad && (
            <Row>
              <div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Upgrade launchpad</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                  {confirmUpgrade ? `Spend ${formatCurrency(LAUNCHPAD_UPGRADE_COST)}? This can't be undone. Tap again to confirm.` : `Permanent upgrade · ${formatCurrency(LAUNCHPAD_UPGRADE_COST, { compact: true })}`}
                </div>
              </div>
              <Btn label={confirmUpgrade ? 'Confirm' : 'Upgrade'} onClick={handleUpgrade} variant="primary" disabled={game.player.francs < LAUNCHPAD_UPGRADE_COST} />
            </Row>
          )}
        </Section>

        <Section label="Star Sailors">
          {suiteHops.map(hop => (
            <NavRow key={hop.id} label={hop.label} detail={suiteChip ? `${hop.caption} · ${suiteChip}` : hop.caption} href={hop.href} testId={`suite-hop-${hop.id}`} />
          ))}
          <NavRow label="Friends" detail="Visit other players' bases" onClick={() => onOpen('friends')} testId="menu-friends" />
          <NavRow label="Community" detail="Shared discoveries and projects" onClick={() => onOpen('community')} testId="menu-community" />
          <NavRow label="Feedback" detail="Tell us what's working and what isn't" onClick={() => onOpen('feedback')} testId="menu-feedback" />
        </Section>

        <Section label="Account">
          <Row>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>
                {email ?? 'Email account'}
              </div>
              {!email && (
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                  Account details are loading
                </div>
              )}
            </div>
            <Btn label="Sign Out" onClick={handleSignOut} variant="ghost" />
          </Row>
        </Section>

        <Section label="Data">
          <Row>
            <div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Reset game</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
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
              <div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Preview state</div>
                <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: 'var(--ln-text-muted)', marginTop: 2 }}>
                  Return to your saved game and account
                </div>
              </div>
              <Btn label="My Game" onClick={() => { onClose(); window.location.href = '/game' }} variant="primary" />
            </Row>

            <Row>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: 'var(--ln-text)' }}>Free Ops mode</div>
              <button
                onClick={() => game.setPlayer(p => ({ ...p, freeOperations: !p.freeOperations }))}
                style={{
                  padding: 'var(--ln-s-2) var(--ln-s-4)', borderRadius: 8,
                  background: game.player.freeOperations ? 'var(--ln-ok-soft)' : 'var(--ln-divider)',
                  border: `1px solid ${game.player.freeOperations ? 'var(--ln-ok-soft)' : 'var(--ln-divider)'}`,
                  color: game.player.freeOperations ? 'var(--ln-ok)' : 'var(--ln-text-muted)',
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
                        padding: 'var(--ln-s-1) var(--ln-s-2)', borderRadius: 6,
                        background: 'var(--ln-bg)', border: `1px solid ${group.color}44`,
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
    </PageSurface>
  )
}
