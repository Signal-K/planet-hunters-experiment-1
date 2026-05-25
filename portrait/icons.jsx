/* global React, window */
// Landnam — Icons & SVG glyphs.
// Real game-art for buildings, planets and contractor marks.
// Exposed via window.LandnamIcons.

// ──────────────────────────────────────────────────────────────────────
// Stroke icons (24px, currentColor)
// ──────────────────────────────────────────────────────────────────────

const Stroke = ({ d, c = [], size = 22, strokeWidth = 2, fill, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor"
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d && <path d={d} />}
    {c.map((p, i) => <path key={i} d={p} />)}
    {children}
  </svg>
);

const I = {
  back:    () => <Stroke d="M15 6l-6 6 6 6" strokeWidth={2.4} />,
  menu:    () => <Stroke c={["M4 7h16","M4 12h16","M4 17h16"]} />,
  close:   () => <Stroke c={["M6 6l12 12","M18 6l-12 12"]} strokeWidth={2.4} />,
  hub:     () => <Stroke c={["M3 11l9-7 9 7","M5 10v9h14v-9","M10 19v-5h4v5"]} />,
  atlas:   () => <Stroke><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3 a 14 14 0 0 1 0 18 M12 3 a 14 14 0 0 0 0 18"/></Stroke>,
  rocket:  () => <Stroke><path d="M12 2 C 8 6 7 11 8 16 L 16 16 C 17 11 16 6 12 2 Z"/><circle cx="12" cy="10" r="2"/><path d="M8 16 L6 21 L9 19 M16 16 L18 21 L15 19"/></Stroke>,
  contract:() => <Stroke><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></Stroke>,
  cargo:   () => <Stroke><rect x="3" y="7" width="18" height="13" rx="1"/><path d="M3 7 L7 3 L17 3 L21 7"/><line x1="9" y1="13" x2="15" y2="13"/></Stroke>,
  bolt:    () => <Stroke><path d="M13 2 L5 14 L11 14 L9 22 L19 9 L13 9 Z" fill="currentColor"/></Stroke>,
  drill:   () => <Stroke><path d="M14 2 L20 8 L14 14 Z"/><line x1="14" y1="8" x2="4" y2="18"/><path d="M4 14 L2 22 L10 20"/></Stroke>,
  check:   () => <Stroke d="M4 12 L10 18 L20 6" strokeWidth={3} />,
  star:    () => <Stroke d="M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z" fill="currentColor" />,
  starOff: () => <Stroke d="M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z" />,
  warning: () => <Stroke><path d="M12 3 L22 20 L2 20 Z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></Stroke>,
  lock:    () => <Stroke><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11 V 7 a 4 4 0 0 1 8 0 V 11"/></Stroke>,
  flame:   () => <Stroke fill="currentColor"><path d="M12 2 C 8 6 6 10 8 14 C 4 14 4 18 8 21 C 5 18 10 16 11 12 C 13 16 16 14 16 11 C 18 14 20 17 17 21 C 22 19 20 13 14 11 C 15 7 14 4 12 2 Z" stroke="none"/></Stroke>,
  satellite:() => <Stroke><rect x="9" y="9" width="6" height="6" rx="0.5"/><path d="M2 12h7M15 12h7M12 2v7M12 15v7M5 5l3 3M16 16l3 3M19 5l-3 3M5 19l3-3"/></Stroke>,
  ping:    () => <Stroke><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M8 12 a 4 4 0 0 1 8 0 M5 12 a 7 7 0 0 1 14 0"/></Stroke>,
};

// ──────────────────────────────────────────────────────────────────────
// Planet renderers — each planet a recognizable little disc
// (used in the system atlas and as the target preview thumb)
// ──────────────────────────────────────────────────────────────────────

