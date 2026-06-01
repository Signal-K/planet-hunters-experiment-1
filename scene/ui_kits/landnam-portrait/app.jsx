/* global React, window */
// Landnam Portrait — root state machine

const { useState } = React;

function LandnamApp() {
  const D  = window.LandnamData;
  const CH = window.LandnamChrome;
  const SP = window.LandnamScreensPre;
  const SL = window.LandnamScreensLoop;
  const TUT = window.LandnamTutorial;

  const [screen, setScreen] = useState('hub');
  const [player, setPlayer] = useState({
    francs: 1240, level: 4, xp: 2140,
    activeMission: null,
    missionCount: D.MISSIONS.filter(m => !m.locked).length,
    pendingLaunch: false,
  });
  const [missionId, setMissionId] = useState(null);
  const [targetId, setTargetId]   = useState(null);
  const [rocket, setRocket]       = useState({ chassis: 'hull-mk1', propulsion: 'ion-a1', drill: 'hand-drill' });
  const [lastCargo, setLastCargo] = useState(null);
  const [menuOpen, setMenuOpen]   = useState(false);
  // ── Tutorial / onboarding state ──────────────────────────────────
  const [tutorial, setTutorial] = useState(true);     // M1 coached run active
  const [doneSteps, setDoneSteps] = useState({});      // step.id -> true
  const [subStep, setSubStep] = useState(0);           // index within same-screen steps
  const [popup, setPopup] = useState(null);            // 'sr2' | 'freeops' | 'loan'
  const [buildGate, setBuildGate] = useState(false);   // Control Station gate

  // The coach is screen-driven: show the steps that belong to the current
  // screen (in order), advancing through any same-screen sub-steps. This keeps
  // the coach in sync whether the player taps the coach CTA or the real control.
  const stepsHere = tutorial ? TUT.M1_STEPS.filter(s => s.screen === screen && !doneSteps[s.id]) : [];
  const coach = stepsHere[Math.min(subStep, Math.max(0, stepsHere.length - 1))] || null;
  const coachIndex = coach ? TUT.M1_STEPS.findIndex(s => s.id === coach.id) : -1;

  function coachAdvance() {
    if (!coach) return;
    // mark this step done
    setDoneSteps(d => ({ ...d, [coach.id]: true }));
    // if more steps remain on THIS screen, show the next one in place…
    const remainingHere = stepsHere.filter(s => s.id !== coach.id);
    if (remainingHere.length > 0) { setSubStep(0); return; }
    setSubStep(0);
    // …otherwise the player must use the real control to move screens.
    // Special transitions the coach performs for them:
    if (coach.screen === 'hub') go('missions');
    else if (coach.screen === 'missions') onPickMission(D.MISSIONS[0].id);
    else if (coach.screen === 'targets') {
      const compat = D.compatibleTargetsFor(D.MISSIONS[0]);
      onPickTarget((compat[0] || D.TARGETS.find(t => t.id === 'mars')).id);
    }
    else if (coach.screen === 'fab') {
      setPlayer(p => ({ ...p, activeMission: { id: D.MISSIONS[0].id, label: 'Iron for Foundry-3 → Mars' } }));
      go('mining');
    }
    else if (coach.screen === 'mining') { onMiningDone({ iron: 22, silicon: 14 }); }
    else if (coach.screen === 'debrief') { setTutorial(false); setPopup('sr2'); }
  }

  const mission = missionId ? D.MISSIONS.find(m => m.id === missionId) : null;
  const target  = targetId  ? D.TARGETS.find(t => t.id === targetId)   : null;

  function go(s) { setScreen(s); }

  function onPickMission(id) {
    setMissionId(id);
    setTargetId(null);
    go('targets');
  }

  function onPickTarget(id) {
    setTargetId(id);
    // auto-suggest a starting build so the user sees a valid rocket immediately
    const next = D.suggestBuild({ mission, target: D.TARGETS.find(t => t.id === id), level: player.level });
    setRocket(next);
    go('fab');
  }

  function onLaunch() {
    setPlayer(p => ({ ...p, pendingLaunch: false, activeMission: { id: mission.id, label: mission.title + ' → ' + target.name } }));
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
      activeMission: null,
    }));
    setLastCargo(null);
    setMissionId(null);
    setTargetId(null);
    go('hub');
  }

  const showNav = ['hub', 'missions', 'targets', 'fab', 'galaxy'].includes(screen);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#06090f' }}>
      {screen === 'hub' && (
        <SP.HubScreen
          player={player}
          onGoBuilding={(b) => {
            if (b === 'missions') return go('missions');
            if (b === 'launchpad') {
              // launchpad direct entry: route through missions to keep the
              // mission-first flow correct
              return go('missions');
            }
            // satellite / market are locked — no-op
          }}
          onNav={go}
        />
      )}
      {screen === 'missions' && (
        <SP.MissionBoardScreen
          player={player}
          onBack={() => go('hub')}
          onPick={onPickMission}
        />
      )}
      {screen === 'galaxy' && (
        <SP.GalaxyScreen
          onBack={() => go('hub')}
          onPickStar={() => go('missions')}
        />
      )}
      {screen === 'targets' && mission && (
        <SP.TargetPickerScreen
          mission={mission}
          onBack={() => go('missions')}
          onPick={onPickTarget}
        />
      )}
      {screen === 'fab' && mission && target && (
        <SP.FabScreen
          mission={mission}
          target={target}
          rocket={rocket}
          onChange={(slot, id) => setRocket(r => ({ ...r, [slot]: id }))}
          onSuggest={() => setRocket(D.suggestBuild({ mission, target, level: player.level }))}
          onLaunch={onLaunch}
          onBack={() => go('targets')}
        />
      )}
      {screen === 'transit' && mission && target && (
        <SL.TransitScreen
          rocket={rocket} target={target} mission={mission}
          onArrive={() => go('mining')}
          onBack={() => go('hub')}
        />
      )}
      {screen === 'mining' && mission && target && (
        <SL.MiningScreen
          rocket={rocket} target={target} mission={mission}
          onComplete={onMiningDone}
          onBack={() => go('hub')}
        />
      )}
      {screen === 'debrief' && (
        <SL.DebriefScreen
          mission={mission} target={target} cargo={lastCargo || {}}
          onDone={onDebriefDone}
        />
      )}

      {showNav && <CH.RadialMenu
        current={screen === 'missions' || screen === 'targets' ? 'missions' : screen === 'fab' ? 'fab' : screen === 'galaxy' ? 'galaxy' : 'hub'}
        onNav={(id) => {
          if (id === 'hub') setMenuOpen(true);            // "Base" → Game Menu overlay
          if (id === 'missions') go('missions');
          if (id === 'galaxy') go('galaxy');
          if (id === 'fab') {
            if (!mission || !target) go('missions');
            else go('fab');
          }
        }}
      />}

      {menuOpen && <SP.GameMenu player={{ ...player, missionsDone: 3 }} onClose={() => setMenuOpen(false)} />}

      {/* ── Tutorial coach overlay (M1 coached run) ── */}
      {coach && (
        <TUT.TutorialCoach
          stepIndex={coachIndex}
          steps={TUT.M1_STEPS}
          ctaReady={false}
          onNext={coachAdvance}
          onSkip={() => setTutorial(false)}
        />
      )}

      {/* ── Build gate (between M1 and M2) ── */}
      {buildGate && (
        <TUT.BuildGatePrompt
          francs={player.francs}
          onBuild={() => { setBuildGate(false); setPlayer(p => ({ ...p, controlBuilt: true })); }}
          onClose={() => setBuildGate(false)}
        />
      )}

      {/* ── Unlock popups ── */}
      {popup && (
        <TUT.UnlockPopup
          kind={popup}
          onClose={() => {
            const k = popup; setPopup(null);
            if (k === 'sr2') { go('hub'); setBuildGate(true); }   // SR2 → prompt build
          }}
        />
      )}

      {/* ── Dev: tutorial trigger chips (kit only) ── */}
      <DevTutorialBar
        onReplay={() => { setTutorial(true); setDoneSteps({}); setSubStep(0); go('hub'); }}
        onSR2={() => setPopup('sr2')}
        onFreeOps={() => setPopup('freeops')}
        onLoan={() => setPopup('loan')}
        onGate={() => setBuildGate(true)}
      />
    </div>
  );
}

// small dev affordance so reviewers can summon each onboarding component
function DevTutorialBar({ onReplay, onSR2, onFreeOps, onLoan, onGate }) {
  const [open, setOpen] = useState(false);
  const chip = (label, fn) => (
    <button onClick={fn} style={{
      padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
      background: 'rgba(8,16,28,0.85)', border: '1px solid rgba(135,207,250,0.4)',
      color: '#9EDCFF', fontFamily: 'var(--ln-font-display)', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{label}</button>
  );
  return (
    <div style={{ position: 'absolute', left: 8, top: 8, zIndex: 95, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
        background: 'rgba(8,16,28,0.85)', border: '1px solid rgba(135,207,250,0.4)',
        color: '#9EDCFF', fontFamily: 'var(--ln-font-mono)', fontSize: 13, fontWeight: 800,
      }}>{open ? '×' : '?'}</button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {chip('▶ Replay M1', onReplay)}
          {chip('SR2 Unlock', onSR2)}
          {chip('Build Gate', onGate)}
          {chip('Free Ops', onFreeOps)}
          {chip('Loan Offer', onLoan)}
        </div>
      )}
    </div>
  );
}

window.LandnamApp = LandnamApp;
