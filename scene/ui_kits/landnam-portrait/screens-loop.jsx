/* global React, window */
// Landnam — mission-loop screens:
//   TransitScreen, MiningScreen, DebriefScreen

const { useState, useEffect, useRef, useMemo } = React;

function D()  { return window.LandnamData; }
function IC() { return window.LandnamIcons; }
function CH() { return window.LandnamChrome; }

// ──────────────────────────────────────────────────────────────────────
// TRANSIT — animated rocket arc to target
// ──────────────────────────────────────────────────────────────────────

function TransitScreen({ rocket, target, mission, onArrive, onBack }) {
  const { TopBar, Panel, GhostBtn, StatusPill } = CH();
  const { Planet, MineralGlyph } = IC();

  // Two-phase animation:
  //   Phase A (0 → 0.45): ASCENT — rocket climbs through sky, atmosphere
  //     blue tweens to deep space black, clouds drift past, stars fade in.
  //   Phase B (0.45 → 1):  CRUISE — deep space arc to target.
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf, t0 = performance.now();
    const total = 6000;
    function loop(now) {
      const prog = Math.min(1, (now - t0) / total);
      setT(prog);
      if (prog < 1) raf = requestAnimationFrame(loop);
      else setTimeout(onArrive, 300);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ascentT 0→1 (over phase A), cruiseT 0→1 (over phase B)
  const ascentT = Math.min(1, t / 0.45);
  const cruiseT = Math.max(0, (t - 0.45) / 0.55);

  // sky → space color blend
  // atmosphere blue #87CFFA (135,207,250) → deep space #03060A (3,6,10)
  const skyR = Math.round(135 + (3   - 135) * ascentT);
  const skyG = Math.round(207 + (6   - 207) * ascentT);
  const skyB = Math.round(250 + (10  - 250) * ascentT);
  const skyTop    = `rgb(${skyR},${skyG},${skyB})`;
  const skyR2 = Math.round(158 + (10 - 158) * ascentT);
  const skyG2 = Math.round(220 + (16 - 220) * ascentT);
  const skyB2 = Math.round(255 + (28 - 255) * ascentT);
  const skyBottom = `rgb(${skyR2},${skyG2},${skyB2})`;

  const chassis = D().PARTS.chassis.find(p => p.id === rocket.chassis);
  const propulsion = D().PARTS.propulsion.find(p => p.id === rocket.propulsion);

  // rocket position during ascent: starts low, rises to top of frame
  // during cruise: arc from top-left to target on right
  const W = 360, H = 320;
  let rx, ry, rAngle;
  if (t < 0.45) {
    // ascent: rocket stays horizontally centered, rises straight up
    rx = W / 2;
    ry = H - 40 - (H - 70) * ascentT;
    rAngle = -90; // pointing up
  } else {
    // cruise: arc to target
    const c = cruiseT;
    rx = W / 2 + (W - 60 - W / 2) * c;
    ry = 60 - 30 * Math.sin(c * Math.PI);
    rAngle = -90 + 90 * c; // rotate from up to right
  }

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: '#03060A' }}>
      <TopBar eyebrow={t < 0.45 ? 'LIFTOFF · ASCENT' : 'MISSION · IN TRANSIT'} title={t < 0.45 ? 'Ascending' : '→ ' + target.name} onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 96, overflowY: 'auto' }}>
        {/* launch canvas */}
        <div style={{
          margin: '0 14px',
          height: H, borderRadius: 12, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(180deg, ' + skyTop + ' 0%, ' + skyBottom + ' 100%)',
          border: '1px solid #434C5E',
        }}>
          {/* starfield — fades IN as sky darkens */}
          <div style={{
            position: 'absolute', inset: 0, opacity: ascentT,
            background:
              'radial-gradient(1px 1px at 8% 14%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 22% 26%, #fff, transparent 60%),' +
              'radial-gradient(1.2px 1.2px at 36% 32%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 50% 12%, #fff, transparent 60%),' +
              'radial-gradient(1.4px 1.4px at 64% 24%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 78% 18%, #fff, transparent 60%),' +
              'radial-gradient(1.3px 1.3px at 90% 36%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 12% 50%, #fff, transparent 60%),' +
              'radial-gradient(1.2px 1.2px at 30% 60%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 48% 68%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 70% 60%, #fff, transparent 60%),' +
              'radial-gradient(1.4px 1.4px at 86% 76%, #fff, transparent 60%),' +
              'radial-gradient(1px 1px at 14% 82%, #fff, transparent 60%),' +
              'radial-gradient(1.2px 1.2px at 56% 88%, #fff, transparent 60%)',
          }}/>

          {/* clouds — drift past and fade OUT as rocket climbs */}
          <div style={{ position: 'absolute', inset: 0, opacity: Math.max(0, 1 - ascentT * 1.4) }}>
            <div style={{ position: 'absolute', left: -60 + ascentT * -80 + 'px', top: H * 0.35, animation: 'cloud-drift 26s linear infinite' }}>
              <CloudSVG/>
            </div>
            <div style={{ position: 'absolute', left: 100 + ascentT * -120 + 'px', top: H * 0.55, animation: 'cloud-drift 32s linear infinite', animationDelay: '-12s', transform: 'scale(0.7)' }}>
              <CloudSVG/>
            </div>
            <div style={{ position: 'absolute', left: 260 + ascentT * -160 + 'px', top: H * 0.20, animation: 'cloud-drift 22s linear infinite', animationDelay: '-6s', transform: 'scale(0.55)' }}>
              <CloudSVG/>
            </div>
          </div>

          {/* atmospheric haze line — fades out */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 100,
            background: 'linear-gradient(180deg, transparent, rgba(158,220,255,' + (0.55 * (1 - ascentT)) + '))',
            pointerEvents: 'none',
          }}/>
          {/* ground rim — only visible during ascent */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 28,
            background: 'linear-gradient(180deg, rgba(140,90,40,' + (0.75 * (1 - ascentT)) + ') 0%, rgba(40,25,12,' + (0.95 * (1 - ascentT)) + ') 100%)',
          }}/>

          {/* trajectory arc — only during cruise */}
          {t >= 0.45 && (
            <svg style={{ position: 'absolute', inset: 0 }} viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none">
              <path d={`M ${W/2} 40 Q ${W*0.75} 0, ${W - 34} 60`} stroke="#3fa9ff" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="3 5" fill="none"/>
              <path d={`M ${W/2} 40 Q ${W*0.75} 0, ${rx} ${ry}`} stroke="#f5a623" strokeWidth="1.5" strokeOpacity="0.8" fill="none"/>
            </svg>
          )}

          {/* target planet — fades IN during cruise */}
          <div style={{ position: 'absolute', right: 14, top: 14, opacity: cruiseT }}>
            <Planet id={target.id} size={64}/>
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: '#f5a623', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4, whiteSpace: 'nowrap' }}>{target.name}</div>
          </div>

          {/* rocket sprite */}
          <div style={{
            position: 'absolute', left: rx, top: ry,
            transform: `translate(-50%, -50%) rotate(${rAngle + 90}deg)`,
          }}>
            <svg width="44" height="64" viewBox="0 0 44 64">
              <defs>
                <linearGradient id="tr2-body" x1="0" x2="1">
                  <stop offset="0%" stopColor="#eaf3ff"/>
                  <stop offset="50%" stopColor="#cde4ff"/>
                  <stop offset="100%" stopColor="#7a93b5"/>
                </linearGradient>
                <radialGradient id="tr2-flame">
                  <stop offset="0%" stopColor="#fff7c8"/>
                  <stop offset="40%" stopColor="#ffc25c"/>
                  <stop offset="80%" stopColor="#f5a623"/>
                  <stop offset="100%" stopColor="#d68a0d" stopOpacity="0"/>
                </radialGradient>
              </defs>
              {/* exhaust trail */}
              <path d="M 14 44 L 22 64 L 30 44 Z" fill="url(#tr2-flame)" opacity="0.85">
                <animate attributeName="d" values="M 14 44 L 22 64 L 30 44 Z;M 12 44 L 22 70 L 32 44 Z;M 14 44 L 22 66 L 30 44 Z" dur="0.32s" repeatCount="indefinite"/>
              </path>
              <path d="M 17 44 L 22 58 L 27 44 Z" fill="#fff7c8" opacity="0.95">
                <animate attributeName="d" values="M 17 44 L 22 58 L 27 44 Z;M 16 44 L 22 62 L 28 44 Z;M 17 44 L 22 59 L 27 44 Z" dur="0.22s" repeatCount="indefinite"/>
              </path>
              {/* body */}
              <path d="M22 4 L32 18 L32 44 L12 44 L12 18 Z" fill="url(#tr2-body)" stroke="#1a2230" strokeWidth="0.8"/>
              <path d="M22 4 L32 18 L12 18 Z" fill="#3fa9ff"/>
              <circle cx="22" cy="22" r="3" fill="#f5a623" stroke="#1a2230" strokeWidth="0.6"/>
              {/* fins */}
              <path d="M12 36 L4 50 L12 44 Z" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
              <path d="M32 36 L40 50 L32 44 Z" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
            </svg>
            {/* smoke particles below the rocket during ascent */}
            {t < 0.4 && (
              <div style={{ position: 'absolute', left: '50%', top: 64, transform: 'translateX(-50%)' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: -6 + (i % 2) * 12,
                    top: i * 8,
                    width: 14 - i*2, height: 14 - i*2,
                    borderRadius: 999,
                    background: 'rgba(220,210,200,' + (0.6 - i*0.12) + ')',
                    filter: 'blur(2px)',
                  }}/>
                ))}
              </div>
            )}
          </div>

          {/* phase indicator */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            padding: '4px 10px',
            background: 'rgba(8,12,22,0.78)',
            border: '1px solid rgba(245,166,35,0.5)',
            borderRadius: 999,
            fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', color: '#f5a623', textTransform: 'uppercase',
          }}>
            {t < 0.15 ? '01 · IGNITION' : t < 0.45 ? '02 · ASCENT' : t < 0.85 ? '03 · CRUISE' : '04 · APPROACH'}
          </div>
        </div>

        {/* progress */}
        <div style={{ padding: '14px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>{t < 0.45 ? 'Liftoff' : 'Transit'}</span>
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: '#f5a623', letterSpacing: '0.12em' }}>ETA · 0:{String(Math.max(0, Math.ceil((1 - t) * 6))).padStart(2,'0')}</span>
            <span style={{ flex: 1 }}/>
            <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: '#7ec8ff' }}>{Math.round(t * 100)}%</span>
          </div>
          <div style={{
            marginTop: 6, height: 12, borderRadius: 6, overflow: 'hidden',
            background: '#06090f', border: '1px solid rgba(63,169,255,0.25)', position: 'relative',
          }}>
            <div style={{
              height: '100%', width: (t * 100) + '%',
              background: 'linear-gradient(90deg, #f5a623 0%, #ffc25c 45%, #3fa9ff 55%, #6cc2ff 100%)',
              boxShadow: '0 0 12px rgba(63,169,255,0.6)',
            }}/>
            {/* phase markers */}
            <div style={{ position: 'absolute', left: '45%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.4)' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>
            <span>↑ EARTH</span><span>ATMOSPHERE</span><span>SPACE</span><span>{target.name} ↗</span>
          </div>
        </div>

        <div style={{ padding: '14px' }}>
          <Panel accent={t < 0.45 ? '#f5a623' : '#7ec8ff'}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#5d7390', textTransform: 'uppercase' }}>Vessel</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: '#e6efff', marginTop: 2 }}>{chassis.name}</div>
                <div style={{ marginTop: 6 }}><StatusPill kind={t < 0.45 ? 'warn' : 'info'}>{t < 0.45 ? 'Boosting' : 'Coasting'}</StatusPill></div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#d68a0d', textTransform: 'uppercase' }}>Burn</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: '#f5a623', marginTop: 2 }}>{propulsion.name}</div>
                <div style={{ marginTop: 6 }}><StatusPill kind="ok">{t < 0.45 ? 'Burn ' + Math.round(ascentT * 100) + '%' : 'Nominal'}</StatusPill></div>
              </div>
            </div>
          </Panel>
        </div>

        <div style={{ padding: '0 14px' }}>
          <GhostBtn onClick={onArrive}>Skip Transit ↦</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// Cloud SVG used during ascent
function CloudSVG() {
  return (
    <svg width="120" height="40" viewBox="0 0 120 40">
      <ellipse cx="30" cy="24" rx="22" ry="12" fill="#fff" opacity="0.85"/>
      <ellipse cx="56" cy="20" rx="26" ry="14" fill="#fff" opacity="0.88"/>
      <ellipse cx="82" cy="24" rx="20" ry="10" fill="#fff" opacity="0.80"/>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// MINING — tap-collect ore minigame on the target's surface
// ──────────────────────────────────────────────────────────────────────

function MiningScreen({ rocket, target, mission, onComplete, onBack }) {
  const { PARTS, MINERAL_META } = D();
  const { TopBar, PrimaryBtn, GhostBtn, StatusPill, Panel } = CH();
  const { MineralGlyph, I } = IC();

  const chassis = PARTS.chassis.find(p => p.id === rocket.chassis);
  const drill   = PARTS.drill.find(p => p.id === rocket.drill);
  const cargoMax = chassis.cargo;

  // ── state ─────────────────────────────────────────────────────────
  const [cargo, setCargo]   = useState({});
  const [pops, setPops]     = useState([]);
  const [sparks, setSparks] = useState([]);
  const [time, setTime]     = useState(45);
  const [ores, setOres]     = useState(() => spawnOres(target, 4));
  const [beamTo, setBeamTo] = useState(null);  // {x, y, until}
  const [scroll, setScroll] = useState(0);     // parallax scroll position

  const total = useMemo(() => Object.values(cargo).reduce((a,b)=>a+b,0), [cargo]);
  const full  = total >= cargoMax;
  const W = 360, H = 380;
  const ROCKET_X = 90;   // rocket is anchored on the left third of the scene
  const ROCKET_Y = 140;
  const GROUND_Y = 270;

  // parallax + ore scroll
  useEffect(() => {
    if (full || time <= 0) return;
    let raf, last = performance.now();
    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      setScroll(s => (s + dt * 60) % 4000);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [full, time]);

  // clock
  useEffect(() => {
    if (full || time <= 0) return;
    const tk = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(tk);
  }, [full, time]);

  // spawn ores
  useEffect(() => {
    if (full || time <= 0) return;
    const sp = setInterval(() => {
      setOres(prev => {
        const live = prev.filter(o => !o.gone);
        if (live.length < 6) return [...live, ...spawnOres(target, 1, W, H)];
        return live;
      });
    }, 1500);
    return () => clearInterval(sp);
  }, [target, full, time]);

  // beam clears itself after 350ms
  useEffect(() => {
    if (!beamTo) return;
    const t = setTimeout(() => setBeamTo(null), 320);
    return () => clearTimeout(t);
  }, [beamTo]);

  function tapOre(o) {
    if (full || o.gone) return;
    const meta = MINERAL_META[o.kind];
    const gain = drill.rate * o.size;
    setCargo(c => ({ ...c, [o.kind]: (c[o.kind] || 0) + gain }));
    const popId = Math.random();
    setPops(p => [...p, { id: popId, x: o.x, y: o.y, label: '+' + gain + ' ' + meta.sym, color: meta.color }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== popId)), 700);
    // beam from rocket to ore
    setBeamTo({ x: o.x, y: o.y });
    // sparks at impact
    const burst = Array.from({ length: 6 }).map(() => ({
      id: Math.random(),
      x: o.x + (Math.random() - 0.5) * 14,
      y: o.y + (Math.random() - 0.5) * 14,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      color: meta.color,
    }));
    setSparks(s => [...s, ...burst]);
    setTimeout(() => setSparks(s => s.filter(sp => !burst.find(b => b.id === sp.id))), 600);
    setOres(prev => prev.map(x => x === o ? { ...x, gone: true } : x));
  }

  // mission requirement progress
  const req = mission ? mission.requires.minerals : {};
  const reqDone = Object.entries(req).every(([k, v]) => (cargo[k] || 0) >= v);
  const pct = (total / cargoMax) * 100;

  // surface palettes by target
  const PAL = {
    mercury: { sky1:'#1b1410', sky2:'#3a2a1c', dist:'#5d4a30', ground:'#7d6248', rock:'#3a2818', glow:'#a89788' },
    venus:   { sky1:'#2a1f08', sky2:'#5a4218', dist:'#8a6020', ground:'#b08840', rock:'#3a2810', glow:'#e6c074' },
    mars:    { sky1:'#1f0c08', sky2:'#3a1810', dist:'#5a2818', ground:'#8a3a18', rock:'#3a1208', glow:'#d97150' },
    belt:    { sky1:'#0a0a12', sky2:'#181820', dist:'#3a3a48', ground:'#5d5d6a', rock:'#1a1a22', glow:'#c9c1a8' },
    jupiter: { sky1:'#1a0c08', sky2:'#3a1f10', dist:'#5a3818', ground:'#7a4a18', rock:'#3a1f10', glow:'#d4a06a' },
    saturn:  { sky1:'#1a1408', sky2:'#3a2c10', dist:'#6a5a28', ground:'#a08858', rock:'#3a2a10', glow:'#e6d4a0' },
    neptune: { sky1:'#040818', sky2:'#0a1838', dist:'#1a3870', ground:'#2a5090', rock:'#0a1838', glow:'#5a8dd0' },
  };
  const pal = PAL[target.id] || PAL.mars;

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: pal.sky1 }}>
      <TopBar eyebrow={'MINING · ' + target.name.toUpperCase()} title="Extract" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 120, overflowY: 'auto' }}>
        {/* sidescroller scene */}
        <div style={{
          margin: '0 14px',
          height: H, borderRadius: 12, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(180deg, ' + pal.sky1 + ' 0%, ' + pal.sky2 + ' 60%, ' + pal.dist + ' 90%, ' + pal.ground + ' 100%)',
          border: '1px solid ' + pal.glow + '55',
          cursor: full ? 'default' : 'crosshair',
          userSelect: 'none',
        }}>
          {/* ── BG: distant starfield (parallax 1) ── */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(1px 1px at 10% 14%, #fff6, transparent 60%),' +
                             'radial-gradient(1.2px 1.2px at 24% 20%, #fff4, transparent 60%),' +
                             'radial-gradient(1px 1px at 38% 10%, #fff5, transparent 60%),' +
                             'radial-gradient(1.4px 1.4px at 52% 30%, #fff7, transparent 60%),' +
                             'radial-gradient(1px 1px at 66% 12%, #fff5, transparent 60%),' +
                             'radial-gradient(1.2px 1.2px at 80% 22%, #fff4, transparent 60%),' +
                             'radial-gradient(1px 1px at 94% 16%, #fff6, transparent 60%)',
            backgroundSize: '300px 100%',
            backgroundPosition: -scroll * 0.08 + 'px 0',
          }}/>
          {/* ── BG: nebula glow ── */}
          <div style={{ position: 'absolute', inset: 0,
            background: 'radial-gradient(40% 50% at 30% 30%, ' + pal.glow + '22, transparent 70%), radial-gradient(50% 40% at 80% 25%, ' + pal.glow + '15, transparent 70%)' }}/>
          {/* ── BG: distant horizon (parallax 2) ── */}
          <svg width="100%" height="100%" viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none"
               style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="distrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pal.dist} stopOpacity="0.85"/>
                <stop offset="100%" stopColor={pal.sky2} stopOpacity="0.4"/>
              </linearGradient>
              <linearGradient id="midrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={pal.ground} stopOpacity="0.85"/>
                <stop offset="100%" stopColor={pal.rock} stopOpacity="1"/>
              </linearGradient>
              <radialGradient id="beamGrad" cx="50%" cy="0%" r="80%">
                <stop offset="0%" stopColor="#CCE6FF" stopOpacity="0.95"/>
                <stop offset="100%" stopColor="#CCE6FF" stopOpacity="0"/>
              </radialGradient>
            </defs>
            {/* far range silhouette */}
            <g transform={`translate(${-scroll * 0.18 % W}, 0)`}>
              <DistantRange w={W} h={H} pal={pal}/>
              <g transform={`translate(${W}, 0)`}><DistantRange w={W} h={H} pal={pal}/></g>
            </g>
            {/* mid dunes */}
            <g transform={`translate(${-scroll * 0.4 % W}, 0)`}>
              <MidRange w={W} h={H} pal={pal}/>
              <g transform={`translate(${W}, 0)`}><MidRange w={W} h={H} pal={pal}/></g>
            </g>
            {/* fore: ground with rocks and craters */}
            <g transform={`translate(${-scroll * 0.9 % W}, 0)`}>
              <Foreground w={W} h={H} pal={pal} groundY={GROUND_Y}/>
              <g transform={`translate(${W}, 0)`}><Foreground w={W} h={H} pal={pal} groundY={GROUND_Y}/></g>
            </g>
            {/* mining beam */}
            {beamTo && (
              <g>
                <line x1={ROCKET_X + 4} y1={ROCKET_Y + 16} x2={beamTo.x} y2={beamTo.y} stroke="#CCE6FF" strokeWidth="3" opacity="0.4"/>
                <line x1={ROCKET_X + 4} y1={ROCKET_Y + 16} x2={beamTo.x} y2={beamTo.y} stroke="#fff" strokeWidth="1.2" opacity="0.95"/>
                <circle cx={beamTo.x} cy={beamTo.y} r="10" fill="url(#beamGrad)"/>
                <circle cx={beamTo.x} cy={beamTo.y} r="4"  fill="#fff" opacity="0.9"/>
              </g>
            )}
          </svg>

          {/* sparks layer (HTML for animation control) */}
          {sparks.map(s => (
            <div key={s.id} style={{
              position: 'absolute', left: s.x, top: s.y, width: 3, height: 3,
              background: s.color,
              borderRadius: 999,
              boxShadow: '0 0 6px ' + s.color,
              animation: 'spark 600ms ease-out forwards',
              transform: 'translate(-50%, -50%)',
              ['--sx']: s.vx + 'px',
              ['--sy']: s.vy + 'px',
              pointerEvents: 'none',
            }}/>
          ))}

          {/* rocket sprite — fixed on the left third */}
          <div style={{ position: 'absolute', left: ROCKET_X, top: ROCKET_Y, transform: 'translate(-50%, -50%)' }}>
            <svg width="60" height="80" viewBox="0 0 60 80">
              <defs>
                <linearGradient id="rocketBody" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#eaf3ff"/>
                  <stop offset="50%" stopColor="#cde4ff"/>
                  <stop offset="100%" stopColor="#7a93b5"/>
                </linearGradient>
                <radialGradient id="flame">
                  <stop offset="0%" stopColor="#fff7c8"/>
                  <stop offset="40%" stopColor="#ffc25c"/>
                  <stop offset="80%" stopColor="#f5a623"/>
                  <stop offset="100%" stopColor="#d68a0d" stopOpacity="0"/>
                </radialGradient>
              </defs>
              {/* nose pointing right */}
              <path d="M 50 30 L 30 22 L 14 22 L 14 38 L 30 38 Z" fill="url(#rocketBody)" stroke="#1a2230" strokeWidth="0.8"/>
              <path d="M 50 30 L 30 22 L 30 38 Z" fill="#3fa9ff"/>
              <circle cx="36" cy="30" r="3.5" fill="#f5a623" stroke="#1a2230" strokeWidth="0.6"/>
              <line x1="14" y1="30" x2="30" y2="30" stroke="#1a2230" strokeWidth="0.5"/>
              {/* fins */}
              <path d="M 14 22 L 6 14 L 14 28 Z" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
              <path d="M 14 38 L 6 46 L 14 32 Z" fill="#3fa9ff" stroke="#1a2230" strokeWidth="0.5"/>
              {/* thruster flame */}
              <ellipse cx="6" cy="30" rx="10" ry="3.5" fill="url(#flame)">
                <animate attributeName="rx" values="8;12;9;11;8" dur="0.4s" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="2" cy="30" rx="5" ry="2" fill="#fff7c8" opacity="0.85">
                <animate attributeName="rx" values="4;6;4;5;4" dur="0.3s" repeatCount="indefinite"/>
              </ellipse>
            </svg>
          </div>

          {/* ores - tappable spots placed in the world (not parallaxed; they're scene-local) */}
          {ores.filter(o => !o.gone).map(o => {
            const meta = MINERAL_META[o.kind];
            const r = 22 + o.size * 6;
            return (
              <button key={o.id} onClick={() => tapOre(o)} disabled={full}
                style={{
                  position: 'absolute', left: o.x, top: o.y,
                  transform: 'translate(-50%,-50%)',
                  width: r, height: r,
                  borderRadius: 6,
                  background: 'radial-gradient(circle at 30% 30%, ' + IC().lighten(meta.color, 0.5) + ', ' + meta.color + ' 70%, ' + IC().darken(meta.color, 0.7) + ' 100%)',
                  border: '1.5px solid ' + IC().darken(meta.color, 0.6),
                  boxShadow: '0 0 14px ' + meta.color + 'aa, inset 0 2px 0 ' + IC().lighten(meta.color, 0.5),
                  cursor: full ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: IC().darken(meta.color, 0.7),
                  fontFamily: 'var(--ln-font-mono)', fontWeight: 800, fontSize: 10 + o.size * 2,
                  letterSpacing: '0.04em',
                  padding: 0,
                  clipPath: 'polygon(20% 0, 80% 0, 100% 30%, 100% 70%, 80% 100%, 20% 100%, 0 70%, 0 30%)',
                  animation: 'orefloat 2.4s ease-in-out infinite',
                }}>{meta.sym}</button>
            );
          })}

          {/* pop labels */}
          {pops.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: p.x, top: p.y,
              transform: 'translate(-50%, -100%)',
              fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16,
              letterSpacing: '0.04em',
              color: p.color, textShadow: '0 0 8px ' + p.color, pointerEvents: 'none',
              animation: 'pop 700ms ease-out forwards',
            }}>{p.label}</div>
          ))}

          {/* HUD over the scene */}
          <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <StatusPill kind={full ? 'crit' : 'warn'}>{full ? 'Cargo Full' : (time === 0 ? 'Time up' : 'Tap ore · beam fires')}</StatusPill>
            </div>
            <div style={{
              fontFamily: 'var(--ln-font-mono)', fontSize: 13, color: '#f5a623',
              background: 'rgba(8,12,22,0.78)', padding: '4px 10px', borderRadius: 6,
              letterSpacing: '0.18em', border: '1px solid rgba(245,166,35,0.45)',
              fontWeight: 700, pointerEvents: 'auto',
            }}>{String(Math.floor(time/60)).padStart(2,'0')}:{String(time%60).padStart(2,'0')}</div>
          </div>
        </div>

        {/* cargo bar */}
        <div style={{ padding: '14px 14px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>Cargo</span>
            <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800, color: '#f5a623' }}>{total}<span style={{ color: '#a9b8ce', fontSize: 11 }}> / {cargoMax} U</span></span>
          </div>
          <div style={{
            height: 14, borderRadius: 7, overflow: 'hidden',
            background: '#06090f', border: '1px solid rgba(245,166,35,0.35)',
          }}>
            <div style={{
              height: '100%', width: Math.min(100, pct) + '%',
              background: 'linear-gradient(90deg, #f5a623, #ffc25c)',
              boxShadow: '0 0 12px rgba(245,166,35,0.6)',
            }}/>
          </div>
        </div>

        {/* mission requirement readout */}
        {mission && (
          <div style={{ padding: '12px 14px' }}>
            <Panel accent={D().CONTRACTORS[mission.contractor].color}>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase', marginBottom: 8 }}>Mission Progress · {mission.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(req).map(([k, v]) => {
                  const got = cargo[k] || 0;
                  const meta = MINERAL_META[k];
                  const p = Math.min(100, (got / v) * 100);
                  const done = got >= v;
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MineralGlyph id={k} size={22}/>
                      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700, color: meta.color, letterSpacing: '0.06em', minWidth: 70 }}>{meta.name}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#06090f', border: '1px solid ' + meta.color + '55', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: p + '%', background: meta.color, boxShadow: '0 0 6px ' + meta.color }}/>
                      </div>
                      <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, color: done ? '#39d36a' : '#a9b8ce', minWidth: 50, textAlign: 'right' }}>{got}/{v}{done ? ' ✓' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </div>

      {/* sticky bottom CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        padding: '10px 14px 24px',
        background: 'linear-gradient(180deg, transparent 0%, ' + pal.sky1 + 'cc 30%, ' + pal.sky1 + ' 100%)',
      }}>
        <PrimaryBtn kind={reqDone ? 'green' : 'cyan'} disabled={total === 0} onClick={() => onComplete(cargo)}>
          {full ? 'Cargo Full · Return →' : reqDone ? 'Mission Done · Return →' : total === 0 ? 'Mine to Continue' : 'Return Now →'}
        </PrimaryBtn>
      </div>

      <style>{`
        @keyframes orefloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%      { transform: translate(-50%, -50%) translateY(-6px); }
        }
        @keyframes pop {
          0%   { opacity: 0; transform: translate(-50%, -100%) translateY(0); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -100%) translateY(-30px); }
        }
        @keyframes spark {
          0%   { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))); }
        }
      `}</style>
    </div>
  );
}

// ─── parallax pieces ─────────────────────────────────────────────────
function DistantRange({ w, h, pal }) {
  // far range silhouette
  return (
    <path d={`M 0 ${h*0.62} L ${w*0.1} ${h*0.55} L ${w*0.2} ${h*0.58} L ${w*0.3} ${h*0.5} L ${w*0.42} ${h*0.55} L ${w*0.55} ${h*0.48} L ${w*0.7} ${h*0.54} L ${w*0.85} ${h*0.5} L ${w} ${h*0.58} L ${w} ${h} L 0 ${h} Z`}
          fill="url(#distrange)" opacity="0.55"/>
  );
}
function MidRange({ w, h, pal }) {
  return (
    <path d={`M 0 ${h*0.72} L ${w*0.08} ${h*0.66} L ${w*0.2} ${h*0.7} L ${w*0.32} ${h*0.64} L ${w*0.45} ${h*0.68} L ${w*0.58} ${h*0.62} L ${w*0.72} ${h*0.68} L ${w*0.85} ${h*0.64} L ${w} ${h*0.7} L ${w} ${h} L 0 ${h} Z`}
          fill="url(#midrange)" opacity="0.8"/>
  );
}
function Foreground({ w, h, pal, groundY }) {
  // ground line with rocks
  return (
    <g>
      <rect x="0" y={groundY} width={w} height={h - groundY} fill={pal.ground}/>
      <rect x="0" y={groundY} width={w} height="3" fill={pal.glow} opacity="0.7"/>
      <rect x="0" y={groundY + 3} width={w} height="2" fill={pal.rock} opacity="0.5"/>
      {/* surface rocks */}
      <ellipse cx={w*0.12} cy={groundY + 4} rx="14" ry="6" fill={pal.rock}/>
      <ellipse cx={w*0.28} cy={groundY + 6} rx="22" ry="8" fill={pal.rock} opacity="0.85"/>
      <ellipse cx={w*0.46} cy={groundY + 4} rx="11" ry="5" fill={pal.rock}/>
      <ellipse cx={w*0.6} cy={groundY + 6} rx="18" ry="7" fill={pal.rock} opacity="0.9"/>
      <ellipse cx={w*0.78} cy={groundY + 5} rx="9" ry="4" fill={pal.rock}/>
      <ellipse cx={w*0.9} cy={groundY + 7} rx="26" ry="9" fill={pal.rock} opacity="0.85"/>
      {/* small ground dust */}
      <circle cx={w*0.18} cy={groundY + 30} r="2" fill={pal.glow} opacity="0.3"/>
      <circle cx={w*0.42} cy={groundY + 40} r="1.5" fill={pal.glow} opacity="0.4"/>
      <circle cx={w*0.66} cy={groundY + 28} r="2.5" fill={pal.glow} opacity="0.3"/>
      <circle cx={w*0.84} cy={groundY + 50} r="2" fill={pal.glow} opacity="0.35"/>
      {/* deep texture stripes */}
      <line x1="0" y1={groundY + 60} x2={w} y2={groundY + 60} stroke={pal.rock} strokeWidth="1" opacity="0.5"/>
      <line x1="0" y1={groundY + 85} x2={w} y2={groundY + 85} stroke={pal.rock} strokeWidth="1" opacity="0.4"/>
    </g>
  );
}

