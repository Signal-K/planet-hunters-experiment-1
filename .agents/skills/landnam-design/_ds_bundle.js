/* @ds-bundle: {"format":3,"namespace":"LandnamDesignSystem_019e2e","components":[],"sourceHashes":{"ui_kits/landnam-game/Chrome.jsx":"8e52c1eecf95","ui_kits/landnam-portrait/app.tsx":"fb74d04c4d6c","ui_kits/landnam-portrait/chrome.tsx":"db66e677a26f","ui_kits/landnam-portrait/data.tsx":"b7a4e7869d9e","ui_kits/landnam-portrait/icons.tsx":"56056e41aa8d","ui_kits/landnam-portrait/ios-frame.tsx":"90961321bf7c","ui_kits/landnam-portrait/screens-loop.tsx":"14ba68c7b546","ui_kits/landnam-portrait/screens-pre.tsx":"51f4802c6422","ui_kits/landnam-portrait/tutorial.tsx":"07ffcd8e4f4e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LandnamDesignSystem_019e2e = window.LandnamDesignSystem_019e2e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/landnam-game/Chrome.jsx
try { (() => {
/* global window.* — page chrome primitives for the Landnam kit */

const {
  useState,
  useEffect,
  useRef,
  useLayoutEffect
} = React;

// ── Stage: scales the 1920×1080 canvas to fit the viewport ────────────
function Stage({
  children,
  variant
}) {
  const wrapRef = useRef(null);
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
  return /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    className: cls
  }, children);
}

// ── Button ─────────────────────────────────────────────────────────────
function Button({
  variant = 'primary',
  children,
  size = 'md',
  icon,
  onClick,
  style
}) {
  const [hov, setHov] = useState(false);
  const [act, setAct] = useState(false);
  const base = {
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
    userSelect: 'none'
  };
  const sizes = {
    sm: {
      padding: '8px 16px',
      fontSize: 14,
      borderRadius: 6
    },
    md: {
      padding: '12px 22px',
      fontSize: 18,
      borderRadius: 8
    },
    lg: {
      padding: '18px 32px',
      fontSize: 22,
      borderRadius: 14
    }
  };
  const variants = {
    primary: {
      background: act ? '#1c87dc' : hov ? '#6cc2ff' : '#3fa9ff',
      color: '#061226',
      boxShadow: '0 4px 0 rgba(0,0,0,0.25)'
    },
    secondary: {
      background: hov ? 'rgba(63,169,255,0.10)' : 'transparent',
      color: '#e6efff',
      border: '1px solid rgba(63,169,255,0.45)'
    },
    amber: {
      background: act ? '#d68a0d' : hov ? '#ffc25c' : '#f5a623',
      color: '#1a1304'
    },
    ghost: {
      background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
      color: '#a9b8ce'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...style
    },
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => {
      setHov(false);
      setAct(false);
    },
    onMouseDown: () => setAct(true),
    onMouseUp: () => setAct(false),
    onClick: onClick
  }, icon, children);
}

// ── Top bar — used in the launchpad ───────────────────────────────────
function TopBar({
  title,
  eyebrow,
  right,
  level,
  francs
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      padding: '24px 48px',
      gap: 24,
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, "\u2190")
  }, "Back"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 8
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "ln-eyebrow",
    style: {
      color: 'var(--ln-text-muted)',
      marginBottom: 4
    }
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 36,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: '#e6efff'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), level != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 8,
      padding: '8px 14px',
      border: '1px solid var(--ln-hairline)',
      borderRadius: 8,
      background: '#0a121d'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ln-label",
    style: {
      fontSize: 12,
      color: '#5d7390'
    }
  }, "LV"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 700,
      fontSize: 22
    }
  }, "04")), francs != null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 10,
      padding: '8px 16px',
      border: '1px solid rgba(245,166,35,0.55)',
      borderRadius: 999,
      background: '#0a121d'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 700,
      fontSize: 22,
      color: '#f5a623'
    }
  }, "\u25B2 ", francs.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    className: "ln-label",
    style: {
      fontSize: 12,
      color: '#a9b8ce'
    }
  }, "F")), right);
}

// ── Bottom bar (Launchpad pattern) ────────────────────────────────────
function Seg({
  check,
  label,
  color,
  last
}) {
  const c = check === 'amber' ? '#f5a623' : check === 'cyan' ? '#3fa9ff' : '#5d7390';
  const bg = check === 'amber' ? 'rgba(245,166,35,0.16)' : check === 'cyan' ? 'rgba(63,169,255,0.16)' : 'transparent';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 28px',
      borderRight: last ? 'none' : '1px solid var(--ln-hairline)',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 999,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: c,
      border: `1px solid ${c}`,
      background: bg,
      fontSize: 13,
      fontWeight: 700
    }
  }, check ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 600,
      fontSize: 16,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: c === '#5d7390' ? '#a9b8ce' : c
    }
  }, label));
}
function BottomBar({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 120,
      background: 'linear-gradient(180deg, rgba(6,9,15,0) 0%, rgba(6,9,15,0.85) 30%, rgba(6,9,15,1) 100%)',
      borderTop: '1px solid var(--ln-hairline)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: 0,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  Stage,
  Button,
  TopBar,
  BottomBar,
  Seg
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-game/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/app.tsx
try { (() => {
/* global React, window */
// Landnam Portrait — root state machine

const {
  useState
} = React;
function LandnamApp() {
  const D = window.LandnamData;
  const CH = window.LandnamChrome;
  const SP = window.LandnamScreensPre;
  const SL = window.LandnamScreensLoop;
  const TUT = window.LandnamTutorial;

  // Deep-link: storyboard frames set window.LANDNAM_START before mount.
  const START = typeof window !== 'undefined' && window.LANDNAM_START || {};
  const [screen, setScreen] = useState(START.screen || 'build');
  const [built, setBuilt] = useState(START.built != null ? START.built : false);
  const [player, setPlayer] = useState({
    francs: 1240,
    level: 4,
    xp: 2140,
    activeMission: START.activeMission || null,
    missionCount: D.MISSIONS.filter(m => !m.locked).length,
    pendingLaunch: false
  });
  const [missionId, setMissionId] = useState(START.missionId || null);
  const [targetId, setTargetId] = useState(START.targetId || null);
  const [rocket, setRocket] = useState({
    chassis: 'hull-mk1',
    propulsion: 'ion-a1',
    drill: 'hand-drill'
  });
  const [lastCargo, setLastCargo] = useState(START.cargo || null);
  const [menuOpen, setMenuOpen] = useState(!!START.menu);
  // ── Tutorial / onboarding state ──────────────────────────────────
  const [tutorial, setTutorial] = useState(START.tutorial !== false); // M1 coached run active
  const [doneSteps, setDoneSteps] = useState(START.doneSteps || {}); // step.id -> true
  const [subStep, setSubStep] = useState(0); // index within same-screen steps
  const [popup, setPopup] = useState(START.popup || null); // 'sr2' | 'freeops' | 'loan'
  const [buildGate, setBuildGate] = useState(!!START.gate); // Control Station gate

  // The coach is screen-driven and NON-BLOCKING. It only ever points at the
  // real control; the player performs the action themselves. For "manual" info
  // steps (no game action) a small "Got it" advances the narration in place.
  const stepsHere = tutorial ? TUT.M1_STEPS.filter(s => s.screen === screen && !doneSteps[s.id]) : [];
  const coach = stepsHere[0] || null;
  const coachIndex = coach ? TUT.M1_STEPS.findIndex(s => s.id === coach.id) : -1;

  // advance a manual (info-only) step — does NOT perform any game action
  function coachManualNext() {
    if (coach) setDoneSteps(d => ({
      ...d,
      [coach.id]: true
    }));
  }
  const mission = missionId ? D.MISSIONS.find(m => m.id === missionId) : null;
  const target = targetId ? D.TARGETS.find(t => t.id === targetId) : null;
  function go(s) {
    setScreen(s);
  }
  function onPickMission(id) {
    setMissionId(id);
    setTargetId(null);
    go('targets');
  }
  function onPickTarget(id) {
    setTargetId(id);
    // auto-suggest a starting build so the user sees a valid rocket immediately
    const next = D.suggestBuild({
      mission,
      target: D.TARGETS.find(t => t.id === id),
      level: player.level
    });
    setRocket(next);
    go('fab');
  }
  function onLaunch() {
    setPlayer(p => ({
      ...p,
      pendingLaunch: false,
      activeMission: {
        id: mission.id,
        label: mission.title + ' → ' + target.name
      }
    }));
    go('transit');
  }
  function onMiningDone(cargo) {
    setLastCargo(cargo);
    go('debrief');
  }
  function onDebriefDone(total, xp) {
    setPlayer(p => ({
      ...p,
      francs: p.francs + total,
      xp: p.xp + xp,
      activeMission: null
    }));
    setLastCargo(null);
    setMissionId(null);
    setTargetId(null);
    // If this was the coached M1 run, end coaching and reward SR2.
    if (tutorial) {
      setTutorial(false);
      setPopup('sr2');
    } else go('hub');
  }
  const showNav = ['hub', 'missions', 'targets', 'fab', 'galaxy'].includes(screen);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: '#06090f'
    }
  }, screen === 'build' && /*#__PURE__*/React.createElement(SP.BuildPlaceScreen, {
    onPlaced: () => {
      setBuilt(true);
      go('hub');
    },
    onBack: () => go('hub')
  }), screen === 'hub' && /*#__PURE__*/React.createElement(SP.HubScreen, {
    player: player,
    onGoBuilding: b => {
      if (b === 'missions') return go('missions');
      if (b === 'launchpad') {
        // launchpad direct entry: route through missions to keep the
        // mission-first flow correct
        return go('missions');
      }
      // satellite / market are locked — no-op
    },
    onNav: go
  }), screen === 'missions' && /*#__PURE__*/React.createElement(SP.MissionBoardScreen, {
    player: player,
    onBack: () => go('hub'),
    onPick: onPickMission
  }), screen === 'galaxy' && /*#__PURE__*/React.createElement(SP.GalaxyScreen, {
    onBack: () => go('hub'),
    onPickStar: () => go('missions')
  }), screen === 'targets' && mission && /*#__PURE__*/React.createElement(SP.TargetPickerScreen, {
    mission: mission,
    onBack: () => go('missions'),
    onPick: onPickTarget
  }), screen === 'fab' && mission && target && /*#__PURE__*/React.createElement(SP.FabScreen, {
    mission: mission,
    target: target,
    rocket: rocket,
    onChange: (slot, id) => setRocket(r => ({
      ...r,
      [slot]: id
    })),
    onSuggest: () => setRocket(D.suggestBuild({
      mission,
      target,
      level: player.level
    })),
    onLaunch: onLaunch,
    onBack: () => go('targets')
  }), screen === 'transit' && mission && target && /*#__PURE__*/React.createElement(SL.TransitScreen, {
    rocket: rocket,
    target: target,
    mission: mission,
    onArrive: () => go('mining'),
    onBack: () => go('hub')
  }), screen === 'mining' && mission && target && /*#__PURE__*/React.createElement(SL.MiningScreen, {
    rocket: rocket,
    target: target,
    mission: mission,
    onComplete: onMiningDone,
    onBack: () => go('hub')
  }), screen === 'debrief' && /*#__PURE__*/React.createElement(SL.DebriefScreen, {
    mission: mission,
    target: target,
    cargo: lastCargo || {},
    onDone: onDebriefDone
  }), showNav && /*#__PURE__*/React.createElement(CH.RadialMenu, {
    current: screen === 'missions' || screen === 'targets' ? 'missions' : screen === 'fab' ? 'fab' : screen === 'galaxy' ? 'galaxy' : 'hub',
    onNav: id => {
      if (id === 'hub') setMenuOpen(true); // "Base" → Game Menu overlay
      if (id === 'missions') go('missions');
      if (id === 'galaxy') go('galaxy');
      if (id === 'fab') {
        if (!mission || !target) go('missions');else go('fab');
      }
    }
  }), menuOpen && /*#__PURE__*/React.createElement(SP.GameMenu, {
    player: {
      ...player,
      missionsDone: 3
    },
    onClose: () => setMenuOpen(false)
  }), coach && /*#__PURE__*/React.createElement(TUT.TutorialCoach, {
    stepIndex: coachIndex,
    steps: TUT.M1_STEPS,
    step: coach,
    total: TUT.M1_STEPS.length,
    onManualNext: coachManualNext,
    onSkip: () => setTutorial(false)
  }), buildGate && /*#__PURE__*/React.createElement(TUT.BuildGatePrompt, {
    francs: player.francs,
    onBuild: () => {
      setBuildGate(false);
      setPlayer(p => ({
        ...p,
        controlBuilt: true
      }));
    },
    onClose: () => setBuildGate(false)
  }), popup && /*#__PURE__*/React.createElement(TUT.UnlockPopup, {
    kind: popup,
    onClose: () => {
      const k = popup;
      setPopup(null);
      if (k === 'sr2') {
        go('hub');
        setBuildGate(true);
      } // SR2 → prompt build
    }
  }), !START.hideDev && /*#__PURE__*/React.createElement(DevTutorialBar, {
    onReplay: () => {
      setTutorial(true);
      setDoneSteps({});
      setSubStep(0);
      go('hub');
    },
    onSR2: () => setPopup('sr2'),
    onFreeOps: () => setPopup('freeops'),
    onLoan: () => setPopup('loan'),
    onGate: () => setBuildGate(true)
  }));
}

// small dev affordance so reviewers can summon each onboarding component
function DevTutorialBar({
  onReplay,
  onSR2,
  onFreeOps,
  onLoan,
  onGate
}) {
  const [open, setOpen] = useState(false);
  const chip = (label, fn) => /*#__PURE__*/React.createElement("button", {
    onClick: fn,
    style: {
      padding: '5px 9px',
      borderRadius: 7,
      cursor: 'pointer',
      background: 'rgba(8,16,28,0.85)',
      border: '1px solid rgba(135,207,250,0.4)',
      color: '#9EDCFF',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    }
  }, label);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 8,
      top: 8,
      zIndex: 95,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      width: 30,
      height: 30,
      borderRadius: 999,
      cursor: 'pointer',
      background: 'rgba(8,16,28,0.85)',
      border: '1px solid rgba(135,207,250,0.4)',
      color: '#9EDCFF',
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 13,
      fontWeight: 800
    }
  }, open ? '×' : '?'), open && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, chip('▶ Replay M1', onReplay), chip('SR2 Unlock', onSR2), chip('Build Gate', onGate), chip('Free Ops', onFreeOps), chip('Loan Offer', onLoan)));
}
window.LandnamApp = LandnamApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/app.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/chrome.tsx
try { (() => {
/* global React, window */
// Landnam — Shared chrome (TopBar, BottomNav, panels, buttons)
// Exposed via window.LandnamChrome.

const {
  useState,
  useEffect
} = React;

// ──────────────────────────────────────────────────────────────────────
// TopBar — sits over the scene, no opaque chrome
// ──────────────────────────────────────────────────────────────────────
function TopBar({
  eyebrow,
  title,
  onBack,
  right,
  dense
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      padding: '18px 14px 12px 14px',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.92) 0%, rgba(6,9,15,0.5) 70%, transparent 100%)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      pointerEvents: 'auto'
    }
  }, onBack ? /*#__PURE__*/React.createElement(IconBtn, {
    onClick: onBack,
    ariaLabel: "back"
  }, window.LandnamIcons.I.back()) : /*#__PURE__*/React.createElement(IconBtn, {
    ariaLabel: "menu"
  }, window.LandnamIcons.I.menu())), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      pointerEvents: 'none'
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.24em',
      textTransform: 'uppercase',
      color: 'var(--ln-text-muted)'
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '2px 0 0 0',
      fontFamily: 'var(--ln-font-display)',
      fontSize: dense ? 18 : 22,
      fontWeight: 800,
      letterSpacing: '-0.01em',
      color: 'var(--ln-text)',
      lineHeight: 1,
      textShadow: '0 2px 8px rgba(0,0,0,0.5)'
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      pointerEvents: 'auto',
      display: 'flex',
      gap: 6
    }
  }, right));
}

// ──────────────────────────────────────────────────────────────────────
// IconBtn — circular glass button
// ──────────────────────────────────────────────────────────────────────
function IconBtn({
  children,
  onClick,
  ariaLabel,
  color = '#cde4ff',
  size = 38
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    "aria-label": ariaLabel,
    style: {
      width: size,
      height: size,
      flex: '0 0 auto',
      borderRadius: 999,
      background: 'rgba(8,16,28,0.7)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(63,169,255,0.35)',
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0
    }
  }, children);
}

// ──────────────────────────────────────────────────────────────────────
// HUD — currency / level strip on the hub
// ──────────────────────────────────────────────────────────────────────
function HUDStrip({
  player
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 54,
      right: 14,
      zIndex: 20,
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Chip, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#7ec8ff'
    }
  }, "LV"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 14
    }
  }, player.level)), /*#__PURE__*/React.createElement(Chip, {
    amber: true
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#d68a0d'
    }
  }, "\u25B2"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 14
    }
  }, player.francs.toLocaleString())));
}
function Chip({
  amber,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      background: 'rgba(8,16,28,0.78)',
      backdropFilter: 'blur(6px)',
      border: '1px solid ' + (amber ? 'rgba(245,166,35,0.55)' : 'rgba(63,169,255,0.35)'),
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.14em',
      color: amber ? '#f5a623' : '#cde4ff',
      textTransform: 'uppercase'
    }
  }, children);
}

// ──────────────────────────────────────────────────────────────────────
// StatusPill
// ──────────────────────────────────────────────────────────────────────
function StatusPill({
  kind = 'ok',
  children,
  dim
}) {
  const tones = {
    ok: {
      bg: 'rgba(57,211,106,0.18)',
      fg: '#39d36a'
    },
    warn: {
      bg: 'rgba(255,179,71,0.18)',
      fg: '#ffb347'
    },
    crit: {
      bg: 'rgba(255,90,106,0.18)',
      fg: '#ff5a6a'
    },
    info: {
      bg: 'rgba(126,200,255,0.18)',
      fg: '#7ec8ff'
    },
    amber: {
      bg: 'rgba(245,166,35,0.18)',
      fg: '#f5a623'
    },
    mute: {
      bg: 'rgba(169,184,206,0.10)',
      fg: '#7a8294'
    }
  };
  const t = tones[kind] || tones.ok;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      opacity: dim ? 0.7 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 999,
      background: t.fg,
      boxShadow: '0 0 6px ' + t.fg
    }
  }), children);
}

// ──────────────────────────────────────────────────────────────────────
// Panel — corner-bracketed dark panel
// ──────────────────────────────────────────────────────────────────────
function Panel({
  children,
  style,
  accent = '#3fa9ff'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(18,34,54,0.78) 0%, rgba(10,18,29,0.82) 100%)',
      border: '1px solid ' + accent + '40',
      borderRadius: 12,
      padding: 14,
      backdropFilter: 'blur(8px)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(Corners, {
    c: accent
  }), children);
}
function Corners({
  c
}) {
  const sty = pos => ({
    position: 'absolute',
    width: 10,
    height: 10,
    [pos.includes('t') ? 'top' : 'bottom']: -1,
    [pos.includes('l') ? 'left' : 'right']: -1,
    ['border' + (pos.includes('t') ? 'Top' : 'Bottom')]: '1.5px solid ' + c,
    ['border' + (pos.includes('l') ? 'Left' : 'Right')]: '1.5px solid ' + c
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: sty('tl')
  }), /*#__PURE__*/React.createElement("span", {
    style: sty('tr')
  }), /*#__PURE__*/React.createElement("span", {
    style: sty('bl')
  }), /*#__PURE__*/React.createElement("span", {
    style: sty('br')
  }));
}

// ──────────────────────────────────────────────────────────────────────
// Buttons
// ──────────────────────────────────────────────────────────────────────
function PrimaryBtn({
  children,
  onClick,
  disabled,
  full = true,
  kind = 'cyan'
}) {
  const grads = {
    cyan: ['#6cc2ff', '#2d8de0', '#06121f', 'rgba(63,169,255,0.4)'],
    amber: ['#ffc25c', '#d68a0d', '#1d0c00', 'rgba(245,166,35,0.4)'],
    green: ['#6cf09a', '#1ea54a', '#02180c', 'rgba(57,211,106,0.4)']
  };
  const [h1, h2, fg, glow] = grads[kind] || grads.cyan;
  return /*#__PURE__*/React.createElement("button", {
    onClick: !disabled ? onClick : undefined,
    disabled: disabled,
    style: {
      width: full ? '100%' : 'auto',
      padding: '16px 22px',
      background: 'linear-gradient(180deg, ' + h1 + ' 0%, ' + h2 + ' 100%)',
      color: fg,
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 16,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      border: 'none',
      borderRadius: 12,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3), 0 0 22px ' + glow,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      opacity: disabled ? 0.4 : 1,
      filter: disabled ? 'saturate(0.5)' : 'none'
    }
  }, children);
}
function GhostBtn({
  children,
  onClick,
  full = true
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      width: full ? '100%' : 'auto',
      padding: '12px 18px',
      background: 'rgba(8,16,28,0.6)',
      color: '#a9b8ce',
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      border: '1px solid rgba(169,184,206,0.18)',
      borderRadius: 10,
      cursor: 'pointer'
    }
  }, children);
}

// ──────────────────────────────────────────────────────────────────────
// Scene wrapper with parallax bg image + foreground content
// Renders Earth1.png (or other scene image) full-bleed beneath children
// ──────────────────────────────────────────────────────────────────────
function SceneBg({
  image,
  dim = 0.2,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'url(' + image + ')',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'saturate(1.02) brightness(' + (1 - dim) + ')'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, rgba(6,9,15,0.45) 0%, transparent 22%, transparent 74%, rgba(6,9,15,0.45) 100%)'
    }
  }), children);
}

