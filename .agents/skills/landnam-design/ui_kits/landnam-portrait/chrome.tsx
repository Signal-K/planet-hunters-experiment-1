/* global React, window */
// Landnam — Shared chrome (TopBar, BottomNav, panels, buttons)
// Exposed via window.LandnamChrome.

/// <reference path="./types.ts" />

const { useState, useEffect } = React;

// ──────────────────────────────────────────────────────────────────────
// TopBar — sits over the scene, no opaque chrome
// ──────────────────────────────────────────────────────────────────────
interface TopBarProps {
  eyebrow?: string;
  title?: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  dense?: boolean;
}

function TopBar({ eyebrow, title, onBack, right, dense }: TopBarProps) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      padding: '18px 14px 12px 14px',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.92) 0%, rgba(6,9,15,0.5) 70%, transparent 100%)',
      display: 'flex', alignItems: 'center', gap: 10,
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        {onBack
          ? <IconBtn onClick={onBack} ariaLabel="back">{window.LandnamIcons.I.back()}</IconBtn>
          : <IconBtn ariaLabel="menu">{window.LandnamIcons.I.menu()}</IconBtn>
        }
      </div>
      <div style={{ flex: 1, pointerEvents: 'none' }}>
        {eyebrow && <div style={{
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ln-text-muted)',
        }}>{eyebrow}</div>}
        {title && <h1 style={{
          margin: '2px 0 0 0', fontFamily: 'var(--ln-font-display)',
          fontSize: dense ? 18 : 22, fontWeight: 800, letterSpacing: '-0.01em',
          color: 'var(--ln-text)', lineHeight: 1,
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>{title}</h1>}
      </div>
      <div style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>{right}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// IconBtn — circular glass button
// ──────────────────────────────────────────────────────────────────────
interface IconBtnProps {
  children?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  color?: string;
  size?: number;
}

function IconBtn({ children, onClick, ariaLabel, color = '#cde4ff', size = 38 }: IconBtnProps) {
  return (
    <button onClick={onClick} aria-label={ariaLabel} style={{
      width: size, height: size, flex: '0 0 auto', borderRadius: 999,
      background: 'rgba(8,16,28,0.7)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(63,169,255,0.35)',
      color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0,
    }}>{children}</button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// HUD — currency / level strip on the hub
// ──────────────────────────────────────────────────────────────────────
interface HUDStripProps {
  player: Player;
}

function HUDStrip({ player }: HUDStripProps) {
  return (
    <div style={{
      position: 'absolute', top: 54, right: 14, zIndex: 20,
      display: 'flex', gap: 6, alignItems: 'center',
    }}>
      <Chip>
        <span style={{ color: '#7ec8ff' }}>LV</span>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{player.level}</span>
      </Chip>
      <Chip amber>
        <span style={{ color: '#d68a0d' }}>▲</span>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{player.francs.toLocaleString()}</span>
      </Chip>
    </div>
  );
}

interface ChipProps {
  amber?: boolean;
  children?: React.ReactNode;
}

function Chip({ amber, children }: ChipProps) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: 'rgba(8,16,28,0.78)',
      backdropFilter: 'blur(6px)',
      border: '1px solid ' + (amber ? 'rgba(245,166,35,0.55)' : 'rgba(63,169,255,0.35)'),
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
      color: amber ? '#f5a623' : '#cde4ff', textTransform: 'uppercase',
    }}>{children}</div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// StatusPill
// ──────────────────────────────────────────────────────────────────────
type StatusPillKind = 'ok' | 'warn' | 'crit' | 'info' | 'amber' | 'mute';

interface StatusPillProps {
  kind?: StatusPillKind;
  children?: React.ReactNode;
  dim?: boolean;
}

function StatusPill({ kind = 'ok', children, dim }: StatusPillProps) {
  const tones: Record<StatusPillKind, { bg: string; fg: string }> = {
    ok:   { bg: 'rgba(57,211,106,0.18)',  fg: '#39d36a' },
    warn: { bg: 'rgba(255,179,71,0.18)',  fg: '#ffb347' },
    crit: { bg: 'rgba(255,90,106,0.18)',  fg: '#ff5a6a' },
    info: { bg: 'rgba(126,200,255,0.18)', fg: '#7ec8ff' },
    amber:{ bg: 'rgba(245,166,35,0.18)',  fg: '#f5a623' },
    mute: { bg: 'rgba(169,184,206,0.10)', fg: '#7a8294' },
  };
  const t = tones[kind] || tones.ok;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      opacity: dim ? 0.7 : 1,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg, boxShadow: '0 0 6px ' + t.fg }} />
      {children}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Panel — corner-bracketed dark panel
// ──────────────────────────────────────────────────────────────────────
interface PanelProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  accent?: string;
}

