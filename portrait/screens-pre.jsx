/* global React, window */
// Landnam — pre-launch screens:
//   HubScreen, MissionBoardScreen, MissionDetailScreen,
//   TargetPickerScreen, FabScreen
//
// Mission-first flow:
//   Hub → tap Control Station → Missions → pick mission →
//   compatible targets → pick target → Fab → validate → Launch

const { useState, useMemo } = React;

// helpers shorthands set inside components (window.* dereferenced lazily so
// the load order in index.html doesn't matter)
function D() { return window.LandnamData; }
function IC() { return window.LandnamIcons; }
function CH() { return window.LandnamChrome; }

// ──────────────────────────────────────────────────────────────────────
// HUB — Earth Base scene with layered sections (sky/mountains/forest/soil)
// Buildings sit in distinct, non-overlapping zones; the soil layer is
// drawn as a cross-section with roots + ore veins + buried structures.
// Game HUD fills the device status-bar zone.
// ──────────────────────────────────────────────────────────────────────

function HubScreen({ player, onGoBuilding, onNav }) {
  const { TopBar, SceneBg, StatusPill, Panel } = CH();
  const { Building, I } = IC();

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* ── Backdrop: painted Earth1.png ── */}
      <SceneBg image="./assets/scenes/earth-day.png" dim={0.10}/>

      {/* ── Sky layer: drifting clouds + sun ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38%', overflow: 'hidden', pointerEvents: 'none' }}>
        {/* sun */}
        <div style={{
          position: 'absolute', right: 28, top: 96,
          width: 44, height: 44, borderRadius: 999,
          background: 'radial-gradient(circle, #fff8d4 0%, #ffd28a 60%, transparent 100%)',
          boxShadow: '0 0 36px rgba(255,210,138,0.65)',
        }}/>
        {/* clouds */}
        <Cloud style={{ left: '-30%', top: 78, opacity: 0.85, transform: 'scale(0.9)' }} dur="55s" delay="0s"/>
        <Cloud style={{ left: '-30%', top: 130, opacity: 0.65, transform: 'scale(0.65)' }} dur="72s" delay="-22s"/>
        <Cloud style={{ left: '-30%', top: 200, opacity: 0.55, transform: 'scale(0.85)' }} dur="48s" delay="-40s"/>
        {/* atmospheric haze toward horizon */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
          background: 'linear-gradient(180deg, transparent, rgba(158,220,255,0.55))',
        }}/>
      </div>

      {/* ── Game HUD across the device status-bar zone ── */}
      <HubTopHUD player={player}/>

      {/* ── Title row (under the HUD) ── */}
      <div style={{
        position: 'absolute', top: 56, left: 14, right: 14, zIndex: 18,
        display: 'flex', alignItems: 'flex-end', gap: 10,
      }}>
        <div>
          <div className="hub-eyebrow">EARTH BASE · LV {player.level}</div>
          <h1 className="hub-title">Earth Base</h1>
        </div>
        <span style={{ flex: 1 }}/>
        <button onClick={() => onNav('galaxy')} style={{
          background: 'rgba(8,16,28,0.75)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(135,207,250,0.45)',
          color: '#87CFFA',
          padding: '6px 12px',
          borderRadius: 999,
          fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>{I.atlas()} Atlas</button>
      </div>

      {/* ── Active mission ticker (below HUD when present) ── */}
      {player.activeMission && (
        <div style={{
          position: 'absolute', left: 14, top: 132, zIndex: 5,
          maxWidth: 260,
        }}>
          <Panel accent="#7ec8ff" style={{ padding: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 999,
                background: 'radial-gradient(circle at 30% 30%, #aacfff, #1e3a6c 80%)',
                boxShadow: '0 0 10px rgba(63,169,255,0.4)',
                flex: '0 0 auto',
              }}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: '#7ec8ff', textTransform: 'uppercase' }}>In Transit</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, color: '#e6efff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.activeMission.label}</div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* ── Surface buildings (laid out on the soil band, ~58%–78%) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>

          {/* Satellite — left, on the forest/soil edge */}
          <Building
            kind="satellite"
            label="Satellite"
            sub="L5 LOCKED"
            locked
            onClick={() => onGoBuilding('satellite')}
            w={88}
            style={{ left: 12, top: 488 }}
          />

          {/* Launchpad — center, dominant */}
          <Building
            kind="launchpad"
            label="Launchpad"
            sub="OPERATIONAL"
            status="ok"
            hot={!!player.pendingLaunch}
            onClick={() => onGoBuilding('launchpad')}
            w={140}
            style={{ left: '50%', top: 442, transform: 'translateX(-50%)' }}
          />

          {/* Control Station — right */}
          <Building
            kind="control"
            label="Control"
            sub={player.missionCount + ' JOBS'}
            status="warn"
            onClick={() => onGoBuilding('missions')}
            w={96}
            style={{ right: 14, top: 488 }}
          />
        </div>
      </div>

      {/* ── Soil cross-section overlay (underground band) ── */}
      <SoilCrossSection onMarket={() => onGoBuilding('market')}/>

      {/* hint */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 5,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          padding: '5px 12px',
          background: 'rgba(8,16,28,0.75)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(135,207,250,0.4)',
          borderRadius: 999,
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.22em', color: '#9EDCFF', textTransform: 'uppercase',
        }}>Tap a building</div>
      </div>

      <style>{`
        .hub-eyebrow { font-family: var(--ln-font-display); font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.6); text-shadow: 0 1px 4px rgba(0,0,0,0.7); }
        .hub-title { margin: 2px 0 0; font-family: var(--ln-font-display); font-size: 24px; font-weight: 800; letter-spacing: -0.01em; color: #fff; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.7); }
        @keyframes cloud-drift {
          from { transform: translateX(0); }
          to   { transform: translateX(460px); }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// HubTopHUD — game ribbon that fills the iOS status-bar zone
// Sits BEHIND the device status bar (time/battery) and wraps around the
// dynamic island.  Left: mission count badge.  Right: Francs + XP/LV.
// ──────────────────────────────────────────────────────────────────────
function HubTopHUD({ player }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 56,
      zIndex: 15, pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.78) 0%, rgba(6,9,15,0.55) 60%, transparent 100%)',
    }}>
      {/* left HUD chip — sits beside the iOS time */}
      <div style={{ position: 'absolute', left: 78, top: 14, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 8px',
          background: 'rgba(255,179,71,0.16)',
          border: '1px solid rgba(255,179,71,0.45)',
          borderRadius: 999,
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
          letterSpacing: '0.16em', color: '#ffb347', textTransform: 'uppercase',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: '#ffb347', boxShadow: '0 0 6px #ffb347' }}/>
          {player.missionCount} Jobs
        </span>
      </div>
      {/* right HUD chips — sit beside the iOS battery */}
      <div style={{ position: 'absolute', right: 88, top: 14, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 8px',
          background: 'rgba(245,166,35,0.16)',
          border: '1px solid rgba(245,166,35,0.55)',
          borderRadius: 999,
          fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
          letterSpacing: '0.06em', color: '#f5a623',
        }}>▲ {player.francs.toLocaleString()}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 8px',
          background: 'rgba(135,207,250,0.14)',
          border: '1px solid rgba(135,207,250,0.45)',
          borderRadius: 999,
          fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
          letterSpacing: '0.06em', color: '#87CFFA',
        }}>LV {player.level}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Cloud SVG that drifts horizontally
// ──────────────────────────────────────────────────────────────────────
function Cloud({ style, dur = '60s', delay = '0s' }) {
  return (
    <div style={{
      position: 'absolute',
      animation: `cloud-drift ${dur} linear infinite`,
      animationDelay: delay,
      ...style,
    }}>
      <svg width="120" height="50" viewBox="0 0 120 50" fill="none">
        <ellipse cx="32" cy="32" rx="22" ry="14" fill="#ffffff" opacity="0.82"/>
        <ellipse cx="58" cy="26" rx="26" ry="16" fill="#ffffff" opacity="0.86"/>
        <ellipse cx="84" cy="30" rx="20" ry="12" fill="#ffffff" opacity="0.78"/>
        <ellipse cx="48" cy="36" rx="28" ry="10" fill="#ffffff" opacity="0.65"/>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// SoilCrossSection — paint a cutaway view of the soil layer below the
// surface buildings.  Reveals roots, rock strata, ore veins, and a
// buried Marketplace room embedded in the dirt.
// ──────────────────────────────────────────────────────────────────────
function SoilCrossSection({ onMarket }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 90, height: 180,
      zIndex: 4,
      pointerEvents: 'none',
    }}>
      {/* surface line — keeps surface from blending into cross-section */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 4,
        background: 'linear-gradient(180deg, rgba(80,55,28,0.85), rgba(40,25,10,0))',
      }}/>

      {/* dirt strata over the painted bg */}
      <svg width="100%" height="100%" viewBox="0 0 402 180" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="strata1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a3220" stopOpacity="0.0"/>
            <stop offset="60%" stopColor="#3a2418" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#1e1208" stopOpacity="0.9"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="402" height="180" fill="url(#strata1)"/>
        {/* strata lines */}
        <path d="M0 40 Q 100 36, 200 42 T 402 38" stroke="rgba(80,55,28,0.5)" strokeWidth="1.5" fill="none"/>
        <path d="M0 80 Q 120 86, 220 78 T 402 84" stroke="rgba(60,40,20,0.6)" strokeWidth="1.2" fill="none"/>
        <path d="M0 130 Q 80 124, 180 132 T 402 128" stroke="rgba(40,28,14,0.7)" strokeWidth="1" fill="none"/>
        {/* gravel dots */}
        {[...Array(30)].map((_, i) => {
          const x = (i * 37 + i * 11) % 402;
          const y = 30 + ((i * 53) % 130);
          return <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.5} fill={['#5a3820','#3a2418','#7a5028'][i % 3]} opacity="0.65"/>
        })}
        {/* ore veins (small mineral dots) */}
        <g>
          <circle cx="74"  cy="62" r="2.2" fill="#d97150" opacity="0.85"/>
          <circle cx="80"  cy="68" r="1.4" fill="#d97150" opacity="0.7"/>
          <circle cx="86"  cy="62" r="1.8" fill="#d97150" opacity="0.8"/>
          <circle cx="312" cy="86" r="2"   fill="#b9d8ff" opacity="0.85"/>
          <circle cx="318" cy="92" r="1.4" fill="#b9d8ff" opacity="0.7"/>
          <circle cx="324" cy="86" r="1.6" fill="#b9d8ff" opacity="0.8"/>
          <circle cx="220" cy="148" r="2.2" fill="#ffd166" opacity="0.85"/>
          <circle cx="226" cy="154" r="1.4" fill="#ffd166" opacity="0.7"/>
        </g>
        {/* tree roots from forest above */}
        <g stroke="#3a2418" strokeWidth="1.4" fill="none" opacity="0.7" strokeLinecap="round">
          <path d="M40 0 q -4 24, 4 50"/>
          <path d="M150 0 q 6 30, -6 60"/>
          <path d="M260 0 q -10 30, 0 60"/>
          <path d="M370 0 q 8 20, -4 50"/>
        </g>
        {/* launchpad foundation pile under center */}
        <g fill="#5d6a7a" stroke="#1a2230" strokeWidth="1">
          <rect x="166" y="0" width="70" height="36" opacity="0.95"/>
          <rect x="172" y="36" width="58" height="18"/>
          <rect x="184" y="54" width="34" height="60"/>
          {/* hazard stripes */}
          <g fill="#f5a623">
            <rect x="172" y="4" width="4" height="3"/>
            <rect x="180" y="4" width="4" height="3"/>
            <rect x="188" y="4" width="4" height="3"/>
            <rect x="196" y="4" width="4" height="3"/>
            <rect x="204" y="4" width="4" height="3"/>
            <rect x="212" y="4" width="4" height="3"/>
            <rect x="220" y="4" width="4" height="3"/>
          </g>
        </g>
      </svg>

      {/* buried Marketplace — interactive */}
      <button onClick={onMarket} style={{
        position: 'absolute', left: 24, bottom: 14, width: 110,
        background: 'transparent', border: 'none', padding: 0, cursor: 'not-allowed',
        pointerEvents: 'auto', opacity: 0.55, filter: 'grayscale(0.5)',
      }}>
        <svg viewBox="0 0 120 90" width="100%" height="76">
          {/* underground room */}
          <rect x="6" y="14" width="108" height="68" fill="#2a1a0e" stroke="#7a5028" strokeWidth="1.4"/>
          {/* support beams */}
          <line x1="6" y1="14" x2="14" y2="2" stroke="#7a5028" strokeWidth="2"/>
          <line x1="114" y1="14" x2="106" y2="2" stroke="#7a5028" strokeWidth="2"/>
          <line x1="6" y1="14" x2="114" y2="14" stroke="#3a2418" strokeWidth="2"/>
          {/* shelves */}
          <rect x="16" y="40" width="20" height="32" fill="#3fa9ff" opacity="0.85" stroke="#1a2230" strokeWidth="0.6"/>
          <rect x="44" y="40" width="20" height="32" fill="#39d36a" opacity="0.85" stroke="#1a2230" strokeWidth="0.6"/>
          <rect x="72" y="40" width="20" height="32" fill="#ffb347" opacity="0.85" stroke="#1a2230" strokeWidth="0.6"/>
          {/* room floor */}
          <line x1="6" y1="76" x2="114" y2="76" stroke="#3a2418" strokeWidth="2"/>
          {/* sign */}
          <rect x="36" y="22" width="48" height="12" fill="#3a2418" stroke="#7a5028" strokeWidth="0.8"/>
        </svg>
        <div style={{
          marginTop: 4,
          padding: '3px 8px',
          background: 'rgba(8,12,22,0.85)',
          border: '1px solid rgba(122,80,40,0.6)',
          borderRadius: 4,
          fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#7a8294', textAlign: 'center',
        }}>Marketplace · L5</div>
      </button>

      {/* underground LABEL strip */}
      <div style={{
        position: 'absolute', right: 14, top: 14,
        padding: '3px 8px',
        background: 'rgba(8,12,22,0.7)',
        border: '1px solid rgba(122,80,40,0.55)',
        borderRadius: 999,
        fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: '#9c8d70',
      }}>·  Subsurface  ·</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// MISSION BOARD — list of contracts
// ──────────────────────────────────────────────────────────────────────

function MissionBoardScreen({ onBack, onPick, player }) {
  const { MISSIONS, CONTRACTORS, compatibleTargetsFor } = D();
  const { TopBar, Panel, StatusPill, SceneBg } = CH();
  const { ContractorBadge, I, MineralGlyph } = IC();

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
      <SceneBg image="./assets/scenes/earth-day.png" dim={0.7}/>
      <TopBar eyebrow="EARTH BASE · M2" title="Mission Board" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 110, paddingBottom: 100, overflowY: 'auto' }}>
        <div style={{ padding: '0 14px 8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Active Contracts · {MISSIONS.filter(m => !m.locked).length}</span>
          <span style={{ flex: 1 }} />
          <StatusPill kind="amber" dim>Sort · Payout</StatusPill>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MISSIONS.map(m => {
            const contractor = CONTRACTORS[m.contractor];
            const targets = compatibleTargetsFor(m);
            const accent = contractor.color;
            return (
              <button key={m.id}
                onClick={() => !m.locked && onPick(m.id)}
                style={{
                  background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
                  cursor: m.locked ? 'not-allowed' : 'pointer',
                  opacity: m.locked ? 0.5 : 1,
                }}>
                <Panel accent={accent} style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <ContractorBadge contractor={contractor} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: accent, textTransform: 'uppercase' }}>{contractor.name}</span>
                        <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.16em', color: '#5d7390', textTransform: 'uppercase', marginLeft: 'auto' }}>{m.tag}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#e6efff', marginTop: 4, letterSpacing: '0.01em' }}>{m.title}</div>
                      <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4, lineHeight: 1.4 }}>{m.brief}</div>
                    </div>
                  </div>

                  {/* requirements row */}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {Object.entries(m.requires.minerals).map(([k, v]) => {
                      const meta = D().MINERAL_META[k];
                      return (
                        <div key={k} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '3px 8px 3px 3px',
                          background: 'rgba(8,16,28,0.7)',
                          border: '1px solid ' + meta.color + '55',
                          borderRadius: 6,
                        }}>
                          <MineralGlyph id={k} size={20} />
                          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 800, color: meta.color }}>×{v}</span>
                        </div>
                      );
                    })}
                    <span style={{ flex: 1 }} />
                    <StatusPill kind={m.difficulty.startsWith('L') ? 'crit' : 'info'} dim>{m.difficulty}</StatusPill>
                  </div>

                  {/* payout row */}
                  <div style={{
                    marginTop: 10, display: 'flex', alignItems: 'center', gap: 10,
                    paddingTop: 10, borderTop: '1px dashed rgba(63,169,255,0.18)',
                  }}>
                    <div style={{
                      fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 18, color: '#f5a623',
                    }}>▲ {m.payout.francs.toLocaleString()}</div>
                    <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, letterSpacing: '0.16em', color: '#7ec8ff' }}>+{m.payout.xp} XP</span>
                    <span style={{ flex: 1 }} />
                    {m.locked
                      ? <StatusPill kind="mute">🔒 {m.unlockAt}</StatusPill>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: accent + '20', border: '1px solid ' + accent + '55', color: accent, fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{targets.length} target{targets.length !== 1 ? 's' : ''} ›</span>
                    }
                  </div>
                </Panel>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// TARGET PICKER — Sol system showing compatible bodies highlighted
// ──────────────────────────────────────────────────────────────────────

function TargetPickerScreen({ mission, onBack, onPick }) {
  const { TARGETS, compatibleTargetsFor } = D();
  const { TopBar, Panel, StatusPill, PrimaryBtn } = CH();
  const { Sun, Planet, MineralGlyph, I } = IC();
  const compat = compatibleTargetsFor(mission);
  const compatIds = new Set(compat.map(t => t.id));

  const [picked, setPicked] = useState(compat.find(t => t.recommended)?.id || compat[0]?.id);

  // place planets in a portrait-friendly system view
  const ANGLES = { mercury: 200, venus: 320, earth: 70, mars: 140, belt: 250, jupiter: 30, saturn: 200, neptune: 320 };
  const RADII  = { 1: 36, 2: 60, 3: 84, 4: 108, 5: 132, 6: 158, 7: 184, 8: 208 };
  function place(t) {
    const a = (ANGLES[t.id] * Math.PI) / 180;
    const r = RADII[t.orbit];
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: '#03060c' }}>
      <TopBar eyebrow={mission.title.toUpperCase()} title="Pick Target" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 110, paddingBottom: 96, overflowY: 'auto' }}>
        <div style={{ padding: '0 14px 6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Compatible · {compat.length}</span>
          <span style={{ flex: 1 }} />
          <StatusPill kind="amber" dim>Reach ≤ Orbit {mission.requires.max_orbit}</StatusPill>
        </div>

        {/* system map */}
        <div style={{
          margin: '6px 14px',
          height: 360,
          borderRadius: 14,
          background:
            // deep field tactical bg per brief: nebula blobs over near-black
            'radial-gradient(40% 35% at 22% 18%, #1A1540AA, transparent 70%),' +
            'radial-gradient(38% 30% at 78% 70%, #141E47AA, transparent 70%),' +
            'radial-gradient(60% 60% at 50% 50%, #0a1422 0%, #03060a 90%)',
          border: '1px solid #434C5E',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* dense star field */}
          <div style={{ position: 'absolute', inset: 0, background:
            'radial-gradient(1px 1px at 8% 12%, #fff8, transparent 60%),' +
            'radial-gradient(1px 1px at 18% 28%, #fff6, transparent 60%),' +
            'radial-gradient(1.2px 1.2px at 30% 44%, #fff7, transparent 60%),' +
            'radial-gradient(1px 1px at 44% 18%, #fff5, transparent 60%),' +
            'radial-gradient(1.4px 1.4px at 58% 30%, #fff7, transparent 60%),' +
            'radial-gradient(1px 1px at 66% 62%, #fff5, transparent 60%),' +
            'radial-gradient(1.3px 1.3px at 76% 22%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 84% 76%, #fff5, transparent 60%),' +
            'radial-gradient(1.2px 1.2px at 92% 44%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 12% 84%, #fff5, transparent 60%),' +
            'radial-gradient(1.1px 1.1px at 26% 76%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 48% 88%, #fff4, transparent 60%),' +
            'radial-gradient(1.2px 1.2px at 62% 84%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 80% 92%, #fff5, transparent 60%)',
          }}/>
          {/* tactical grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background:
              'repeating-linear-gradient(0deg, transparent 0 39px, rgba(135,207,250,0.06) 39px 40px),' +
              'repeating-linear-gradient(90deg, transparent 0 39px, rgba(135,207,250,0.06) 39px 40px)',
          }}/>
          {/* edge "greeblies" corner marks */}
          <Greebly pos="tl"/><Greebly pos="tr"/><Greebly pos="bl"/><Greebly pos="br"/>
          {/* orbits */}
          {[1,2,3,4,5,6,7,8].map(o => {
            const tOnOrbit = TARGETS.find(t => t.orbit === o);
            const reachable = tOnOrbit && o <= mission.requires.max_orbit;
            return (
              <div key={o} style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                width: RADII[o]*2, height: RADII[o]*2, borderRadius: 999,
                border: '1px ' + (reachable ? 'solid' : 'dashed') + ' ' + (reachable ? 'rgba(239,231,211,0.16)' : 'rgba(255,90,106,0.22)'),
              }}/>
            );
          })}
          {/* range disc */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: RADII[mission.requires.max_orbit]*2 + 24,
            height: RADII[mission.requires.max_orbit]*2 + 24,
            borderRadius: 999,
            border: '1px solid rgba(245,166,35,0.4)',
            boxShadow: 'inset 0 0 40px rgba(245,166,35,0.05)',
            pointerEvents: 'none',
          }}/>
          {/* sun */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <Sun size={44}/>
          </div>
          {/* planets */}
          {TARGETS.map(t => {
            const p = place(t);
            const isCompat = compatIds.has(t.id);
            const isPicked = t.id === picked;
            return (
              <button key={t.id} onClick={() => isCompat && setPicked(t.id)} style={{
                position: 'absolute', left: '50%', top: '50%',
                marginLeft: p.x, marginTop: p.y, transform: 'translate(-50%,-50%)',
                background: 'transparent', border: 'none', padding: 0,
                cursor: isCompat ? 'pointer' : 'not-allowed',
                opacity: isCompat ? 1 : 0.25, filter: isCompat ? 'none' : 'grayscale(1)',
              }}>
                <div style={{
                  position: 'relative',
                  borderRadius: 999,
                  outline: isPicked ? '2px solid #f5a623' : 'none',
                  outlineOffset: 4,
                  boxShadow: isPicked ? '0 0 22px rgba(245,166,35,0.6)' : 'none',
                }}>
                  <Planet id={t.id} size={t.id === 'belt' ? 36 : 26}/>
                </div>
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
                  fontFamily: 'var(--ln-font-mono)', fontSize: 9, color: isPicked ? '#f5a623' : '#cde4ff',
                  letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  background: 'rgba(8,12,22,0.7)', padding: '1px 5px', borderRadius: 3,
                }}>{t.name}</div>
              </button>
            );
          })}
        </div>

        {/* picked target detail */}
        {picked && (() => {
          const t = TARGETS.find(x => x.id === picked);
          return (
            <div style={{ padding: '14px 14px 0 14px' }}>
              <Panel accent="#f5a623">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Planet id={t.id} size={48}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: '#f5a623', textTransform: 'uppercase' }}>Target Selected</div>
                    <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 20, color: '#e6efff', letterSpacing: '0.02em' }}>{t.name}{t.recommended ? ' ★' : ''}</div>
                    <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, letterSpacing: '0.16em', color: '#7a8294', textTransform: 'uppercase' }}>Orbit {t.orbit} · Difficulty {t.difficulty}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', lineHeight: 1.4 }}>{t.brief}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {t.minerals.map(m => {
                    const meta = D().MINERAL_META[m];
                    const needed = mission.requires.minerals[m];
                    return (
                      <div key={m} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 8px 3px 3px',
                        background: 'rgba(8,16,28,0.7)',
                        border: '1px solid ' + meta.color + (needed ? 'aa' : '55'),
                        borderRadius: 6,
                        boxShadow: needed ? '0 0 12px ' + meta.color + '33' : 'none',
                      }}>
                        <MineralGlyph id={m} size={20} />
                        <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.name}{needed ? ' · need ' + needed : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <div style={{ marginTop: 12 }}>
                <PrimaryBtn onClick={() => onPick(t.id)}>Continue · Build →</PrimaryBtn>
              </div>
            </div>
          );
        })()}

        {compat.length === 0 && (
          <div style={{ padding: '14px' }}>
            <Panel accent="#ff5a6a">
              <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#ff8290' }}>No reachable targets.</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4 }}>Wait for higher-tier propulsion or pick a different mission.</div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// FAB — rocket assembly w/ live constraint validation
// ──────────────────────────────────────────────────────────────────────

function FabScreen({ mission, target, rocket, onChange, onSuggest, onLaunch, onBack }) {
  const { PARTS, validateBuild } = D();
  const { TopBar, Panel, PrimaryBtn, GhostBtn, StatusPill, ErrorRow } = CH();
  const { Planet, ContractorBadge, MineralGlyph } = IC();

  const check = validateBuild({ mission, target, rocket });
  const { chassis, propulsion, drill, ok, problems } = check;

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: '#06090f' }}>
      {/* faint blueprint grid bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0a1726 0%, #06101c 100%)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'repeating-linear-gradient(0deg, transparent 0 19px, rgba(63,169,255,0.08) 19px 20px), ' +
          'repeating-linear-gradient(90deg, transparent 0 19px, rgba(63,169,255,0.08) 19px 20px)',
      }}/>

      <TopBar eyebrow="LAUNCHPAD · ASSEMBLY" title="Build Rocket" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 110, paddingBottom: 130, overflowY: 'auto' }}>
        {/* mission + target context */}
        <div style={{ padding: '0 14px 12px' }}>
          <Panel accent={D().CONTRACTORS[mission.contractor].color} style={{ padding: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ContractorBadge contractor={D().CONTRACTORS[mission.contractor]} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>Mission</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#e6efff' }}>{mission.title}</div>
              </div>
              <div style={{ width: 1, height: 36, background: 'rgba(63,169,255,0.18)' }}/>
              <Planet id={target.id} size={36}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>Target</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 14, color: '#f5a623' }}>{target.name}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(mission.requires.minerals).map(([k, v]) => (
                <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <MineralGlyph id={k} size={16}/>
                  <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, color: D().MINERAL_META[k].color }}>×{v}</span>
                </div>
              ))}
              <span style={{ flex: 1 }}/>
              <StatusPill kind="amber" dim>Cargo ≥ {mission.requires.cargo_min}</StatusPill>
              <StatusPill kind="amber" dim>Drill ≥ T{mission.requires.drill_tier}</StatusPill>
            </div>
          </Panel>
        </div>

        {/* 3 slots stacked as a rocket */}
        <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SlotRow slot="chassis"    label="01 · Chassis · Hull + Cargo"   picked={chassis}    parts={PARTS.chassis}    onPick={id => onChange('chassis', id)}    accent="#3fa9ff" />
          <SlotRow slot="propulsion" label="02 · Propulsion · Range"        picked={propulsion} parts={PARTS.propulsion} onPick={id => onChange('propulsion', id)} accent="#f5a623" target={target} />
          <SlotRow slot="drill"      label="03 · Mining Drill · Yield"     picked={drill}      parts={PARTS.drill}      onPick={id => onChange('drill', id)}      accent="#3fa9ff" mission={mission} />
        </div>

        {/* errors / preview */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {problems.map((p, i) => <ErrorRow key={i}>{p}</ErrorRow>)}
          {ok && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(57,211,106,0.10)',
              border: '1px solid rgba(57,211,106,0.45)',
              borderRadius: 8,
              color: '#39d36a',
              fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#39d36a', boxShadow: '0 0 8px #39d36a' }}/>
              Build compatible · Ready for launch
            </div>
          )}
        </div>
      </div>

      {/* sticky bottom CTA bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        padding: '10px 14px 24px',
        background: 'linear-gradient(180deg, transparent 0%, #06090fee 30%, #06090f 100%)',
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <GhostBtn onClick={onSuggest} full={false}>⚙ Auto-Suggest</GhostBtn>
          <span style={{ flex: 1 }}/>
          <span style={{
            fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            color: ok ? '#39d36a' : '#ff5a6a', textTransform: 'uppercase',
            alignSelf: 'center',
          }}>{ok ? '✓ COMPATIBLE' : '✗ ' + problems.length + ' ISSUE' + (problems.length !== 1 ? 'S' : '')}</span>
        </div>
        <PrimaryBtn kind="amber" disabled={!ok} onClick={onLaunch}>Confirm Launch →</PrimaryBtn>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// SlotRow — one assembly slot with its part image + tier chips
// ──────────────────────────────────────────────────────────────────────

function SlotRow({ slot, label, picked, parts, onPick, accent, target, mission }) {
  const { Panel } = CH();
  const isProp = slot === 'propulsion';
  if (!picked) return null;
  return (
    <div>
      <div style={{
        fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7a8294',
        marginBottom: 8,
      }}>{label}</div>

      <Panel accent={accent}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* render the real part image, with a translucent backplate */}
          <div style={{
            width: 92, height: 64, flex: '0 0 auto',
            borderRadius: 6,
            background: 'radial-gradient(60% 80% at 50% 60%, ' + accent + '30 0%, transparent 70%), #06090f',
            border: '1px solid ' + accent + '40',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img src={picked.img} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 16, color: '#e6efff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{picked.name}</div>
            <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.18em', color: '#7a8294', textTransform: 'uppercase', marginTop: 2 }}>ID · {picked.id.toUpperCase()} · T{picked.tier}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, fontFamily: 'var(--ln-font-mono)', fontSize: 11 }}>
              {slot === 'chassis' && <>
                <Stat k="MASS" v={picked.mass + 'T'}/>
                <Stat k="CARGO" v={picked.cargo + 'U'} amber={mission && picked.cargo < mission.requires.cargo_min}/>
              </>}
              {slot === 'propulsion' && <>
                <Stat k="PWR" v={picked.power + 'MW'}/>
                <Stat k="REACH" v={'≤O' + picked.max_orbit} amber={target && picked.max_orbit < target.orbit}/>
              </>}
              {slot === 'drill' && <>
                <Stat k="RATE" v={'×' + picked.rate}/>
                <Stat k="TIER" v={'T' + picked.tier} amber={mission && picked.tier < mission.requires.drill_tier}/>
              </>}
            </div>
          </div>
        </div>
      </Panel>

      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', marginTop: 8,
        paddingBottom: 4, WebkitOverflowScrolling: 'touch',
      }}>
        {parts.map(p => {
          const on = p.id === picked.id;
          return (
            <button key={p.id} onClick={() => !p.locked && onPick(p.id)} style={{
              flex: '0 0 auto', padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid ' + (on ? accent : 'rgba(63,169,255,0.25)'),
              background: on ? accent + '22' : 'rgba(8,16,28,0.7)',
              color: on ? accent : (p.locked ? '#5d7390' : '#cde4ff'),
              fontFamily: 'var(--ln-font-display)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: p.locked ? 'not-allowed' : 'pointer',
              opacity: p.locked ? 0.5 : 1,
              whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {p.locked && '🔒'}{p.name}<span style={{ fontFamily: 'var(--ln-font-mono)', opacity: 0.7 }}>T{p.tier}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ k, v, amber }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ color: '#5d7390', letterSpacing: '0.18em', fontSize: 9 }}>{k}</span>
      <span style={{ color: amber ? '#ff5a6a' : '#e6efff', fontFamily: 'var(--ln-font-display)', fontWeight: 800 }}>{v}</span>
    </span>
  );
}

window.LandnamScreensPre = {
  HubScreen, MissionBoardScreen, TargetPickerScreen, FabScreen, GalaxyScreen,
};

// ─── decoration: tactical corner mark ──────────────────────────────
function Greebly({ pos }) {
  const sty = {
    position: 'absolute', width: 18, height: 18, pointerEvents: 'none',
    borderColor: '#87CFFA', borderStyle: 'solid', borderWidth: 0,
  };
  if (pos === 'tl') Object.assign(sty, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5 });
  if (pos === 'tr') Object.assign(sty, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5 });
  if (pos === 'bl') Object.assign(sty, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5 });
  if (pos === 'br') Object.assign(sty, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5 });
  return <div style={sty}/>;
}

// ──────────────────────────────────────────────────────────────────────
// GALAXY — cross-system map.  Tactical HUD per visual brief.
// ──────────────────────────────────────────────────────────────────────

function GalaxyScreen({ onBack, onPickStar }) {
  const { STARS, STAR_LINKS } = D();
  const { TopBar, Panel, StatusPill, PrimaryBtn } = CH();

  const [picked, setPicked] = useState('sol');
  const star = STARS.find(s => s.id === picked);

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative', background: '#05060d' }}>
      <TopBar eyebrow="STELLAR_OS · SECTOR" title="Galaxy Atlas" onBack={onBack}/>

      <div style={{ position: 'absolute', inset: 0, paddingTop: 110, paddingBottom: 100, overflowY: 'auto' }}>
        <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Sector · 8 systems</span>
          <span style={{ flex: 1 }}/>
          <StatusPill kind="info" dim>Range L4</StatusPill>
        </div>

        <div style={{
          margin: '6px 14px',
          height: 480,
          borderRadius: 14,
          background:
            'radial-gradient(40% 35% at 22% 18%, #1A1540AA, transparent 70%),' +
            'radial-gradient(38% 30% at 78% 70%, #141E47CC, transparent 70%),' +
            'radial-gradient(50% 50% at 50% 50%, #080810 0%, #03060A 90%)',
          border: '1px solid #434C5E',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* dense star dust */}
          <div style={{ position: 'absolute', inset: 0, background:
            'radial-gradient(1px 1px at 6% 8%, #fff7, transparent 60%),' +
            'radial-gradient(1px 1px at 14% 22%, #fff5, transparent 60%),' +
            'radial-gradient(1.2px 1.2px at 22% 38%, #fff7, transparent 60%),' +
            'radial-gradient(1px 1px at 34% 16%, #fff5, transparent 60%),' +
            'radial-gradient(1.4px 1.4px at 42% 30%, #fff7, transparent 60%),' +
            'radial-gradient(1px 1px at 52% 60%, #fff5, transparent 60%),' +
            'radial-gradient(1.3px 1.3px at 60% 22%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 68% 76%, #fff5, transparent 60%),' +
            'radial-gradient(1.2px 1.2px at 76% 44%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 84% 12%, #fff5, transparent 60%),' +
            'radial-gradient(1.1px 1.1px at 92% 28%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 90% 70%, #fff5, transparent 60%),' +
            'radial-gradient(1.2px 1.2px at 12% 88%, #fff6, transparent 60%),' +
            'radial-gradient(1px 1px at 36% 92%, #fff5, transparent 60%),' +
            'radial-gradient(1.4px 1.4px at 62% 86%, #fff7, transparent 60%),' +
            'radial-gradient(1px 1px at 80% 92%, #fff5, transparent 60%)',
          }}/>

          {/* tactical grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            background:
              'repeating-linear-gradient(0deg, transparent 0 39px, rgba(135,207,250,0.08) 39px 40px),' +
              'repeating-linear-gradient(90deg, transparent 0 39px, rgba(135,207,250,0.08) 39px 40px)',
          }}/>

          {/* greeblies */}
          <Greebly pos="tl"/><Greebly pos="tr"/><Greebly pos="bl"/><Greebly pos="br"/>

          {/* edge tick stamps */}
          <div style={{ position: 'absolute', top: 14, left: 36, fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: '#87CFFA88', textTransform: 'uppercase' }}>SEC · 04A</div>
          <div style={{ position: 'absolute', top: 14, right: 36, fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: '#87CFFA88', textTransform: 'uppercase' }}>+22.4ly</div>
          <div style={{ position: 'absolute', bottom: 14, left: 36, fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: '#87CFFA88', textTransform: 'uppercase' }}>v 4.0.2</div>
          <div style={{ position: 'absolute', bottom: 14, right: 36, fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.22em', color: '#87CFFA88', textTransform: 'uppercase' }}>·  Galaxy  ·</div>

          {/* constellation links */}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
            {STAR_LINKS.map(([a, b], i) => {
              const sa = STARS.find(s => s.id === a);
              const sb = STARS.find(s => s.id === b);
              const hot = a === picked || b === picked;
              return (
                <line key={i}
                  x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y}
                  stroke={hot ? '#f5a623' : '#9EDCFF'}
                  strokeOpacity={hot ? 0.75 : 0.30}
                  strokeWidth={hot ? '0.30' : '0.22'}
                  strokeDasharray="0.6 1.2"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          {/* stars */}
          {STARS.map(s => {
            const colors = {
              sol:  { c: '#E2C19C', glow: '#fff7c8' },
              cool: { c: '#cfe2ff', glow: '#9EDCFF' },
              warm: { c: '#ffa46a', glow: '#ffd28a' },
              red:  { c: '#ff7676', glow: '#ff5a6a' },
              pale: { c: '#f0f4ff', glow: '#fff' },
            };
            const col = colors[s.kind] || colors.cool;
            const isPicked = s.id === picked;
            return (
              <button key={s.id}
                onClick={() => setPicked(s.id)}
                style={{
                  position: 'absolute', left: s.x + '%', top: s.y + '%',
                  transform: 'translate(-50%,-50%)',
                  background: 'transparent', border: 'none', padding: 0,
                  cursor: 'pointer',
                }}>
                <div style={{
                  width: isPicked ? 16 : 10, height: isPicked ? 16 : 10,
                  borderRadius: 999,
                  background: 'radial-gradient(circle, ' + col.glow + ', ' + col.c + ' 70%)',
                  boxShadow: '0 0 ' + (isPicked ? 18 : 10) + 'px ' + col.glow,
                  transition: 'all 200ms',
                }}/>
                <div style={{
                  position: 'absolute', top: '100%', left: '50%',
                  transform: 'translateX(-50%)', marginTop: 4,
                  padding: '1px 5px',
                  background: '#0a0c12',
                  fontFamily: 'var(--ln-font-mono)', fontSize: 9, letterSpacing: '0.05em',
                  color: isPicked ? '#f5a623' : '#d8e0ee',
                  whiteSpace: 'nowrap',
                }}>{s.name}<span style={{ color: '#7a8294', marginLeft: 6, fontSize: 8 }}>{s.dist}</span></div>
              </button>
            );
          })}

          {/* selection reticle */}
          {star && (
            <div style={{
              position: 'absolute', left: star.x + '%', top: star.y + '%',
              transform: 'translate(-50%,-50%)',
              width: 40, height: 40,
              border: '1px solid #f5a623',
              pointerEvents: 'none',
            }}>
              <div style={{ position: 'absolute', left: '50%', top: -7, width: 1, height: 7, background: '#f5a623' }}/>
              <div style={{ position: 'absolute', left: '50%', bottom: -7, width: 1, height: 7, background: '#f5a623' }}/>
              <div style={{ position: 'absolute', top: '50%', left: -7, width: 7, height: 1, background: '#f5a623' }}/>
              <div style={{ position: 'absolute', top: '50%', right: -7, width: 7, height: 1, background: '#f5a623' }}/>
            </div>
          )}
        </div>

        {/* selected system summary */}
        <div style={{ padding: '14px 14px 0' }}>
          <Panel accent={star && star.id === 'sol' ? '#E2C19C' : '#7ec8ff'}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>System Telemetry</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <div style={{ fontFamily: 'var(--ln-font-mono)', fontWeight: 700, fontSize: 22, color: star?.id === 'sol' ? '#E2C19C' : '#efe7d3' }}>{star?.name}</div>
              <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 11, letterSpacing: '0.16em', color: '#7a8294', textTransform: 'uppercase' }}>{star?.dist}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontFamily: 'var(--ln-font-mono)', fontSize: 10, letterSpacing: '0.1em', color: '#a9b8ce', textTransform: 'uppercase' }}>
              <span><span style={{ color: '#5d7390' }}>CLASS</span>&nbsp;&nbsp;{starClass(star)}</span>
              <span><span style={{ color: '#5d7390' }}>BODIES</span>&nbsp;&nbsp;<span style={{ color: '#f5a623', fontWeight: 700 }}>{star?.id === 'sol' ? 8 : '—'}</span></span>
              <span style={{ marginLeft: 'auto' }}><span style={{ color: '#5d7390' }}>STAT</span>&nbsp;&nbsp;<span style={{ color: star?.id === 'sol' ? '#39d36a' : '#ff5a6a' }}>{star?.id === 'sol' ? 'OPEN' : 'LOCKED'}</span></span>
            </div>
          </Panel>
        </div>

        <div style={{ padding: '12px 14px 0' }}>
          <PrimaryBtn disabled={star?.id !== 'sol'} onClick={() => onPickStar(picked)}>
            {star?.id === 'sol' ? 'Enter Sol System →' : 'Out of Range · L' + (5 + (STARS.findIndex(s=>s.id===picked)%3))}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function starClass(s) {
  if (!s) return '—';
  return ({ sol: 'G2V', cool: 'A0V', warm: 'K2V', red: 'M4V', pale: 'B3V' })[s.kind] || 'G0V';
}
