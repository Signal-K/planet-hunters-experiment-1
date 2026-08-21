'use client'

import { useState } from 'react'
import { DEV_GROUPS, resolvePreset } from '@/lib/devPresets'
import { isDevLauncherEnabled } from '@/lib/devAccess'
import { pbShared } from '@/lib/pb'

// Duplicated rather than imported from game-context.tsx — same convention as
// app/game/page.tsx's own STORAGE_KEY constant.
const STORAGE_KEY = 'landnam-game-state-v1'
// Must match scripts/seed-dev-presets.ts exactly (email scheme + password).
const PRESET_PASSWORD = 'DevPreset123!'
const presetEmail = (key: string) => `dev-preset-${key}@example.com`

export default function DevShortcuts() {
  const [open, setOpen] = useState(false)
  // In-memory mode is the original behavior (?preset=, no backend I/O) — kept
  // as the default so nothing about existing screenshot/QA workflows changes.
  // Backend mode (STS-627) signs into a real seeded PocketBase account instead
  // and exercises the exact same production sync path (useAuthSync.ts) that
  // every real signed-in/guest player already uses. IMPORTANT: normal
  // gameplay ALWAYS persists to PocketBase regardless of this toggle — this
  // switch only picks which DEV preview path a dev shot uses, not whether
  // real play is saved.
  const [backendMode, setBackendMode] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  if (!isDevLauncherEnabled()) return null

  function jump(key: string) {
    const preset = resolvePreset(key)
    const url = new URL(`/game/${preset?.screen ?? 'intro'}`, window.location.origin)
    url.searchParams.set('preset', key)
    window.location.href = url.toString()
  }

  async function jumpBackend(key: string) {
    setStatus(`Signing in as ${key}…`)
    try {
      // Drop any stale local save first — mergeRemoteState prefers local
      // progress once the screen/mission has moved off the defaults, which
      // would otherwise fight the seeded account's state on load.
      localStorage.removeItem(STORAGE_KEY)
      await pbShared.collection('users').authWithPassword(presetEmail(key), PRESET_PASSWORD)
      // Full reload (not client-side nav) so every in-memory ref/effect in
      // useAuthSync starts clean against the newly signed-in account.
      window.location.href = '/game'
    } catch {
      setStatus(`No seeded account for "${key}" yet — run: npx tsx scripts/seed-dev-presets.ts ${key}`)
    }
  }

  return (
    // KES-173: dropping this below the header (top:8 -> ~56) traded one
    // overlap for a worse one — ToastLayer's global toast stack
    // (components/ui/ToastLayer.tsx) starts at top:52 and this badge's
    // zIndex 999 beats its 85, so a toast on any screen would render behind
    // the DEV button. Left at its original anchor; the screens that were
    // actually clipped (HubScreen's own inline header) now reserve
    // horizontal clearance for it instead.
    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 999, userSelect: 'none' }}>
      <button
        data-testid="dev-shortcuts-toggle"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '3px 8px',
          background: open ? '#1a2e1a' : '#0e1a0e',
          border: '1px solid #3a7a3a',
          borderRadius: 6,
          color: '#5aff5a',
          fontFamily: 'var(--ln-font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          cursor: 'pointer',
          opacity: 0.8,
        }}
      >
        {open ? 'DEV CLOSE' : 'DEV'}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 28,
          left: 0,
          background: '#060d18',
          border: '1px solid #1a2e3a',
          borderRadius: 10,
          padding: '8px 0 6px',
          minWidth: 220,
          maxHeight: 'calc(100dvh - 80px)',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        }}>
          <div data-testid="dev-shortcuts-panel" style={{ padding: '0 12px 6px', fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.2em', color: '#2a5a2a', textTransform: 'uppercase' }}>
            Mission and UI States
          </div>

          <div style={{ padding: '0 10px 8px' }}>
            <button
              data-testid="dev-shortcuts-mode-toggle"
              onClick={() => { setBackendMode(v => !v); setStatus(null) }}
              title={backendMode
                ? 'Backend (seeded account): signs into a real seeded PocketBase account (npx tsx scripts/seed-dev-presets.ts) and exercises the actual production sync path. Survives reload, same as real play.'
                : 'In-memory preset: instant UI preview only, zero persistence, resets on reload. Not representative of real save behavior — normal signed-in/guest play always persists to PocketBase regardless of this toggle.'}
              style={{
                width: '100%',
                padding: '5px 10px',
                background: backendMode ? '#1a2a3a' : '#0a1624',
                border: `1px solid ${backendMode ? '#3fa9ff88' : '#2a5a2a44'}`,
                borderRadius: 6,
                color: backendMode ? '#3fa9ff' : '#5a8a5a',
                fontFamily: 'var(--ln-font-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {backendMode ? '● Backend (seeded account)' : '○ In-memory preset (no save)'}
            </button>
            {status && (
              <div style={{ padding: '4px 2px 0', fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#ffb84d', lineHeight: 1.4 }}>
                {status}
              </div>
            )}
          </div>

          <div style={{ padding: '0 10px 8px' }}>
            <a
              href="/game/launcher"
              style={{
                display: 'block',
                padding: '6px 10px',
                border: '1px solid #2a5a2a88',
                borderRadius: 6,
                color: '#5aff5a',
                fontFamily: 'var(--ln-font-display)',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              OPEN LAUNCHER
            </a>
          </div>

          {DEV_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div style={{ height: 1, background: '#0d1f2e', margin: '4px 0' }} />}

              <div style={{ padding: '4px 12px 2px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, background: group.color, flexShrink: 0 }} />
                <span data-testid={`dev-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: group.color, textTransform: 'uppercase' }}>
                  {group.label}
                </span>
              </div>

              <div style={{ padding: '2px 10px 2px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.shots.map(shot => (
                  <button
                    key={shot.key}
                    data-testid={`dev-shot-${shot.key}`}
                    onClick={() => { backendMode ? jumpBackend(shot.key) : jump(shot.key) }}
                    title={backendMode ? `${shot.hint} (signs into a seeded backend account — real persistence)` : `${shot.hint} (in-memory preview only — no persistence)`}
                    style={{
                      padding: '4px 10px',
                      background: '#0a1624',
                      border: `1px solid ${group.color}44`,
                      borderRadius: 6,
                      color: group.color,
                      fontFamily: 'var(--ln-font-display)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${group.color}18`; e.currentTarget.style.borderColor = `${group.color}88` }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0a1624'; e.currentTarget.style.borderColor = `${group.color}44` }}
                  >
                    {shot.label}
                    {/* STS-635: stage badge — distinguishes still-mid-tutorial presets
                        (Free Ops not unlocked) from post-tutorial/Free-Ops presets,
                        since the preset key/group alone doesn't signal this reliably. */}
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        padding: '1px 4px',
                        borderRadius: 4,
                        color: shot.stage === 'free-ops' ? '#39d36a' : '#ffb84d',
                        border: `1px solid ${shot.stage === 'free-ops' ? '#39d36a88' : '#ffb84d88'}`,
                        opacity: 0.9,
                      }}
                    >
                      {shot.stage === 'free-ops' ? 'FREE OPS' : 'TUTORIAL'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