function Panel({ children, style, accent = '#3fa9ff' }: PanelProps) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(18,34,54,0.78) 0%, rgba(10,18,29,0.82) 100%)',
      border: '1px solid ' + accent + '40',
      borderRadius: 12,
      padding: 14,
      backdropFilter: 'blur(8px)',
      ...style,
    }}>
      <Corners c={accent} />
      {children}
    </div>
  );
}

interface CornersProps {
  c: string;
}

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

function Corners({ c }: CornersProps) {
  const sty = (pos: CornerPos): React.CSSProperties => ({
    position: 'absolute', width: 10, height: 10,
    [pos.includes('t') ? 'top' : 'bottom']: -1,
    [pos.includes('l') ? 'left' : 'right']: -1,
    ['border' + (pos.includes('t') ? 'Top' : 'Bottom')]: '1.5px solid ' + c,
    ['border' + (pos.includes('l') ? 'Left' : 'Right')]: '1.5px solid ' + c,
  } as React.CSSProperties);
  return (
    <>
      <span style={sty('tl')} /><span style={sty('tr')} />
      <span style={sty('bl')} /><span style={sty('br')} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Buttons
// ──────────────────────────────────────────────────────────────────────
type PrimaryBtnKind = 'cyan' | 'amber' | 'green';

interface PrimaryBtnProps {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  kind?: PrimaryBtnKind;
}

function PrimaryBtn({ children, onClick, disabled, full = true, kind = 'cyan' }: PrimaryBtnProps) {
  const grads: Record<PrimaryBtnKind, [string, string, string, string]> = {
    cyan:  ['#6cc2ff', '#2d8de0', '#06121f', 'rgba(63,169,255,0.4)'],
    amber: ['#ffc25c', '#d68a0d', '#1d0c00', 'rgba(245,166,35,0.4)'],
    green: ['#6cf09a', '#1ea54a', '#02180c', 'rgba(57,211,106,0.4)'],
  };
  const [h1, h2, fg, glow] = grads[kind] || grads.cyan;
  return (
    <button onClick={!disabled ? onClick : undefined} disabled={disabled} style={{
      width: full ? '100%' : 'auto',
      padding: '16px 22px',
      background: 'linear-gradient(180deg, ' + h1 + ' 0%, ' + h2 + ' 100%)',
      color: fg,
      fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      border: 'none', borderRadius: 12,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3), 0 0 22px ' + glow,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      opacity: disabled ? 0.4 : 1,
      filter: disabled ? 'saturate(0.5)' : 'none',
    }}>{children}</button>
  );
}

interface GhostBtnProps {
  children?: React.ReactNode;
  onClick?: () => void;
  full?: boolean;
}

function GhostBtn({ children, onClick, full = true }: GhostBtnProps) {
  return (
    <button onClick={onClick} style={{
      width: full ? '100%' : 'auto',
      padding: '12px 18px',
      background: 'rgba(8,16,28,0.6)',
      color: '#a9b8ce',
      fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 13,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      border: '1px solid rgba(169,184,206,0.18)',
      borderRadius: 10, cursor: 'pointer',
    }}>{children}</button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Scene wrapper with parallax bg image + foreground content
// Renders Earth1.png (or other scene image) full-bleed beneath children
// ──────────────────────────────────────────────────────────────────────
interface SceneBgProps {
  image: string;
  dim?: number;
  children?: React.ReactNode;
}

function SceneBg({ image, dim = 0.2, children }: SceneBgProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* painted landscape as a CSS background — composites reliably */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(' + image + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'saturate(1.02) brightness(' + (1 - dim) + ')',
      }}/>
      {/* legibility wash — only darkens the very top & bottom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(6,9,15,0.45) 0%, transparent 22%, transparent 74%, rgba(6,9,15,0.45) 100%)',
      }}/>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Pokémon-GO style radial menu.
// A single round hub button floats bottom-center; tapping it fans out
// satellite icon-buttons on an arc. Each satellite has its own color,
// bounces in with stagger, wiggles on hover, and pulses if "hot".
// ──────────────────────────────────────────────────────────────────────
interface RadialMenuItem {
  id: string;
  label: string;
  glyph: React.ReactNode;
  color: string;
}

interface RadialMenuProps {
  current: string;
  onNav: (id: string) => void;
  items?: RadialMenuItem[];
}

function RadialMenu({ current, onNav, items }: RadialMenuProps) {
  const { useState } = React;
  const [open, setOpen] = useState(false);
  const I = window.LandnamIcons.I;

  const MENU: RadialMenuItem[] = items || [
    { id: 'hub',      label: 'Base',     glyph: I.hub(),      color: '#39d36a' },
    { id: 'missions', label: 'Missions', glyph: I.contract(), color: '#f5a623' },
    { id: 'galaxy',   label: 'Atlas',    glyph: I.atlas(),    color: '#7ec8ff' },
    { id: 'fab',      label: 'Build',    glyph: I.rocket(),   color: '#c084ff' },
  ];

  // fan the satellites across a 160° arc centered straight up
  const N = MENU.length;
  const spread = 150;                 // degrees
  const start = -90 - spread / 2;     // leftmost
  const radius = 96;

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      height: 150, pointerEvents: 'none',
    }}>
      {/* scrim that closes the menu when tapping outside */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, pointerEvents: 'auto',
          background: 'radial-gradient(60% 50% at 50% 100%, rgba(3,6,12,0.55), transparent 70%)',
        }}/>
      )}

      {/* satellites */}
      {MENU.map((m, i) => {
        const ang = (start + (spread / (N - 1)) * i) * Math.PI / 180;
        const dx = Math.cos(ang) * radius;
        const dy = Math.sin(ang) * radius;
        const active = current === m.id;
        return (
          <button key={m.id}
            onClick={() => { onNav(m.id); setOpen(false); }}
            className="radial-sat"
            style={{
              position: 'absolute', left: '50%', bottom: 28,
              transform: open
                ? `translate(calc(-50% + ${dx}px), ${dy}px) scale(1)`
                : 'translate(-50%, 0) scale(0.2)',
              opacity: open ? 1 : 0,
              transition: `transform 360ms cubic-bezier(.34,1.56,.64,1) ${i * 45}ms, opacity 240ms ${i * 45}ms`,
              pointerEvents: open ? 'auto' : 'none',
              width: 54, height: 54, borderRadius: 999,
              border: 'none', padding: 0, cursor: 'pointer',
            }}>
            <span className="radial-sat-inner" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              width: 54, height: 54, borderRadius: 999,
              background: active
                ? `radial-gradient(circle at 32% 28%, ${m.color}, ${m.color}cc 70%, ${m.color}88)`
                : 'rgba(10,18,29,0.92)',
              border: '1.5px solid ' + (active ? '#fff' : m.color + '99'),
              boxShadow: active
                ? `0 0 0 2px ${m.color}55, 0 0 18px ${m.color}aa, 0 6px 14px rgba(0,0,0,0.5)`
                : `0 0 12px ${m.color}44, 0 6px 14px rgba(0,0,0,0.5)`,
              color: active ? '#06121f' : m.color,
              backdropFilter: 'blur(6px)',
            }}>
              <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{m.glyph}</span>
            </span>
            {/* label tag */}
            <span style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
              fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: active ? '#fff' : m.color, whiteSpace: 'nowrap',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>{m.label}</span>
          </button>
        );
      })}

      {/* central hub button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'absolute', left: '50%', bottom: 24,
          transform: 'translateX(-50%)',
          width: 64, height: 64, borderRadius: 999,
          border: '2px solid rgba(255,255,255,0.85)',
          background: 'radial-gradient(circle at 32% 28%, #6cc2ff, #2d8de0 60%, #1c6ab8)',
          boxShadow: open
            ? '0 0 0 3px rgba(63,169,255,0.35), 0 0 26px rgba(63,169,255,0.8), 0 8px 18px rgba(0,0,0,0.6)'
            : '0 0 0 3px rgba(63,169,255,0.25), 0 0 18px rgba(63,169,255,0.55), 0 8px 18px rgba(0,0,0,0.6)',
          cursor: 'pointer', pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'box-shadow 200ms',
        }}>
        {/* concentric ring */}
        <span style={{
          position: 'absolute', inset: 6, borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.4)',
        }}/>
        {/* the glyph — rotates to an X when open */}
        <span style={{
          color: '#06121f', display: 'inline-flex', transition: 'transform 320ms cubic-bezier(.34,1.56,.64,1)',
          transform: open ? 'rotate(135deg)' : 'rotate(0deg)',
        }}>
          {open
            ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19c0-3 3-9 7-9s7 6 7 9"/><circle cx="12" cy="9" r="2"/><path d="M12 21c-1.5-1-2-2-2-3M12 21c1.5-1 2-2 2-3"/></svg>}
        </span>
        {/* idle pulse */}
        {!open && <span style={{
          position: 'absolute', inset: -2, borderRadius: 999,
          border: '2px solid rgba(108,194,255,0.6)',
          animation: 'radial-pulse 2.2s ease-out infinite',
        }}/>}
      </button>

      <style>{`
        @keyframes radial-pulse {
          0%   { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .radial-sat:hover .radial-sat-inner { animation: radial-wiggle 0.4s ease-in-out; }
        @keyframes radial-wiggle {
          0%,100% { transform: rotate(0); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}

// keep old name as alias so app.jsx keeps working
interface BottomNavProps {
  current: string;
  onNav: (id: string) => void;
  glassy?: boolean;
}

function BottomNav({ current, onNav, glassy }: BottomNavProps) {
  return <RadialMenu current={current} onNav={onNav} />;
}

// ──────────────────────────────────────────────────────────────────────
// Toasts / inline error rows
// ──────────────────────────────────────────────────────────────────────
interface ErrorRowProps {
  children?: React.ReactNode;
}

function ErrorRow({ children }: ErrorRowProps) {
  const I = window.LandnamIcons.I;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '8px 10px',
      background: 'rgba(255,90,106,0.10)',
      border: '1px solid rgba(255,90,106,0.45)',
      borderRadius: 8,
      color: '#ff8290',
      fontFamily: 'var(--ln-font-body)', fontSize: 12, lineHeight: 1.35,
    }}>
      <span style={{ flex: '0 0 auto', color: '#ff5a6a', marginTop: 1 }}>{I.warning()}</span>
      <span>{children}</span>
    </div>
  );
}

window.LandnamChrome = { TopBar, IconBtn, HUDStrip, Chip, StatusPill, Panel, Corners, PrimaryBtn, GhostBtn, SceneBg, BottomNav, RadialMenu, ErrorRow } as unknown as Window['LandnamChrome'];