// ──────────────────────────────────────────────────────────────────────
// Pokémon-GO style radial menu.
// A single round hub button floats bottom-center; tapping it fans out
// satellite icon-buttons on an arc. Each satellite has its own color,
// bounces in with stagger, wiggles on hover, and pulses if "hot".
// ──────────────────────────────────────────────────────────────────────
function RadialMenu({
  current,
  onNav,
  items
}) {
  const {
    useState
  } = React;
  const [open, setOpen] = useState(false);
  const I = window.LandnamIcons.I;
  const MENU = items || [{
    id: 'hub',
    label: 'Base',
    glyph: I.hub(),
    color: '#39d36a'
  }, {
    id: 'missions',
    label: 'Missions',
    glyph: I.contract(),
    color: '#f5a623'
  }, {
    id: 'galaxy',
    label: 'Atlas',
    glyph: I.atlas(),
    color: '#7ec8ff'
  }, {
    id: 'fab',
    label: 'Build',
    glyph: I.rocket(),
    color: '#c084ff'
  }];

  // fan the satellites across a 160° arc centered straight up
  const N = MENU.length;
  const spread = 150; // degrees
  const start = -90 - spread / 2; // leftmost
  const radius = 96;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      height: 150,
      pointerEvents: 'none'
    }
  }, open && /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(false),
    style: {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'auto',
      background: 'radial-gradient(60% 50% at 50% 100%, rgba(3,6,12,0.55), transparent 70%)'
    }
  }), MENU.map((m, i) => {
    const ang = (start + spread / (N - 1) * i) * Math.PI / 180;
    const dx = Math.cos(ang) * radius;
    const dy = Math.sin(ang) * radius;
    const active = current === m.id;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: () => {
        onNav(m.id);
        setOpen(false);
      },
      className: "radial-sat",
      style: {
        position: 'absolute',
        left: '50%',
        bottom: 28,
        transform: open ? `translate(calc(-50% + ${dx}px), ${dy}px) scale(1)` : 'translate(-50%, 0) scale(0.2)',
        opacity: open ? 1 : 0,
        transition: `transform 360ms cubic-bezier(.34,1.56,.64,1) ${i * 45}ms, opacity 240ms ${i * 45}ms`,
        pointerEvents: open ? 'auto' : 'none',
        width: 54,
        height: 54,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "radial-sat-inner",
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 54,
        height: 54,
        borderRadius: 999,
        background: active ? `radial-gradient(circle at 32% 28%, ${m.color}, ${m.color}cc 70%, ${m.color}88)` : 'rgba(10,18,29,0.92)',
        border: '1.5px solid ' + (active ? '#fff' : m.color + '99'),
        boxShadow: active ? `0 0 0 2px ${m.color}55, 0 0 18px ${m.color}aa, 0 6px 14px rgba(0,0,0,0.5)` : `0 0 12px ${m.color}44, 0 6px 14px rgba(0,0,0,0.5)`,
        color: active ? '#06121f' : m.color,
        backdropFilter: 'blur(6px)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, m.glyph)), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--ln-font-display)',
        fontSize: 8,
        fontWeight: 800,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: active ? '#fff' : m.color,
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)'
      }
    }, m.label));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      width: 64,
      height: 64,
      borderRadius: 999,
      border: '2px solid rgba(255,255,255,0.85)',
      background: 'radial-gradient(circle at 32% 28%, #6cc2ff, #2d8de0 60%, #1c6ab8)',
      boxShadow: open ? '0 0 0 3px rgba(63,169,255,0.35), 0 0 26px rgba(63,169,255,0.8), 0 8px 18px rgba(0,0,0,0.6)' : '0 0 0 3px rgba(63,169,255,0.25), 0 0 18px rgba(63,169,255,0.55), 0 8px 18px rgba(0,0,0,0.6)',
      cursor: 'pointer',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'box-shadow 200ms'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 6,
      borderRadius: 999,
      border: '1px solid rgba(255,255,255,0.4)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#06121f',
      display: 'inline-flex',
      transition: 'transform 320ms cubic-bezier(.34,1.56,.64,1)',
      transform: open ? 'rotate(135deg)' : 'rotate(0deg)'
    }
  }, open ? /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 19c0-3 3-9 7-9s7 6 7 9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "9",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 21c-1.5-1-2-2-2-3M12 21c1.5-1 2-2 2-3"
  }))), !open && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: -2,
      borderRadius: 999,
      border: '2px solid rgba(108,194,255,0.6)',
      animation: 'radial-pulse 2.2s ease-out infinite'
    }
  })), /*#__PURE__*/React.createElement("style", null, `
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
      `));
}

// keep old name as alias so app.jsx keeps working
function BottomNav({
  current,
  onNav,
  glassy
}) {
  return /*#__PURE__*/React.createElement(RadialMenu, {
    current: current,
    onNav: onNav
  });
}

// ──────────────────────────────────────────────────────────────────────
// Toasts / inline error rows
// ──────────────────────────────────────────────────────────────────────
function ErrorRow({
  children
}) {
  const I = window.LandnamIcons.I;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '8px 10px',
      background: 'rgba(255,90,106,0.10)',
      border: '1px solid rgba(255,90,106,0.45)',
      borderRadius: 8,
      color: '#ff8290',
      fontFamily: 'var(--ln-font-body)',
      fontSize: 12,
      lineHeight: 1.35
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      color: '#ff5a6a',
      marginTop: 1
    }
  }, I.warning()), /*#__PURE__*/React.createElement("span", null, children));
}
window.LandnamChrome = {
  TopBar,
  IconBtn,
  HUDStrip,
  Chip,
  StatusPill,
  Panel,
  Corners,
  PrimaryBtn,
  GhostBtn,
  SceneBg,
  BottomNav,
  RadialMenu,
  ErrorRow
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/chrome.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/data.tsx
try { (() => {
/* global window */
// Landnam — data + validation helpers
// All shared via window.LandnamData so other JSX files can read it.

// ─── Minerals ────────────────────────────────────────────────────────
const MINERAL_META = {
  silicon: {
    name: 'Silicon',
    sym: 'Si',
    color: '#b9d8ff',
    price: 8
  },
  iron: {
    name: 'Iron',
    sym: 'Fe',
    color: '#d97150',
    price: 12
  },
  ice: {
    name: 'Ice',
    sym: 'H₂O',
    color: '#9becff',
    price: 14
  },
  carbon: {
    name: 'Carbon',
    sym: 'C',
    color: '#6a7280',
    price: 6
  },
  gold: {
    name: 'Gold',
    sym: 'Au',
    color: '#ffd166',
    price: 90
  },
  rare: {
    name: 'Rare',
    sym: '??',
    color: '#c084ff',
    price: 220
  }
};

// ─── Stars (galaxy atlas) ────────────────────────────────────────────
const STARS = [{
  id: 'vega',
  name: 'VEGA',
  dist: '25.1 ly',
  x: 22,
  y: 12,
  kind: 'cool'
}, {
  id: 'procyon',
  name: 'PROCYON',
  dist: '11.46 ly',
  x: 70,
  y: 18,
  kind: 'pale'
}, {
  id: 'sirius',
  name: 'SIRIUS',
  dist: '8.60 ly',
  x: 80,
  y: 36,
  kind: 'cool'
}, {
  id: 'sol',
  name: 'SOL',
  dist: '0.00 ly',
  x: 50,
  y: 50,
  kind: 'sol'
}, {
  id: 'alpha',
  name: 'α CENTAURI',
  dist: '4.37 ly',
  x: 30,
  y: 60,
  kind: 'warm'
}, {
  id: 'barnard',
  name: 'BARNARD',
  dist: '5.96 ly',
  x: 60,
  y: 70,
  kind: 'red'
}, {
  id: 'altair',
  name: 'ALTAIR',
  dist: '16.7 ly',
  x: 24,
  y: 84,
  kind: 'pale'
}, {
  id: 'wolf',
  name: 'WOLF 359',
  dist: '7.86 ly',
  x: 78,
  y: 80,
  kind: 'red'
}];
const STAR_LINKS = [['vega', 'procyon'], ['procyon', 'sol'], ['sirius', 'sol'], ['sol', 'alpha'], ['sol', 'barnard'], ['alpha', 'wolf'], ['barnard', 'altair']];

// ─── Targets (Sol system) ────────────────────────────────────────────
// minerals: which ores it yields (probability-weighted, in order)
// orbit:   1-8, drives travel range requirement
// difficulty: extraction difficulty 1-3 (drives min drill tier guidance)
const TARGETS = [{
  id: 'mercury',
  name: 'Mercury',
  orbit: 1,
  color: '#a89788',
  minerals: ['silicon', 'iron'],
  difficulty: 1,
  brief: 'Hot, cratered, silicon-rich crust.'
}, {
  id: 'venus',
  name: 'Venus',
  orbit: 2,
  color: '#e6c074',
  minerals: ['carbon', 'silicon'],
  difficulty: 2,
  brief: 'Acid clouds. Carbon plates near the poles.'
}, {
  id: 'earth',
  name: 'Earth',
  orbit: 3,
  color: '#6ba3d8',
  minerals: [],
  difficulty: 0,
  brief: 'Home base. No mining permitted.',
  hub: true
}, {
  id: 'mars',
  name: 'Mars',
  orbit: 4,
  color: '#d97150',
  minerals: ['iron', 'silicon'],
  difficulty: 1,
  brief: 'Iron-rich regolith, gentle gravity.',
  recommended: true
}, {
  id: 'belt',
  name: 'Asteroid Belt',
  orbit: 5,
  color: '#c9c1a8',
  minerals: ['iron', 'gold', 'rare'],
  difficulty: 2,
  brief: 'Loose rubble. Gold pockets, rare anomalies.'
}, {
  id: 'jupiter',
  name: 'Jupiter',
  orbit: 6,
  color: '#d4a06a',
  minerals: ['ice', 'rare'],
  difficulty: 3,
  brief: 'Skim the upper bands for compressed ice.',
  moonOnly: true
}, {
  id: 'saturn',
  name: 'Saturn',
  orbit: 7,
  color: '#e6d4a0',
  minerals: ['ice', 'gold'],
  difficulty: 3,
  brief: 'Ring fragments — beautiful and lethal.'
}, {
  id: 'neptune',
  name: 'Neptune',
  orbit: 8,
  color: '#5a8dd0',
  minerals: ['ice'],
  difficulty: 3,
  brief: 'Frigid methane storms. Pure ice cores.'
}];

// ─── Parts ───────────────────────────────────────────────────────────
const ART = '../../assets/parts/';
const PARTS = {
  chassis: [{
    id: 'hull-mk1',
    name: 'HULL-MK1',
    tier: 1,
    mass: 60,
    cargo: 60,
    img: ART + 'basic_hull_t1.png'
  }, {
    id: 'hull-mk2',
    name: 'HULL-MK2',
    tier: 2,
    mass: 90,
    cargo: 120,
    img: ART + 'reinforced_hull_t2.png'
  }, {
    id: 'frame-x12',
    name: 'FRAME-X12',
    tier: 2,
    mass: 110,
    cargo: 180,
    img: ART + 'cargo_bay_t1.png'
  }, {
    id: 'vessel-x12',
    name: 'VESSEL-X12 HEAVY',
    tier: 3,
    mass: 140,
    cargo: 240,
    locked: true,
    unlockAt: 'L5',
    img: ART + 'reinforced_hull_t2.png'
  }],
  // power → max_orbit reachable (rough heuristic for "range")
  propulsion: [{
    id: 'ion-a1',
    name: 'ION-A1',
    tier: 1,
    power: 4,
    max_orbit: 3,
    img: ART + 'basic_thruster_t1.png'
  }, {
    id: 'hydra-v',
    name: 'HYDRA-V',
    tier: 2,
    power: 8,
    max_orbit: 5,
    img: ART + 'fusion_drive_t2.png'
  }, {
    id: 'vulcan-ix',
    name: 'VULCAN-IX',
    tier: 3,
    power: 12,
    max_orbit: 8,
    img: ART + 'ion_drive_t3.png'
  }, {
    id: 'antimatter',
    name: 'ANTI-MATTER',
    tier: 4,
    power: 22,
    max_orbit: 12,
    locked: true,
    unlockAt: 'L7',
    img: ART + 'ion_drive_t3.png'
  }],
  // drill tier required for different difficulty deposits
  drill: [{
    id: 'hand-drill',
    name: 'HAND-DRILL',
    tier: 1,
    rate: 1,
    img: ART + 'mining_drill_t1.png'
  }, {
    id: 'pulse-drill',
    name: 'PULSE-DRILL',
    tier: 2,
    rate: 2,
    img: ART + 'mining_drill_t1.png'
  }, {
    id: 'cryo-cutter',
    name: 'CRYO-CUTTER',
    tier: 2,
    rate: 2,
    img: ART + 'mining_drill_t1.png'
  }, {
    id: 'plasma-lance',
    name: 'PLASMA-LANCE',
    tier: 3,
    rate: 3,
    locked: true,
    unlockAt: 'L6',
    img: ART + 'mining_drill_t1.png'
  }]
};

// ─── Contractors ─────────────────────────────────────────────────────
const CONTRACTORS = {
  helios: {
    id: 'helios',
    name: 'Helios Mining Co.',
    color: '#ff8a4a',
    glyph: 'sun',
    affinity: 2
  },
  cryos: {
    id: 'cryos',
    name: 'Cryos Labs',
    color: '#9becff',
    glyph: 'snow',
    affinity: 1
  },
  guild: {
    id: 'guild',
    name: 'Foundry Guild',
    color: '#ffd166',
    glyph: 'anvil',
    affinity: 3
  },
  beacon: {
    id: 'beacon',
    name: 'Beacon Relay',
    color: '#7ec8ff',
    glyph: 'wave',
    affinity: 0
  },
  sirius: {
    id: 'sirius',
    name: 'Sirius Survey',
    color: '#c084ff',
    glyph: 'star',
    affinity: 0
  }
};

// ─── Missions ────────────────────────────────────────────────────────
// requires:
//   minerals: { id: amount }     — what must be in the cargo on return
//   cargo_min: number            — minimum chassis cargo capacity
//   drill_tier: number           — minimum drill tier
//   max_orbit: number            — target orbit must be <= this (mission scope)
const MISSIONS = [{
  id: 'm-iron-foundry',
  contractor: 'helios',
  title: 'Iron for Foundry-3',
  brief: 'Helios needs raw iron to keep the orbital foundry running this cycle. Inner-system run.',
  requires: {
    minerals: {
      iron: 20
    },
    cargo_min: 60,
    drill_tier: 1,
    max_orbit: 5
  },
  payout: {
    francs: 480,
    xp: 120,
    affinity: 1
  },
  difficulty: 'M1',
  tag: 'STARTER',
  hot: true
}, {
  id: 'm-cryos-ice',
  contractor: 'cryos',
  title: 'Cryos Ice Run',
  brief: 'Three barrels of clean ice for the Jovian moonbase. Cold-rated drill recommended.',
  requires: {
    minerals: {
      ice: 30
    },
    cargo_min: 100,
    drill_tier: 2,
    max_orbit: 7
  },
  payout: {
    francs: 1200,
    xp: 320,
    affinity: 2
  },
  difficulty: 'M2',
  tag: 'CONTRACT'
}, {
  id: 'm-belt-gold',
  contractor: 'guild',
  title: 'Belt Prospect · Gold',
  brief: 'The Foundry Guild wants a sample of belt-grade gold. Bring back at least 3 units.',
  requires: {
    minerals: {
      gold: 3,
      iron: 10
    },
    cargo_min: 80,
    drill_tier: 2,
    max_orbit: 5
  },
  payout: {
    francs: 2200,
    xp: 480,
    affinity: 2
  },
  difficulty: 'M2',
  tag: 'PROSPECT'
}, {
  id: 'm-silicon-mass',
  contractor: 'helios',
  title: 'Silicon Mass Order',
  brief: 'Large volume order. Bring back 40 units of silicon from anywhere.',
  requires: {
    minerals: {
      silicon: 40
    },
    cargo_min: 80,
    drill_tier: 1,
    max_orbit: 5
  },
  payout: {
    francs: 720,
    xp: 180,
    affinity: 1
  },
  difficulty: 'M1',
  tag: 'BULK'
}, {
  id: 'm-rare-anomaly',
  contractor: 'sirius',
  title: 'Rare Anomaly Trace',
  brief: 'Survey detected rare-element anomalies in the belt. Bring back any rare sample.',
  requires: {
    minerals: {
      rare: 1
    },
    cargo_min: 60,
    drill_tier: 2,
    max_orbit: 5
  },
  payout: {
    francs: 3200,
    xp: 720,
    affinity: 4
  },
  difficulty: 'M3',
  tag: 'BOUNTY'
}, {
  id: 'm-locked-deepfreeze',
  contractor: 'beacon',
  title: 'Neptune Deep Freeze',
  brief: 'Sample pure-core ice from Neptune. Requires antimatter propulsion.',
  requires: {
    minerals: {
      ice: 40
    },
    cargo_min: 180,
    drill_tier: 3,
    max_orbit: 12
  },
  payout: {
    francs: 8400,
    xp: 1800,
    affinity: 6
  },
  difficulty: 'L7',
  tag: 'LOCKED',
  locked: true,
  unlockAt: 'L7'
}];

// ─── Compatibility / validation helpers ──────────────────────────────

// Which targets in TARGETS could satisfy this mission's mineral list?
function compatibleTargetsFor(mission) {
  if (!mission) return [];
  const needed = Object.keys(mission.requires.minerals);
  return TARGETS.filter(t => {
    if (t.hub) return false;
    if (t.orbit > mission.requires.max_orbit) return false;
    // target must yield every mineral the mission asks for
    return needed.every(n => t.minerals.includes(n));
  });
}

// Full constraint check for a built rocket against a mission + target.
// Returns { ok, problems: string[] }
function validateBuild({
  mission,
  target,
  rocket
}) {
  const problems = [];
  const chassis = PARTS.chassis.find(p => p.id === rocket.chassis);
  const propulsion = PARTS.propulsion.find(p => p.id === rocket.propulsion);
  const drill = PARTS.drill.find(p => p.id === rocket.drill);
  if (!chassis || !propulsion || !drill) {
    problems.push('All three slots must be filled');
    return {
      ok: false,
      problems,
      chassis,
      propulsion,
      drill
    };
  }
  if (chassis.locked) problems.push(chassis.name + ' is locked');
  if (propulsion.locked) problems.push(propulsion.name + ' is locked');
  if (drill.locked) problems.push(drill.name + ' is locked');
  if (mission) {
    const cargoNeeded = Object.values(mission.requires.minerals).reduce((a, b) => a + b, 0);
    const cargoMin = Math.max(mission.requires.cargo_min, cargoNeeded);
    if (chassis.cargo < cargoMin) {
      problems.push(`Cargo too small · need ≥ ${cargoMin} U, have ${chassis.cargo} U`);
    }
    if (drill.tier < mission.requires.drill_tier) {
      problems.push(`Drill too weak · need T${mission.requires.drill_tier}+, have T${drill.tier}`);
    }
  }
  if (target) {
    if (propulsion.max_orbit < target.orbit) {
      problems.push(`Propulsion can't reach ${target.name} · need orbit ≥ ${target.orbit}, ${propulsion.name} only reaches ${propulsion.max_orbit}`);
    }
  }
  return {
    ok: problems.length === 0,
    problems,
    chassis,
    propulsion,
    drill
  };
}

// Cheapest valid auto-build (for "Suggest Build" button)
function suggestBuild({
  mission,
  target,
  level = 4
}) {
  // find lowest-tier chassis with enough cargo
  const cargoMin = Math.max(mission ? mission.requires.cargo_min : 0, mission ? Object.values(mission.requires.minerals).reduce((a, b) => a + b, 0) : 0);
  const chassis = PARTS.chassis.find(p => !p.locked && p.cargo >= cargoMin) || PARTS.chassis[0];
  const propulsion = PARTS.propulsion.find(p => !p.locked && p.max_orbit >= target.orbit) || PARTS.propulsion[0];
  const drillTierMin = mission ? mission.requires.drill_tier : target.difficulty;
  const drill = PARTS.drill.find(p => !p.locked && p.tier >= drillTierMin) || PARTS.drill[0];
  return {
    chassis: chassis.id,
    propulsion: propulsion.id,
    drill: drill.id
  };
}

// Compute francs for a returned cargo
function sellCargo(cargo) {
  return Object.entries(cargo).reduce((a, [k, v]) => a + (MINERAL_META[k]?.price || 0) * v, 0);
}

// Rate a mission outcome (1–3 stars)
function rateMission({
  mission,
  cargo,
  elapsed
}) {
  if (!mission) {
    // sandbox mission — rate on cargo fill
    const total = Object.values(cargo).reduce((a, b) => a + b, 0);
    return total > 100 ? 3 : total > 50 ? 2 : 1;
  }
  // Did we hit each mineral requirement?
  const need = mission.requires.minerals;
  let stars = 0;
  const allHit = Object.entries(need).every(([k, v]) => (cargo[k] || 0) >= v);
  if (allHit) stars = 2;
  // Bonus: hit each by 50%+
  const surplus = Object.entries(need).every(([k, v]) => (cargo[k] || 0) >= v * 1.5);
  if (allHit && surplus) stars = 3;
  if (!allHit) stars = 1;
  return stars;
}
window.LandnamData = {
  MINERAL_META,
  STARS,
  STAR_LINKS,
  TARGETS,
  PARTS,
  CONTRACTORS,
  MISSIONS,
  compatibleTargetsFor,
  validateBuild,
  suggestBuild,
  sellCargo,
  rateMission
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/data.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/icons.tsx
try { (() => {
/* global React, window */
// Landnam — Icons & SVG glyphs.
// Real game-art for buildings, planets and contractor marks.
// Exposed via window.LandnamIcons.

// ──────────────────────────────────────────────────────────────────────
// Stroke icons (24px, currentColor)
// ──────────────────────────────────────────────────────────────────────

const Stroke = ({
  d,
  c = [],
  size = 22,
  strokeWidth = 2,
  fill,
  children
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: fill || "none",
  stroke: "currentColor",
  strokeWidth: strokeWidth,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, d && /*#__PURE__*/React.createElement("path", {
  d: d
}), c.map((p, i) => /*#__PURE__*/React.createElement("path", {
  key: i,
  d: p
})), children);
const I = {
  back: () => /*#__PURE__*/React.createElement(Stroke, {
    d: "M15 6l-6 6 6 6",
    strokeWidth: 2.4
  }),
  menu: () => /*#__PURE__*/React.createElement(Stroke, {
    c: ["M4 7h16", "M4 12h16", "M4 17h16"]
  }),
  close: () => /*#__PURE__*/React.createElement(Stroke, {
    c: ["M6 6l12 12", "M18 6l-12 12"],
    strokeWidth: 2.4
  }),
  hub: () => /*#__PURE__*/React.createElement(Stroke, {
    c: ["M3 11l9-7 9 7", "M5 10v9h14v-9", "M10 19v-5h4v5"]
  }),
  atlas: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "12",
    x2: "21",
    y2: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3 a 14 14 0 0 1 0 18 M12 3 a 14 14 0 0 0 0 18"
  })),
  rocket: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 2 C 8 6 7 11 8 16 L 16 16 C 17 11 16 6 12 2 Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 16 L6 21 L9 19 M16 16 L18 21 L15 19"
  })),
  contract: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "3",
    width: "16",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 8h8M8 12h8M8 16h5"
  })),
  cargo: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "7",
    width: "18",
    height: "13",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 7 L7 3 L17 3 L21 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "13",
    x2: "15",
    y2: "13"
  })),
  bolt: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("path", {
    d: "M13 2 L5 14 L11 14 L9 22 L19 9 L13 9 Z",
    fill: "currentColor"
  })),
  drill: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("path", {
    d: "M14 2 L20 8 L14 14 Z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "8",
    x2: "4",
    y2: "18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 14 L2 22 L10 20"
  })),
  check: () => /*#__PURE__*/React.createElement(Stroke, {
    d: "M4 12 L10 18 L20 6",
    strokeWidth: 3
  }),
  star: () => /*#__PURE__*/React.createElement(Stroke, {
    d: "M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z",
    fill: "currentColor"
  }),
  starOff: () => /*#__PURE__*/React.createElement(Stroke, {
    d: "M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"
  }),
  warning: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3 L22 20 L2 20 Z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "10",
    x2: "12",
    y2: "14"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "17",
    r: "0.6",
    fill: "currentColor",
    stroke: "none"
  })),
  lock: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "14",
    height: "10",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11 V 7 a 4 4 0 0 1 8 0 V 11"
  })),
  flame: () => /*#__PURE__*/React.createElement(Stroke, {
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2 C 8 6 6 10 8 14 C 4 14 4 18 8 21 C 5 18 10 16 11 12 C 13 16 16 14 16 11 C 18 14 20 17 17 21 C 22 19 20 13 14 11 C 15 7 14 4 12 2 Z",
    stroke: "none"
  })),
  satellite: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "6",
    height: "6",
    rx: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12h7M15 12h7M12 2v7M12 15v7M5 5l3 3M16 16l3 3M19 5l-3 3M5 19l3-3"
  })),
  ping: () => /*#__PURE__*/React.createElement(Stroke, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 12 a 4 4 0 0 1 8 0 M5 12 a 7 7 0 0 1 14 0"
  }))
};

