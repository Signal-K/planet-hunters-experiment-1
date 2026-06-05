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
      {/* ── Backdrop: painted landscape (sky/mountains/forest/soil) ── */}
      <SceneBg image="../../assets/scenes/earth-day-sm.png" dim={0}/>

      {/* ── Drifting clouds + ambient star field over the painted sky ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '42%', overflow: 'hidden', pointerEvents: 'none' }}>
        <AmbientStars/>
        <Cloud style={{ left: '-30%', top: 40, opacity: 0.7, transform: 'scale(0.8)' }} dur="62s" delay="0s"/>
        <Cloud style={{ left: '-30%', top: 96, opacity: 0.5, transform: 'scale(0.55)' }} dur="80s" delay="-30s"/>
      </div>

      {/* ── Minimal top: title left, resources right ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 18,
        padding: '16px 14px 22px',
        background: 'linear-gradient(180deg, rgba(6,9,15,0.85) 0%, rgba(6,9,15,0.35) 60%, transparent 100%)',
        display: 'flex', alignItems: 'flex-start', gap: 10, pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div className="hub-eyebrow">EARTH BASE · LV {player.level}</div>
          <h1 className="hub-title">Earth Base</h1>
        </div>
        <span style={{ flex: 1 }}/>
        {/* resource pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', pointerEvents: 'auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px',
            background: 'rgba(8,12,22,0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(245,166,35,0.5)',
            borderRadius: 999,
            fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.04em', color: '#f5a623',
          }}>▲ {player.francs.toLocaleString()}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            background: 'rgba(8,12,22,0.7)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,179,71,0.4)',
            borderRadius: 999,
            fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.16em', color: '#ffb347', textTransform: 'uppercase',
          }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: '#ffb347', boxShadow: '0 0 6px #ffb347' }}/>
            {player.missionCount} Jobs
          </span>
        </div>
      </div>

      {/* ── Contextual progression card (one at a time, below title) ── */}
      <ProgressionCard player={player} onGoBuilding={onGoBuilding} onNav={onNav}/>

      {/* ── Surface buildings — sit on the forest/ground line ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>

          {/* Only structures the player has actually placed appear. Anything
              not yet built shows as an empty buildable plot. */}
          {(() => {
            const placed = player.placed || ['launchpad'];
            const SLOTS = [
              { id: 'satellite', kind: 'satellite', label: 'Satellite', sub: 'SCANNING', status: 'ok',
                w: 78, style: { left: 16, top: 506 }, onClick: () => onGoBuilding('satellite') },
              { id: 'launchpad', kind: 'launchpad', label: 'Launchpad',
                sub: player.activeMission ? 'IN FLIGHT' : 'READY', status: player.activeMission ? 'warn' : 'ok',
                hot: !!player.pendingLaunch, w: 132, style: { left: '50%', top: 486, transform: 'translateX(-50%)' },
                onClick: () => onGoBuilding('launchpad') },
              { id: 'control', kind: 'control', label: 'Control', sub: player.missionCount + ' JOBS', status: 'warn',
                w: 84, style: { right: 16, top: 506 }, onClick: () => onGoBuilding('missions') },
            ];
            return SLOTS.map(s => placed.includes(s.id)
              ? <Building key={s.id} kind={s.kind} label={s.label} sub={s.sub} status={s.status} hot={s.hot} onClick={s.onClick} w={s.w} style={s.style} />
              : <EmptyPlot key={s.id} w={s.w} style={s.style} onClick={() => onGoBuilding('build')} />
            );
          })()}
        </div>
      </div>

      {/* ── Subsurface overlay onto the painted soil band ── */}
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
// EmptyPlot — an un-built buildable slot on the hub ground line.
// Tapping it routes to the Build screen.
// ──────────────────────────────────────────────────────────────────────
function EmptyPlot({ w = 90, style, onClick }) {
  return (
    <button onClick={onClick} className="ln-building" style={{
      position: 'absolute', background: 'transparent', border: 'none', padding: 0,
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      ...style,
    }}>
      <div style={{ width: w, height: w * 0.5, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '88%', height: 26, borderRadius: '50% / 60%',
          background: 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.18), rgba(135,207,250,0.04) 70%)',
          border: '2px dashed rgba(135,207,250,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pad-pulse 2s ease-in-out infinite',
        }}>
          <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 16, fontWeight: 800, color: 'rgba(135,207,250,0.8)', marginTop: -2 }}>+</span>
        </div>
      </div>
      <div style={{
        padding: '3px 9px', borderRadius: 999,
        background: 'rgba(8,12,22,0.7)', backdropFilter: 'blur(6px)',
        fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 9,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9EDCFF',
        whiteSpace: 'nowrap',
      }}>+ Build</div>
      <style>{`@keyframes pad-pulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.05); opacity: 1; } }`}</style>
    </button>
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
      position: 'absolute', left: 0, right: 0, bottom: 96, height: 168,
      zIndex: 4,
      pointerEvents: 'none',
    }}>
      {/* surface divider — clean line separating surface from subsurface */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 0,
        borderTop: '1.5px dashed rgba(255,225,160,0.5)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 18,
        background: 'linear-gradient(180deg, rgba(60,40,20,0.5), transparent)',
      }}/>

      {/* subsurface detail — translucent so the painted soil shows through */}
      <svg width="100%" height="100%" viewBox="0 0 402 168" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="strata1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1a0e" stopOpacity="0.0"/>
            <stop offset="100%" stopColor="#1a0f06" stopOpacity="0.35"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="402" height="168" fill="url(#strata1)"/>
        {/* strata lines */}
        <path d="M0 44 Q 100 40, 200 46 T 402 42" stroke="rgba(255,220,160,0.18)" strokeWidth="1" fill="none"/>
        <path d="M0 96 Q 120 102, 220 94 T 402 100" stroke="rgba(255,220,160,0.14)" strokeWidth="1" fill="none"/>
        {/* ore veins glow on the painted soil */}
        <g>
          <circle cx="74"  cy="66" r="3" fill="#d97150" opacity="0.9"/>
          <circle cx="80"  cy="72" r="1.8" fill="#ff9a78" opacity="0.8"/>
          <circle cx="86"  cy="66" r="2.2" fill="#d97150" opacity="0.85"/>
          <circle cx="316" cy="90" r="2.6" fill="#b9d8ff" opacity="0.9"/>
          <circle cx="322" cy="96" r="1.6" fill="#e0f0ff" opacity="0.8"/>
          <circle cx="328" cy="90" r="2"   fill="#b9d8ff" opacity="0.85"/>
          <circle cx="250" cy="132" r="2.8" fill="#ffd166" opacity="0.9"/>
          <circle cx="256" cy="138" r="1.6" fill="#fff0b0" opacity="0.8"/>
        </g>
        {/* glow halos on ore */}
        <circle cx="80" cy="68" r="14" fill="#d97150" opacity="0.12"/>
        <circle cx="322" cy="92" r="14" fill="#b9d8ff" opacity="0.12"/>
        <circle cx="252" cy="134" r="12" fill="#ffd166" opacity="0.12"/>
        {/* tree roots reaching down from the forest */}
        <g stroke="#2a1a0e" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round">
          <path d="M40 0 q -4 24, 4 50"/>
          <path d="M150 0 q 6 30, -6 56"/>
          <path d="M360 0 q 8 20, -4 48"/>
        </g>
      </svg>

      {/* buried Marketplace — interactive */}
      <button onClick={onMarket} style={{
        position: 'absolute', left: 20, bottom: 8, width: 96,
        background: 'transparent', border: 'none', padding: 0, cursor: 'not-allowed',
        pointerEvents: 'auto', opacity: 0.7,
      }}>
        <svg viewBox="0 0 120 90" width="100%" height="64">
          <rect x="6" y="14" width="108" height="68" fill="#1a0f06" stroke="#7a5028" strokeWidth="1.4" opacity="0.92"/>
          <line x1="6" y1="14" x2="14" y2="2" stroke="#7a5028" strokeWidth="2"/>
          <line x1="114" y1="14" x2="106" y2="2" stroke="#7a5028" strokeWidth="2"/>
          <line x1="6" y1="14" x2="114" y2="14" stroke="#3a2418" strokeWidth="2"/>
          <rect x="16" y="40" width="20" height="32" fill="#3fa9ff" opacity="0.85" stroke="#1a2230" strokeWidth="0.6"/>
          <rect x="44" y="40" width="20" height="32" fill="#39d36a" opacity="0.85" stroke="#1a2230" strokeWidth="0.6"/>
          <rect x="72" y="40" width="20" height="32" fill="#ffb347" opacity="0.85" stroke="#1a2230" strokeWidth="0.6"/>
          <line x1="6" y1="76" x2="114" y2="76" stroke="#3a2418" strokeWidth="2"/>
        </svg>
        <div style={{
          marginTop: 3,
          padding: '2px 7px',
          background: 'rgba(8,12,22,0.85)',
          border: '1px solid rgba(122,80,40,0.6)',
          borderRadius: 4,
          fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 8, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: '#9c8d70', textAlign: 'center',
        }}>🔒 Market · L5</div>
      </button>

      {/* subsurface label */}
      <div style={{
        position: 'absolute', right: 14, top: 10,
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
      <SceneBg image="../../assets/scenes/earth-day-sm.png" dim={0.7}/>
      <TopBar eyebrow="EARTH BASE · M2" title="Mission Board" onBack={onBack} />

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 96, overflowY: 'auto' }}>
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

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 96, overflowY: 'auto' }}>
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

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 120, overflowY: 'auto' }}>
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