function Planet({ id, size = 64 }) {
  const s = size;
  const r = s / 2;
  // common: glowing disc with subtle highlight
  const baseLight = '#ffffff', baseShadow = '#000';
  const dot = (cx, cy, rr, c, op = 1) => <circle cx={cx} cy={cy} r={rr} fill={c} opacity={op} />;
  switch (id) {
    case 'mercury': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <defs><radialGradient id={'g-' + id} cx="35%" cy="30%"><stop offset="0%" stopColor="#d9c4a8"/><stop offset="60%" stopColor="#a89788"/><stop offset="100%" stopColor="#4a3d30"/></radialGradient></defs>
        <circle cx={r} cy={r} r={r-2} fill={'url(#g-' + id + ')'}/>
        {dot(r*0.6, r*0.7, r*0.10, '#3d3328', 0.55)}
        {dot(r*1.2, r*0.9, r*0.07, '#3d3328', 0.45)}
        {dot(r*0.8, r*1.3, r*0.08, '#3d3328', 0.5)}
        {dot(r*1.4, r*1.4, r*0.05, '#3d3328', 0.4)}
      </svg>
    );
    case 'venus': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <defs><radialGradient id={'g-' + id} cx="40%" cy="30%"><stop offset="0%" stopColor="#fff1c0"/><stop offset="60%" stopColor="#e6c074"/><stop offset="100%" stopColor="#5a4218"/></radialGradient></defs>
        <circle cx={r} cy={r} r={r-2} fill={'url(#g-' + id + ')'}/>
        <ellipse cx={r} cy={r*0.7} rx={r*0.8} ry={r*0.1} fill="#fff" opacity="0.18"/>
        <ellipse cx={r} cy={r*1.1} rx={r*0.7} ry={r*0.08} fill="#fff" opacity="0.14"/>
        <ellipse cx={r} cy={r*1.5} rx={r*0.6} ry={r*0.07} fill="#fff" opacity="0.10"/>
      </svg>
    );
    case 'earth': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <defs><radialGradient id={'g-' + id} cx="35%" cy="30%"><stop offset="0%" stopColor="#aacfff"/><stop offset="55%" stopColor="#3d7bb8"/><stop offset="100%" stopColor="#0e2540"/></radialGradient></defs>
        <circle cx={r} cy={r} r={r-2} fill={'url(#g-' + id + ')'}/>
        {/* continents */}
        <path d={`M ${r*0.6} ${r*0.8} q ${r*0.2} ${-r*0.1} ${r*0.4} 0 q ${r*0.2} ${r*0.2} 0 ${r*0.3} q ${-r*0.3} ${r*0.1} ${-r*0.4} ${-r*0.1} Z`} fill="#3da050" opacity="0.85"/>
        <path d={`M ${r*0.5} ${r*1.4} q ${r*0.2} ${-r*0.05} ${r*0.5} ${r*0.05} q ${r*0.05} ${r*0.2} ${-r*0.2} ${r*0.2} q ${-r*0.2} 0 ${-r*0.3} ${-r*0.25} Z`} fill="#3da050" opacity="0.85"/>
        {/* clouds */}
        <ellipse cx={r*0.8} cy={r*0.45} rx={r*0.3} ry={r*0.08} fill="#fff" opacity="0.45"/>
        <ellipse cx={r*1.3} cy={r*1.6} rx={r*0.25} ry={r*0.07} fill="#fff" opacity="0.4"/>
      </svg>
    );
    case 'mars': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <defs><radialGradient id={'g-' + id} cx="35%" cy="30%"><stop offset="0%" stopColor="#ffa46a"/><stop offset="60%" stopColor="#d97150"/><stop offset="100%" stopColor="#4a1a08"/></radialGradient></defs>
        <circle cx={r} cy={r} r={r-2} fill={'url(#g-' + id + ')'}/>
        {/* polar caps */}
        <path d={`M ${r*0.7} ${r*0.2} q ${r*0.3} ${-r*0.1} ${r*0.6} 0 q ${-r*0.3} ${r*0.18} ${-r*0.6} 0 Z`} fill="#fff" opacity="0.85"/>
        <path d={`M ${r*0.8} ${r*1.85} q ${r*0.3} ${r*0.05} ${r*0.45} 0 q ${-r*0.25} ${-r*0.18} ${-r*0.45} 0 Z`} fill="#fff" opacity="0.8"/>
        {/* craters */}
        {dot(r*0.7, r*0.9, r*0.08, '#3a1a0b', 0.6)}
        {dot(r*1.2, r*1.1, r*0.1, '#3a1a0b', 0.55)}
        {dot(r*1.4, r*0.75, r*0.05, '#3a1a0b', 0.5)}
      </svg>
    );
    case 'belt': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {[...Array(28)].map((_, i) => {
          const a = (i / 28) * Math.PI * 2;
          const rr = r * (0.85 + (i % 3) * 0.04);
          return <circle key={i} cx={r + Math.cos(a) * rr} cy={r + Math.sin(a) * rr} r={1.5 + (i % 3) * 0.6} fill="#c9c1a8" opacity={0.7 + (i % 2) * 0.2}/>
        })}
        <circle cx={r} cy={r} r="2" fill="#5d7390"/>
      </svg>
    );
    case 'jupiter': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <defs><radialGradient id={'g-' + id} cx="35%" cy="30%"><stop offset="0%" stopColor="#f7d8a3"/><stop offset="60%" stopColor="#d4a06a"/><stop offset="100%" stopColor="#4a2810"/></radialGradient></defs>
        <circle cx={r} cy={r} r={r-2} fill={'url(#g-' + id + ')'}/>
        {/* bands */}
        <rect x={1} y={r*0.55} width={s-2} height={r*0.18} fill="#9a6a35" opacity="0.5"/>
        <rect x={1} y={r*0.95} width={s-2} height={r*0.12} fill="#f7e2b5" opacity="0.45"/>
        <rect x={1} y={r*1.25} width={s-2} height={r*0.18} fill="#9a6a35" opacity="0.4"/>
        <rect x={1} y={r*1.55} width={s-2} height={r*0.10} fill="#f7e2b5" opacity="0.4"/>
        <ellipse cx={r*1.3} cy={r*1.1} rx={r*0.18} ry={r*0.10} fill="#d04830" opacity="0.7"/>
      </svg>
    );
    case 'saturn': return (
      <svg width={s} height={s+10} viewBox={`0 0 ${s} ${s+10}`}>
        <defs><radialGradient id={'g-' + id} cx="35%" cy="30%"><stop offset="0%" stopColor="#f9e6b3"/><stop offset="60%" stopColor="#e6d4a0"/><stop offset="100%" stopColor="#5a4218"/></radialGradient></defs>
        <ellipse cx={r} cy={r+5} rx={r*1.45} ry={r*0.18} fill="none" stroke="#bda87a" strokeWidth="2.5" opacity="0.7"/>
        <ellipse cx={r} cy={r+5} rx={r*1.25} ry={r*0.14} fill="none" stroke="#9a8550" strokeWidth="1.5" opacity="0.6"/>
        <circle cx={r} cy={r+5} r={r-2} fill={'url(#g-' + id + ')'}/>
        <rect x={1} y={r*0.7+5} width={s-2} height={r*0.10} fill="#bda87a" opacity="0.4"/>
        <rect x={1} y={r*1.1+5} width={s-2} height={r*0.10} fill="#bda87a" opacity="0.3"/>
        <ellipse cx={r} cy={r+5} rx={r*1.45} ry={r*0.18} fill="none" stroke="#bda87a" strokeWidth="2.5" opacity="0.45"
          style={{ clipPath: `inset(0 0 50% 0)` }}/>
      </svg>
    );
    case 'neptune': return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <defs><radialGradient id={'g-' + id} cx="35%" cy="30%"><stop offset="0%" stopColor="#aacfff"/><stop offset="60%" stopColor="#3a72c8"/><stop offset="100%" stopColor="#0a1838"/></radialGradient></defs>
        <circle cx={r} cy={r} r={r-2} fill={'url(#g-' + id + ')'}/>
        <ellipse cx={r*1.1} cy={r*0.7} rx={r*0.15} ry={r*0.08} fill="#fff" opacity="0.4"/>
        <ellipse cx={r*0.8} cy={r*1.3} rx={r*0.2} ry={r*0.06} fill="#1a3870" opacity="0.5"/>
      </svg>
    );
    default: return <svg width={s} height={s}><circle cx={r} cy={r} r={r-2} fill="#3fa9ff"/></svg>;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Sun (system center)
