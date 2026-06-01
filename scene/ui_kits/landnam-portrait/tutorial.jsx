/* global React, window */
// Landnam — Tutorial / onboarding layer.
//   - TutorialCoach: pinned coach + speech card + spotlight cutout, step counter
//   - UnlockPopup:   SR2 unlock, Free-Ops unlock, generic reward popups
//   - BuildGatePrompt: "Build the Control Station" gate between M1 and M2
// Exposed via window.LandnamTutorial.

const { useState, useEffect, useRef } = React;

function CH() { return window.LandnamChrome; }
function IC() { return window.LandnamIcons; }

// ──────────────────────────────────────────────────────────────────────
// Coached step script.  Each step binds to a SCREEN; the coach card text +
// the call-to-action highlight live here so the flow is data-driven.
//   anchor: where the speech card points  ('top'|'bottom'|'center')
//   spot:   {x,y,w,h} region (in 402×874 canvas px) to spotlight, or null
//   cta:    label shown on the highlighted control (purely descriptive)
// ──────────────────────────────────────────────────────────────────────
const M1_STEPS = [
  { id: 1, screen: 'hub',     title: 'Welcome, Commander',
    body: 'Your first contract is waiting. Open the radial menu and tap NEW MISSION to begin.',
    anchor: 'bottom', spot: { x: 169, y: 786, w: 64, h: 64 }, cta: 'New Mission' },
  { id: 2, screen: 'missions', title: 'Lock a Contract',
    body: 'Pick a mining company. They name the minerals they want and pay a bonus on delivery.',
    anchor: 'top', spot: { x: 14, y: 150, w: 374, h: 150 }, cta: 'Choose a buyer' },
  { id: 3, screen: 'targets',  title: 'Choose a Destination',
    body: 'Tap an asteroid on the map. Closer = faster trip; its composition decides your haul.',
    anchor: 'bottom', spot: { x: 20, y: 150, w: 362, h: 360 }, cta: 'Tap a target' },
  { id: 4, screen: 'fab',      title: 'Assemble the Rocket',
    body: 'Your Starter Rocket SR1 is pre-loaded. Tap PROCEED to confirm the build.',
    anchor: 'top', spot: { x: 14, y: 150, w: 374, h: 250 }, cta: 'Proceed' },
  { id: 5, screen: 'fab',      title: 'Launch',
    body: 'Everything checks out. Tap CONFIRM LAUNCH — the rocket departs immediately.',
    anchor: 'bottom', spot: { x: 14, y: 760, w: 374, h: 70 }, cta: 'Confirm Launch' },
  { id: 6, screen: 'mining',   title: 'Arrival',
    body: 'You\'ve reached the asteroid. Tap ore deposits to fire the mining laser.',
    anchor: 'center', spot: null, cta: 'Tap ore' },
  { id: 7, screen: 'mining',   title: 'Fill the Order',
    body: 'Mine the exact quantities your contract asked for. Watch the order panel fill up.',
    anchor: 'bottom', spot: { x: 14, y: 470, w: 374, h: 150 }, cta: 'Fill the order' },
  { id: 8, screen: 'mining',   title: 'Return Home',
    body: 'Order complete. Tap RETURN to bring your haul back to Earth Base.',
    anchor: 'bottom', spot: { x: 14, y: 760, w: 374, h: 70 }, cta: 'Return' },
  { id: 9, screen: 'debrief',  title: 'Debrief',
    body: 'Sell your cargo and collect the contractor bonus. That\'s one mission in the books!',
    anchor: 'bottom', spot: { x: 14, y: 760, w: 374, h: 70 }, cta: 'Collect' },
];

