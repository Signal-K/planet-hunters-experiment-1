/* global React, window */
// Landnam — Shared chrome (TopBar, BottomNav, panels, buttons)
// Exposed via window.LandnamChrome.

const { useState, useEffect } = React;

// ──────────────────────────────────────────────────────────────────────
// TopBar — sits over the scene, no opaque chrome
// ──────────────────────────────────────────────────────────────────────
function TopBar({ eyebrow, title, onBack, right, dense }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      padding: '54px 14px 12px 14px',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.92) 0%, rgba(6,9,15,0.55) 70%, transparent 100%)',
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
function IconBtn({ children, onClick, ariaLabel, color = '#cde4ff', size = 38 }) {
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
function HUDStrip({ player }) {
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

function Chip({ amber, children }) {
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
function StatusPill({ kind = 'ok', children, dim }) {
  const tones = {
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
function Panel({ children, style, accent = '#3fa9ff' }) {
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

function Corners({ c }) {
  const sty = (pos) => ({
    position: 'absolute', width: 10, height: 10,
    [pos.includes('t') ? 'top' : 'bottom']: -1,
    [pos.includes('l') ? 'left' : 'right']: -1,
    ['border' + (pos.includes('t') ? 'Top' : 'Bottom')]: '1.5px solid ' + c,
    ['border' + (pos.includes('l') ? 'Left' : 'Right')]: '1.5px solid ' + c,
  });
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
function PrimaryBtn({ children, onClick, disabled, full = true, kind = 'cyan' }) {
  const grads = {
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

function GhostBtn({ children, onClick, full = true }) {
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
function SceneBg({ image, dim = 0.2, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <img src={image} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: 'center',
        filter: 'saturate(0.95) brightness(' + (1 - dim) + ')',
      }}/>
      {/* sky gradient overlay to blend with our HUD */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(6,9,15,0.45) 0%, transparent 30%, transparent 70%, rgba(6,9,15,0.55) 100%)',
      }}/>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Bottom nav (in-game tabs)
// ──────────────────────────────────────────────────────────────────────
function BottomNav({ current, onNav, glassy }) {
  const I = window.LandnamIcons.I;
  const tabs = [
    { id: 'hub',     label: 'Base',     glyph: I.hub() },
    { id: 'galaxy',  label: 'Atlas',    glyph: I.atlas() },
    { id: 'missions',label: 'Missions', glyph: I.contract() },
    { id: 'fab',     label: 'Build',    glyph: I.rocket() },
  ];
  return (
    <nav style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
      padding: '8px 10px 26px 10px',
      background: glassy
        ? 'linear-gradient(180deg, transparent 0%, rgba(6,9,15,0.6) 30%, rgba(6,9,15,0.85) 100%)'
        : 'linear-gradient(180deg, transparent 0%, rgba(6,9,15,0.85) 40%, #06090f 100%)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.id)} style={{
          flex: 1, padding: '8px 4px',
          background: current === t.id ? 'rgba(63,169,255,0.18)' : 'transparent',
          border: 'none', borderRadius: 10,
          color: current === t.id ? 'var(--ln-cyan)' : 'var(--ln-text-muted)',
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          cursor: 'pointer',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 }}>{t.glyph}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Toasts / inline error rows
// ──────────────────────────────────────────────────────────────────────
function ErrorRow({ children }) {
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

window.LandnamChrome = { TopBar, IconBtn, HUDStrip, Chip, StatusPill, Panel, Corners, PrimaryBtn, GhostBtn, SceneBg, BottomNav, ErrorRow };
