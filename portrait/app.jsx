/* global React, window */
// Landnam Portrait — root state machine

const { useState } = React;

function LandnamApp() {
  const D  = window.LandnamData;
  const CH = window.LandnamChrome;
  const SP = window.LandnamScreensPre;
  const SL = window.LandnamScreensLoop;

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

  const showNav = ['hub', 'missions', 'targets', 'fab'].includes(screen);

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

      {showNav && <CH.BottomNav
        current={screen === 'missions' || screen === 'targets' ? 'missions' : screen === 'fab' ? 'fab' : screen === 'hub' ? 'hub' : null}
        glassy
        onNav={(id) => {
          if (id === 'hub') go('hub');
          if (id === 'missions') go('missions');
          if (id === 'galaxy') go('targets');  // for portrait we use mission-first flow
          if (id === 'fab') {
            if (!mission || !target) go('missions');
            else go('fab');
          }
        }}
      />}
    </div>
  );
}

window.LandnamApp = LandnamApp;