// ──────────────────────────────────────────────────────────────────────
// Planet renderers — each planet a recognizable little disc
// (used in the system atlas and as the target preview thumb)
// ──────────────────────────────────────────────────────────────────────

function Planet({
  id,
  size = 64
}) {
  const s = size;
  const r = s / 2;
  // common: glowing disc with subtle highlight
  const baseLight = '#ffffff',
    baseShadow = '#000';
  const dot = (cx, cy, rr, c, op = 1) => /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: cy,
    r: rr,
    fill: c,
    opacity: op
  });
  switch (id) {
    case 'mercury':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "35%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#d9c4a8"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "60%",
        stopColor: "#a89788"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#4a3d30"
      }))), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), dot(r * 0.6, r * 0.7, r * 0.10, '#3d3328', 0.55), dot(r * 1.2, r * 0.9, r * 0.07, '#3d3328', 0.45), dot(r * 0.8, r * 1.3, r * 0.08, '#3d3328', 0.5), dot(r * 1.4, r * 1.4, r * 0.05, '#3d3328', 0.4));
    case 'venus':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "40%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#fff1c0"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "60%",
        stopColor: "#e6c074"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#5a4218"
      }))), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r,
        cy: r * 0.7,
        rx: r * 0.8,
        ry: r * 0.1,
        fill: "#fff",
        opacity: "0.18"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r,
        cy: r * 1.1,
        rx: r * 0.7,
        ry: r * 0.08,
        fill: "#fff",
        opacity: "0.14"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r,
        cy: r * 1.5,
        rx: r * 0.6,
        ry: r * 0.07,
        fill: "#fff",
        opacity: "0.10"
      }));
    case 'earth':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "35%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#aacfff"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "55%",
        stopColor: "#3d7bb8"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#0e2540"
      }))), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), /*#__PURE__*/React.createElement("path", {
        d: `M ${r * 0.6} ${r * 0.8} q ${r * 0.2} ${-r * 0.1} ${r * 0.4} 0 q ${r * 0.2} ${r * 0.2} 0 ${r * 0.3} q ${-r * 0.3} ${r * 0.1} ${-r * 0.4} ${-r * 0.1} Z`,
        fill: "#3da050",
        opacity: "0.85"
      }), /*#__PURE__*/React.createElement("path", {
        d: `M ${r * 0.5} ${r * 1.4} q ${r * 0.2} ${-r * 0.05} ${r * 0.5} ${r * 0.05} q ${r * 0.05} ${r * 0.2} ${-r * 0.2} ${r * 0.2} q ${-r * 0.2} 0 ${-r * 0.3} ${-r * 0.25} Z`,
        fill: "#3da050",
        opacity: "0.85"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r * 0.8,
        cy: r * 0.45,
        rx: r * 0.3,
        ry: r * 0.08,
        fill: "#fff",
        opacity: "0.45"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r * 1.3,
        cy: r * 1.6,
        rx: r * 0.25,
        ry: r * 0.07,
        fill: "#fff",
        opacity: "0.4"
      }));
    case 'mars':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "35%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#ffa46a"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "60%",
        stopColor: "#d97150"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#4a1a08"
      }))), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), /*#__PURE__*/React.createElement("path", {
        d: `M ${r * 0.7} ${r * 0.2} q ${r * 0.3} ${-r * 0.1} ${r * 0.6} 0 q ${-r * 0.3} ${r * 0.18} ${-r * 0.6} 0 Z`,
        fill: "#fff",
        opacity: "0.85"
      }), /*#__PURE__*/React.createElement("path", {
        d: `M ${r * 0.8} ${r * 1.85} q ${r * 0.3} ${r * 0.05} ${r * 0.45} 0 q ${-r * 0.25} ${-r * 0.18} ${-r * 0.45} 0 Z`,
        fill: "#fff",
        opacity: "0.8"
      }), dot(r * 0.7, r * 0.9, r * 0.08, '#3a1a0b', 0.6), dot(r * 1.2, r * 1.1, r * 0.1, '#3a1a0b', 0.55), dot(r * 1.4, r * 0.75, r * 0.05, '#3a1a0b', 0.5));
    case 'belt':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, [...Array(28)].map((_, i) => {
        const a = i / 28 * Math.PI * 2;
        const rr = r * (0.85 + i % 3 * 0.04);
        return /*#__PURE__*/React.createElement("circle", {
          key: i,
          cx: r + Math.cos(a) * rr,
          cy: r + Math.sin(a) * rr,
          r: 1.5 + i % 3 * 0.6,
          fill: "#c9c1a8",
          opacity: 0.7 + i % 2 * 0.2
        });
      }), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: "2",
        fill: "#5d7390"
      }));
    case 'jupiter':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "35%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#f7d8a3"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "60%",
        stopColor: "#d4a06a"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#4a2810"
      }))), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), /*#__PURE__*/React.createElement("rect", {
        x: 1,
        y: r * 0.55,
        width: s - 2,
        height: r * 0.18,
        fill: "#9a6a35",
        opacity: "0.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: 1,
        y: r * 0.95,
        width: s - 2,
        height: r * 0.12,
        fill: "#f7e2b5",
        opacity: "0.45"
      }), /*#__PURE__*/React.createElement("rect", {
        x: 1,
        y: r * 1.25,
        width: s - 2,
        height: r * 0.18,
        fill: "#9a6a35",
        opacity: "0.4"
      }), /*#__PURE__*/React.createElement("rect", {
        x: 1,
        y: r * 1.55,
        width: s - 2,
        height: r * 0.10,
        fill: "#f7e2b5",
        opacity: "0.4"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r * 1.3,
        cy: r * 1.1,
        rx: r * 0.18,
        ry: r * 0.10,
        fill: "#d04830",
        opacity: "0.7"
      }));
    case 'saturn':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s + 10,
        viewBox: `0 0 ${s} ${s + 10}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "35%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#f9e6b3"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "60%",
        stopColor: "#e6d4a0"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#5a4218"
      }))), /*#__PURE__*/React.createElement("ellipse", {
        cx: r,
        cy: r + 5,
        rx: r * 1.45,
        ry: r * 0.18,
        fill: "none",
        stroke: "#bda87a",
        strokeWidth: "2.5",
        opacity: "0.7"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r,
        cy: r + 5,
        rx: r * 1.25,
        ry: r * 0.14,
        fill: "none",
        stroke: "#9a8550",
        strokeWidth: "1.5",
        opacity: "0.6"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r + 5,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), /*#__PURE__*/React.createElement("rect", {
        x: 1,
        y: r * 0.7 + 5,
        width: s - 2,
        height: r * 0.10,
        fill: "#bda87a",
        opacity: "0.4"
      }), /*#__PURE__*/React.createElement("rect", {
        x: 1,
        y: r * 1.1 + 5,
        width: s - 2,
        height: r * 0.10,
        fill: "#bda87a",
        opacity: "0.3"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r,
        cy: r + 5,
        rx: r * 1.45,
        ry: r * 0.18,
        fill: "none",
        stroke: "#bda87a",
        strokeWidth: "2.5",
        opacity: "0.45",
        style: {
          clipPath: `inset(0 0 50% 0)`
        }
      }));
    case 'neptune':
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s,
        viewBox: `0 0 ${s} ${s}`
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
        id: 'g-' + id,
        cx: "35%",
        cy: "30%"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#aacfff"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "60%",
        stopColor: "#3a72c8"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#0a1838"
      }))), /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: 'url(#g-' + id + ')'
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r * 1.1,
        cy: r * 0.7,
        rx: r * 0.15,
        ry: r * 0.08,
        fill: "#fff",
        opacity: "0.4"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: r * 0.8,
        cy: r * 1.3,
        rx: r * 0.2,
        ry: r * 0.06,
        fill: "#1a3870",
        opacity: "0.5"
      }));
    default:
      return /*#__PURE__*/React.createElement("svg", {
        width: s,
        height: s
      }, /*#__PURE__*/React.createElement("circle", {
        cx: r,
        cy: r,
        r: r - 2,
        fill: "#3fa9ff"
      }));
  }
}

// ──────────────────────────────────────────────────────────────────────
// Sun (system center)
// ──────────────────────────────────────────────────────────────────────
function Sun({
  size = 56
}) {
  const r = size / 2;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "sun-g",
    cx: "50%",
    cy: "50%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#fff7c8"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "40%",
    stopColor: "#ffe1a8"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "75%",
    stopColor: "#f5a623"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#8a3f00",
    stopOpacity: "0"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "sun-core",
    cx: "40%",
    cy: "35%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#fff7c8"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#f5a623"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: r,
    cy: r,
    r: r,
    fill: "url(#sun-g)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: r,
    cy: r,
    r: r * 0.55,
    fill: "url(#sun-core)"
  }));
}

// ──────────────────────────────────────────────────────────────────────
// Contractor monograms (used on mission cards)
// ──────────────────────────────────────────────────────────────────────

function ContractorBadge({
  contractor,
  size = 44
}) {
  const c = contractor.color;
  const r = size / 2;
  const ringFill = `radial-gradient(circle at 30% 30%, ${lighten(c, 0.4)}, ${c} 60%, ${darken(c, 0.5)} 100%)`;
  const Body = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: 8,
      background: ringFill,
      boxShadow: `inset 0 1px 0 ${lighten(c, 0.7)}55, inset 0 -2px 0 ${darken(c, 0.5)}, 0 4px 10px ${c}55`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: darken(c, 0.7),
      flex: '0 0 auto'
    }
  }, children);
  switch (contractor.glyph) {
    case 'sun':
      return /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("svg", {
        width: size * 0.65,
        height: size * 0.65,
        viewBox: "0 0 24 24",
        fill: "currentColor"
      }, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "5"
      }), /*#__PURE__*/React.createElement("g", {
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round"
      }, /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "2",
        x2: "12",
        y2: "4.5"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "19.5",
        x2: "12",
        y2: "22"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "2",
        y1: "12",
        x2: "4.5",
        y2: "12"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "19.5",
        y1: "12",
        x2: "22",
        y2: "12"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "5",
        y1: "5",
        x2: "6.8",
        y2: "6.8"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "17.2",
        y1: "17.2",
        x2: "19",
        y2: "19"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "5",
        y1: "19",
        x2: "6.8",
        y2: "17.2"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "17.2",
        y1: "6.8",
        x2: "19",
        y2: "5"
      }))));
    case 'snow':
      return /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("svg", {
        width: size * 0.65,
        height: size * 0.65,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.8",
        strokeLinecap: "round"
      }, /*#__PURE__*/React.createElement("line", {
        x1: "12",
        y1: "2",
        x2: "12",
        y2: "22"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "3",
        y1: "7",
        x2: "21",
        y2: "17"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "3",
        y1: "17",
        x2: "21",
        y2: "7"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M9 4 l3 -2 l3 2 M9 20 l3 2 l3 -2"
      })));
    case 'anvil':
      return /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("svg", {
        width: size * 0.7,
        height: size * 0.7,
        viewBox: "0 0 24 24",
        fill: "currentColor"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M3 8 L21 8 Q 20 13 16 14 L 16 18 L 8 18 L 8 14 Q 4 13 3 8 Z"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "10",
        y: "18",
        width: "4",
        height: "2"
      })));
    case 'wave':
      return /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("svg", {
        width: size * 0.7,
        height: size * 0.7,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M3 14 q 3 -4 6 0 q 3 4 6 0 q 3 -4 6 0"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 9 q 3 -4 6 0 q 3 4 6 0 q 3 -4 6 0"
      })));
    case 'star':
    default:
      return /*#__PURE__*/React.createElement(Body, null, /*#__PURE__*/React.createElement("svg", {
        width: size * 0.7,
        height: size * 0.7,
        viewBox: "0 0 24 24",
        fill: "currentColor"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"
      })));
  }
}

// ──────────────────────────────────────────────────────────────────────
// Mineral chip glyphs (block + symbol)
// ──────────────────────────────────────────────────────────────────────

function MineralGlyph({
  id,
  size = 28
}) {
  const meta = window.LandnamData.MINERAL_META[id];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: 4,
      flex: '0 0 auto',
      background: 'radial-gradient(circle at 30% 30%, ' + lighten(meta.color, 0.35) + ', ' + meta.color + ' 70%, ' + darken(meta.color, 0.55) + ' 100%)',
      boxShadow: 'inset 0 1px 0 ' + lighten(meta.color, 0.5) + '55, inset 0 -1px 0 ' + darken(meta.color, 0.5) + '55',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--ln-font-mono)',
      fontWeight: 800,
      fontSize: size * 0.36,
      letterSpacing: '0.02em',
      color: darken(meta.color, 0.6)
    }
  }, meta.sym);
}

// ──────────────────────────────────────────────────────────────────────
// Earth Base buildings (placed on top of the parallax bg)
// Each draws itself with an absolute-positioned wrapper at the supplied size.
// Buildings are *clickable* — the caller provides onClick.
// ──────────────────────────────────────────────────────────────────────

function Building({
  kind,
  label,
  sub,
  status,
  onClick,
  locked,
  hot,
  w = 110,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: !locked ? onClick : undefined,
    className: "ln-building",
    style: {
      position: 'absolute',
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: locked ? 'not-allowed' : 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      filter: locked ? 'grayscale(0.6) brightness(0.7)' : 'none',
      transition: 'transform 180ms cubic-bezier(.34,1.56,.64,1)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ln-building-art",
    style: {
      width: w,
      height: w,
      position: 'relative',
      transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1)',
      filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))'
    }
  }, /*#__PURE__*/React.createElement(BuildingArt, {
    kind: kind,
    hot: hot
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 2,
      transform: 'translateX(-50%)',
      width: w * 0.6,
      height: w * 0.12,
      borderRadius: '50%',
      background: 'radial-gradient(ellipse, rgba(0,0,0,0.45), transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -4,
      borderRadius: 14,
      border: hot ? '2px solid #f5a623' : '2px solid transparent',
      boxShadow: hot ? '0 0 20px rgba(245,166,35,0.5)' : 'none',
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      marginTop: -4,
      padding: '3px 9px',
      background: 'rgba(8,12,22,0.7)',
      backdropFilter: 'blur(6px)',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      boxShadow: hot ? '0 0 12px rgba(245,166,35,0.5)' : '0 2px 8px rgba(0,0,0,0.4)'
    }
  }, sub && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: 999,
      flex: '0 0 auto',
      background: status === 'ok' ? '#39d36a' : status === 'warn' ? '#ffb347' : '#7a8294',
      boxShadow: '0 0 6px currentColor',
      color: status === 'ok' ? '#39d36a' : status === 'warn' ? '#ffb347' : '#7a8294'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: locked ? '#9aa4b4' : hot ? '#f5a623' : '#eaf3ff'
    }
  }, label), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 8,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: status === 'ok' ? '#39d36a' : status === 'warn' ? '#ffb347' : '#7a8294'
    }
  }, sub)));
}
function BuildingArt({
  kind,
  hot
}) {
  switch (kind) {
    case 'launchpad':
      return /*#__PURE__*/React.createElement("svg", {
        viewBox: "0 0 110 110",
        width: "100%",
        height: "100%"
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
        id: "rocket-body",
        x1: "0",
        x2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#eaf3ff"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "50%",
        stopColor: "#cde4ff"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#7a93b5"
      })), /*#__PURE__*/React.createElement("linearGradient", {
        id: "rocket-nose",
        x1: "0",
        x2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#6cc2ff"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#1c6ab8"
      })), /*#__PURE__*/React.createElement("linearGradient", {
        id: "pad-deck",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#5d6a7a"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#2a3340"
      }))), /*#__PURE__*/React.createElement("g", {
        stroke: "#3a4a5e",
        strokeWidth: "1.6",
        fill: "none"
      }, /*#__PURE__*/React.createElement("line", {
        x1: "22",
        y1: "40",
        x2: "22",
        y2: "92"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "86",
        y1: "40",
        x2: "86",
        y2: "92"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "22",
        y1: "50",
        x2: "34",
        y2: "56"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "22",
        y1: "62",
        x2: "34",
        y2: "68"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "22",
        y1: "74",
        x2: "34",
        y2: "80"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "86",
        y1: "50",
        x2: "74",
        y2: "56"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "86",
        y1: "62",
        x2: "74",
        y2: "68"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "86",
        y1: "74",
        x2: "74",
        y2: "80"
      })), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "90",
        width: "82",
        height: "10",
        fill: "url(#pad-deck)",
        rx: "1"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "14",
        y: "98",
        width: "82",
        height: "3",
        fill: "#1a2230"
      }), /*#__PURE__*/React.createElement("g", {
        fill: "#f5a623"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "16",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "24",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "32",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "40",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "48",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "56",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "64",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "72",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "80",
        y: "91",
        width: "4",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "88",
        y: "91",
        width: "4",
        height: "2"
      })), /*#__PURE__*/React.createElement("path", {
        d: "M54 18 L62 36 L62 80 L46 80 L46 36 Z",
        fill: "url(#rocket-body)",
        stroke: "#3a4a5e",
        strokeWidth: "0.8"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M54 18 L62 36 L46 36 Z",
        fill: "url(#rocket-nose)"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "49",
        y: "48",
        width: "10",
        height: "3",
        fill: "#3fa9ff"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "49",
        y: "48",
        width: "10",
        height: "3",
        fill: "none",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "54",
        cy: "60",
        r: "3",
        fill: "#f5a623",
        stroke: "#1a2230",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "46",
        y1: "68",
        x2: "62",
        y2: "68",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M46 70 L40 84 L46 78 Z",
        fill: "#3fa9ff",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M62 70 L68 84 L62 78 Z",
        fill: "#3fa9ff",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "22",
        cy: "40",
        r: "2.5",
        fill: hot ? '#f5a623' : '#39d36a'
      }, /*#__PURE__*/React.createElement("animate", {
        attributeName: "opacity",
        values: "1;0.3;1",
        dur: "1.4s",
        repeatCount: "indefinite"
      })), /*#__PURE__*/React.createElement("circle", {
        cx: "86",
        cy: "40",
        r: "2.5",
        fill: hot ? '#f5a623' : '#39d36a'
      }, /*#__PURE__*/React.createElement("animate", {
        attributeName: "opacity",
        values: "1;0.3;1",
        dur: "1.4s",
        begin: "0.7s",
        repeatCount: "indefinite"
      })));
    case 'control':
      return /*#__PURE__*/React.createElement("svg", {
        viewBox: "0 0 110 110",
        width: "100%",
        height: "100%"
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
        id: "hab-roof",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#5a7ba8"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#2a3a55"
      })), /*#__PURE__*/React.createElement("linearGradient", {
        id: "hab-wall",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#e6e2d4"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#7d7666"
      }))), /*#__PURE__*/React.createElement("line", {
        x1: "84",
        y1: "20",
        x2: "84",
        y2: "60",
        stroke: "#5d7390",
        strokeWidth: "1.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M82 22 L86 22 M81 30 L87 30 M80 38 L88 38",
        stroke: "#5d7390",
        strokeWidth: "1"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "84",
        cy: "18",
        r: "2.5",
        fill: "#ff5a6a"
      }, /*#__PURE__*/React.createElement("animate", {
        attributeName: "opacity",
        values: "1;0.2;1",
        dur: "1.6s",
        repeatCount: "indefinite"
      })), /*#__PURE__*/React.createElement("ellipse", {
        cx: "36",
        cy: "44",
        rx: "14",
        ry: "5",
        fill: "#cde4ff",
        stroke: "#1a2230",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "36",
        y1: "44",
        x2: "36",
        y2: "56",
        stroke: "#1a2230",
        strokeWidth: "0.8"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "32",
        y: "56",
        width: "8",
        height: "6",
        fill: "#5d7390"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M18 70 L18 64 L60 60 L92 64 L92 70 Z",
        fill: "url(#hab-roof)",
        stroke: "#1a2230",
        strokeWidth: "0.8"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "18",
        y: "70",
        width: "74",
        height: "28",
        fill: "url(#hab-wall)",
        stroke: "#1a2230",
        strokeWidth: "0.8"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "26",
        y: "76",
        width: "14",
        height: "10",
        fill: "#3fa9ff",
        opacity: "0.85"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "26",
        y: "76",
        width: "14",
        height: "10",
        fill: "none",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "33",
        y1: "76",
        x2: "33",
        y2: "86",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "44",
        y: "76",
        width: "14",
        height: "10",
        fill: "#ffb347",
        opacity: "0.85"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "44",
        y: "76",
        width: "14",
        height: "10",
        fill: "none",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "51",
        y1: "76",
        x2: "51",
        y2: "86",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "62",
        y: "76",
        width: "14",
        height: "10",
        fill: "#3fa9ff",
        opacity: "0.85"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "62",
        y: "76",
        width: "14",
        height: "10",
        fill: "none",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "69",
        y1: "76",
        x2: "69",
        y2: "86",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "80",
        y: "86",
        width: "8",
        height: "12",
        fill: "#3a2818",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("g", {
        fill: "#f5a623"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "18",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "24",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "30",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "36",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "42",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "48",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "54",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "60",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "66",
        y: "96",
        width: "3",
        height: "2"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "72",
        y: "96",
        width: "3",
        height: "2"
      })));
    case 'satellite':
      return /*#__PURE__*/React.createElement("svg", {
        viewBox: "0 0 110 110",
        width: "100%",
        height: "100%"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "34",
        y: "78",
        width: "42",
        height: "20",
        fill: "#7d7666",
        stroke: "#1a2230",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "34",
        y: "78",
        width: "42",
        height: "4",
        fill: "#3a4a5e"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "55",
        y1: "78",
        x2: "55",
        y2: "60",
        stroke: "#3a4a5e",
        strokeWidth: "2"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: "55",
        cy: "40",
        rx: "32",
        ry: "14",
        fill: "#cde4ff",
        stroke: "#1a2230",
        strokeWidth: "0.8"
      }), /*#__PURE__*/React.createElement("ellipse", {
        cx: "55",
        cy: "40",
        rx: "32",
        ry: "14",
        fill: "url(#dish-sheen)"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "55",
        y1: "40",
        x2: "55",
        y2: "58",
        stroke: "#1a2230",
        strokeWidth: "1"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "40",
        y1: "42",
        x2: "70",
        y2: "42",
        stroke: "#3a4a5e",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "30",
        y1: "40",
        x2: "80",
        y2: "40",
        stroke: "#3a4a5e",
        strokeWidth: "0.6",
        opacity: "0.6"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "55",
        cy: "40",
        r: "3",
        fill: "#f5a623",
        stroke: "#1a2230",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("g", {
        fill: "none",
        stroke: "#7ec8ff",
        strokeWidth: "1",
        opacity: "0.85"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M22 36 Q 55 14 88 36",
        strokeDasharray: "2 3"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M14 32 Q 55 4 96 32",
        strokeDasharray: "2 3",
        opacity: "0.6"
      })), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
        id: "dish-sheen",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#ffffff",
        stopOpacity: "0.5"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#ffffff",
        stopOpacity: "0"
      }))));
    case 'market':
      return /*#__PURE__*/React.createElement("svg", {
        viewBox: "0 0 110 110",
        width: "100%",
        height: "100%"
      }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
        id: "mkt-roof",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, /*#__PURE__*/React.createElement("stop", {
        offset: "0%",
        stopColor: "#d68a0d"
      }), /*#__PURE__*/React.createElement("stop", {
        offset: "100%",
        stopColor: "#7a4f00"
      }))), /*#__PURE__*/React.createElement("path", {
        d: "M20 56 L90 56 L96 66 L14 66 Z",
        fill: "url(#mkt-roof)",
        stroke: "#1a2230",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("g", {
        stroke: "#fff",
        strokeWidth: "3",
        opacity: "0.85"
      }, /*#__PURE__*/React.createElement("line", {
        x1: "24",
        y1: "56",
        x2: "24",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "32",
        y1: "56",
        x2: "32",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "40",
        y1: "56",
        x2: "40",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "48",
        y1: "56",
        x2: "48",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "56",
        y1: "56",
        x2: "56",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "64",
        y1: "56",
        x2: "64",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "72",
        y1: "56",
        x2: "72",
        y2: "66"
      }), /*#__PURE__*/React.createElement("line", {
        x1: "80",
        y1: "56",
        x2: "80",
        y2: "66"
      })), /*#__PURE__*/React.createElement("rect", {
        x: "20",
        y: "66",
        width: "70",
        height: "32",
        fill: "#9c8d70",
        stroke: "#1a2230",
        strokeWidth: "0.6"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "20",
        y: "66",
        width: "70",
        height: "6",
        fill: "#3a2818"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "28",
        y: "80",
        width: "14",
        height: "18",
        fill: "#3fa9ff",
        opacity: "0.8",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "48",
        y: "80",
        width: "14",
        height: "18",
        fill: "#39d36a",
        opacity: "0.8",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }), /*#__PURE__*/React.createElement("rect", {
        x: "68",
        y: "80",
        width: "14",
        height: "18",
        fill: "#ffb347",
        opacity: "0.8",
        stroke: "#1a2230",
        strokeWidth: "0.5"
      }));
    case 'cargo-rocket':
      return (
        /*#__PURE__*/
        // a small rocket prepared on the launchpad — used inside the launchpad detail
        React.createElement("svg", {
          viewBox: "0 0 110 110",
          width: "100%",
          height: "100%"
        }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
          id: "rb-2",
          x1: "0",
          x2: "1"
        }, /*#__PURE__*/React.createElement("stop", {
          offset: "0%",
          stopColor: "#eaf3ff"
        }), /*#__PURE__*/React.createElement("stop", {
          offset: "100%",
          stopColor: "#7a93b5"
        }))), /*#__PURE__*/React.createElement("path", {
          d: "M55 4 L70 28 L70 92 L40 92 L40 28 Z",
          fill: "url(#rb-2)",
          stroke: "#1a2230",
          strokeWidth: "0.8"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M55 4 L70 28 L40 28 Z",
          fill: "#3fa9ff"
        }), /*#__PURE__*/React.createElement("circle", {
          cx: "55",
          cy: "40",
          r: "6",
          fill: "#f5a623",
          stroke: "#1a2230"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "44",
          y: "56",
          width: "22",
          height: "20",
          fill: "#cde4ff",
          stroke: "#1a2230",
          strokeWidth: "0.5"
        }), /*#__PURE__*/React.createElement("line", {
          x1: "44",
          y1: "66",
          x2: "66",
          y2: "66",
          stroke: "#1a2230",
          strokeWidth: "0.3"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M40 80 L30 100 L40 92 M70 80 L80 100 L70 92",
          fill: "#3fa9ff",
          stroke: "#1a2230",
          strokeWidth: "0.5"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M48 92 L55 106 L62 92",
          fill: "#f5a623"
        }))
      );
    default:
      return /*#__PURE__*/React.createElement("svg", {
        viewBox: "0 0 100 100"
      }, /*#__PURE__*/React.createElement("rect", {
        x: "20",
        y: "60",
        width: "60",
        height: "30",
        fill: "#5d7390"
      }));
  }
}

// ──────────────────────────────────────────────────────────────────────
// Color helpers
// ──────────────────────────────────────────────────────────────────────

function lighten(hex, t) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  const mix = v => Math.min(255, Math.round(v + (255 - v) * t));
  return '#' + [mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function darken(hex, t) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  const mix = v => Math.max(0, Math.round(v * (1 - t)));
  return '#' + [mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
window.LandnamIcons = {
  I,
  Planet,
  Sun,
  ContractorBadge,
  MineralGlyph,
  Building,
  BuildingArt,
  lighten,
  darken
};

// hover/press interactivity for buildings (injected once)
if (typeof document !== 'undefined' && !document.getElementById('ln-building-style')) {
  const st = document.createElement('style');
  st.id = 'ln-building-style';
  st.textContent = `
    .ln-building:not(:disabled):hover { transform: translateY(-3px) scale(1.04); }
    .ln-building:not(:disabled):hover .ln-building-art { filter: drop-shadow(0 10px 16px rgba(0,0,0,0.5)) brightness(1.08); }
    .ln-building:not(:disabled):active { transform: translateY(-1px) scale(0.99); }
    .ln-building-art { animation: ln-bob 5s ease-in-out infinite; }
    @keyframes ln-bob { 0%,100% { translate: 0 0; } 50% { translate: 0 -2px; } }
  `;
  document.head.appendChild(st);
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/icons.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/ios-frame.tsx
try { (() => {
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports: IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false,
  hideStatusBar = false,
  hideIsland = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, !hideIsland && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), !hideStatusBar && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/ios-frame.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/screens-loop.tsx
try { (() => {
/* global React, window */
// Landnam — mission-loop screens:
//   TransitScreen, MiningScreen, DebriefScreen

const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
function D() {
  return window.LandnamData;
}
function IC() {
  return window.LandnamIcons;
}
function CH() {
  return window.LandnamChrome;
}

// ──────────────────────────────────────────────────────────────────────
// TRANSIT — animated rocket arc to target
// ──────────────────────────────────────────────────────────────────────

function TransitScreen({
  rocket,
  target,
  mission,
  onArrive,
  onBack
}) {
  const {
    TopBar,
    Panel,
    GhostBtn,
    StatusPill
  } = CH();
  const {
    Planet,
    MineralGlyph
  } = IC();

  // Two-phase animation:
  //   Phase A (0 → 0.45): ASCENT — rocket climbs through sky, atmosphere
  //     blue tweens to deep space black, clouds drift past, stars fade in.
  //   Phase B (0.45 → 1):  CRUISE — deep space arc to target.
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf,
      t0 = performance.now();
    const total = 6000;
    function loop(now) {
      const prog = Math.min(1, (now - t0) / total);
      setT(prog);
      if (prog < 1) raf = requestAnimationFrame(loop);else setTimeout(onArrive, 300);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ascentT 0→1 (over phase A), cruiseT 0→1 (over phase B)
  const ascentT = Math.min(1, t / 0.45);
  const cruiseT = Math.max(0, (t - 0.45) / 0.55);

  // sky → space color blend
  // atmosphere blue #87CFFA (135,207,250) → deep space #03060A (3,6,10)
  const skyR = Math.round(135 + (3 - 135) * ascentT);
  const skyG = Math.round(207 + (6 - 207) * ascentT);
  const skyB = Math.round(250 + (10 - 250) * ascentT);
  const skyTop = `rgb(${skyR},${skyG},${skyB})`;
  const skyR2 = Math.round(158 + (10 - 158) * ascentT);
  const skyG2 = Math.round(220 + (16 - 220) * ascentT);
  const skyB2 = Math.round(255 + (28 - 255) * ascentT);
  const skyBottom = `rgb(${skyR2},${skyG2},${skyB2})`;
  const chassis = D().PARTS.chassis.find(p => p.id === rocket.chassis);
  const propulsion = D().PARTS.propulsion.find(p => p.id === rocket.propulsion);

  // rocket position during ascent: starts low, rises to top of frame
  // during cruise: arc from top-left to target on right
  const W = 360,
    H = 320;
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
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#03060A'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: t < 0.45 ? 'LIFTOFF · ASCENT' : 'MISSION · IN TRANSIT',
    title: t < 0.45 ? 'Ascending' : '→ ' + target.name,
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 96,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 14px',
      height: H,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(180deg, ' + skyTop + ' 0%, ' + skyBottom + ' 100%)',
      border: '1px solid #434C5E'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: ascentT,
      background: 'radial-gradient(1px 1px at 8% 14%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 22% 26%, #fff, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 36% 32%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 50% 12%, #fff, transparent 60%),' + 'radial-gradient(1.4px 1.4px at 64% 24%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 78% 18%, #fff, transparent 60%),' + 'radial-gradient(1.3px 1.3px at 90% 36%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 12% 50%, #fff, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 30% 60%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 48% 68%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 70% 60%, #fff, transparent 60%),' + 'radial-gradient(1.4px 1.4px at 86% 76%, #fff, transparent 60%),' + 'radial-gradient(1px 1px at 14% 82%, #fff, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 56% 88%, #fff, transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: Math.max(0, 1 - ascentT * 1.4)
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: -60 + ascentT * -80 + 'px',
      top: H * 0.35,
      animation: 'cloud-drift 26s linear infinite'
    }
  }, /*#__PURE__*/React.createElement(CloudSVG, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 100 + ascentT * -120 + 'px',
      top: H * 0.55,
      animation: 'cloud-drift 32s linear infinite',
      animationDelay: '-12s',
      transform: 'scale(0.7)'
    }
  }, /*#__PURE__*/React.createElement(CloudSVG, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 260 + ascentT * -160 + 'px',
      top: H * 0.20,
      animation: 'cloud-drift 22s linear infinite',
      animationDelay: '-6s',
      transform: 'scale(0.55)'
    }
  }, /*#__PURE__*/React.createElement(CloudSVG, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 100,
      background: 'linear-gradient(180deg, transparent, rgba(158,220,255,' + 0.55 * (1 - ascentT) + '))',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 28,
      background: 'linear-gradient(180deg, rgba(140,90,40,' + 0.75 * (1 - ascentT) + ') 0%, rgba(40,25,12,' + 0.95 * (1 - ascentT) + ') 100%)'
    }
  }), t >= 0.45 && /*#__PURE__*/React.createElement("svg", {
    style: {
      position: 'absolute',
      inset: 0
    },
    viewBox: '0 0 ' + W + ' ' + H,
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: `M ${W / 2} 40 Q ${W * 0.75} 0, ${W - 34} 60`,
    stroke: "#3fa9ff",
    strokeWidth: "1.2",
    strokeOpacity: "0.35",
    strokeDasharray: "3 5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M ${W / 2} 40 Q ${W * 0.75} 0, ${rx} ${ry}`,
    stroke: "#f5a623",
    strokeWidth: "1.5",
    strokeOpacity: "0.8",
    fill: "none"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 14,
      top: 14,
      opacity: cruiseT
    }
  }, /*#__PURE__*/React.createElement(Planet, {
    id: target.id,
    size: 64
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      color: '#f5a623',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      marginTop: 4,
      whiteSpace: 'nowrap'
    }
  }, target.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: rx,
      top: ry,
      transform: `translate(-50%, -50%) rotate(${rAngle + 90}deg)`
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "44",
    height: "64",
    viewBox: "0 0 44 64"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "tr2-body",
    x1: "0",
    x2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#eaf3ff"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#cde4ff"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#7a93b5"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "tr2-flame"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#fff7c8"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "40%",
    stopColor: "#ffc25c"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "80%",
    stopColor: "#f5a623"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#d68a0d",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M 14 44 L 22 64 L 30 44 Z",
    fill: "url(#tr2-flame)",
    opacity: "0.85"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    values: "M 14 44 L 22 64 L 30 44 Z;M 12 44 L 22 70 L 32 44 Z;M 14 44 L 22 66 L 30 44 Z",
    dur: "0.32s",
    repeatCount: "indefinite"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M 17 44 L 22 58 L 27 44 Z",
    fill: "#fff7c8",
    opacity: "0.95"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "d",
    values: "M 17 44 L 22 58 L 27 44 Z;M 16 44 L 22 62 L 28 44 Z;M 17 44 L 22 59 L 27 44 Z",
    dur: "0.22s",
    repeatCount: "indefinite"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M22 4 L32 18 L32 44 L12 44 L12 18 Z",
    fill: "url(#tr2-body)",
    stroke: "#1a2230",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 4 L32 18 L12 18 Z",
    fill: "#3fa9ff"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "22",
    cy: "22",
    r: "3",
    fill: "#f5a623",
    stroke: "#1a2230",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 36 L4 50 L12 44 Z",
    fill: "#3fa9ff",
    stroke: "#1a2230",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 36 L40 50 L32 44 Z",
    fill: "#3fa9ff",
    stroke: "#1a2230",
    strokeWidth: "0.5"
  })), t < 0.4 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 64,
      transform: 'translateX(-50%)'
    }
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      left: -6 + i % 2 * 12,
      top: i * 8,
      width: 14 - i * 2,
      height: 14 - i * 2,
      borderRadius: 999,
      background: 'rgba(220,210,200,' + (0.6 - i * 0.12) + ')',
      filter: 'blur(2px)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      padding: '4px 10px',
      background: 'rgba(8,12,22,0.78)',
      border: '1px solid rgba(245,166,35,0.5)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#f5a623',
      textTransform: 'uppercase'
    }
  }, t < 0.15 ? '01 · IGNITION' : t < 0.45 ? '02 · ASCENT' : t < 0.85 ? '03 · CRUISE' : '04 · APPROACH')), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 14px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, t < 0.45 ? 'Liftoff' : 'Transit'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 12,
      color: '#f5a623',
      letterSpacing: '0.12em'
    }
  }, "ETA \xB7 0:", String(Math.max(0, Math.ceil((1 - t) * 6))).padStart(2, '0')), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 11,
      color: '#7ec8ff'
    }
  }, Math.round(t * 100), "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      background: '#06090f',
      border: '1px solid rgba(63,169,255,0.25)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: t * 100 + '%',
      background: 'linear-gradient(90deg, #f5a623 0%, #ffc25c 45%, #3fa9ff 55%, #6cc2ff 100%)',
      boxShadow: '0 0 12px rgba(63,169,255,0.6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '45%',
      top: 0,
      bottom: 0,
      width: 1,
      background: 'rgba(255,255,255,0.4)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 4,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u2191 EARTH"), /*#__PURE__*/React.createElement("span", null, "ATMOSPHERE"), /*#__PURE__*/React.createElement("span", null, "SPACE"), /*#__PURE__*/React.createElement("span", null, target.name, " \u2197"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: t < 0.45 ? '#f5a623' : '#7ec8ff'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#5d7390',
      textTransform: 'uppercase'
    }
  }, "Vessel"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 15,
      color: '#e6efff',
      marginTop: 2
    }
  }, chassis.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    kind: t < 0.45 ? 'warn' : 'info'
  }, t < 0.45 ? 'Boosting' : 'Coasting'))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#d68a0d',
      textTransform: 'uppercase'
    }
  }, "Burn"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 15,
      color: '#f5a623',
      marginTop: 2
    }
  }, propulsion.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    kind: "ok"
  }, t < 0.45 ? 'Burn ' + Math.round(ascentT * 100) + '%' : 'Nominal')))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px'
    }
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onArrive
  }, "Skip Transit \u21A6"))));
}