// ──────────────────────────────────────────────────────────────────────
// BUILD & PLACE — the very first step. Two phases:
//   phase 'pick'  → choose a structure from the build list (only Launchpad
//                   available at start; others locked).
//   phase 'place' → tap a plot cell on the Earth Base ground to site it.
// ──────────────────────────────────────────────────────────────────────

function BuildPlaceScreen({ onPlaced, onBack }) {
  const { TopBar, Panel, PrimaryBtn, GhostBtn, StatusPill, SceneBg } = CH();
  const { BuildingArt, I } = IC();
  const [phase, setPhase] = useState((typeof window !== 'undefined' && window.LANDNAM_START && window.LANDNAM_START.buildPhase) || 'pick');
  const [picked, setPicked] = useState('launchpad');
  const [cell, setCell] = useState(null);

  const CATALOG = [
    { id: 'launchpad', name: 'Launchpad',        kind: 'launchpad', cost: 0,    desc: 'Assemble rockets and launch mining missions.', avail: true },
    { id: 'control',   name: 'Control Station',  kind: 'control',   cost: 500,  desc: 'Unlocks the contractor job board.', avail: false, req: 'M1' },
    { id: 'satellite', name: 'Satellite Station',kind: 'satellite', cost: 1800, desc: 'Scan TESS data, classify planet candidates.', avail: false, req: 'L5' },
    { id: 'market',    name: 'Marketplace',      kind: 'market',    cost: 2400, desc: 'Sell cargo at fluctuating live prices.', avail: false, req: 'L5' },
  ];
  const sel = CATALOG.find(c => c.id === picked);

  // plot grid — 4 cols × 2 rows of buildable tiles on the ground band
  const COLS = 4, ROWS = 2;
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ r, c, id: r * COLS + c });

  return (
    <div className="scene" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneBg image="../../assets/scenes/earth-day-sm.png" dim={phase === 'place' ? 0.35 : 0.12}/>

      <TopBar
        eyebrow={phase === 'pick' ? 'EARTH BASE · SETUP' : 'PLACE STRUCTURE'}
        title={phase === 'pick' ? 'Build' : 'Choose a Plot'}
        onBack={phase === 'place' ? () => setPhase('pick') : onBack}
      />

      {phase === 'pick' && (
        <div style={{ position: 'absolute', inset: 0, paddingTop: 128, paddingBottom: 120, overflowY: 'auto' }}>
          <div style={{ padding: '0 14px 8px' }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--ln-text-muted)', textTransform: 'uppercase' }}>Available Structures</div>
          </div>
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CATALOG.map(c => {
              const on = c.id === picked;
              return (
                <button key={c.id}
                  onClick={() => c.avail && setPicked(c.id)}
                  style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: c.avail ? 'pointer' : 'not-allowed', opacity: c.avail ? 1 : 0.5 }}>
                  <Panel accent={on ? '#f5a623' : '#3fa9ff'} style={{ padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 60, height: 60, flex: '0 0 auto', filter: c.avail ? 'none' : 'grayscale(0.7)' }}>
                        <BuildingArt kind={c.kind}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 800, fontSize: 15, color: on ? '#f5a623' : '#e6efff', letterSpacing: '0.02em' }}>{c.name}</div>
                        <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 11, color: '#a9b8ce', marginTop: 2, lineHeight: 1.35 }}>{c.desc}</div>
                        <div style={{ marginTop: 6 }}>
                          {c.avail
                            ? <StatusPill kind={c.cost === 0 ? 'ok' : 'amber'}>{c.cost === 0 ? 'Free · Starter' : '▲ ' + c.cost}</StatusPill>
                            : <StatusPill kind="mute">🔒 {c.req}</StatusPill>}
                        </div>
                      </div>
                      {on && <span style={{ color: '#f5a623', fontSize: 22 }}>✓</span>}
                    </div>
                  </Panel>
                </button>
              );
            })}
          </div>
          <div style={{ padding: '14px' }}>
            <PrimaryBtn kind="amber" onClick={() => setPhase('place')}>Select a Plot →</PrimaryBtn>
          </div>
        </div>
      )}

      {phase === 'place' && (
        <>
          {/* instruction banner */}
          <div style={{ position: 'absolute', left: 14, right: 14, top: 130, zIndex: 12 }}>
            <Panel accent="#f5a623" style={{ padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, flex: '0 0 auto' }}><BuildingArt kind={sel.kind} hot/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#f5a623', textTransform: 'uppercase' }}>Placing · {sel.name}</div>
                  <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 2 }}>{cell == null ? 'Tap a glowing pad on the surface.' : 'Pad chosen — confirm to build here.'}</div>
                </div>
              </div>
            </Panel>
          </div>

          {/* soil surface line — plots sit ON TOP of the soil, not inside it */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 702, height: 3, zIndex: 6,
            background: 'linear-gradient(90deg, transparent, rgba(255,225,160,0.55) 20%, rgba(255,225,160,0.55) 80%, transparent)' }}/>

          {/* a single row of building pads resting on the surface line */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 628, zIndex: 10, padding: '0 14px',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
            {[0,1,2,3].map(id => {
              const on = cell === id;
              return (
                <button key={id} onClick={() => setCell(id)} style={{
                  position: 'relative', flex: '1 1 0', maxWidth: 88, cursor: 'pointer',
                  background: 'transparent', border: 'none', padding: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  {/* structure preview floats above the selected pad */}
                  <div style={{ width: 64, height: 64, marginBottom: 2, opacity: on ? 1 : 0,
                    transform: on ? 'translateY(0)' : 'translateY(6px)', transition: 'all 160ms' }}>
                    {on && <BuildingArt kind={sel.kind} hot/>}
                  </div>
                  {/* the pad itself — an isometric-ish ground plate */}
                  <div style={{
                    width: '100%', height: 30, borderRadius: '50% / 60%',
                    background: on
                      ? 'radial-gradient(ellipse at 50% 35%, rgba(245,166,35,0.5), rgba(245,166,35,0.12) 70%)'
                      : 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.28), rgba(135,207,250,0.05) 70%)',
                    border: '2px dashed ' + (on ? '#f5a623' : 'rgba(135,207,250,0.6)'),
                    boxShadow: on ? '0 0 22px rgba(245,166,35,0.55)' : '0 2px 6px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: on ? 'none' : 'pad-pulse 1.8s ease-in-out infinite',
                    transition: 'all 160ms',
                  }}>
                    {!on && <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 20, fontWeight: 800, color: 'rgba(135,207,250,0.85)', marginTop: -2 }}>+</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* confirm CTA */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, padding: '10px 14px 24px', background: 'linear-gradient(180deg, transparent 0%, #06090fcc 30%, #06090f 100%)' }}>
            <PrimaryBtn kind="amber" disabled={cell == null} onClick={() => onPlaced(picked)}>Confirm · Build Here →</PrimaryBtn>
          </div>

          <style>{`@keyframes pad-pulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.05); opacity: 1; } }`}</style>
        </>
      )}
    </div>
  );
}

