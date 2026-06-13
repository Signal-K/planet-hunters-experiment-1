/* global React, window */
/* page chrome primitives for the Landnam kit */

const { useState, useEffect, useRef, useLayoutEffect } = React;

// ── Stage: scales the 1920×1080 canvas to fit the viewport ────────────
interface StageProps {
  children?: React.ReactNode;
  variant?: string;
}

function Stage({ children, variant }: StageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    function fit() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(w / 1920, h / 1080);
      el.style.transform = `scale(${scale})`;
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const cls = ['canvas', variant].filter(Boolean).join(' ');
  return <div ref={wrapRef} className={cls}>{children}</div>;
}

// ── Button ─────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'amber' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  children?: React.ReactNode;
  size?: ButtonSize;
  icon?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

function Button({ variant = 'primary', children, size = 'md', icon, onClick, style }: ButtonProps) {
  const [hov, setHov] = useState<boolean>(false);
  const [act, setAct] = useState<boolean>(false);
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    fontFamily: 'var(--ln-font-display)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 120ms var(--ln-ease-snap)',
    transform: act ? 'scale(0.98)' : 'scale(1)',
    userSelect: 'none',
  };
  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: 14, borderRadius: 6 },
    md: { padding: '12px 22px', fontSize: 18, borderRadius: 8 },
    lg: { padding: '18px 32px', fontSize: 22, borderRadius: 14 },
  };
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: act ? '#1c87dc' : (hov ? '#6cc2ff' : '#3fa9ff'),
      color: '#061226',
      boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
    },
    secondary: {
      background: hov ? 'rgba(63,169,255,0.10)' : 'transparent',
      color: '#e6efff',
      border: '1px solid rgba(63,169,255,0.45)',
    },
    amber: {
      background: act ? '#d68a0d' : (hov ? '#ffc25c' : '#f5a623'),
      color: '#1a1304',
    },
    ghost: {
      background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
      color: '#a9b8ce',
    },
  };
  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setAct(false); }}
      onMouseDown={() => setAct(true)} onMouseUp={() => setAct(false)}
      onClick={onClick}
    >
      {icon}{children}
    </button>
  );
}

// ── Top bar — used in the launchpad ───────────────────────────────────
interface TopBarProps {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  right?: React.ReactNode;
  level?: number;
  francs?: number;
}

function TopBar({ title, eyebrow, right, level, francs }: TopBarProps) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center',
      padding: '24px 48px',
      gap: 24,
      zIndex: 5,
    }}>
      <Button variant="ghost" size="sm" icon={<span style={{fontSize:18}}>←</span>}>Back</Button>
      <div style={{ marginLeft: 8 }}>
        {eyebrow && <div className="ln-eyebrow" style={{ color: 'var(--ln-text-muted)', marginBottom: 4 }}>{eyebrow}</div>}
        <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.01em', color: '#e6efff' }}>{title}</div>
      </div>
      <div style={{ flex: 1 }} />
      {level != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 8,
          padding: '8px 14px', border: '1px solid var(--ln-hairline)',
          borderRadius: 8, background: '#0a121d',
        }}>
          <span className="ln-label" style={{ fontSize: 12, color: '#5d7390' }}>LV</span>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 22 }}>04</span>
        </div>
      )}
      {francs != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 10,
          padding: '8px 16px', border: '1px solid rgba(245,166,35,0.55)',
          borderRadius: 999, background: '#0a121d',
        }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 22, color: '#f5a623' }}>▲ {francs.toLocaleString()}</span>
          <span className="ln-label" style={{ fontSize: 12, color: '#a9b8ce' }}>F</span>
        </div>
      )}
      {right}
    </div>
  );
}

// ── Bottom bar (Launchpad pattern) ────────────────────────────────────
type SegCheck = 'amber' | 'cyan' | boolean | undefined;

interface SegProps {
  check?: SegCheck;
  label: string;
  color?: string;
  last?: boolean;
}

function Seg({ check, label, color, last }: SegProps) {
  const c = check === 'amber' ? '#f5a623' : check === 'cyan' ? '#3fa9ff' : '#5d7390';
  const bg = check === 'amber' ? 'rgba(245,166,35,0.16)' : check === 'cyan' ? 'rgba(63,169,255,0.16)' : 'transparent';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 28px',
      borderRight: last ? 'none' : '1px solid var(--ln-hairline)',
      height: '100%',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: c, border: `1px solid ${c}`, background: bg, fontSize: 13, fontWeight: 700,
      }}>{check ? '✓' : ''}</span>
      <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '0.18em', textTransform: 'uppercase', color: c === '#5d7390' ? '#a9b8ce' : c }}>{label}</span>
    </div>
  );
}

interface BottomBarProps {
  children?: React.ReactNode;
}

function BottomBar({ children }: BottomBarProps) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      height: 120,
      background: 'linear-gradient(180deg, rgba(6,9,15,0) 0%, rgba(6,9,15,0.85) 30%, rgba(6,9,15,1) 100%)',
      borderTop: '1px solid var(--ln-hairline)',
      display: 'flex', alignItems: 'center',
      padding: '0 32px',
      gap: 0,
      zIndex: 5,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, { Stage, Button, TopBar, BottomBar, Seg } as Record<string, unknown>);