// Cloud SVG used during ascent
function CloudSVG() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "120",
    height: "40",
    viewBox: "0 0 120 40"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "30",
    cy: "24",
    rx: "22",
    ry: "12",
    fill: "#fff",
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "56",
    cy: "20",
    rx: "26",
    ry: "14",
    fill: "#fff",
    opacity: "0.88"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "82",
    cy: "24",
    rx: "20",
    ry: "10",
    fill: "#fff",
    opacity: "0.80"
  }));
}

// ──────────────────────────────────────────────────────────────────────
// MINING — tap-collect ore minigame on the target's surface
// ──────────────────────────────────────────────────────────────────────

function MiningScreen({
  rocket,
  target,
  mission,
  onComplete,
  onBack
}) {
  const {
    PARTS,
    MINERAL_META
  } = D();
  const {
    TopBar,
    PrimaryBtn,
    GhostBtn,
    StatusPill,
    Panel
  } = CH();
  const {
    MineralGlyph,
    I
  } = IC();
  const chassis = PARTS.chassis.find(p => p.id === rocket.chassis);
  const drill = PARTS.drill.find(p => p.id === rocket.drill);
  const cargoMax = chassis.cargo;

  // ── state ─────────────────────────────────────────────────────────
  const [cargo, setCargo] = useState({});
  const [pops, setPops] = useState([]);
  const [sparks, setSparks] = useState([]);
  const [time, setTime] = useState(45);
  const [ores, setOres] = useState(() => spawnOres(target, 6));
  const [beamTo, setBeamTo] = useState(null); // {x, y, until}
  const [lunge, setLunge] = useState(null); // ore the rocket is diving toward
  const [scrollUnused] = useState(0);
  const total = useMemo(() => Object.values(cargo).reduce((a, b) => a + b, 0), [cargo]);
  const full = total >= cargoMax;
  const W = 360,
    H = 380;
  const ROCKET_X = 86; // rocket hovers over the left of the dig site
  const ROCKET_Y = 96;
  const GROUND_Y = 210; // soil surface — ores are buried below this line

  // static dig site — no horizontal scroll (ores stay put in the soil)
  const scroll = 0;

  // clock
  useEffect(() => {
    if (full || time <= 0) return;
    const tk = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(tk);
  }, [full, time]);

  // replenish ore deposits as they're mined (kept stocked so the order is fillable)
  useEffect(() => {
    if (full || time <= 0) return;
    const sp = setInterval(() => {
      setOres(prev => {
        const live = prev.filter(o => !o.gone);
        if (live.length < 6) return [...live, ...spawnOres(target, 6 - live.length, W, H)];
        return live;
      });
    }, 1200);
    return () => clearInterval(sp);
  }, [target, full, time]);

  // beam clears itself after 420ms
  useEffect(() => {
    if (!beamTo) return;
    const t = setTimeout(() => setBeamTo(null), 420);
    return () => clearTimeout(t);
  }, [beamTo]);
  function tapOre(o) {
    if (full || o.gone) return;
    const meta = MINERAL_META[o.kind];
    const gain = drill.rate * o.size;
    setCargo(c => ({
      ...c,
      [o.kind]: (c[o.kind] || 0) + gain
    }));
    const popId = Math.random();
    setPops(p => [...p, {
      id: popId,
      x: o.x,
      y: o.y,
      label: '+' + gain + ' ' + meta.sym,
      color: meta.color
    }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== popId)), 800);
    // beam from rocket to ore + rocket lunges toward it
    setBeamTo({
      x: o.x,
      y: o.y
    });
    setLunge({
      x: o.x,
      y: o.y
    });
    setTimeout(() => setLunge(null), 220);
    // sparks at impact
    const burst = Array.from({
      length: 10
    }).map(() => ({
      id: Math.random(),
      x: o.x + (Math.random() - 0.5) * 18,
      y: o.y + (Math.random() - 0.5) * 18,
      vx: (Math.random() - 0.5) * 44,
      vy: (Math.random() - 0.5) * 44,
      color: meta.color
    }));
    setSparks(s => [...s, ...burst]);
    setTimeout(() => setSparks(s => s.filter(sp => !burst.find(b => b.id === sp.id))), 600);
    setOres(prev => prev.map(x => x === o ? {
      ...x,
      gone: true
    } : x));
  }

  // mission requirement progress
  const req = mission ? mission.requires.minerals : {};
  const reqDone = Object.entries(req).every(([k, v]) => (cargo[k] || 0) >= v);
  const pct = total / cargoMax * 100;

  // surface palettes by target
  const PAL = {
    mercury: {
      sky1: '#1b1410',
      sky2: '#3a2a1c',
      dist: '#5d4a30',
      ground: '#7d6248',
      rock: '#3a2818',
      glow: '#a89788'
    },
    venus: {
      sky1: '#2a1f08',
      sky2: '#5a4218',
      dist: '#8a6020',
      ground: '#b08840',
      rock: '#3a2810',
      glow: '#e6c074'
    },
    mars: {
      sky1: '#1f0c08',
      sky2: '#3a1810',
      dist: '#5a2818',
      ground: '#8a3a18',
      rock: '#3a1208',
      glow: '#d97150'
    },
    belt: {
      sky1: '#0a0a12',
      sky2: '#181820',
      dist: '#3a3a48',
      ground: '#5d5d6a',
      rock: '#1a1a22',
      glow: '#c9c1a8'
    },
    jupiter: {
      sky1: '#1a0c08',
      sky2: '#3a1f10',
      dist: '#5a3818',
      ground: '#7a4a18',
      rock: '#3a1f10',
      glow: '#d4a06a'
    },
    saturn: {
      sky1: '#1a1408',
      sky2: '#3a2c10',
      dist: '#6a5a28',
      ground: '#a08858',
      rock: '#3a2a10',
      glow: '#e6d4a0'
    },
    neptune: {
      sky1: '#040818',
      sky2: '#0a1838',
      dist: '#1a3870',
      ground: '#2a5090',
      rock: '#0a1838',
      glow: '#5a8dd0'
    }
  };
  const pal = PAL[target.id] || PAL.mars;
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: pal.sky1
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: 'MINING · ' + target.name.toUpperCase(),
    title: "Extract",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 120,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 14px',
      height: H,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      background: 'linear-gradient(180deg, ' + pal.sky1 + ' 0%, ' + pal.sky2 + ' 60%, ' + pal.dist + ' 90%, ' + pal.ground + ' 100%)',
      border: '1px solid ' + pal.glow + '55',
      cursor: full ? 'default' : 'crosshair',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'radial-gradient(1px 1px at 10% 14%, #fff6, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 24% 20%, #fff4, transparent 60%),' + 'radial-gradient(1px 1px at 38% 10%, #fff5, transparent 60%),' + 'radial-gradient(1.4px 1.4px at 52% 30%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 66% 12%, #fff5, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 80% 22%, #fff4, transparent 60%),' + 'radial-gradient(1px 1px at 94% 16%, #fff6, transparent 60%)',
      backgroundSize: '300px 100%',
      backgroundPosition: -scroll * 0.08 + 'px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(40% 50% at 30% 30%, ' + pal.glow + '22, transparent 70%), radial-gradient(50% 40% at 80% 25%, ' + pal.glow + '15, transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: '0 0 ' + W + ' ' + H,
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "distrange",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: pal.dist,
    stopOpacity: "0.85"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: pal.sky2,
    stopOpacity: "0.4"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "midrange",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: pal.ground,
    stopOpacity: "0.85"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: pal.rock,
    stopOpacity: "1"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "beamGrad",
    cx: "50%",
    cy: "0%",
    r: "80%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#CCE6FF",
    stopOpacity: "0.95"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#CCE6FF",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${-scroll * 0.18 % W}, 0)`
  }, /*#__PURE__*/React.createElement(DistantRange, {
    w: W,
    h: H,
    pal: pal
  }), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${W}, 0)`
  }, /*#__PURE__*/React.createElement(DistantRange, {
    w: W,
    h: H,
    pal: pal
  }))), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${-scroll * 0.4 % W}, 0)`
  }, /*#__PURE__*/React.createElement(MidRange, {
    w: W,
    h: H,
    pal: pal
  }), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${W}, 0)`
  }, /*#__PURE__*/React.createElement(MidRange, {
    w: W,
    h: H,
    pal: pal
  }))), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${-scroll * 0.9 % W}, 0)`
  }, /*#__PURE__*/React.createElement(Foreground, {
    w: W,
    h: H,
    pal: pal,
    groundY: GROUND_Y
  }), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${W}, 0)`
  }, /*#__PURE__*/React.createElement(Foreground, {
    w: W,
    h: H,
    pal: pal,
    groundY: GROUND_Y
  }))), beamTo && /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("line", {
    x1: ROCKET_X + 4,
    y1: ROCKET_Y + 16,
    x2: beamTo.x,
    y2: beamTo.y,
    stroke: "#CCE6FF",
    strokeWidth: "7",
    opacity: "0.35"
  }), /*#__PURE__*/React.createElement("line", {
    x1: ROCKET_X + 4,
    y1: ROCKET_Y + 16,
    x2: beamTo.x,
    y2: beamTo.y,
    stroke: "#9EDCFF",
    strokeWidth: "3.5",
    opacity: "0.7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: ROCKET_X + 4,
    y1: ROCKET_Y + 16,
    x2: beamTo.x,
    y2: beamTo.y,
    stroke: "#fff",
    strokeWidth: "1.4",
    opacity: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: beamTo.x,
    cy: beamTo.y,
    r: "16",
    fill: "url(#beamGrad)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: beamTo.x,
    cy: beamTo.y,
    r: "6",
    fill: "#fff",
    opacity: "0.95"
  }))), sparks.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      position: 'absolute',
      left: s.x,
      top: s.y,
      width: 3,
      height: 3,
      background: s.color,
      borderRadius: 999,
      boxShadow: '0 0 6px ' + s.color,
      animation: 'spark 600ms ease-out forwards',
      transform: 'translate(-50%, -50%)',
      ['--sx']: s.vx + 'px',
      ['--sy']: s.vy + 'px',
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: lunge ? ROCKET_X + (lunge.x - ROCKET_X) * 0.28 : ROCKET_X,
      top: lunge ? ROCKET_Y + (lunge.y - ROCKET_Y) * 0.16 : ROCKET_Y,
      transform: 'translate(-50%, -50%)' + (lunge ? ' rotate(12deg)' : ''),
      transition: 'left 180ms cubic-bezier(.34,1.56,.64,1), top 180ms cubic-bezier(.34,1.56,.64,1), transform 180ms'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "60",
    height: "80",
    viewBox: "0 0 60 80"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "rocketBody",
    x1: "0",
    x2: "1",
    y1: "0",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#eaf3ff"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: "#cde4ff"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#7a93b5"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "flame"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#fff7c8"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "40%",
    stopColor: "#ffc25c"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "80%",
    stopColor: "#f5a623"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#d68a0d",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M 50 30 L 30 22 L 14 22 L 14 38 L 30 38 Z",
    fill: "url(#rocketBody)",
    stroke: "#1a2230",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 50 30 L 30 22 L 30 38 Z",
    fill: "#3fa9ff"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "36",
    cy: "30",
    r: "3.5",
    fill: "#f5a623",
    stroke: "#1a2230",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "30",
    x2: "30",
    y2: "30",
    stroke: "#1a2230",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 14 22 L 6 14 L 14 28 Z",
    fill: "#3fa9ff",
    stroke: "#1a2230",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 14 38 L 6 46 L 14 32 Z",
    fill: "#3fa9ff",
    stroke: "#1a2230",
    strokeWidth: "0.5"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "6",
    cy: "30",
    rx: "10",
    ry: "3.5",
    fill: "url(#flame)"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "rx",
    values: "8;12;9;11;8",
    dur: "0.4s",
    repeatCount: "indefinite"
  })), /*#__PURE__*/React.createElement("ellipse", {
    cx: "2",
    cy: "30",
    rx: "5",
    ry: "2",
    fill: "#fff7c8",
    opacity: "0.85"
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "rx",
    values: "4;6;4;5;4",
    dur: "0.3s",
    repeatCount: "indefinite"
  })))), ores.filter(o => !o.gone).map(o => {
    const meta = MINERAL_META[o.kind];
    const r = 26 + o.size * 6;
    return /*#__PURE__*/React.createElement("button", {
      key: o.id,
      onClick: () => tapOre(o),
      disabled: full,
      style: {
        position: 'absolute',
        left: o.x,
        top: o.y,
        transform: 'translate(-50%,-50%)',
        width: r,
        height: r,
        borderRadius: 5,
        background: 'radial-gradient(circle at 32% 28%, ' + IC().lighten(meta.color, 0.5) + ', ' + meta.color + ' 65%, ' + IC().darken(meta.color, 0.7) + ' 100%)',
        border: '2px solid ' + IC().darken(meta.color, 0.65),
        boxShadow: '0 0 16px ' + meta.color + '66, inset 0 2px 0 ' + IC().lighten(meta.color, 0.5) + ', 0 4px 6px rgba(0,0,0,0.5)',
        cursor: full ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: IC().darken(meta.color, 0.7),
        fontFamily: 'var(--ln-font-mono)',
        fontWeight: 800,
        fontSize: 11 + o.size * 2,
        letterSpacing: '0.04em',
        padding: 0,
        clipPath: 'polygon(22% 4%, 78% 0, 100% 34%, 96% 76%, 74% 100%, 26% 98%, 2% 70%, 6% 28%)'
      }
    }, meta.sym);
  }), pops.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    style: {
      position: 'absolute',
      left: p.x,
      top: p.y,
      transform: 'translate(-50%, -100%)',
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 16,
      letterSpacing: '0.04em',
      color: p.color,
      textShadow: '0 0 8px ' + p.color,
      pointerEvents: 'none',
      animation: 'pop 700ms ease-out forwards'
    }
  }, p.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    kind: full ? 'crit' : 'warn'
  }, full ? 'Cargo Full' : time === 0 ? 'Time up' : 'Tap ore · beam fires')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 13,
      color: '#f5a623',
      background: 'rgba(8,12,22,0.78)',
      padding: '4px 10px',
      borderRadius: 6,
      letterSpacing: '0.18em',
      border: '1px solid rgba(245,166,35,0.45)',
      fontWeight: 700,
      pointerEvents: 'auto'
    }
  }, String(Math.floor(time / 60)).padStart(2, '0'), ":", String(time % 60).padStart(2, '0')))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 14px 0 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Cargo"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 14,
      fontWeight: 800,
      color: '#f5a623'
    }
  }, total, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#a9b8ce',
      fontSize: 11
    }
  }, " / ", cargoMax, " U"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 14,
      borderRadius: 7,
      overflow: 'hidden',
      background: '#06090f',
      border: '1px solid rgba(245,166,35,0.35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: Math.min(100, pct) + '%',
      background: 'linear-gradient(90deg, #f5a623, #ffc25c)',
      boxShadow: '0 0 12px rgba(245,166,35,0.6)'
    }
  }))), mission && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: D().CONTRACTORS[mission.contractor].color
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Mission Progress \xB7 ", mission.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, Object.entries(req).map(([k, v]) => {
    const got = cargo[k] || 0;
    const meta = MINERAL_META[k];
    const p = Math.min(100, got / v * 100);
    const done = got >= v;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(MineralGlyph, {
      id: k,
      size: 22
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontSize: 11,
        fontWeight: 700,
        color: meta.color,
        letterSpacing: '0.06em',
        minWidth: 70
      }
    }, meta.name), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: '#06090f',
        border: '1px solid ' + meta.color + '55',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        width: p + '%',
        background: meta.color,
        boxShadow: '0 0 6px ' + meta.color
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 11,
        color: done ? '#39d36a' : '#a9b8ce',
        minWidth: 50,
        textAlign: 'right'
      }
    }, got, "/", v, done ? ' ✓' : ''));
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      padding: '10px 14px 24px',
      background: 'linear-gradient(180deg, transparent 0%, ' + pal.sky1 + 'cc 30%, ' + pal.sky1 + ' 100%)'
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    kind: reqDone ? 'green' : 'cyan',
    disabled: false,
    onClick: () => onComplete(cargo)
  }, full ? 'Cargo Full · Return →' : reqDone ? 'Mission Done · Return →' : total === 0 ? 'Return Empty →' : 'Return Now →')), /*#__PURE__*/React.createElement("style", null, `
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
      `));
}

// ─── parallax pieces ─────────────────────────────────────────────────
function DistantRange({
  w,
  h,
  pal
}) {
  // far range silhouette
  return /*#__PURE__*/React.createElement("path", {
    d: `M 0 ${h * 0.62} L ${w * 0.1} ${h * 0.55} L ${w * 0.2} ${h * 0.58} L ${w * 0.3} ${h * 0.5} L ${w * 0.42} ${h * 0.55} L ${w * 0.55} ${h * 0.48} L ${w * 0.7} ${h * 0.54} L ${w * 0.85} ${h * 0.5} L ${w} ${h * 0.58} L ${w} ${h} L 0 ${h} Z`,
    fill: "url(#distrange)",
    opacity: "0.55"
  });
}
function MidRange({
  w,
  h,
  pal
}) {
  return /*#__PURE__*/React.createElement("path", {
    d: `M 0 ${h * 0.72} L ${w * 0.08} ${h * 0.66} L ${w * 0.2} ${h * 0.7} L ${w * 0.32} ${h * 0.64} L ${w * 0.45} ${h * 0.68} L ${w * 0.58} ${h * 0.62} L ${w * 0.72} ${h * 0.68} L ${w * 0.85} ${h * 0.64} L ${w} ${h * 0.7} L ${w} ${h} L 0 ${h} Z`,
    fill: "url(#midrange)",
    opacity: "0.8"
  });
}
function Foreground({
  w,
  h,
  pal,
  groundY
}) {
  // ground line with rocks
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: groundY,
    width: w,
    height: h - groundY,
    fill: pal.ground
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: groundY,
    width: w,
    height: "3",
    fill: pal.glow,
    opacity: "0.7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: groundY + 3,
    width: w,
    height: "2",
    fill: pal.rock,
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: w * 0.12,
    cy: groundY + 4,
    rx: "14",
    ry: "6",
    fill: pal.rock
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: w * 0.28,
    cy: groundY + 6,
    rx: "22",
    ry: "8",
    fill: pal.rock,
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: w * 0.46,
    cy: groundY + 4,
    rx: "11",
    ry: "5",
    fill: pal.rock
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: w * 0.6,
    cy: groundY + 6,
    rx: "18",
    ry: "7",
    fill: pal.rock,
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: w * 0.78,
    cy: groundY + 5,
    rx: "9",
    ry: "4",
    fill: pal.rock
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: w * 0.9,
    cy: groundY + 7,
    rx: "26",
    ry: "9",
    fill: pal.rock,
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: w * 0.18,
    cy: groundY + 30,
    r: "2",
    fill: pal.glow,
    opacity: "0.3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: w * 0.42,
    cy: groundY + 40,
    r: "1.5",
    fill: pal.glow,
    opacity: "0.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: w * 0.66,
    cy: groundY + 28,
    r: "2.5",
    fill: pal.glow,
    opacity: "0.3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: w * 0.84,
    cy: groundY + 50,
    r: "2",
    fill: pal.glow,
    opacity: "0.35"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: groundY + 60,
    x2: w,
    y2: groundY + 60,
    stroke: pal.rock,
    strokeWidth: "1",
    opacity: "0.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: groundY + 85,
    x2: w,
    y2: groundY + 85,
    stroke: pal.rock,
    strokeWidth: "1",
    opacity: "0.4"
  }));
}
function spawnOres(target, n, W = 360, H = 380) {
  const out = [];
  const GROUND_Y = 210;
  // ores are BURIED in the soil band (below the surface line), spread across
  // the width on a couple of depth rows. Static — they do not move.
  for (let i = 0; i < n; i++) {
    const kind = target.minerals[Math.floor(Math.random() * target.minerals.length)];
    const row = Math.floor(Math.random() * 3); // 3 depth rows in the soil
    out.push({
      id: Math.random(),
      kind,
      x: 36 + Math.random() * (W - 64),
      y: GROUND_Y + 26 + row * 44 + (Math.random() * 16 - 8),
      size: 1 + (Math.random() < 0.15 ? 2 : Math.random() < 0.5 ? 1 : 0)
    });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// DEBRIEF — pay out, rate the mission, show progression
// ──────────────────────────────────────────────────────────────────────

function DebriefScreen({
  mission,
  target,
  cargo,
  onDone
}) {
  const {
    MINERAL_META,
    sellCargo,
    rateMission,
    CONTRACTORS
  } = D();
  const {
    TopBar,
    Panel,
    PrimaryBtn,
    StatusPill
  } = CH();
  const {
    ContractorBadge,
    MineralGlyph,
    I,
    Planet
  } = IC();
  const subtotal = sellCargo(cargo);
  const stars = rateMission({
    mission,
    cargo,
    elapsed: 1
  });
  const reqMet = mission ? Object.entries(mission.requires.minerals).every(([k, v]) => (cargo[k] || 0) >= v) : false;
  const missionPayout = mission && reqMet ? mission.payout.francs : 0;
  const xp = (mission && reqMet ? mission.payout.xp : 0) + Math.round(subtotal / 8);
  const affinity = mission && reqMet ? mission.payout.affinity : 0;
  const total = subtotal + missionPayout;
  const contractor = mission ? CONTRACTORS[mission.contractor] : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#06090f'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0.5,
      background: 'radial-gradient(1px 1px at 8% 14%, #fff7, transparent 60%), radial-gradient(1.4px 1.4px at 24% 26%, #fff6, transparent 60%), radial-gradient(1px 1px at 60% 18%, #fff5, transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: "MISSION COMPLETE",
    title: "Debrief"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 120,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 100,
      height: 100,
      margin: '0 auto 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -12,
      borderRadius: 999,
      background: 'radial-gradient(circle, rgba(57,211,106,0.35), transparent 70%)',
      animation: 'glow 2s ease-in-out infinite'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 100,
      height: 100,
      borderRadius: 999,
      background: 'radial-gradient(circle at 30% 30%, #a9ffc8, #1ea54a 70%, #02180c)',
      boxShadow: '0 0 30px rgba(57,211,106,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#02180c'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "58",
    height: "58",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "4 12 10 18 20 6"
  })))), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 28,
      letterSpacing: '0.08em',
      color: '#e6efff',
      textTransform: 'uppercase'
    }
  }, "Returned"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 11,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginTop: 4
    }
  }, "From ", target.name, " \xB7 Sol III orbit re-entry"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      justifyContent: 'center',
      marginTop: 12
    }
  }, [1, 2, 3].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: i <= stars ? '#f5a623' : '#1f2a3a',
      filter: i <= stars ? 'drop-shadow(0 0 8px #f5a623)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "28",
    height: "28",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 14px 0 14px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: "#f5a623"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 999,
      background: 'radial-gradient(circle at 30% 30%, #ffe1a8, #d68a0d 70%, #4a2800)',
      color: '#1a0c00',
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 26,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(245,166,35,0.5)',
      flex: '0 0 auto'
    }
  }, "\u25B2"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#d68a0d',
      textTransform: 'uppercase'
    }
  }, "Francs Earned"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 32,
      color: '#f5a623',
      lineHeight: 1,
      marginTop: 2
    }
  }, "+", total.toLocaleString()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 6,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    kind: "info"
  }, "+", xp, " XP"), affinity > 0 && contractor && /*#__PURE__*/React.createElement(StatusPill, {
    kind: "amber"
  }, "+", affinity, " ", contractor.name.split(' ')[0], " affinity")))))), mission && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px 0 14px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: reqMet ? '#39d36a' : '#ff5a6a'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, contractor && /*#__PURE__*/React.createElement(ContractorBadge, {
    contractor: contractor,
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Contract"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 13,
      color: '#e6efff'
    }
  }, mission.title)), reqMet ? /*#__PURE__*/React.createElement(StatusPill, {
    kind: "ok"
  }, "Delivered") : /*#__PURE__*/React.createElement(StatusPill, {
    kind: "crit"
  }, "Failed")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, Object.entries(mission.requires.minerals).map(([k, v]) => {
    const got = cargo[k] || 0;
    const meta = MINERAL_META[k];
    const done = got >= v;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px 4px 4px',
        background: done ? '#022213' : '#23080c',
        border: '1px solid ' + (done ? '#39d36a55' : '#ff5a6a55'),
        borderRadius: 6
      }
    }, /*#__PURE__*/React.createElement(MineralGlyph, {
      id: k,
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontSize: 11,
        fontWeight: 800,
        color: done ? '#39d36a' : '#ff8290'
      }
    }, got, "/", v));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px 0 14px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: "#3fa9ff"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, "Sold Cargo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, Object.entries(cargo).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 12,
      color: '#5d7390'
    }
  }, "\u2014 Nothing collected \u2014"), Object.entries(cargo).map(([k, v]) => {
    const meta = MINERAL_META[k];
    const lineTotal = meta.price * v;
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(MineralGlyph, {
      id: k,
      size: 24
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 700,
        fontSize: 13,
        color: '#e6efff',
        letterSpacing: '0.04em'
      }
    }, meta.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 10,
        color: '#7a8294',
        letterSpacing: '0.12em'
      }
    }, "\xD7", v, " @ \u25B2", meta.price)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 16,
        color: '#f5a623'
      }
    }, "\u25B2 ", lineTotal.toLocaleString()));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'rgba(63,169,255,0.18)',
      margin: '4px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Cargo Subtotal"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 16,
      color: '#a9b8ce'
    }
  }, "\u25B2 ", subtotal.toLocaleString())), missionPayout > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#d68a0d',
      textTransform: 'uppercase'
    }
  }, "Contract Bonus"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 16,
      color: '#f5a623'
    }
  }, "\u25B2 ", missionPayout.toLocaleString())))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      padding: '10px 14px 24px',
      background: 'linear-gradient(180deg, transparent 0%, #06090fcc 30%, #06090f 100%)'
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    kind: "amber",
    onClick: () => onDone(total, xp, affinity)
  }, "Return to Earth Base")), /*#__PURE__*/React.createElement("style", null, `
        @keyframes glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.1); }
        }
      `));
}
window.LandnamScreensLoop = {
  TransitScreen,
  MiningScreen,
  DebriefScreen
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/screens-loop.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/screens-pre.tsx
try { (() => {
/* global React, window */
// Landnam — pre-launch screens:
//   HubScreen, MissionBoardScreen, MissionDetailScreen,
//   TargetPickerScreen, FabScreen
//
// Mission-first flow:
//   Hub → tap Control Station → Missions → pick mission →
//   compatible targets → pick target → Fab → validate → Launch

const {
  useState,
  useMemo
} = React;

// helpers shorthands set inside components (window.* dereferenced lazily so
// the load order in index.html doesn't matter)
function D() {
  return window.LandnamData;
}
function IC() {
  return window.LandnamIcons;
}
function CH() {
  return window.LandnamChrome;
}

// ──────────────────────────────────────────────────────────────────────
// HUB — Earth Base scene with layered sections (sky/mountains/forest/soil)
// Buildings sit in distinct, non-overlapping zones; the soil layer is
// drawn as a cross-section with roots + ore veins + buried structures.
// Game HUD fills the device status-bar zone.
// ──────────────────────────────────────────────────────────────────────

function HubScreen({
  player,
  onGoBuilding,
  onNav
}) {
  const {
    TopBar,
    SceneBg,
    StatusPill,
    Panel
  } = CH();
  const {
    Building,
    I
  } = IC();
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(SceneBg, {
    image: "../../assets/scenes/earth-day-sm.png",
    dim: 0
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '42%',
      overflow: 'hidden',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(AmbientStars, null), /*#__PURE__*/React.createElement(Cloud, {
    style: {
      left: '-30%',
      top: 40,
      opacity: 0.7,
      transform: 'scale(0.8)'
    },
    dur: "62s",
    delay: "0s"
  }), /*#__PURE__*/React.createElement(Cloud, {
    style: {
      left: '-30%',
      top: 96,
      opacity: 0.5,
      transform: 'scale(0.55)'
    },
    dur: "80s",
    delay: "-30s"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 18,
      padding: '16px 14px 22px',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.85) 0%, rgba(6,9,15,0.35) 60%, transparent 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "hub-eyebrow"
  }, "EARTH BASE \xB7 LV ", player.level), /*#__PURE__*/React.createElement("h1", {
    className: "hub-title"
  }, "Earth Base")), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      alignItems: 'flex-end',
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 11px',
      background: 'rgba(8,12,22,0.7)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(245,166,35,0.5)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.04em',
      color: '#f5a623'
    }
  }, "\u25B2 ", player.francs.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      background: 'rgba(8,12,22,0.7)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(255,179,71,0.4)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.16em',
      color: '#ffb347',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: 999,
      background: '#ffb347',
      boxShadow: '0 0 6px #ffb347'
    }
  }), player.missionCount, " Jobs"))), /*#__PURE__*/React.createElement(ProgressionCard, {
    player: player,
    onGoBuilding: onGoBuilding,
    onNav: onNav
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'auto'
    }
  }, (() => {
    const placed = player.placed || ['launchpad'];
    const SLOTS = [{
      id: 'satellite',
      kind: 'satellite',
      label: 'Satellite',
      sub: 'SCANNING',
      status: 'ok',
      w: 78,
      style: {
        left: 16,
        top: 506
      },
      onClick: () => onGoBuilding('satellite')
    }, {
      id: 'launchpad',
      kind: 'launchpad',
      label: 'Launchpad',
      sub: player.activeMission ? 'IN FLIGHT' : 'READY',
      status: player.activeMission ? 'warn' : 'ok',
      hot: !!player.pendingLaunch,
      w: 132,
      style: {
        left: '50%',
        top: 486,
        transform: 'translateX(-50%)'
      },
      onClick: () => onGoBuilding('launchpad')
    }, {
      id: 'control',
      kind: 'control',
      label: 'Control',
      sub: player.missionCount + ' JOBS',
      status: 'warn',
      w: 84,
      style: {
        right: 16,
        top: 506
      },
      onClick: () => onGoBuilding('missions')
    }];
    return SLOTS.map(s => placed.includes(s.id) ? /*#__PURE__*/React.createElement(Building, {
      key: s.id,
      kind: s.kind,
      label: s.label,
      sub: s.sub,
      status: s.status,
      hot: s.hot,
      onClick: s.onClick,
      w: s.w,
      style: s.style
    }) : /*#__PURE__*/React.createElement(EmptyPlot, {
      key: s.id,
      w: s.w,
      style: s.style,
      onClick: () => onGoBuilding('build')
    }));
  })())), /*#__PURE__*/React.createElement(SoilCrossSection, {
    onMarket: () => onGoBuilding('market')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 110,
      zIndex: 5,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '5px 12px',
      background: 'rgba(8,16,28,0.75)',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(135,207,250,0.4)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#9EDCFF',
      textTransform: 'uppercase'
    }
  }, "Tap a building")), /*#__PURE__*/React.createElement("style", null, `
        .hub-eyebrow { font-family: var(--ln-font-display); font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.6); text-shadow: 0 1px 4px rgba(0,0,0,0.7); }
        .hub-title { margin: 2px 0 0; font-family: var(--ln-font-display); font-size: 24px; font-weight: 800; letter-spacing: -0.01em; color: #fff; line-height: 1; text-shadow: 0 2px 10px rgba(0,0,0,0.7); }
        @keyframes cloud-drift {
          from { transform: translateX(0); }
          to   { transform: translateX(460px); }
        }
      `));
}

// ──────────────────────────────────────────────────────────────────────
// HubTopHUD — game ribbon that fills the iOS status-bar zone
// Sits BEHIND the device status bar (time/battery) and wraps around the
// dynamic island.  Left: mission count badge.  Right: Francs + XP/LV.
// ──────────────────────────────────────────────────────────────────────
function HubTopHUD({
  player
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      zIndex: 15,
      pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(6,9,15,0.78) 0%, rgba(6,9,15,0.55) 60%, transparent 100%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 78,
      top: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(255,179,71,0.16)',
      border: '1px solid rgba(255,179,71,0.45)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.16em',
      color: '#ffb347',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: 999,
      background: '#ffb347',
      boxShadow: '0 0 6px #ffb347'
    }
  }), player.missionCount, " Jobs")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 88,
      top: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(245,166,35,0.16)',
      border: '1px solid rgba(245,166,35,0.55)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.06em',
      color: '#f5a623'
    }
  }, "\u25B2 ", player.francs.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: 'rgba(135,207,250,0.14)',
      border: '1px solid rgba(135,207,250,0.45)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.06em',
      color: '#87CFFA'
    }
  }, "LV ", player.level)));
}

// ──────────────────────────────────────────────────────────────────────
// Cloud SVG that drifts horizontally
// ──────────────────────────────────────────────────────────────────────
function Cloud({
  style,
  dur = '60s',
  delay = '0s'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      animation: `cloud-drift ${dur} linear infinite`,
      animationDelay: delay,
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "120",
    height: "50",
    viewBox: "0 0 120 50",
    fill: "none"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "32",
    cy: "32",
    rx: "22",
    ry: "14",
    fill: "#ffffff",
    opacity: "0.82"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "58",
    cy: "26",
    rx: "26",
    ry: "16",
    fill: "#ffffff",
    opacity: "0.86"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "84",
    cy: "30",
    rx: "20",
    ry: "12",
    fill: "#ffffff",
    opacity: "0.78"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "48",
    cy: "36",
    rx: "28",
    ry: "10",
    fill: "#ffffff",
    opacity: "0.65"
  })));
}

// ──────────────────────────────────────────────────────────────────────
// EmptyPlot — an un-built buildable slot on the hub ground line.
// Tapping it routes to the Build screen.
// ──────────────────────────────────────────────────────────────────────
function EmptyPlot({
  w = 90,
  style,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: "ln-building",
    style: {
      position: 'absolute',
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: w,
      height: w * 0.5,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '88%',
      height: 26,
      borderRadius: '50% / 60%',
      background: 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.18), rgba(135,207,250,0.04) 70%)',
      border: '2px dashed rgba(135,207,250,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'pad-pulse 2s ease-in-out infinite'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 16,
      fontWeight: 800,
      color: 'rgba(135,207,250,0.8)',
      marginTop: -2
    }
  }, "+"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '3px 9px',
      borderRadius: 999,
      background: 'rgba(8,12,22,0.7)',
      backdropFilter: 'blur(6px)',
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 9,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#9EDCFF',
      whiteSpace: 'nowrap'
    }
  }, "+ Build"), /*#__PURE__*/React.createElement("style", null, `@keyframes pad-pulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.05); opacity: 1; } }`));
}

// ──────────────────────────────────────────────────────────────────────
// SoilCrossSection — paint a cutaway view of the soil layer below the
// surface buildings.  Reveals roots, rock strata, ore veins, and a
// buried Marketplace room embedded in the dirt.
// ──────────────────────────────────────────────────────────────────────
function SoilCrossSection({
  onMarket
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 96,
      height: 168,
      zIndex: 4,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 0,
      borderTop: '1.5px dashed rgba(255,225,160,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 18,
      background: 'linear-gradient(180deg, rgba(60,40,20,0.5), transparent)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 402 168",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "strata1",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#2a1a0e",
    stopOpacity: "0.0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#1a0f06",
    stopOpacity: "0.35"
  }))), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "402",
    height: "168",
    fill: "url(#strata1)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 44 Q 100 40, 200 46 T 402 42",
    stroke: "rgba(255,220,160,0.18)",
    strokeWidth: "1",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M0 96 Q 120 102, 220 94 T 402 100",
    stroke: "rgba(255,220,160,0.14)",
    strokeWidth: "1",
    fill: "none"
  }), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "74",
    cy: "66",
    r: "3",
    fill: "#d97150",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "80",
    cy: "72",
    r: "1.8",
    fill: "#ff9a78",
    opacity: "0.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "86",
    cy: "66",
    r: "2.2",
    fill: "#d97150",
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "316",
    cy: "90",
    r: "2.6",
    fill: "#b9d8ff",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "322",
    cy: "96",
    r: "1.6",
    fill: "#e0f0ff",
    opacity: "0.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "328",
    cy: "90",
    r: "2",
    fill: "#b9d8ff",
    opacity: "0.85"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "250",
    cy: "132",
    r: "2.8",
    fill: "#ffd166",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "256",
    cy: "138",
    r: "1.6",
    fill: "#fff0b0",
    opacity: "0.8"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "80",
    cy: "68",
    r: "14",
    fill: "#d97150",
    opacity: "0.12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "322",
    cy: "92",
    r: "14",
    fill: "#b9d8ff",
    opacity: "0.12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "252",
    cy: "134",
    r: "12",
    fill: "#ffd166",
    opacity: "0.12"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#2a1a0e",
    strokeWidth: "1.4",
    fill: "none",
    opacity: "0.55",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M40 0 q -4 24, 4 50"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M150 0 q 6 30, -6 56"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M360 0 q 8 20, -4 48"
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: onMarket,
    style: {
      position: 'absolute',
      left: 20,
      bottom: 8,
      width: 96,
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: 'not-allowed',
      pointerEvents: 'auto',
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 120 90",
    width: "100%",
    height: "64"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "14",
    width: "108",
    height: "68",
    fill: "#1a0f06",
    stroke: "#7a5028",
    strokeWidth: "1.4",
    opacity: "0.92"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "14",
    x2: "14",
    y2: "2",
    stroke: "#7a5028",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "114",
    y1: "14",
    x2: "106",
    y2: "2",
    stroke: "#7a5028",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "14",
    x2: "114",
    y2: "14",
    stroke: "#3a2418",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "16",
    y: "40",
    width: "20",
    height: "32",
    fill: "#3fa9ff",
    opacity: "0.85",
    stroke: "#1a2230",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "44",
    y: "40",
    width: "20",
    height: "32",
    fill: "#39d36a",
    opacity: "0.85",
    stroke: "#1a2230",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "72",
    y: "40",
    width: "20",
    height: "32",
    fill: "#ffb347",
    opacity: "0.85",
    stroke: "#1a2230",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "76",
    x2: "114",
    y2: "76",
    stroke: "#3a2418",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3,
      padding: '2px 7px',
      background: 'rgba(8,12,22,0.85)',
      border: '1px solid rgba(122,80,40,0.6)',
      borderRadius: 4,
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 8,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#9c8d70',
      textAlign: 'center'
    }
  }, "\uD83D\uDD12 Market \xB7 L5")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 14,
      top: 10,
      padding: '3px 8px',
      background: 'rgba(8,12,22,0.7)',
      border: '1px solid rgba(122,80,40,0.55)',
      borderRadius: 999,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#9c8d70'
    }
  }, "\xB7  Subsurface  \xB7"));
}

// ──────────────────────────────────────────────────────────────────────
// MISSION BOARD — list of contracts
// ──────────────────────────────────────────────────────────────────────

function MissionBoardScreen({
  onBack,
  onPick,
  player
}) {
  const {
    MISSIONS,
    CONTRACTORS,
    compatibleTargetsFor
  } = D();
  const {
    TopBar,
    Panel,
    StatusPill,
    SceneBg
  } = CH();
  const {
    ContractorBadge,
    I,
    MineralGlyph
  } = IC();
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#06090f'
    }
  }, /*#__PURE__*/React.createElement(SceneBg, {
    image: "../../assets/scenes/earth-day-sm.png",
    dim: 0.7
  }), /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: "EARTH BASE \xB7 M2",
    title: "Mission Board",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 96,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px 8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: 'var(--ln-text-muted)',
      textTransform: 'uppercase'
    }
  }, "Active Contracts \xB7 ", MISSIONS.filter(m => !m.locked).length), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StatusPill, {
    kind: "amber",
    dim: true
  }, "Sort \xB7 Payout")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, MISSIONS.map(m => {
    const contractor = CONTRACTORS[m.contractor];
    const targets = compatibleTargetsFor(m);
    const accent = contractor.color;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: () => !m.locked && onPick(m.id),
      style: {
        background: 'transparent',
        border: 'none',
        padding: 0,
        textAlign: 'left',
        cursor: m.locked ? 'not-allowed' : 'pointer',
        opacity: m.locked ? 0.5 : 1
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      accent: accent,
      style: {
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(ContractorBadge, {
      contractor: contractor,
      size: 44
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.2em',
        color: accent,
        textTransform: 'uppercase'
      }
    }, contractor.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        color: '#5d7390',
        textTransform: 'uppercase',
        marginLeft: 'auto'
      }
    }, m.tag)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 16,
        color: '#e6efff',
        marginTop: 4,
        letterSpacing: '0.01em'
      }
    }, m.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-body)',
        fontSize: 12,
        color: '#a9b8ce',
        marginTop: 4,
        lineHeight: 1.4
      }
    }, m.brief))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center'
      }
    }, Object.entries(m.requires.minerals).map(([k, v]) => {
      const meta = D().MINERAL_META[k];
      return /*#__PURE__*/React.createElement("div", {
        key: k,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px 3px 3px',
          background: 'rgba(8,16,28,0.7)',
          border: '1px solid ' + meta.color + '55',
          borderRadius: 6
        }
      }, /*#__PURE__*/React.createElement(MineralGlyph, {
        id: k,
        size: 20
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--ln-font-display)',
          fontSize: 11,
          fontWeight: 800,
          color: meta.color
        }
      }, "\xD7", v));
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(StatusPill, {
      kind: m.difficulty.startsWith('L') ? 'crit' : 'info',
      dim: true
    }, m.difficulty)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingTop: 10,
        borderTop: '1px dashed rgba(63,169,255,0.18)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 18,
        color: '#f5a623'
      }
    }, "\u25B2 ", m.payout.francs.toLocaleString()), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 11,
        letterSpacing: '0.16em',
        color: '#7ec8ff'
      }
    }, "+", m.payout.xp, " XP"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), m.locked ? /*#__PURE__*/React.createElement(StatusPill, {
      kind: "mute"
    }, "\uD83D\uDD12 ", m.unlockAt) : /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 8,
        background: accent + '20',
        border: '1px solid ' + accent + '55',
        color: accent,
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase'
      }
    }, targets.length, " target", targets.length !== 1 ? 's' : '', " \u203A"))));
  }))));
}

// ──────────────────────────────────────────────────────────────────────
// TARGET PICKER — Sol system showing compatible bodies highlighted
// ──────────────────────────────────────────────────────────────────────

function TargetPickerScreen({
  mission,
  onBack,
  onPick
}) {
  const {
    TARGETS,
    compatibleTargetsFor
  } = D();
  const {
    TopBar,
    Panel,
    StatusPill,
    PrimaryBtn
  } = CH();
  const {
    Sun,
    Planet,
    MineralGlyph,
    I
  } = IC();
  const compat = compatibleTargetsFor(mission);
  const compatIds = new Set(compat.map(t => t.id));
  const [picked, setPicked] = useState(compat.find(t => t.recommended)?.id || compat[0]?.id);

  // place planets in a portrait-friendly system view
  const ANGLES = {
    mercury: 200,
    venus: 320,
    earth: 70,
    mars: 140,
    belt: 250,
    jupiter: 30,
    saturn: 200,
    neptune: 320
  };
  const RADII = {
    1: 36,
    2: 60,
    3: 84,
    4: 108,
    5: 132,
    6: 158,
    7: 184,
    8: 208
  };
  function place(t) {
    const a = ANGLES[t.id] * Math.PI / 180;
    const r = RADII[t.orbit];
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r
    };
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#03060c'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: mission.title.toUpperCase(),
    title: "Pick Target",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 96,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px 6px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: 'var(--ln-text-muted)',
      textTransform: 'uppercase'
    }
  }, "Compatible \xB7 ", compat.length), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StatusPill, {
    kind: "amber",
    dim: true
  }, "Reach \u2264 Orbit ", mission.requires.max_orbit)), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '6px 14px',
      height: 360,
      borderRadius: 14,
      background:
      // deep field tactical bg per brief: nebula blobs over near-black
      'radial-gradient(40% 35% at 22% 18%, #1A1540AA, transparent 70%),' + 'radial-gradient(38% 30% at 78% 70%, #141E47AA, transparent 70%),' + 'radial-gradient(60% 60% at 50% 50%, #0a1422 0%, #03060a 90%)',
      border: '1px solid #434C5E',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(1px 1px at 8% 12%, #fff8, transparent 60%),' + 'radial-gradient(1px 1px at 18% 28%, #fff6, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 30% 44%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 44% 18%, #fff5, transparent 60%),' + 'radial-gradient(1.4px 1.4px at 58% 30%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 66% 62%, #fff5, transparent 60%),' + 'radial-gradient(1.3px 1.3px at 76% 22%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 84% 76%, #fff5, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 92% 44%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 12% 84%, #fff5, transparent 60%),' + 'radial-gradient(1.1px 1.1px at 26% 76%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 48% 88%, #fff4, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 62% 84%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 80% 92%, #fff5, transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'repeating-linear-gradient(0deg, transparent 0 39px, rgba(135,207,250,0.06) 39px 40px),' + 'repeating-linear-gradient(90deg, transparent 0 39px, rgba(135,207,250,0.06) 39px 40px)'
    }
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "tl"
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "tr"
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "bl"
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "br"
  }), [1, 2, 3, 4, 5, 6, 7, 8].map(o => {
    const tOnOrbit = TARGETS.find(t => t.orbit === o);
    const reachable = tOnOrbit && o <= mission.requires.max_orbit;
    return /*#__PURE__*/React.createElement("div", {
      key: o,
      style: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%,-50%)',
        width: RADII[o] * 2,
        height: RADII[o] * 2,
        borderRadius: 999,
        border: '1px ' + (reachable ? 'solid' : 'dashed') + ' ' + (reachable ? 'rgba(239,231,211,0.16)' : 'rgba(255,90,106,0.22)')
      }
    });
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: RADII[mission.requires.max_orbit] * 2 + 24,
      height: RADII[mission.requires.max_orbit] * 2 + 24,
      borderRadius: 999,
      border: '1px solid rgba(245,166,35,0.4)',
      boxShadow: 'inset 0 0 40px rgba(245,166,35,0.05)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)'
    }
  }, /*#__PURE__*/React.createElement(Sun, {
    size: 44
  })), TARGETS.map(t => {
    const p = place(t);
    const isCompat = compatIds.has(t.id);
    const isPicked = t.id === picked;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => isCompat && setPicked(t.id),
      style: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: p.x,
        marginTop: p.y,
        transform: 'translate(-50%,-50%)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: isCompat ? 'pointer' : 'not-allowed',
        opacity: isCompat ? 1 : 0.25,
        filter: isCompat ? 'none' : 'grayscale(1)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        borderRadius: 999,
        outline: isPicked ? '2px solid #f5a623' : 'none',
        outlineOffset: 4,
        boxShadow: isPicked ? '0 0 22px rgba(245,166,35,0.6)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(Planet, {
      id: t.id,
      size: t.id === 'belt' ? 36 : 26
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 9,
        color: isPicked ? '#f5a623' : '#cde4ff',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        background: 'rgba(8,12,22,0.7)',
        padding: '1px 5px',
        borderRadius: 3
      }
    }, t.name));
  })), picked && (() => {
    const t = TARGETS.find(x => x.id === picked);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 14px 0 14px'
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      accent: "#f5a623"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Planet, {
      id: t.id,
      size: 48
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.2em',
        color: '#f5a623',
        textTransform: 'uppercase'
      }
    }, "Target Selected"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 20,
        color: '#e6efff',
        letterSpacing: '0.02em'
      }
    }, t.name, t.recommended ? ' ★' : ''), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: '#7a8294',
        textTransform: 'uppercase'
      }
    }, "Orbit ", t.orbit, " \xB7 Difficulty ", t.difficulty))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        fontFamily: 'var(--ln-font-body)',
        fontSize: 12,
        color: '#a9b8ce',
        lineHeight: 1.4
      }
    }, t.brief), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, t.minerals.map(m => {
      const meta = D().MINERAL_META[m];
      const needed = mission.requires.minerals[m];
      return /*#__PURE__*/React.createElement("div", {
        key: m,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px 3px 3px',
          background: 'rgba(8,16,28,0.7)',
          border: '1px solid ' + meta.color + (needed ? 'aa' : '55'),
          borderRadius: 6,
          boxShadow: needed ? '0 0 12px ' + meta.color + '33' : 'none'
        }
      }, /*#__PURE__*/React.createElement(MineralGlyph, {
        id: m,
        size: 20
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--ln-font-display)',
          fontSize: 11,
          fontWeight: 700,
          color: meta.color
        }
      }, meta.name, needed ? ' · need ' + needed : ''));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement(PrimaryBtn, {
      onClick: () => onPick(t.id)
    }, "Continue \xB7 Build \u2192")));
  })(), compat.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: "#ff5a6a"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 14,
      color: '#ff8290'
    }
  }, "No reachable targets."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 12,
      color: '#a9b8ce',
      marginTop: 4
    }
  }, "Wait for higher-tier propulsion or pick a different mission.")))));
}

// ──────────────────────────────────────────────────────────────────────
// FAB — rocket assembly w/ live constraint validation
// ──────────────────────────────────────────────────────────────────────

function FabScreen({
  mission,
  target,
  rocket,
  onChange,
  onSuggest,
  onLaunch,
  onBack
}) {
  const {
    PARTS,
    validateBuild
  } = D();
  const {
    TopBar,
    Panel,
    PrimaryBtn,
    GhostBtn,
    StatusPill,
    ErrorRow
  } = CH();
  const {
    Planet,
    ContractorBadge,
    MineralGlyph
  } = IC();
  const check = validateBuild({
    mission,
    target,
    rocket
  });
  const {
    chassis,
    propulsion,
    drill,
    ok,
    problems
  } = check;
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#06090f'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, #0a1726 0%, #06101c 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'repeating-linear-gradient(0deg, transparent 0 19px, rgba(63,169,255,0.08) 19px 20px), ' + 'repeating-linear-gradient(90deg, transparent 0 19px, rgba(63,169,255,0.08) 19px 20px)'
    }
  }), /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: "LAUNCHPAD \xB7 ASSEMBLY",
    title: "Build Rocket",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 120,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px 12px'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: D().CONTRACTORS[mission.contractor].color,
    style: {
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(ContractorBadge, {
    contractor: D().CONTRACTORS[mission.contractor],
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Mission"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 14,
      color: '#e6efff'
    }
  }, mission.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 36,
      background: 'rgba(63,169,255,0.18)'
    }
  }), /*#__PURE__*/React.createElement(Planet, {
    id: target.id,
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Target"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 14,
      color: '#f5a623'
    }
  }, target.name))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, Object.entries(mission.requires.minerals).map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(MineralGlyph, {
    id: k,
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 800,
      color: D().MINERAL_META[k].color
    }
  }, "\xD7", v))), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StatusPill, {
    kind: "amber",
    dim: true
  }, "Cargo \u2265 ", mission.requires.cargo_min), /*#__PURE__*/React.createElement(StatusPill, {
    kind: "amber",
    dim: true
  }, "Drill \u2265 T", mission.requires.drill_tier)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(SlotRow, {
    slot: "chassis",
    label: "01 \xB7 Chassis \xB7 Hull + Cargo",
    picked: chassis,
    parts: PARTS.chassis,
    onPick: id => onChange('chassis', id),
    accent: "#3fa9ff"
  }), /*#__PURE__*/React.createElement(SlotRow, {
    slot: "propulsion",
    label: "02 \xB7 Propulsion \xB7 Range",
    picked: propulsion,
    parts: PARTS.propulsion,
    onPick: id => onChange('propulsion', id),
    accent: "#f5a623",
    target: target
  }), /*#__PURE__*/React.createElement(SlotRow, {
    slot: "drill",
    label: "03 \xB7 Mining Drill \xB7 Yield",
    picked: drill,
    parts: PARTS.drill,
    onPick: id => onChange('drill', id),
    accent: "#3fa9ff",
    mission: mission
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, problems.map((p, i) => /*#__PURE__*/React.createElement(ErrorRow, {
    key: i
  }, p)), ok && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      background: 'rgba(57,211,106,0.10)',
      border: '1px solid rgba(57,211,106,0.45)',
      borderRadius: 8,
      color: '#39d36a',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 999,
      background: '#39d36a',
      boxShadow: '0 0 8px #39d36a'
    }
  }), "Build compatible \xB7 Ready for launch"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      padding: '10px 14px 24px',
      background: 'linear-gradient(180deg, transparent 0%, #06090fee 30%, #06090f 100%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(GhostBtn, {
    onClick: onSuggest,
    full: false
  }, "\u2699 Auto-Suggest"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      color: ok ? '#39d36a' : '#ff5a6a',
      textTransform: 'uppercase',
      alignSelf: 'center'
    }
  }, ok ? '✓ COMPATIBLE' : '✗ ' + problems.length + ' ISSUE' + (problems.length !== 1 ? 'S' : ''))), /*#__PURE__*/React.createElement(PrimaryBtn, {
    kind: "amber",
    disabled: !ok,
    onClick: onLaunch
  }, "Confirm Launch \u2192")));
}

// ──────────────────────────────────────────────────────────────────────
// SlotRow — one assembly slot with its part image + tier chips
// ──────────────────────────────────────────────────────────────────────

function SlotRow({
  slot,
  label,
  picked,
  parts,
  onPick,
  accent,
  target,
  mission
}) {
  const {
    Panel
  } = CH();
  const isProp = slot === 'propulsion';
  if (!picked) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#7a8294',
      marginBottom: 8
    }
  }, label), /*#__PURE__*/React.createElement(Panel, {
    accent: accent
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 92,
      height: 64,
      flex: '0 0 auto',
      borderRadius: 6,
      background: 'radial-gradient(60% 80% at 50% 60%, ' + accent + '30 0%, transparent 70%), #06090f',
      border: '1px solid ' + accent + '40',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: picked.img,
    alt: "",
    style: {
      width: '90%',
      height: '90%',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800,
      fontSize: 16,
      color: '#e6efff',
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, picked.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      letterSpacing: '0.18em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginTop: 2
    }
  }, "ID \xB7 ", picked.id.toUpperCase(), " \xB7 T", picked.tier), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 6,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 11
    }
  }, slot === 'chassis' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Stat, {
    k: "MASS",
    v: picked.mass + 'T'
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "CARGO",
    v: picked.cargo + 'U',
    amber: mission && picked.cargo < mission.requires.cargo_min
  })), slot === 'propulsion' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Stat, {
    k: "PWR",
    v: picked.power + 'MW'
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "REACH",
    v: '≤O' + picked.max_orbit,
    amber: target && picked.max_orbit < target.orbit
  })), slot === 'drill' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Stat, {
    k: "RATE",
    v: '×' + picked.rate
  }), /*#__PURE__*/React.createElement(Stat, {
    k: "TIER",
    v: 'T' + picked.tier,
    amber: mission && picked.tier < mission.requires.drill_tier
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      marginTop: 8,
      paddingBottom: 4,
      WebkitOverflowScrolling: 'touch'
    }
  }, parts.map(p => {
    const on = p.id === picked.id;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      onClick: () => !p.locked && onPick(p.id),
      style: {
        flex: '0 0 auto',
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid ' + (on ? accent : 'rgba(63,169,255,0.25)'),
        background: on ? accent + '22' : 'rgba(8,16,28,0.7)',
        color: on ? accent : p.locked ? '#5d7390' : '#cde4ff',
        fontFamily: 'var(--ln-font-display)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        cursor: p.locked ? 'not-allowed' : 'pointer',
        opacity: p.locked ? 0.5 : 1,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, p.locked && '🔒', p.name, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        opacity: 0.7
      }
    }, "T", p.tier));
  })));
}
function Stat({
  k,
  v,
  amber
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d7390',
      letterSpacing: '0.18em',
      fontSize: 9
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: amber ? '#ff5a6a' : '#e6efff',
      fontFamily: 'var(--ln-font-display)',
      fontWeight: 800
    }
  }, v));
}

// ──────────────────────────────────────────────────────────────────────
// BUILD & PLACE — the very first step. Two phases:
//   phase 'pick'  → choose a structure from the build list (only Launchpad
//                   available at start; others locked).
//   phase 'place' → tap a plot cell on the Earth Base ground to site it.
// ──────────────────────────────────────────────────────────────────────

function BuildPlaceScreen({
  onPlaced,
  onBack
}) {
  const {
    TopBar,
    Panel,
    PrimaryBtn,
    GhostBtn,
    StatusPill,
    SceneBg
  } = CH();
  const {
    BuildingArt,
    I
  } = IC();
  const [phase, setPhase] = useState(typeof window !== 'undefined' && window.LANDNAM_START && window.LANDNAM_START.buildPhase || 'pick');
  const [picked, setPicked] = useState('launchpad');
  const [cell, setCell] = useState(null);
  const CATALOG = [{
    id: 'launchpad',
    name: 'Launchpad',
    kind: 'launchpad',
    cost: 0,
    desc: 'Assemble rockets and launch mining missions.',
    avail: true
  }, {
    id: 'control',
    name: 'Control Station',
    kind: 'control',
    cost: 500,
    desc: 'Unlocks the contractor job board.',
    avail: false,
    req: 'M1'
  }, {
    id: 'satellite',
    name: 'Satellite Station',
    kind: 'satellite',
    cost: 1800,
    desc: 'Scan TESS data, classify planet candidates.',
    avail: false,
    req: 'L5'
  }, {
    id: 'market',
    name: 'Marketplace',
    kind: 'market',
    cost: 2400,
    desc: 'Sell cargo at fluctuating live prices.',
    avail: false,
    req: 'L5'
  }];
  const sel = CATALOG.find(c => c.id === picked);

  // plot grid — 4 cols × 2 rows of buildable tiles on the ground band
  const COLS = 4,
    ROWS = 2;
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({
    r,
    c,
    id: r * COLS + c
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(SceneBg, {
    image: "../../assets/scenes/earth-day-sm.png",
    dim: phase === 'place' ? 0.35 : 0.12
  }), /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: phase === 'pick' ? 'EARTH BASE · SETUP' : 'PLACE STRUCTURE',
    title: phase === 'pick' ? 'Build' : 'Choose a Plot',
    onBack: phase === 'place' ? () => setPhase('pick') : onBack
  }), phase === 'pick' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 128,
      paddingBottom: 120,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: 'var(--ln-text-muted)',
      textTransform: 'uppercase'
    }
  }, "Available Structures")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, CATALOG.map(c => {
    const on = c.id === picked;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => c.avail && setPicked(c.id),
      style: {
        background: 'transparent',
        border: 'none',
        padding: 0,
        textAlign: 'left',
        cursor: c.avail ? 'pointer' : 'not-allowed',
        opacity: c.avail ? 1 : 0.5
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      accent: on ? '#f5a623' : '#3fa9ff',
      style: {
        padding: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 60,
        height: 60,
        flex: '0 0 auto',
        filter: c.avail ? 'none' : 'grayscale(0.7)'
      }
    }, /*#__PURE__*/React.createElement(BuildingArt, {
      kind: c.kind
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontWeight: 800,
        fontSize: 15,
        color: on ? '#f5a623' : '#e6efff',
        letterSpacing: '0.02em'
      }
    }, c.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-body)',
        fontSize: 11,
        color: '#a9b8ce',
        marginTop: 2,
        lineHeight: 1.35
      }
    }, c.desc), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6
      }
    }, c.avail ? /*#__PURE__*/React.createElement(StatusPill, {
      kind: c.cost === 0 ? 'ok' : 'amber'
    }, c.cost === 0 ? 'Free · Starter' : '▲ ' + c.cost) : /*#__PURE__*/React.createElement(StatusPill, {
      kind: "mute"
    }, "\uD83D\uDD12 ", c.req))), on && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#f5a623',
        fontSize: 22
      }
    }, "\u2713"))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px'
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    kind: "amber",
    onClick: () => setPhase('place')
  }, "Select a Plot \u2192"))), phase === 'place' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 14,
      right: 14,
      top: 130,
      zIndex: 12
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: "#f5a623",
    style: {
      padding: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(BuildingArt, {
    kind: sel.kind,
    hot: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.2em',
      color: '#f5a623',
      textTransform: 'uppercase'
    }
  }, "Placing \xB7 ", sel.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 12,
      color: '#a9b8ce',
      marginTop: 2
    }
  }, cell == null ? 'Tap a glowing pad on the surface.' : 'Pad chosen — confirm to build here.'))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 702,
      height: 3,
      zIndex: 6,
      background: 'linear-gradient(90deg, transparent, rgba(255,225,160,0.55) 20%, rgba(255,225,160,0.55) 80%, transparent)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 628,
      zIndex: 10,
      padding: '0 14px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 10
    }
  }, [0, 1, 2, 3].map(id => {
    const on = cell === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => setCell(id),
      style: {
        position: 'relative',
        flex: '1 1 0',
        maxWidth: 88,
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        marginBottom: 2,
        opacity: on ? 1 : 0,
        transform: on ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 160ms'
      }
    }, on && /*#__PURE__*/React.createElement(BuildingArt, {
      kind: sel.kind,
      hot: true
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        height: 30,
        borderRadius: '50% / 60%',
        background: on ? 'radial-gradient(ellipse at 50% 35%, rgba(245,166,35,0.5), rgba(245,166,35,0.12) 70%)' : 'radial-gradient(ellipse at 50% 35%, rgba(135,207,250,0.28), rgba(135,207,250,0.05) 70%)',
        border: '2px dashed ' + (on ? '#f5a623' : 'rgba(135,207,250,0.6)'),
        boxShadow: on ? '0 0 22px rgba(245,166,35,0.55)' : '0 2px 6px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: on ? 'none' : 'pad-pulse 1.8s ease-in-out infinite',
        transition: 'all 160ms'
      }
    }, !on && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 20,
        fontWeight: 800,
        color: 'rgba(135,207,250,0.85)',
        marginTop: -2
      }
    }, "+")));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      padding: '10px 14px 24px',
      background: 'linear-gradient(180deg, transparent 0%, #06090fcc 30%, #06090f 100%)'
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    kind: "amber",
    disabled: cell == null,
    onClick: () => onPlaced(picked)
  }, "Confirm \xB7 Build Here \u2192")), /*#__PURE__*/React.createElement("style", null, `@keyframes pad-pulse { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.05); opacity: 1; } }`)));
}
window.LandnamScreensPre = {
  HubScreen,
  MissionBoardScreen,
  TargetPickerScreen,
  FabScreen,
  GalaxyScreen,
  GameMenu,
  BuildPlaceScreen
};

// ──────────────────────────────────────────────────────────────────────
// AmbientStars — 55 procedurally placed dots in the upper sky
// ──────────────────────────────────────────────────────────────────────
function AmbientStars() {
  const dots = React.useMemo(() => {
    const out = [];
    let seed = 1337;
    const rnd = () => (seed = seed * 1103515245 + 12345 & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 55; i++) {
      out.push({
        x: rnd() * 100,
        y: rnd() * 92,
        r: 0.6 + rnd() * 1.4,
        o: 0.3 + rnd() * 0.6,
        d: 1.6 + rnd() * 2.8
      });
    }
    return out;
  }, []);
  return /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, dots.map((s, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: s.x,
    cy: s.y,
    r: s.r,
    fill: "#fff",
    opacity: s.o
  }, /*#__PURE__*/React.createElement("animate", {
    attributeName: "opacity",
    values: `${s.o};${s.o * 0.25};${s.o}`,
    dur: s.d + 's',
    repeatCount: "indefinite"
  }))));
}

// ──────────────────────────────────────────────────────────────────────
// ProgressionCard — contextual "what next" card, one at a time.
//   Priority: in-flight → launch-ready → debrief → build-control → next-mission
// ──────────────────────────────────────────────────────────────────────
function ProgressionCard({
  player,
  onGoBuilding,
  onNav
}) {
  let card;
  if (player.activeMission) {
    card = {
      accent: '#7ec8ff',
      eyebrow: 'Mission In Progress',
      title: player.activeMission.label,
      cta: 'Resume Mission',
      kind: 'info',
      go: () => onNav('resume')
    };
  } else if (player.pendingLaunch) {
    card = {
      accent: '#f5a623',
      eyebrow: 'Launch Ready on Pad',
      title: 'Vessel fuelled & assigned',
      cta: 'Open Launchpad',
      kind: 'amber',
      go: () => onGoBuilding('launchpad')
    };
  } else if (player.debriefPending) {
    card = {
      accent: '#39d36a',
      eyebrow: 'Mission Debrief Ready',
      title: 'Cargo awaiting sale',
      cta: 'Open Debrief',
      kind: 'ok',
      go: () => onNav('debrief')
    };
  } else {
    card = {
      accent: '#f5a623',
      eyebrow: 'Next Mission Available',
      title: player.missionCount + ' contracts on the board',
      cta: 'Open Launchpad',
      kind: 'amber',
      go: () => onGoBuilding('missions')
    };
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 14,
      right: 14,
      top: 86,
      zIndex: 8,
      maxWidth: 300,
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: card.go,
    style: {
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      background: 'linear-gradient(180deg, rgba(10,18,29,0.86), rgba(6,12,22,0.9))',
      border: '1px solid ' + card.accent + '66',
      borderRadius: 12,
      padding: 10,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 6px 18px rgba(0,0,0,0.4), 0 0 16px ' + card.accent + '22',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 36,
      borderRadius: 3,
      flex: '0 0 auto',
      background: card.accent,
      boxShadow: '0 0 10px ' + card.accent
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      fontWeight: 800,
      letterSpacing: '0.2em',
      color: card.accent,
      textTransform: 'uppercase'
    }
  }, card.eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 13,
      fontWeight: 800,
      color: '#e6efff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, card.title)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      padding: '5px 10px',
      borderRadius: 8,
      background: card.accent + '22',
      border: '1px solid ' + card.accent + '88',
      color: card.accent,
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, card.cta, " \u203A")));
}

// ──────────────────────────────────────────────────────────────────────
// GameMenu — modal overlay opened from the "Base" radial button.
//   Header: Logbook · Discoveries · Close.  Sections: Stats, Cargo, Settings.
// ──────────────────────────────────────────────────────────────────────
function GameMenu({
  player,
  onClose
}) {
  const {
    Panel,
    StatusPill,
    IconBtn
  } = CH();
  const {
    MineralGlyph
  } = IC();
  const {
    MINERAL_META
  } = D();
  const [tab, setTab] = useState('menu');
  const cargo = player.stash || {
    iron: 24,
    silicon: 40,
    ice: 12
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 60
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(3,6,12,0.72)',
      backdropFilter: 'blur(3px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: 40,
      background: 'linear-gradient(180deg, #0b1422 0%, #06090f 100%)',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      border: '1px solid rgba(63,169,255,0.3)',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'sheet-up 320ms cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.25)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 16px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "PLANET HUNTERS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 18,
      fontWeight: 800,
      color: '#e6efff'
    }
  }, "Base of Operations")), /*#__PURE__*/React.createElement(IconBtn, {
    onClick: onClose,
    ariaLabel: "close",
    size: 34
  }, IC().I.close())), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      padding: '0 16px 10px'
    }
  }, [['menu', 'Menu'], ['logbook', 'Logbook'], ['discoveries', 'Discoveries']].map(([id, lbl]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setTab(id),
    style: {
      flex: 1,
      padding: '8px 0',
      borderRadius: 8,
      cursor: 'pointer',
      background: tab === id ? 'rgba(63,169,255,0.16)' : 'rgba(8,16,28,0.6)',
      border: '1px solid ' + (tab === id ? 'rgba(63,169,255,0.55)' : 'rgba(63,169,255,0.18)'),
      color: tab === id ? '#87CFFA' : '#7a8294',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.16em',
      textTransform: 'uppercase'
    }
  }, lbl))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 16px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, tab === 'menu' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Panel, {
    accent: "#f5a623"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Stats"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      letterSpacing: '0.2em',
      color: '#d68a0d',
      textTransform: 'uppercase'
    }
  }, "Francs"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 20,
      fontWeight: 800,
      color: '#f5a623'
    }
  }, "\u25B2 ", player.francs.toLocaleString())), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      letterSpacing: '0.2em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Missions Done"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 20,
      fontWeight: 800,
      color: '#e6efff'
    }
  }, player.missionsDone || 3)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      letterSpacing: '0.2em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Level"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 20,
      fontWeight: 800,
      color: '#87CFFA'
    }
  }, player.level)))), /*#__PURE__*/React.createElement(Panel, {
    accent: "#3fa9ff"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginBottom: 8
    }
  }, "Cargo Hold"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, Object.entries(cargo).map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px 4px 4px',
      background: 'rgba(8,16,28,0.7)',
      border: '1px solid ' + MINERAL_META[k].color + '55',
      borderRadius: 6
    }
  }, /*#__PURE__*/React.createElement(MineralGlyph, {
    id: k,
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 12,
      fontWeight: 800,
      color: MINERAL_META[k].color
    }
  }, v))))), /*#__PURE__*/React.createElement(Panel, {
    accent: "#5d7390"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, "Settings"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(MenuRow, {
    label: "Practice Mining"
  }), /*#__PURE__*/React.createElement(MenuRow, {
    label: "Replay Tutorial"
  }), /*#__PURE__*/React.createElement(MenuRow, {
    label: "Dialogue",
    toggle: true
  }), /*#__PURE__*/React.createElement(MenuRow, {
    label: "Reset Progress",
    danger: true
  })))), tab === 'logbook' && /*#__PURE__*/React.createElement(Panel, {
    accent: "#7ec8ff"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 13,
      color: '#a9b8ce',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#e6efff'
    }
  }, "Mission Log"), /*#__PURE__*/React.createElement("br", null), "\xB7 M1 \xB7 Iron for Foundry-3 \u2014 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#39d36a'
    }
  }, "Delivered \u2605\u2605\u2605"), /*#__PURE__*/React.createElement("br", null), "\xB7 M1 \xB7 Silicon Mass Order \u2014 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#39d36a'
    }
  }, "Delivered \u2605\u2605"), /*#__PURE__*/React.createElement("br", null), "\xB7 M2 \xB7 Cryos Ice Run \u2014 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#ffb347'
    }
  }, "In progress"))), tab === 'discoveries' && /*#__PURE__*/React.createElement(Panel, {
    accent: "#c084ff"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 13,
      color: '#a9b8ce',
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: '#e6efff'
    }
  }, "Classified Targets"), /*#__PURE__*/React.createElement("br", null), "\xB7 Mars \u2014 Iron field mapped", /*#__PURE__*/React.createElement("br", null), "\xB7 Asteroid Belt \u2014 Rare anomaly flagged", /*#__PURE__*/React.createElement("br", null), "\xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#7a8294'
    }
  }, "3 candidates pending TESS review (L5)"))))), /*#__PURE__*/React.createElement("style", null, `@keyframes sheet-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`));
}
function MenuRow({
  label,
  toggle,
  danger
}) {
  const [on, setOn] = useState(true);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => toggle && setOn(o => !o),
    style: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: '10px 12px',
      borderRadius: 8,
      cursor: 'pointer',
      background: 'rgba(8,16,28,0.6)',
      border: '1px solid ' + (danger ? 'rgba(255,90,106,0.4)' : 'rgba(63,169,255,0.18)'),
      color: danger ? '#ff8290' : '#cde4ff',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.04em'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'left'
    }
  }, label), toggle ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 20,
      borderRadius: 999,
      background: on ? '#39d36a' : '#2a3340',
      position: 'relative',
      transition: 'background 160ms'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: on ? 18 : 2,
      width: 16,
      height: 16,
      borderRadius: 999,
      background: '#fff',
      transition: 'left 160ms'
    }
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d7390'
    }
  }, "\u203A"));
}

// ─── decoration: tactical corner mark ──────────────────────────────
function Greebly({
  pos
}) {
  const sty = {
    position: 'absolute',
    width: 18,
    height: 18,
    pointerEvents: 'none',
    borderColor: '#87CFFA',
    borderStyle: 'solid',
    borderWidth: 0
  };
  if (pos === 'tl') Object.assign(sty, {
    top: 8,
    left: 8,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5
  });
  if (pos === 'tr') Object.assign(sty, {
    top: 8,
    right: 8,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5
  });
  if (pos === 'bl') Object.assign(sty, {
    bottom: 8,
    left: 8,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5
  });
  if (pos === 'br') Object.assign(sty, {
    bottom: 8,
    right: 8,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5
  });
  return /*#__PURE__*/React.createElement("div", {
    style: sty
  });
}

// ──────────────────────────────────────────────────────────────────────
// GALAXY — cross-system map.  Tactical HUD per visual brief.
// ──────────────────────────────────────────────────────────────────────

function GalaxyScreen({
  onBack,
  onPickStar
}) {
  const {
    STARS,
    STAR_LINKS
  } = D();
  const {
    TopBar,
    Panel,
    StatusPill,
    PrimaryBtn
  } = CH();
  const [picked, setPicked] = useState('sol');
  const star = STARS.find(s => s.id === picked);
  return /*#__PURE__*/React.createElement("div", {
    className: "scene",
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#05060d'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    eyebrow: "STELLAR_OS \xB7 SECTOR",
    title: "Galaxy Atlas",
    onBack: onBack
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      paddingTop: 72,
      paddingBottom: 96,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 14px 8px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: 'var(--ln-text-muted)',
      textTransform: 'uppercase'
    }
  }, "Sector \xB7 8 systems"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StatusPill, {
    kind: "info",
    dim: true
  }, "Range L4")), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '6px 14px',
      height: 480,
      borderRadius: 14,
      background: 'radial-gradient(40% 35% at 22% 18%, #1A1540AA, transparent 70%),' + 'radial-gradient(38% 30% at 78% 70%, #141E47CC, transparent 70%),' + 'radial-gradient(50% 50% at 50% 50%, #080810 0%, #03060A 90%)',
      border: '1px solid #434C5E',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(1px 1px at 6% 8%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 14% 22%, #fff5, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 22% 38%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 34% 16%, #fff5, transparent 60%),' + 'radial-gradient(1.4px 1.4px at 42% 30%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 52% 60%, #fff5, transparent 60%),' + 'radial-gradient(1.3px 1.3px at 60% 22%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 68% 76%, #fff5, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 76% 44%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 84% 12%, #fff5, transparent 60%),' + 'radial-gradient(1.1px 1.1px at 92% 28%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 90% 70%, #fff5, transparent 60%),' + 'radial-gradient(1.2px 1.2px at 12% 88%, #fff6, transparent 60%),' + 'radial-gradient(1px 1px at 36% 92%, #fff5, transparent 60%),' + 'radial-gradient(1.4px 1.4px at 62% 86%, #fff7, transparent 60%),' + 'radial-gradient(1px 1px at 80% 92%, #fff5, transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: 'repeating-linear-gradient(0deg, transparent 0 39px, rgba(135,207,250,0.08) 39px 40px),' + 'repeating-linear-gradient(90deg, transparent 0 39px, rgba(135,207,250,0.08) 39px 40px)'
    }
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "tl"
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "tr"
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "bl"
  }), /*#__PURE__*/React.createElement(Greebly, {
    pos: "br"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      left: 36,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      letterSpacing: '0.22em',
      color: '#87CFFA88',
      textTransform: 'uppercase'
    }
  }, "SEC \xB7 04A"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 14,
      right: 36,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      letterSpacing: '0.22em',
      color: '#87CFFA88',
      textTransform: 'uppercase'
    }
  }, "+22.4ly"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 14,
      left: 36,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      letterSpacing: '0.22em',
      color: '#87CFFA88',
      textTransform: 'uppercase'
    }
  }, "v 4.0.2"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 14,
      right: 36,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      letterSpacing: '0.22em',
      color: '#87CFFA88',
      textTransform: 'uppercase'
    }
  }, "\xB7  Galaxy  \xB7"), /*#__PURE__*/React.createElement("svg", {
    width: "100%",
    height: "100%",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0
    }
  }, STAR_LINKS.map(([a, b], i) => {
    const sa = STARS.find(s => s.id === a);
    const sb = STARS.find(s => s.id === b);
    const hot = a === picked || b === picked;
    return /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: sa.x,
      y1: sa.y,
      x2: sb.x,
      y2: sb.y,
      stroke: hot ? '#f5a623' : '#9EDCFF',
      strokeOpacity: hot ? 0.75 : 0.30,
      strokeWidth: hot ? '0.30' : '0.22',
      strokeDasharray: "0.6 1.2",
      vectorEffect: "non-scaling-stroke"
    });
  })), STARS.map(s => {
    const colors = {
      sol: {
        c: '#E2C19C',
        glow: '#fff7c8'
      },
      cool: {
        c: '#cfe2ff',
        glow: '#9EDCFF'
      },
      warm: {
        c: '#ffa46a',
        glow: '#ffd28a'
      },
      red: {
        c: '#ff7676',
        glow: '#ff5a6a'
      },
      pale: {
        c: '#f0f4ff',
        glow: '#fff'
      }
    };
    const col = colors[s.kind] || colors.cool;
    const isPicked = s.id === picked;
    return /*#__PURE__*/React.createElement("button", {
      key: s.id,
      onClick: () => setPicked(s.id),
      style: {
        position: 'absolute',
        left: s.x + '%',
        top: s.y + '%',
        transform: 'translate(-50%,-50%)',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: isPicked ? 16 : 10,
        height: isPicked ? 16 : 10,
        borderRadius: 999,
        background: 'radial-gradient(circle, ' + col.glow + ', ' + col.c + ' 70%)',
        boxShadow: '0 0 ' + (isPicked ? 18 : 10) + 'px ' + col.glow,
        transition: 'all 200ms'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 4,
        padding: '1px 5px',
        background: '#0a0c12',
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 9,
        letterSpacing: '0.05em',
        color: isPicked ? '#f5a623' : '#d8e0ee',
        whiteSpace: 'nowrap'
      }
    }, s.name, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#7a8294',
        marginLeft: 6,
        fontSize: 8
      }
    }, s.dist)));
  }), star && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: star.x + '%',
      top: star.y + '%',
      transform: 'translate(-50%,-50%)',
      width: 40,
      height: 40,
      border: '1px solid #f5a623',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: -7,
      width: 1,
      height: 7,
      background: '#f5a623'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: -7,
      width: 1,
      height: 7,
      background: '#f5a623'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: -7,
      width: 7,
      height: 1,
      background: '#f5a623'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      right: -7,
      width: 7,
      height: 1,
      background: '#f5a623'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 14px 0'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    accent: star && star.id === 'sol' ? '#E2C19C' : '#7ec8ff'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.22em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "System Telemetry"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontWeight: 700,
      fontSize: 22,
      color: star?.id === 'sol' ? '#E2C19C' : '#efe7d3'
    }
  }, star?.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 11,
      letterSpacing: '0.16em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, star?.dist)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 8,
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 10,
      letterSpacing: '0.1em',
      color: '#a9b8ce',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d7390'
    }
  }, "CLASS"), "\xA0\xA0", starClass(star)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d7390'
    }
  }, "BODIES"), "\xA0\xA0", /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#f5a623',
      fontWeight: 700
    }
  }, star?.id === 'sol' ? 8 : '—')), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5d7390'
    }
  }, "STAT"), "\xA0\xA0", /*#__PURE__*/React.createElement("span", {
    style: {
      color: star?.id === 'sol' ? '#39d36a' : '#ff5a6a'
    }
  }, star?.id === 'sol' ? 'OPEN' : 'LOCKED'))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 14px 0'
    }
  }, /*#__PURE__*/React.createElement(PrimaryBtn, {
    disabled: star?.id !== 'sol',
    onClick: () => onPickStar(picked)
  }, star?.id === 'sol' ? 'Enter Sol System →' : 'Out of Range · L' + (5 + STARS.findIndex(s => s.id === picked) % 3)))));
}
function starClass(s) {
  if (!s) return '—';
  return {
    sol: 'G2V',
    cool: 'A0V',
    warm: 'K2V',
    red: 'M4V',
    pale: 'B3V'
  }[s.kind] || 'G0V';
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/screens-pre.tsx", error: String((e && e.message) || e) }); }

// ui_kits/landnam-portrait/tutorial.tsx
try { (() => {
/* global React, window */
// Landnam — Tutorial / onboarding layer.
//   - TutorialCoach: pinned coach + speech card + spotlight cutout, step counter
//   - UnlockPopup:   SR2 unlock, Free-Ops unlock, generic reward popups
//   - BuildGatePrompt: "Build the Control Station" gate between M1 and M2
// Exposed via window.LandnamTutorial.

const {
  useState,
  useEffect,
  useRef
} = React;
function CH() {
  return window.LandnamChrome;
}
function IC() {
  return window.LandnamIcons;
}

// ──────────────────────────────────────────────────────────────────────
// Coached step script.  Each step binds to a SCREEN; the coach card text +
// the call-to-action highlight live here so the flow is data-driven.
//   anchor: where the speech card points  ('top'|'bottom'|'center')
//   spot:   {x,y,w,h} region (in 402×874 canvas px) to spotlight, or null
//   cta:    label shown on the highlighted control (purely descriptive)
// ──────────────────────────────────────────────────────────────────────
const M1_STEPS = [{
  id: 0,
  screen: 'build',
  title: 'Build a Launchpad',
  body: 'Every base starts here. Select the Launchpad, then tap a plot to place it on your land.',
  action: 'Tap SELECT A PLOT, then a pad',
  anchor: 'bottom',
  spot: null,
  cta: 'Build Launchpad'
}, {
  id: 1,
  screen: 'hub',
  title: 'Open a Mission',
  body: 'Open the radial menu, then choose MISSIONS to see the contract board.',
  action: 'Tap menu, then MISSIONS',
  anchor: 'top',
  spot: {
    x: 169,
    y: 786,
    w: 64,
    h: 64
  },
  cta: 'the menu'
}, {
  id: 2,
  screen: 'missions',
  title: 'Lock a Contract',
  body: 'Pick a mining company. They name the minerals they want and pay a bonus on delivery.',
  action: 'Tap a contract card',
  anchor: 'bottom',
  spot: {
    x: 14,
    y: 150,
    w: 374,
    h: 168
  },
  cta: 'a contract'
}, {
  id: 3,
  screen: 'targets',
  title: 'Choose a Destination',
  body: 'Tap a highlighted body on the map — only compatible targets are selectable.',
  action: 'Tap a target, then Continue',
  anchor: 'bottom',
  spot: {
    x: 20,
    y: 150,
    w: 362,
    h: 360
  },
  cta: 'a target'
}, {
  id: 4,
  screen: 'fab',
  title: 'Assemble the Rocket',
  body: 'Your Starter Rocket is pre-loaded with compatible parts. Swap any slot to experiment, or keep the suggested build.',
  manual: true,
  anchor: 'top',
  spot: {
    x: 14,
    y: 150,
    w: 374,
    h: 250
  },
  cta: 'Got it'
}, {
  id: 5,
  screen: 'fab',
  title: 'Launch',
  body: 'Everything checks out.',
  action: 'Tap CONFIRM LAUNCH',
  anchor: 'top',
  spot: {
    x: 14,
    y: 786,
    w: 374,
    h: 64
  },
  cta: 'Confirm Launch'
}, {
  id: 6,
  screen: 'mining',
  title: 'Mine the Asteroid',
  body: 'Tap the glowing ore deposits to fire your laser. Fill your contract order, then tap RETURN when you\'re ready to fly home.',
  action: 'Tap ore to mine · then Return',
  anchor: 'center',
  spot: null,
  cta: 'mine'
}, {
  id: 9,
  screen: 'debrief',
  title: 'Debrief',
  body: 'Sell your cargo and collect the contractor bonus.',
  action: 'Tap to collect your reward',
  anchor: 'top',
  spot: {
    x: 14,
    y: 786,
    w: 374,
    h: 64
  },
  cta: 'Collect'
}];

// ──────────────────────────────────────────────────────────────────────
// Coach character glyph — a friendly helmeted operator bust
// ──────────────────────────────────────────────────────────────────────
function CoachAvatar({
  size = 44,
  talking
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: 999,
      flex: '0 0 auto',
      background: 'radial-gradient(circle at 32% 28%, #6cc2ff, #2d8de0 60%, #1c4f86)',
      border: '2px solid #aef',
      boxShadow: '0 0 14px rgba(63,169,255,0.7), inset 0 2px 0 rgba(255,255,255,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      animation: talking ? 'coach-bob 1.2s ease-in-out infinite' : 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.62,
    height: size * 0.62,
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 13 a7 7 0 0 1 14 0 v3 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 z",
    fill: "#0a1422",
    stroke: "#cde4ff",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 11 a4.5 4.5 0 0 1 9 0 v2 h-9 z",
    fill: "#87CFFA"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "10",
    cy: "11",
    rx: "1.4",
    ry: "2",
    fill: "#fff",
    opacity: "0.7"
  })));
}

// ──────────────────────────────────────────────────────────────────────
// TutorialCoach — non-blocking guide. Two modes:
//   • POINT (action steps): a slim hint bar at the top + a pulsing ring
//     drawn AROUND the real control. NO advance button — the player must
//     press the real button themselves. A finger/arrow points at it.
//     Tapping the coach avatar collapses the hint to just the ring.
//   • INFO (manual steps): a small speech card with a "Got it ›" that only
//     advances the narration (no game action performed).
// The dimmer is light and the spotlight hole is fully click-through, so the
// highlighted control is always pressable.
// ──────────────────────────────────────────────────────────────────────
function TutorialCoach({
  stepIndex,
  steps,
  step,
  total,
  onManualNext,
  onSkip
}) {
  const {
    useState
  } = React;
  const [collapsed, setCollapsed] = useState(false);
  if (!step) return null;
  const spot = step.spot;
  const manual = !!step.manual;

  // Progress dots derived from step order
  const dots = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: i === stepIndex ? 16 : 6,
      height: 6,
      borderRadius: 999,
      background: i < stepIndex ? '#39d36a' : i === stepIndex ? '#f5a623' : 'rgba(135,207,250,0.25)',
      transition: 'all 200ms'
    }
  })));

  // Spotlight ring around the real control (click-through hole).
  const ring = spot && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: spot.x,
      top: spot.y,
      width: spot.w,
      height: spot.h,
      borderRadius: 14,
      boxShadow: '0 0 0 9999px rgba(3,6,12,' + (manual ? '0.62' : '0.42') + ')',
      border: '2px solid #f5a623',
      animation: 'coach-spot 1.4s ease-in-out infinite',
      pointerEvents: 'none'
    }
  }), !collapsed && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: Math.min(Math.max(spot.x + spot.w / 2 - 13, 12), 364),
      top: step.anchor === 'top' ? spot.y + spot.h + 4 : spot.y - 34,
      animation: 'coach-point 1s ease-in-out infinite',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "30",
    viewBox: "0 0 26 30",
    style: {
      transform: step.anchor === 'top' ? 'rotate(180deg)' : 'none',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 2 L13 22 M13 22 L6 15 M13 22 L20 15",
    stroke: "#f5a623",
    strokeWidth: "4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none"
  }))));

  // ── INFO MODE — small narration card (no game action) ──
  if (manual) {
    const cardTop = step.anchor === 'top' ? 150 : step.anchor === 'center' ? 330 : 520;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        pointerEvents: 'none'
      }
    }, ring || /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(3,6,12,0.45)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 14,
        right: 14,
        top: cardTop,
        zIndex: 82,
        pointerEvents: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'linear-gradient(180deg, #0d1c30 0%, #081120 100%)',
        border: '1px solid rgba(135,207,250,0.5)',
        borderRadius: 16,
        padding: 14,
        boxShadow: '0 12px 36px rgba(0,0,0,0.6), 0 0 24px rgba(63,169,255,0.25)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(CoachAvatar, {
      size: 40,
      talking: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.2em',
        color: '#87CFFA',
        textTransform: 'uppercase'
      }
    }, "Mission Coach"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--ln-font-mono)',
        fontSize: 10,
        color: '#7a8294',
        letterSpacing: '0.12em'
      }
    }, stepIndex + 1, " / ", total)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-display)',
        fontSize: 15,
        fontWeight: 800,
        color: '#e6efff',
        marginTop: 4
      }
    }, step.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--ln-font-body)',
        fontSize: 13,
        color: '#a9b8ce',
        marginTop: 4,
        lineHeight: 1.45
      }
    }, step.body))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 12
      }
    }, dots, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: onSkip,
      style: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--ln-font-display)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: '#5d7390'
      }
    }, "Skip"), /*#__PURE__*/React.createElement("button", {
      onClick: onManualNext,
      style: {
        padding: '8px 16px',
        borderRadius: 10,
        cursor: 'pointer',
        border: 'none',
        background: 'linear-gradient(180deg, #6cc2ff, #2d8de0)',
        color: '#06121f',
        fontFamily: 'var(--ln-font-display)',
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, "Got it ", /*#__PURE__*/React.createElement("span", null, "\u203A"))))), /*#__PURE__*/React.createElement("style", null, COACH_KEYFRAMES));
  }

  // ── POINT MODE — slim top hint bar, player presses the real button ──
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 80,
      pointerEvents: 'none'
    }
  }, ring, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      top: 62,
      zIndex: 82,
      pointerEvents: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'linear-gradient(180deg, rgba(13,28,48,0.96), rgba(8,17,32,0.96))',
      border: '1px solid rgba(245,166,35,0.5)',
      borderRadius: 999,
      padding: '7px 12px 7px 7px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCollapsed(c => !c),
    style: {
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(CoachAvatar, {
    size: 34,
    talking: !collapsed
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      fontWeight: 800,
      letterSpacing: '0.2em',
      color: '#f5a623',
      textTransform: 'uppercase'
    }
  }, step.title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 9,
      color: '#7a8294'
    }
  }, stepIndex + 1, "/", total)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 12,
      color: '#dfe9f7',
      lineHeight: 1.3,
      marginTop: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "\uD83D\uDC49 ", step.action || 'Tap ' + step.cta)), /*#__PURE__*/React.createElement("button", {
    onClick: onSkip,
    style: {
      flex: '0 0 auto',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#5d7390'
    }
  }, "Skip")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      display: 'flex',
      justifyContent: 'center'
    }
  }, dots)), /*#__PURE__*/React.createElement("style", null, COACH_KEYFRAMES));
}
const COACH_KEYFRAMES = `
  @keyframes coach-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
  @keyframes coach-spot { 0%,100% { box-shadow: 0 0 0 9999px rgba(3,6,12,0.5), 0 0 0 0 rgba(245,166,35,0); } 50% { box-shadow: 0 0 0 9999px rgba(3,6,12,0.5), 0 0 18px 3px rgba(245,166,35,0.6); } }
  @keyframes coach-point { 0%,100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
`;

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
    cta: 'Outstanding'
  },
  freeops: {
    accent: '#f5a623',
    eyebrow: 'Milestone Reached',
    title: 'FREE OPERATIONS',
    body: 'All authored missions complete. The Marketplace is open, the mission cap is lifted — you\'re in command now.',
    art: 'star',
    stats: [['MARKET', 'OPEN'], ['MISSIONS', '∞'], ['COACH', 'OFF']],
    cta: 'Take Command'
  },
  loan: {
    accent: '#ffb347',
    eyebrow: 'Offer',
    title: 'EMERGENCY LOAN',
    body: 'Running low on Francs? The Foundry Guild offers a 5,000 F advance, repaid from your next two deliveries.',
    art: 'coin',
    stats: [['ADVANCE', '5,000 F'], ['TERM', '2 RUNS'], ['RATE', '8%']],
    cta: 'Accept Loan'
  }
};
function UnlockPopup({
  kind,
  onClose
}) {
  const u = UNLOCKS[kind] || UNLOCKS.sr2;
  const {
    Planet
  } = IC();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(3,6,12,0.8)',
      backdropFilter: 'blur(3px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 320,
      maxWidth: '90%',
      background: 'linear-gradient(180deg, #0d1c30 0%, #060d18 100%)',
      border: '1px solid ' + u.accent + '88',
      borderRadius: 20,
      padding: 22,
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px ' + u.accent + '33',
      animation: 'unlock-in 420ms cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 20,
      overflow: 'hidden',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 70,
      width: 300,
      height: 300,
      transform: 'translate(-50%,-50%)',
      background: 'conic-gradient(from 0deg, ' + u.accent + '22 0deg, transparent 18deg, ' + u.accent + '22 36deg, transparent 54deg, ' + u.accent + '22 72deg, transparent 90deg, ' + u.accent + '22 108deg, transparent 126deg, ' + u.accent + '22 144deg, transparent 162deg, ' + u.accent + '22 180deg, transparent 198deg, ' + u.accent + '22 216deg, transparent 234deg, ' + u.accent + '22 252deg, transparent 270deg, ' + u.accent + '22 288deg, transparent 306deg, ' + u.accent + '22 324deg, transparent 342deg, ' + u.accent + '22 360deg)',
      animation: 'unlock-spin 18s linear infinite'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.24em',
      color: u.accent,
      textTransform: 'uppercase'
    }
  }, u.eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '14px auto',
      width: 96,
      height: 96,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -8,
      borderRadius: 999,
      background: 'radial-gradient(circle, ' + u.accent + '44, transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement(UnlockArt, {
    kind: u.art,
    accent: u.accent
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: '0.04em',
      color: '#fff',
      textShadow: '0 0 18px ' + u.accent + '88'
    }
  }, u.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 13,
      color: '#a9b8ce',
      marginTop: 8,
      lineHeight: 1.5
    }
  }, u.body), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'center',
      marginTop: 16
    }
  }, u.stats.map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      flex: 1,
      padding: '8px 4px',
      background: 'rgba(8,16,28,0.7)',
      border: '1px solid ' + u.accent + '44',
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: '0.16em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 15,
      fontWeight: 800,
      color: u.accent,
      marginTop: 2
    }
  }, v)))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: '100%',
      marginTop: 18,
      padding: '14px',
      borderRadius: 12,
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(180deg, ' + u.accent + ', ' + IC().darken(u.accent, 0.35) + ')',
      color: '#04121f',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 14,
      fontWeight: 800,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.3)'
    }
  }, u.cta))), /*#__PURE__*/React.createElement("style", null, `
        @keyframes unlock-in { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes unlock-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
      `));
}
function UnlockArt({
  kind,
  accent
}) {
  if (kind === 'rocket') return /*#__PURE__*/React.createElement("svg", {
    width: "96",
    height: "96",
    viewBox: "0 0 96 96"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "ua-body",
    x1: "0",
    x2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#eaf3ff"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#7a93b5"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M48 8 L62 34 L62 70 L34 70 L34 34 Z",
    fill: "url(#ua-body)",
    stroke: "#1a2230",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M48 8 L62 34 L34 34 Z",
    fill: accent
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "48",
    cy: "42",
    r: "6",
    fill: "#f5a623",
    stroke: "#1a2230"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M34 60 L22 78 L34 72 M62 60 L74 78 L62 72",
    fill: accent,
    stroke: "#1a2230"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M40 70 L48 90 L56 70",
    fill: "#f5a623"
  }));
  if (kind === 'coin') return /*#__PURE__*/React.createElement("svg", {
    width: "96",
    height: "96",
    viewBox: "0 0 96 96"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "48",
    cy: "48",
    r: "34",
    fill: "radial-gradient(#ffe1a8,#d68a0d)",
    stroke: "#8a5300",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "48",
    cy: "48",
    r: "34",
    fill: "#f5a623",
    stroke: "#8a5300",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "48",
    cy: "48",
    r: "26",
    fill: "none",
    stroke: "#fff1d0",
    strokeWidth: "1.5",
    opacity: "0.6"
  }), /*#__PURE__*/React.createElement("text", {
    x: "48",
    y: "60",
    textAnchor: "middle",
    fontFamily: "var(--ln-font-display)",
    fontSize: "34",
    fontWeight: "800",
    fill: "#7a4f00"
  }, "\u25B2"));
  // star
  return /*#__PURE__*/React.createElement("svg", {
    width: "96",
    height: "96",
    viewBox: "0 0 96 96"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M48 8 L58 38 L90 39 L64 58 L74 90 L48 70 L22 90 L32 58 L6 39 L38 38 Z",
    fill: accent,
    stroke: "#fff",
    strokeWidth: "1.5",
    opacity: "0.95"
  }));
}

// ──────────────────────────────────────────────────────────────────────
// BuildGatePrompt — between M1 and M2: place the Control Station
// ──────────────────────────────────────────────────────────────────────
function BuildGatePrompt({
  onBuild,
  onClose,
  francs
}) {
  const cost = 500000000;
  const afford = francs >= cost;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 88,
      display: 'flex',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(3,6,12,0.7)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      background: 'linear-gradient(180deg, #0d1c30, #060d18)',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      border: '1px solid rgba(245,166,35,0.5)',
      padding: '18px 16px 26px',
      boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
      animation: 'gate-up 360ms cubic-bezier(.16,1,.3,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 2,
      background: 'rgba(255,255,255,0.25)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(window.LandnamIcons.BuildingArt, {
    kind: "control"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.22em',
      color: '#f5a623',
      textTransform: 'uppercase'
    }
  }, "Build Required"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 18,
      fontWeight: 800,
      color: '#e6efff'
    }
  }, "Control Station"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-body)',
      fontSize: 12,
      color: '#a9b8ce',
      marginTop: 4,
      lineHeight: 1.4
    }
  }, "Unlocks the contractor job board and re-enables the Missions tab."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.18em',
      color: '#7a8294',
      textTransform: 'uppercase'
    }
  }, "Cost"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-display)',
      fontSize: 16,
      fontWeight: 800,
      color: afford ? '#f5a623' : '#ff5a6a'
    }
  }, "\u25B2 500,000,000"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--ln-font-mono)',
      fontSize: 10,
      color: '#5d7390'
    }
  }, "Bal \u25B2 ", francs.toLocaleString())), /*#__PURE__*/React.createElement("button", {
    onClick: onBuild,
    disabled: !afford,
    style: {
      width: '100%',
      marginTop: 14,
      padding: '15px',
      borderRadius: 12,
      border: 'none',
      cursor: afford ? 'pointer' : 'not-allowed',
      background: 'linear-gradient(180deg, #ffc25c, #d68a0d)',
      color: '#1d0c00',
      fontFamily: 'var(--ln-font-display)',
      fontSize: 14,
      fontWeight: 800,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      boxShadow: 'inset 0 1px 0 rgba(255,235,180,0.5), 0 4px 0 rgba(0,0,0,0.3)',
      opacity: afford ? 1 : 0.5
    }
  }, "Build \xB7 Place on Earth Base")), /*#__PURE__*/React.createElement("style", null, `@keyframes gate-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`));
}
window.LandnamTutorial = {
  M1_STEPS,
  TutorialCoach,
  CoachAvatar,
  UnlockPopup,
  BuildGatePrompt
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landnam-portrait/tutorial.tsx", error: String((e && e.message) || e) }); }

})();