window.LandnamScreensPre = {
  HubScreen, MissionBoardScreen, TargetPickerScreen, FabScreen, GalaxyScreen, GameMenu, BuildPlaceScreen,
};

// ──────────────────────────────────────────────────────────────────────
// AmbientStars — 55 procedurally placed dots in the upper sky
// ──────────────────────────────────────────────────────────────────────
function AmbientStars() {
  const dots = React.useMemo(() => {
    const out = [];
    let seed = 1337;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 55; i++) {
      out.push({ x: rnd() * 100, y: rnd() * 92, r: 0.6 + rnd() * 1.4, o: 0.3 + rnd() * 0.6, d: 1.6 + rnd() * 2.8 });
    }
    return out;
  }, []);
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      {dots.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o}>
          <animate attributeName="opacity" values={`${s.o};${s.o * 0.25};${s.o}`} dur={s.d + 's'} repeatCount="indefinite"/>
        </circle>
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// ProgressionCard — contextual "what next" card, one at a time.
//   Priority: in-flight → launch-ready → debrief → build-control → next-mission
// ──────────────────────────────────────────────────────────────────────
function ProgressionCard({ player, onGoBuilding, onNav }) {
  let card;
  if (player.activeMission) {
    card = { accent: '#7ec8ff', eyebrow: 'Mission In Progress', title: player.activeMission.label, cta: 'Resume Mission', kind: 'info', go: () => onNav('resume') };
  } else if (player.pendingLaunch) {
    card = { accent: '#f5a623', eyebrow: 'Launch Ready on Pad', title: 'Vessel fuelled & assigned', cta: 'Open Launchpad', kind: 'amber', go: () => onGoBuilding('launchpad') };
  } else if (player.debriefPending) {
    card = { accent: '#39d36a', eyebrow: 'Mission Debrief Ready', title: 'Cargo awaiting sale', cta: 'Open Debrief', kind: 'ok', go: () => onNav('debrief') };
  } else {
    card = { accent: '#f5a623', eyebrow: 'Next Mission Available', title: player.missionCount + ' contracts on the board', cta: 'Open Launchpad', kind: 'amber', go: () => onGoBuilding('missions') };
  }
  return (
    <div style={{ position: 'absolute', left: 14, right: 14, top: 86, zIndex: 8, maxWidth: 300, pointerEvents: 'auto' }}>
      <button onClick={card.go} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'linear-gradient(180deg, rgba(10,18,29,0.86), rgba(6,12,22,0.9))',
        border: '1px solid ' + card.accent + '66',
        borderRadius: 12, padding: 10,
        backdropFilter: 'blur(8px)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.4), 0 0 16px ' + card.accent + '22',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 6, height: 36, borderRadius: 3, flex: '0 0 auto',
          background: card.accent, boxShadow: '0 0 10px ' + card.accent,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 800, letterSpacing: '0.2em', color: card.accent, textTransform: 'uppercase' }}>{card.eyebrow}</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 800, color: '#e6efff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</div>
        </div>
        <span style={{
          flex: '0 0 auto',
          padding: '5px 10px', borderRadius: 8,
          background: card.accent + '22', border: '1px solid ' + card.accent + '88',
          color: card.accent,
          fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>{card.cta} ›</span>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// GameMenu — modal overlay opened from the "Base" radial button.
//   Header: Logbook · Discoveries · Close.  Sections: Stats, Cargo, Settings.
// ──────────────────────────────────────────────────────────────────────
function GameMenu({ player, onClose }) {
  const { Panel, StatusPill, IconBtn } = CH();
  const { MineralGlyph } = IC();
  const { MINERAL_META } = D();
  const [tab, setTab] = useState('menu');

  const cargo = player.stash || { iron: 24, silicon: 40, ice: 12 };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      {/* scrim */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.72)', backdropFilter: 'blur(3px)' }}/>
      {/* sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, top: 40,
        background: 'linear-gradient(180deg, #0b1422 0%, #06090f 100%)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: '1px solid rgba(63,169,255,0.3)',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        animation: 'sheet-up 320ms cubic-bezier(.16,1,.3,1)',
      }}>
        {/* grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }}/>
        </div>
        {/* header */}
        <div style={{ padding: '10px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase' }}>PLANET HUNTERS</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: '#e6efff' }}>Base of Operations</div>
          </div>
          <IconBtn onClick={onClose} ariaLabel="close" size={34}>{IC().I.close()}</IconBtn>
        </div>
        {/* tab strip */}
        <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px' }}>
          {[['menu','Menu'],['logbook','Logbook'],['discoveries','Discoveries']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
              background: tab === id ? 'rgba(63,169,255,0.16)' : 'rgba(8,16,28,0.6)',
              border: '1px solid ' + (tab === id ? 'rgba(63,169,255,0.55)' : 'rgba(63,169,255,0.18)'),
              color: tab === id ? '#87CFFA' : '#7a8294',
              fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>{lbl}</button>
          ))}
        </div>
        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'menu' && <>
            {/* stats */}
            <Panel accent="#f5a623">
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase', marginBottom: 8 }}>Stats</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.2em', color: '#d68a0d', textTransform: 'uppercase' }}>Francs</div><div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 20, fontWeight: 800, color: '#f5a623' }}>▲ {player.francs.toLocaleString()}</div></div>
                <div><div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.2em', color: '#7a8294', textTransform: 'uppercase' }}>Missions Done</div><div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 20, fontWeight: 800, color: '#e6efff' }}>{player.missionsDone || 3}</div></div>
                <div><div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, letterSpacing: '0.2em', color: '#7a8294', textTransform: 'uppercase' }}>Level</div><div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 20, fontWeight: 800, color: '#87CFFA' }}>{player.level}</div></div>
              </div>
            </Panel>
            {/* cargo */}
            <Panel accent="#3fa9ff">
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase', marginBottom: 8 }}>Cargo Hold</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(cargo).map(([k, v]) => (
                  <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', background: 'rgba(8,16,28,0.7)', border: '1px solid ' + MINERAL_META[k].color + '55', borderRadius: 6 }}>
                    <MineralGlyph id={k} size={20}/>
                    <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800, color: MINERAL_META[k].color }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
            {/* settings */}
            <Panel accent="#5d7390">
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#7a8294', textTransform: 'uppercase', marginBottom: 10 }}>Settings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <MenuRow label="Practice Mining"/>
                <MenuRow label="Replay Tutorial"/>
                <MenuRow label="Dialogue" toggle/>
                <MenuRow label="Reset Progress" danger/>
              </div>
            </Panel>
          </>}
          {tab === 'logbook' && <Panel accent="#7ec8ff"><div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', lineHeight: 1.5 }}>
            <b style={{ color: '#e6efff' }}>Mission Log</b><br/>
            · M1 · Iron for Foundry-3 — <span style={{ color: '#39d36a' }}>Delivered ★★★</span><br/>
            · M1 · Silicon Mass Order — <span style={{ color: '#39d36a' }}>Delivered ★★</span><br/>
            · M2 · Cryos Ice Run — <span style={{ color: '#ffb347' }}>In progress</span>
          </div></Panel>}
          {tab === 'discoveries' && <Panel accent="#c084ff"><div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', lineHeight: 1.5 }}>
            <b style={{ color: '#e6efff' }}>Classified Targets</b><br/>
            · Mars — Iron field mapped<br/>
            · Asteroid Belt — Rare anomaly flagged<br/>
            · <span style={{ color: '#7a8294' }}>3 candidates pending TESS review (L5)</span>
          </div></Panel>}
        </div>
      </div>
      <style>{`@keyframes sheet-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

function MenuRow({ label, toggle, danger }) {
  const [on, setOn] = useState(true);
  return (
    <button onClick={() => toggle && setOn(o => !o)} style={{
      display: 'flex', alignItems: 'center', width: '100%',
      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
      background: 'rgba(8,16,28,0.6)',
      border: '1px solid ' + (danger ? 'rgba(255,90,106,0.4)' : 'rgba(63,169,255,0.18)'),
      color: danger ? '#ff8290' : '#cde4ff',
      fontFamily: 'var(--ln-font-display)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {toggle
        ? <span style={{ width: 36, height: 20, borderRadius: 999, background: on ? '#39d36a' : '#2a3340', position: 'relative', transition: 'background 160ms' }}>
            <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'left 160ms' }}/>
          </span>
        : <span style={{ color: '#5d7390' }}>›</span>}
    </button>
  );
}

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

      <div style={{ position: 'absolute', inset: 0, paddingTop: 72, paddingBottom: 96, overflowY: 'auto' }}>
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