// ──────────────────────────────────────────────────────────────────────
// Coach character glyph — a friendly helmeted operator bust
// ──────────────────────────────────────────────────────────────────────
function CoachAvatar({ size = 44, talking }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flex: '0 0 auto',
      background: 'radial-gradient(circle at 32% 28%, #6cc2ff, #2d8de0 60%, #1c4f86)',
      border: '2px solid #aef',
      boxShadow: '0 0 14px rgba(63,169,255,0.7), inset 0 2px 0 rgba(255,255,255,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      animation: talking ? 'coach-bob 1.2s ease-in-out infinite' : 'none',
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        {/* helmet */}
        <path d="M5 13 a7 7 0 0 1 14 0 v3 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 z" fill="#0a1422" stroke="#cde4ff" strokeWidth="1.2"/>
        {/* visor */}
        <path d="M7.5 11 a4.5 4.5 0 0 1 9 0 v2 h-9 z" fill="#87CFFA"/>
        {/* visor shine */}
        <ellipse cx="10" cy="11" rx="1.4" ry="2" fill="#fff" opacity="0.7"/>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// TutorialCoach — full overlay: dimmer + spotlight + speech card + pinned coach
// ──────────────────────────────────────────────────────────────────────
function TutorialCoach({ stepIndex, steps, onNext, onSkip, ctaReady }) {
  const step = steps[stepIndex];
  if (!step) return null;
  const total = steps.length;

  // Spotlight: a transparent hole with a huge box-shadow acting as the dimmer.
  const spot = step.spot;
  const cardTop = step.anchor === 'top' ? 150
    : step.anchor === 'center' ? 360
    : 560;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, pointerEvents: 'none' }}>
      {/* dimmer + spotlight cutout */}
      {spot ? (
        <div style={{
          position: 'absolute',
          left: spot.x, top: spot.y, width: spot.w, height: spot.h,
          borderRadius: 14,
          boxShadow: '0 0 0 9999px rgba(3,6,12,0.78)',
          border: '2px solid #f5a623',
          animation: 'coach-spot 1.6s ease-in-out infinite',
          pointerEvents: 'none',
        }}/>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.55)' }}/>
      )}

      {/* speech card */}
      <div style={{
        position: 'absolute', left: 14, right: 14, top: cardTop, zIndex: 82,
        pointerEvents: 'auto',
      }}>
        <div style={{
          background: 'linear-gradient(180deg, #0d1c30 0%, #081120 100%)',
          border: '1px solid rgba(135,207,250,0.5)',
          borderRadius: 16,
          padding: 14,
          boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 24px rgba(63,169,255,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <CoachAvatar size={44} talking/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#87CFFA', textTransform: 'uppercase' }}>Mission Coach</span>
                <span style={{ flex: 1 }}/>
                <span style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#7a8294', letterSpacing: '0.12em' }}>{stepIndex + 1} / {total}</span>
              </div>
              <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: '#e6efff', marginTop: 4 }}>{step.title}</div>
              <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', marginTop: 4, lineHeight: 1.45 }}>{step.body}</div>
            </div>
          </div>

          {/* progress dots + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {steps.map((s, i) => (
                <span key={i} style={{
                  width: i === stepIndex ? 16 : 6, height: 6, borderRadius: 999,
                  background: i < stepIndex ? '#39d36a' : i === stepIndex ? '#f5a623' : 'rgba(135,207,250,0.25)',
                  transition: 'all 200ms',
                }}/>
              ))}
            </div>
            <span style={{ flex: 1 }}/>
            <button onClick={onSkip} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5d7390',
            }}>Skip</button>
            <button onClick={onNext} style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', border: 'none',
              background: ctaReady
                ? 'linear-gradient(180deg, #6cf09a, #1ea54a)'
                : 'linear-gradient(180deg, #6cc2ff, #2d8de0)',
              color: ctaReady ? '#02180c' : '#06121f',
              fontFamily: 'var(--ln-font-display)', fontSize: 12, fontWeight: 800,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {step.cta} <span>›</span>
            </button>
          </div>
        </div>
        {/* pointer toward the spotlight */}
        {spot && step.anchor === 'bottom' && (
          <div style={{ position: 'absolute', left: Math.min(Math.max(spot.x + spot.w/2 - 14, 20), 360), top: -10, width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '12px solid #0d1c30' }}/>
        )}
      </div>

      <style>{`
        @keyframes coach-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes coach-spot { 0%,100% { box-shadow: 0 0 0 9999px rgba(3,6,12,0.78), 0 0 0 0 rgba(245,166,35,0.0); } 50% { box-shadow: 0 0 0 9999px rgba(3,6,12,0.78), 0 0 18px 2px rgba(245,166,35,0.5); } }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// UnlockPopup — celebratory reveal (SR2, Free Ops, etc.)
// ──────────────────────────────────────────────────────────────────────
const UNLOCKS = {
  sr2: {
    accent: '#3fa9ff',
    eyebrow: 'Vehicle Unlocked',
    title: 'STARTER ROCKET 2',
    body: 'Faster, longer range, and 1.5× cargo capacity. Now available at the Launchpad.',
    art: 'rocket',
    stats: [['RANGE', '+60%'], ['CARGO', '×1.5'], ['SPEED', '+40%']],
    cta: 'Outstanding',
  },
  freeops: {
    accent: '#f5a623',
    eyebrow: 'Milestone Reached',
    title: 'FREE OPERATIONS',
    body: 'All authored missions complete. The Marketplace is open, the mission cap is lifted — you\'re in command now.',
    art: 'star',
    stats: [['MARKET', 'OPEN'], ['MISSIONS', '∞'], ['COACH', 'OFF']],
    cta: 'Take Command',
  },
  loan: {
    accent: '#ffb347',
    eyebrow: 'Offer',
    title: 'EMERGENCY LOAN',
    body: 'Running low on Francs? The Foundry Guild offers a 5,000 F advance, repaid from your next two deliveries.',
    art: 'coin',
    stats: [['ADVANCE', '5,000 F'], ['TERM', '2 RUNS'], ['RATE', '8%']],
    cta: 'Accept Loan',
  },
};

function UnlockPopup({ kind, onClose }) {
  const u = UNLOCKS[kind] || UNLOCKS.sr2;
  const { Planet } = IC();
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.8)', backdropFilter: 'blur(3px)' }}/>
      <div style={{
        position: 'relative', width: 320, maxWidth: '90%',
        background: 'linear-gradient(180deg, #0d1c30 0%, #060d18 100%)',
        border: '1px solid ' + u.accent + '88',
        borderRadius: 20, padding: 22, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px ' + u.accent + '33',
        animation: 'unlock-in 420ms cubic-bezier(.16,1,.3,1)',
      }}>
        {/* burst rays */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', left: '50%', top: 70, width: 300, height: 300,
            transform: 'translate(-50%,-50%)',
            background: 'conic-gradient(from 0deg, ' + u.accent + '22 0deg, transparent 18deg, ' + u.accent + '22 36deg, transparent 54deg, ' + u.accent + '22 72deg, transparent 90deg, ' + u.accent + '22 108deg, transparent 126deg, ' + u.accent + '22 144deg, transparent 162deg, ' + u.accent + '22 180deg, transparent 198deg, ' + u.accent + '22 216deg, transparent 234deg, ' + u.accent + '22 252deg, transparent 270deg, ' + u.accent + '22 288deg, transparent 306deg, ' + u.accent + '22 324deg, transparent 342deg, ' + u.accent + '22 360deg)',
            animation: 'unlock-spin 18s linear infinite',
          }}/>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', color: u.accent, textTransform: 'uppercase' }}>{u.eyebrow}</div>

          {/* art */}
          <div style={{ margin: '14px auto', width: 96, height: 96, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: 999, background: 'radial-gradient(circle, ' + u.accent + '44, transparent 70%)' }}/>
            <UnlockArt kind={u.art} accent={u.accent}/>
          </div>

          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', color: '#fff', textShadow: '0 0 18px ' + u.accent + '88' }}>{u.title}</div>
          <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 13, color: '#a9b8ce', marginTop: 8, lineHeight: 1.5 }}>{u.body}</div>

          {/* stat chips */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {u.stats.map(([k, v]) => (
              <div key={k} style={{ flex: 1, padding: '8px 4px', background: 'rgba(8,16,28,0.7)', border: '1px solid ' + u.accent + '44', borderRadius: 10 }}>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', color: '#7a8294', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 15, fontWeight: 800, color: u.accent, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <button onClick={onClose} style={{
            width: '100%', marginTop: 18, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, ' + u.accent + ', ' + IC().darken(u.accent, 0.35) + ')',
            color: '#04121f', fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)',
          }}>{u.cta}</button>
        </div>
      </div>
      <style>{`
        @keyframes unlock-in { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes unlock-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}

function UnlockArt({ kind, accent }) {
  if (kind === 'rocket') return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <defs><linearGradient id="ua-body" x1="0" x2="1"><stop offset="0%" stopColor="#eaf3ff"/><stop offset="100%" stopColor="#7a93b5"/></linearGradient></defs>
      <path d="M48 8 L62 34 L62 70 L34 70 L34 34 Z" fill="url(#ua-body)" stroke="#1a2230" strokeWidth="1.2"/>
      <path d="M48 8 L62 34 L34 34 Z" fill={accent}/>
      <circle cx="48" cy="42" r="6" fill="#f5a623" stroke="#1a2230"/>
      <path d="M34 60 L22 78 L34 72 M62 60 L74 78 L62 72" fill={accent} stroke="#1a2230"/>
      <path d="M40 70 L48 90 L56 70" fill="#f5a623"/>
    </svg>
  );
  if (kind === 'coin') return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="34" fill="radial-gradient(#ffe1a8,#d68a0d)" stroke="#8a5300" strokeWidth="2"/>
      <circle cx="48" cy="48" r="34" fill="#f5a623" stroke="#8a5300" strokeWidth="2"/>
      <circle cx="48" cy="48" r="26" fill="none" stroke="#fff1d0" strokeWidth="1.5" opacity="0.6"/>
      <text x="48" y="60" textAnchor="middle" fontFamily="var(--ln-font-display)" fontSize="34" fontWeight="800" fill="#7a4f00">▲</text>
    </svg>
  );
  // star
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <path d="M48 8 L58 38 L90 39 L64 58 L74 90 L48 70 L22 90 L32 58 L6 39 L38 38 Z" fill={accent} stroke="#fff" strokeWidth="1.5" opacity="0.95"/>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// BuildGatePrompt — between M1 and M2: place the Control Station
// ──────────────────────────────────────────────────────────────────────
function BuildGatePrompt({ onBuild, onClose, francs }) {
  const cost = 500000000;
  const afford = francs >= cost;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 88, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(3,6,12,0.7)' }}/>
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(180deg, #0d1c30, #060d18)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: '1px solid rgba(245,166,35,0.5)',
        padding: '18px 16px 26px',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
        animation: 'gate-up 360ms cubic-bezier(.16,1,.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }}/>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, flex: '0 0 auto' }}>
            <window.LandnamIcons.BuildingArt kind="control"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 800, letterSpacing: '0.22em', color: '#f5a623', textTransform: 'uppercase' }}>Build Required</div>
            <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 18, fontWeight: 800, color: '#e6efff' }}>Control Station</div>
            <div style={{ fontFamily: 'var(--ln-font-body)', fontSize: 12, color: '#a9b8ce', marginTop: 4, lineHeight: 1.4 }}>Unlocks the contractor job board and re-enables the Missions tab.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: '#7a8294', textTransform: 'uppercase' }}>Cost</div>
          <div style={{ fontFamily: 'var(--ln-font-display)', fontSize: 16, fontWeight: 800, color: afford ? '#f5a623' : '#ff5a6a' }}>▲ 500,000,000</div>
          <span style={{ flex: 1 }}/>
          <div style={{ fontFamily: 'var(--ln-font-mono)', fontSize: 10, color: '#5d7390' }}>Bal ▲ {francs.toLocaleString()}</div>
        </div>
        <button onClick={onBuild} disabled={!afford} style={{
          width: '100%', marginTop: 14, padding: '15px', borderRadius: 12, border: 'none',
          cursor: afford ? 'pointer' : 'not-allowed',
          background: 'linear-gradient(180deg, #ffc25c, #d68a0d)', color: '#1d0c00',
          fontFamily: 'var(--ln-font-display)', fontSize: 14, fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.5), 0 4px 0 rgba(0,0,0,0.3)',
          opacity: afford ? 1 : 0.5,
        }}>Build · Place on Earth Base</button>
      </div>
      <style>{`@keyframes gate-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

window.LandnamTutorial = { M1_STEPS, TutorialCoach, CoachAvatar, UnlockPopup, BuildGatePrompt };