function spawnOres(target, n, W = 360, H = 380) {
  const out = [];
  // ores live above the ground line: y between ~80 and 240
  for (let i = 0; i < n; i++) {
    const kind = target.minerals[Math.floor(Math.random() * target.minerals.length)];
    out.push({
      id: Math.random(),
      kind,
      x: 140 + Math.random() * (W - 160),  // right of rocket
      y: 100 + Math.random() * 150,
      size: 1 + (Math.random() < 0.15 ? 2 : Math.random() < 0.5 ? 1 : 0),
    });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// DEBRIEF — pay out, rate the mission, show progression
// ──────────────────────────────────────────────────────────────────────

function DebriefScreen({ mission, target, cargo, onDone }) {
  const { MINERAL_META, sellCargo, rateMission, CONTRACTORS } = D();
  const { TopBar, Panel, PrimaryBtn, StatusPill } = CH();
  const { ContractorBadge, MineralGlyph, I, Planet } = IC();

  const subtotal = sellCargo(cargo);
  const stars = rateMission({ mission, cargo, elapsed: 1 });
  const reqMet = mission ? Object.entries(mission.requires.minerals).every(([k, v]) => (cargo[k] || 0) >= v) : false;
  const missionPayout = mission && reqMet ? mission.payout.francs : 0;
  const xp = (mission && reqMet ? mission.payout.xp : 0) + Math.round(subtotal / 8);
  const affinity = mission && reqMet ? mission.payout.affinity : 0;
  const total = subtotal + missionPayout;

  const contractor = mission ? CONTRACTORS[mission.contractor] : null;

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
      {/* subtle starfield bg */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        background: 'radial-gradient(1px 1px at 8% 14%, #fff7, transparent 60%), radial-gradient(1.4px 1.4px at 24% 26%, #fff6, transparent 60%), radial-gradient(1px 1px at 60% 18%, #fff5, transparent 60%)',
      }}/>
      <TopBar eyebrow="MISSION COMPLETE" title="Debrief" />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 120, overflowY: 'auto' }}>
        {/* hero */}
        <div style={{ padding: '0 14px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
            <div style={{ position: 'absolute', inset: -12, borderRadius: 999, background: 'radial-gradient(circle, rgba(57,211,106,0.35), transparent 70%)', animation: 'glow 2s ease-in-out infinite' }}/>
            <div style={{
              position: 'relative',
              width: 100, height: 100, borderRadius: 999,
              background: 'radial-gradient(circle at 30% 30%, #a9ffc8, #1ea54a 70%, #02180c)',
              boxShadow: '0 0 30px rgba(57,211,106,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#02180c',
            }}>
              <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 10 18 20 6"/></svg>
            </div>
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '0.08em', color: '#e6efff', textTransform: 'uppercase' }}>Returned</h1>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase', marginTop: 4 }}>From {target.name} · Sol III orbit re-entry</div>
          {/* star rating */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                color: i <= stars ? '#f5a623' : '#1f2a3a',
                filter: i <= stars ? 'drop-shadow(0 0 8px #f5a623)' : 'none',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"/></svg>
              </div>
            ))}
          </div>
        </div>

        {/* main reward */}
        <div style={{ padding: '18px 14px 0 14px' }}>
          <Panel accent="#f5a623">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 999,
                background: 'radial-gradient(circle at 30% 30%, #ffe1a8, #d68a0d 70%, #4a2800)',
                color: '#1a0c00', fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(245,166,35,0.5)',
                flex: '0 0 auto',
              }}>▲</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#d68a0d', textTransform: 'uppercase' }}>Francs Earned</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 32, color: '#f5a623', lineHeight: 1, marginTop: 2 }}>+{total.toLocaleString()}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <StatusPill kind="info">+{xp} XP</StatusPill>
                  {affinity > 0 && contractor && <StatusPill kind="amber">+{affinity} {contractor.name.split(' ')[0]} affinity</StatusPill>}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* mission contract status */}
        {mission && (
          <div style={{ padding: '12px 14px 0 14px' }}>
            <Panel accent={reqMet ? '#39d36a' : '#ff5a6a'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {contractor && <ContractorBadge contractor={contractor} size={36}/>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>Contract</div>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 13, color: '#e6efff' }}>{mission.title}</div>
                </div>
                {reqMet
                  ? <StatusPill kind="ok">Delivered</StatusPill>
                  : <StatusPill kind="crit">Failed</StatusPill>}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(mission.requires.minerals).map(([k, v]) => {
                  const got = cargo[k] || 0;
                  const meta = MINERAL_META[k];
                  const done = got >= v;
                  return (
                    <div key={k} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px 4px 4px',
                      background: done ? '#022213' : '#23080c',
                      border: '1px solid ' + (done ? '#39d36a55' : '#ff5a6a55'),
                      borderRadius: 6,
                    }}>
                      <MineralGlyph id={k} size={18}/>
                      <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, color: done ? '#39d36a' : '#ff8290' }}>{got}/{v}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {/* per-mineral sales breakdown */}
        <div style={{ padding: '12px 14px 0 14px' }}>
          <Panel accent="#3fa9ff">
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase', marginBottom: 10 }}>Sold Cargo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(cargo).length === 0 && (
                <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 12, color: '#5d7390' }}>— Nothing collected —</div>
              )}
              {Object.entries(cargo).map(([k, v]) => {
                const meta = MINERAL_META[k];
                const lineTotal = meta.price * v;
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MineralGlyph id={k} size={24}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 700, fontSize: 13, color: '#e6efff', letterSpacing: '0.04em' }}>{meta.name}</div>
                      <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#7a8294', letterSpacing: '0.12em' }}>×{v} @ ▲{meta.price}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#f5a623' }}>▲ {lineTotal.toLocaleString()}</div>
                  </div>
                );
              })}
              <div style={{ height: 1, background: 'rgba(63,169,255,0.18)', margin: '4px 0' }}/>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>Cargo Subtotal</span>
                <span style={{ flex: 1 }}/>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#a9b8ce' }}>▲ {subtotal.toLocaleString()}</span>
              </div>
              {missionPayout > 0 && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: '#d68a0d', textTransform: 'uppercase' }}>Contract Bonus</span>
                  <span style={{ flex: 1 }}/>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#f5a623' }}>▲ {missionPayout.toLocaleString()}</span>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* sticky bottom CTA */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        padding: '10px 14px 24px',
        background: 'linear-gradient(180deg, transparent 0%, #06090fcc 30%, #06090f 100%)',
      }}>
        <PrimaryBtn kind="amber" onClick={() => onDone(total, xp, affinity)}>Return to Earth Base</PrimaryBtn>
      </div>

      <style>{`
        @keyframes glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

window.LandnamScreensLoop = { TransitScreen, MiningScreen, DebriefScreen };