// ──────────────────────────────────────────────────────────────────────
function Sun({ size = 56 }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="sun-g" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fff7c8"/>
          <stop offset="40%" stopColor="#ffe1a8"/>
          <stop offset="75%" stopColor="#f5a623"/>
          <stop offset="100%" stopColor="#8a3f00" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="sun-core" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fff7c8"/>
          <stop offset="100%" stopColor="#f5a623"/>
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r} fill="url(#sun-g)"/>
      <circle cx={r} cy={r} r={r*0.55} fill="url(#sun-core)"/>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Contractor monograms (used on mission cards)
// ──────────────────────────────────────────────────────────────────────

function ContractorBadge({ contractor, size = 44 }) {
  const c = contractor.color;
  const r = size / 2;
  const ringFill = `radial-gradient(circle at 30% 30%, ${lighten(c, 0.4)}, ${c} 60%, ${darken(c, 0.5)} 100%)`;
  const Body = ({ children }) => (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: ringFill,
      boxShadow: `inset 0 1px 0 ${lighten(c, 0.7)}55, inset 0 -2px 0 ${darken(c, 0.5)}, 0 4px 10px ${c}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: darken(c, 0.7), flex: '0 0 auto',
    }}>{children}</div>
  );
  switch (contractor.glyph) {
    case 'sun': return (
      <Body><svg width={size*0.65} height={size*0.65} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="6.8" y2="6.8"/><line x1="17.2" y1="17.2" x2="19" y2="19"/><line x1="5" y1="19" x2="6.8" y2="17.2"/><line x1="17.2" y1="6.8" x2="19" y2="5"/></g></svg></Body>
    );
    case 'snow': return (
      <Body><svg width={size*0.65} height={size*0.65} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="3" y1="7" x2="21" y2="17"/><line x1="3" y1="17" x2="21" y2="7"/><path d="M9 4 l3 -2 l3 2 M9 20 l3 2 l3 -2"/></svg></Body>
    );
    case 'anvil': return (
      <Body><svg width={size*0.7} height={size*0.7} viewBox="0 0 24 24" fill="currentColor"><path d="M3 8 L21 8 Q 20 13 16 14 L 16 18 L 8 18 L 8 14 Q 4 13 3 8 Z"/><rect x="10" y="18" width="4" height="2"/></svg></Body>
    );
    case 'wave': return (
      <Body><svg width={size*0.7} height={size*0.7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 14 q 3 -4 6 0 q 3 4 6 0 q 3 -4 6 0"/><path d="M3 9 q 3 -4 6 0 q 3 4 6 0 q 3 -4 6 0"/></svg></Body>
    );
    case 'star':
    default: return (
      <Body><svg width={size*0.7} height={size*0.7} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"/></svg></Body>
    );
  }
}

// ──────────────────────────────────────────────────────────────────────
// Mineral chip glyphs (block + symbol)
// ──────────────────────────────────────────────────────────────────────

function MineralGlyph({ id, size = 28 }) {
  const meta = window.LandnamData.MINERAL_META[id];
  return (
    <div style={{
      width: size, height: size, borderRadius: 4, flex: '0 0 auto',
      background: 'radial-gradient(circle at 30% 30%, ' + lighten(meta.color, 0.35) + ', ' + meta.color + ' 70%, ' + darken(meta.color, 0.55) + ' 100%)',
      boxShadow: 'inset 0 1px 0 ' + lighten(meta.color, 0.5) + '55, inset 0 -1px 0 ' + darken(meta.color, 0.5) + '55',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ln-font-mono)', fontWeight: 800, fontSize: size * 0.36,
      letterSpacing: '0.02em',
      color: darken(meta.color, 0.6),
    }}>{meta.sym}</div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Earth Base buildings (placed on top of the parallax bg)
// Each draws itself with an absolute-positioned wrapper at the supplied size.
// Buildings are *clickable* — the caller provides onClick.
// ──────────────────────────────────────────────────────────────────────

function Building({ kind, label, sub, status, onClick, locked, hot, w = 110, style }) {
  return (
    <button onClick={!locked ? onClick : undefined}
      style={{
        position: 'absolute',
        background: 'transparent', border: 'none', padding: 0,
        cursor: locked ? 'not-allowed' : 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        filter: locked ? 'grayscale(0.6) brightness(0.65)' : 'none',
        ...style,
      }}>
      <div style={{ width: w, height: w, position: 'relative' }}>
        <BuildingArt kind={kind} hot={hot} />
        {/* hover ring */}
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: 12,
          border: hot ? '2px solid #f5a623' : '2px solid transparent',
          boxShadow: hot ? '0 0 20px rgba(245,166,35,0.5)' : 'none',
          pointerEvents: 'none',
        }}/>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
        padding: '4px 10px',
        background: 'rgba(8,12,22,0.78)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(63,169,255,0.45)',
        borderRadius: 6,
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: locked ? '#7a8294' : (hot ? '#f5a623' : '#cde4ff'),
        }}>{label}</span>
        {sub && <span style={{
          fontFamily: 'var(--ln-font-mono)', fontSize: 9,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: status === 'ok' ? '#39d36a' : status === 'warn' ? '#ffb347' : '#7a8294',
        }}>{sub}</span>}
      </div>
    </button>
  );
}

function BuildingArt({ kind, hot }) {
  switch (kind) {
    case 'launchpad': return (
      <svg viewBox="0 0 110 110" width="100%" height="100%">
        <defs>
          <linearGradient id="rocket-body" x1="0" x2="1">
            <stop offset="0%" stopColor="#eaf3ff"/>
            <stop offset="50%" stopColor="#cde4ff"/>
            <stop offset="100%" stopColor="#7a93b5"/>
          </linearGradient>
          <linearGradient id="rocket-nose" x1="0" x2="1">
            <stop offset="0%" stopColor="#6cc2ff"/>
            <stop offset="100%" stopColor="#1c6ab8"/>
          </linearGradient>
          <linearGradient id="pad-deck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5d6a7a"/>
            <stop offset="100%" stopColor="#2a3340"/>
          </linearGradient>
        </defs>

        {/* gantry frame */}
        <g stroke="#3a4a5e" strokeWidth="1.6" fill="none">
          <line x1="22" y1="40" x2="22" y2="92"/>
          <line x1="86" y1="40" x2="86" y2="92"/>
          <line x1="22" y1="50" x2="34" y2="56"/>
          <line x1="22" y1="62" x2="34" y2="68"/>
          <line x1="22" y1="74" x2="34" y2="80"/>
          <line x1="86" y1="50" x2="74" y2="56"/>
          <line x1="86" y1="62" x2="74" y2="68"/>
          <line x1="86" y1="74" x2="74" y2="80"/>
        </g>

        {/* pad deck */}
        <rect x="14" y="90" width="82" height="10" fill="url(#pad-deck)" rx="1"/>
        <rect x="14" y="98" width="82" height="3" fill="#1a2230"/>
        {/* hazard stripes */}
        <g fill="#f5a623">
          <rect x="16" y="91" width="4" height="2"/>
          <rect x="24" y="91" width="4" height="2"/>
          <rect x="32" y="91" width="4" height="2"/>
          <rect x="40" y="91" width="4" height="2"/>
          <rect x="48" y="91" width="4" height="2"/>
          <rect x="56" y="91" width="4" height="2"/>
          <rect x="64" y="91" width="4" height="2"/>
          <rect x="72" y="91" width="4" height="2"/>
          <rect x="80" y="91" width="4" height="2"/>
          <rect x="88" y="91" width="4" height="2"/>
        </g>

        {/* rocket */}
        <path d="M54 18 L62 36 L62 80 L46 80 L46 36 Z" fill="url(#rocket-body)" stroke="#3a4a5e" strokeWidth="0.8"/>
        <path d="M54 18 L62 36 L46 36 Z" fill="url(#rocket-nose)"/>
        <rect x="49" y="48" width="10" height="3" fill="#3fa9ff"/>
        <rect x="49" y="48" width="10" height="3" fill="none" stroke="#1a2230" strokeWidth="0.5"/>
        <circle cx="54" cy="60" r="3" fill="#f5a623" stroke="#1a2230" strokeWidth="0.6"/>
        <line x1="46" y1="68" x2="62" y2="68" stroke="#1a2230" strokeWidth="0.5"/>
        {/* fins */}
        <path d="M46 70 L40 84 L46 78 Z" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
        <path d="M62 70 L68 84 L62 78 Z" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
        {/* status light on top of gantry */}
        <circle cx="22" cy="40" r="2.5" fill={hot ? '#f5a623' : '#39d36a'}>
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="86" cy="40" r="2.5" fill={hot ? '#f5a623' : '#39d36a'}>
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" begin="0.7s" repeatCount="indefinite"/>
        </circle>
      </svg>
    );

    case 'control': return (
      <svg viewBox="0 0 110 110" width="100%" height="100%">
        <defs>
          <linearGradient id="hab-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a7ba8"/><stop offset="100%" stopColor="#2a3a55"/>
          </linearGradient>
          <linearGradient id="hab-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6e2d4"/><stop offset="100%" stopColor="#7d7666"/>
          </linearGradient>
        </defs>
        {/* radio mast */}
        <line x1="84" y1="20" x2="84" y2="60" stroke="#5d7390" strokeWidth="1.5"/>
        <path d="M82 22 L86 22 M81 30 L87 30 M80 38 L88 38" stroke="#5d7390" strokeWidth="1"/>
        <circle cx="84" cy="18" r="2.5" fill="#ff5a6a">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite"/>
        </circle>
        {/* dish on top */}
        <ellipse cx="36" cy="44" rx="14" ry="5" fill="#cde4ff" stroke="#1a2230" strokeWidth="0.6"/>
        <line x1="36" y1="44" x2="36" y2="56" stroke="#1a2230" strokeWidth="0.8"/>
        <rect x="32" y="56" width="8" height="6" fill="#5d7390"/>
        {/* habitat box */}
        <path d="M18 70 L18 64 L60 60 L92 64 L92 70 Z" fill="url(#hab-roof)" stroke="#1a2230" strokeWidth="0.8"/>
        <rect x="18" y="70" width="74" height="28" fill="url(#hab-wall)" stroke="#1a2230" strokeWidth="0.8"/>
        {/* windows */}
        <rect x="26" y="76" width="14" height="10" fill="#3fa9ff" opacity="0.85"/>
        <rect x="26" y="76" width="14" height="10" fill="none" stroke="#1a2230" strokeWidth="0.5"/>
        <line x1="33" y1="76" x2="33" y2="86" stroke="#1a2230" strokeWidth="0.5"/>
        <rect x="44" y="76" width="14" height="10" fill="#ffb347" opacity="0.85"/>
        <rect x="44" y="76" width="14" height="10" fill="none" stroke="#1a2230" strokeWidth="0.5"/>
        <line x1="51" y1="76" x2="51" y2="86" stroke="#1a2230" strokeWidth="0.5"/>
        <rect x="62" y="76" width="14" height="10" fill="#3fa9ff" opacity="0.85"/>
        <rect x="62" y="76" width="14" height="10" fill="none" stroke="#1a2230" strokeWidth="0.5"/>
        <line x1="69" y1="76" x2="69" y2="86" stroke="#1a2230" strokeWidth="0.5"/>
        {/* door */}
        <rect x="80" y="86" width="8" height="12" fill="#3a2818" stroke="#1a2230" strokeWidth="0.5"/>
        {/* hazard stripe along base */}
        <g fill="#f5a623">
          <rect x="18" y="96" width="3" height="2"/><rect x="24" y="96" width="3" height="2"/>
          <rect x="30" y="96" width="3" height="2"/><rect x="36" y="96" width="3" height="2"/>
          <rect x="42" y="96" width="3" height="2"/><rect x="48" y="96" width="3" height="2"/>
          <rect x="54" y="96" width="3" height="2"/><rect x="60" y="96" width="3" height="2"/>
          <rect x="66" y="96" width="3" height="2"/><rect x="72" y="96" width="3" height="2"/>
        </g>
      </svg>
    );

    case 'satellite': return (
      <svg viewBox="0 0 110 110" width="100%" height="100%">
        {/* base hut */}
        <rect x="34" y="78" width="42" height="20" fill="#7d7666" stroke="#1a2230" strokeWidth="0.6"/>
        <rect x="34" y="78" width="42" height="4" fill="#3a4a5e"/>
        {/* dish pole */}
        <line x1="55" y1="78" x2="55" y2="60" stroke="#3a4a5e" strokeWidth="2"/>
        {/* big dish */}
        <ellipse cx="55" cy="40" rx="32" ry="14" fill="#cde4ff" stroke="#1a2230" strokeWidth="0.8"/>
        <ellipse cx="55" cy="40" rx="32" ry="14" fill="url(#dish-sheen)"/>
        <line x1="55" y1="40" x2="55" y2="58" stroke="#1a2230" strokeWidth="1"/>
        <line x1="40" y1="42" x2="70" y2="42" stroke="#3a4a5e" strokeWidth="0.6"/>
        <line x1="30" y1="40" x2="80" y2="40" stroke="#3a4a5e" strokeWidth="0.6" opacity="0.6"/>
        {/* feed horn */}
        <circle cx="55" cy="40" r="3" fill="#f5a623" stroke="#1a2230" strokeWidth="0.6"/>
        {/* ping arcs */}
        <g fill="none" stroke="#7ec8ff" strokeWidth="1" opacity="0.85">
          <path d="M22 36 Q 55 14 88 36" strokeDasharray="2 3"/>
          <path d="M14 32 Q 55 4 96 32" strokeDasharray="2 3" opacity="0.6"/>
        </g>
        <defs>
          <linearGradient id="dish-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    );

    case 'market': return (
      <svg viewBox="0 0 110 110" width="100%" height="100%">
        <defs>
          <linearGradient id="mkt-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d68a0d"/><stop offset="100%" stopColor="#7a4f00"/>
          </linearGradient>
        </defs>
        {/* awning */}
        <path d="M20 56 L90 56 L96 66 L14 66 Z" fill="url(#mkt-roof)" stroke="#1a2230" strokeWidth="0.6"/>
        {/* stripes */}
        <g stroke="#fff" strokeWidth="3" opacity="0.85">
          <line x1="24" y1="56" x2="24" y2="66"/>
          <line x1="32" y1="56" x2="32" y2="66"/>
          <line x1="40" y1="56" x2="40" y2="66"/>
          <line x1="48" y1="56" x2="48" y2="66"/>
          <line x1="56" y1="56" x2="56" y2="66"/>
          <line x1="64" y1="56" x2="64" y2="66"/>
          <line x1="72" y1="56" x2="72" y2="66"/>
          <line x1="80" y1="56" x2="80" y2="66"/>
        </g>
        {/* booth */}
        <rect x="20" y="66" width="70" height="32" fill="#9c8d70" stroke="#1a2230" strokeWidth="0.6"/>
        <rect x="20" y="66" width="70" height="6" fill="#3a2818"/>
        <rect x="28" y="80" width="14" height="18" fill="#3fa9ff" opacity="0.8" stroke="#1a2230" strokeWidth="0.5"/>
        <rect x="48" y="80" width="14" height="18" fill="#39d36a" opacity="0.8" stroke="#1a2230" strokeWidth="0.5"/>
        <rect x="68" y="80" width="14" height="18" fill="#ffb347" opacity="0.8" stroke="#1a2230" strokeWidth="0.5"/>
        {/* lock chip if locked */}
      </svg>
    );

    case 'cargo-rocket': return (
      // a small rocket prepared on the launchpad — used inside the launchpad detail
      <svg viewBox="0 0 110 110" width="100%" height="100%">
        <defs>
          <linearGradient id="rb-2" x1="0" x2="1"><stop offset="0%" stopColor="#eaf3ff"/><stop offset="100%" stopColor="#7a93b5"/></linearGradient>
        </defs>
        <path d="M55 4 L70 28 L70 92 L40 92 L40 28 Z" fill="url(#rb-2)" stroke="#1a2230" strokeWidth="0.8"/>
        <path d="M55 4 L70 28 L40 28 Z" fill="#3fa9ff"/>
        <circle cx="55" cy="40" r="6" fill="#f5a623" stroke="#1a2230"/>
        <rect x="44" y="56" width="22" height="20" fill="#cde4ff" stroke="#1a2230" strokeWidth="0.5"/>
        <line x1="44" y1="66" x2="66" y2="66" stroke="#1a2230" strokeWidth="0.3"/>
        <path d="M40 80 L30 100 L40 92 M70 80 L80 100 L70 92" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
        <path d="M48 92 L55 106 L62 92" fill="#f5a623"/>
      </svg>
    );

    default: return <svg viewBox="0 0 100 100"><rect x="20" y="60" width="60" height="30" fill="#5d7390"/></svg>;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Color helpers
// ──────────────────────────────────────────────────────────────────────

function lighten(hex, t) {
  const c = hex.replace('#','');
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  const mix = v => Math.min(255, Math.round(v + (255 - v) * t));
  return '#' + [mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2,'0')).join('');
}
function darken(hex, t) {
  const c = hex.replace('#','');
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  const mix = v => Math.max(0, Math.round(v * (1 - t)));
  return '#' + [mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2,'0')).join('');
}

window.LandnamIcons = { I, Planet, Sun, ContractorBadge, MineralGlyph, Building, BuildingArt, lighten, darken };
