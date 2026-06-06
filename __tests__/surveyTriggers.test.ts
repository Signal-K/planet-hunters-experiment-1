/**
 * Behavioural tests for the web game survey trigger bridge.
 *
 * Each test simulates a web game mechanic completing and asserts that the
 * correct PostHog survey fires (or doesn't fire) — matching the behaviour
 * that the Godot game's PostHogNativeSurveyBridge provided natively.
 *
 * No browser, no PostHog SDK, no network.  All I/O is in-memory.
 */

import {
  SurveyBridge,
  SurveyFiredEvent,
  SurveyStore,
  SURVEY_IDS,
  SURVEY_GATE_KEYS,
  LAUNCHPAD_BACK_COUNT_KEY,
  SESSION_COUNT_KEY,
} from "../utils/surveyBridge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(): SurveyStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem:  (key)        => data.get(key) ?? null,
    setItem:  (key, value) => { data.set(key, value); },
  };
}

interface BridgeHarness {
  bridge:    SurveyBridge;
  store:     SurveyStore & { data: Map<string, string> };
  fired:     SurveyFiredEvent[];
  firedIds:  () => string[];
}

function makeBridge(storeOverride?: SurveyStore & { data: Map<string, string> }): BridgeHarness {
  const store  = storeOverride ?? makeStore();
  const fired: SurveyFiredEvent[] = [];
  const bridge = new SurveyBridge({
    store,
    isOverlayOpen: () => false,
    onFire: (e) => fired.push(e),
  });
  return { bridge, store, fired, firedIds: () => fired.map((e) => e.surveyId) };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("SurveyBridge — web game survey triggers", () => {

  // ── Contractor ──────────────────────────────────────────────────────────────

  describe("contractor survey", () => {
    it("fires on contractor_signed", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("contractor_signed");
      expect(firedIds()).toContain(SURVEY_IDS.contractor);
    });

    it("sets the gate key in the store", () => {
      const { bridge, store } = makeBridge();
      bridge.handleGameEvent("contractor_signed");
      expect(store.getItem(SURVEY_GATE_KEYS.contractor)).not.toBeNull();
    });

    it("does not fire twice on the same device", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("contractor_signed");
      bridge.handleGameEvent("contractor_signed");
      expect(firedIds().filter((id) => id === SURVEY_IDS.contractor)).toHaveLength(1);
    });

    it("gate persists across bridge instances (same store)", () => {
      const store = makeStore();
      const { bridge } = makeBridge(store);
      bridge.handleGameEvent("contractor_signed");

      const { bridge: b2, firedIds } = makeBridge(store);
      b2.handleGameEvent("contractor_signed");
      expect(firedIds()).not.toContain(SURVEY_IDS.contractor);
    });
  });

  // ── Mining ──────────────────────────────────────────────────────────────────

  describe("mining survey", () => {
    it("fires on mining_run_completed", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mining_run_completed");
      expect(firedIds()).toContain(SURVEY_IDS.mining);
    });

    it("does not fire twice", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mining_run_completed");
      bridge.handleGameEvent("mining_run_completed");
      expect(firedIds().filter((id) => id === SURVEY_IDS.mining)).toHaveLength(1);
    });
  });

  // ── Science / planet_found ──────────────────────────────────────────────────

  describe("science survey", () => {
    it("fires on scanner_scan_completed (any mode)", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 0, scanner_mode: "asteroids" });
      expect(firedIds()).toContain(SURVEY_IDS.science);
    });

    it("does not fire twice", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 0 });
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 0 });
      expect(firedIds().filter((id) => id === SURVEY_IDS.science)).toHaveLength(1);
    });
  });

  describe("planet_found survey", () => {
    it("fires alongside science when scanner_mode=planets and detected_count>0", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 3, scanner_mode: "planets" });
      expect(firedIds()).toContain(SURVEY_IDS.science);
      expect(firedIds()).toContain(SURVEY_IDS.planet_found);
    });

    it("does not fire when detected_count is 0", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 0, scanner_mode: "planets" });
      expect(firedIds()).not.toContain(SURVEY_IDS.planet_found);
    });

    it("does not fire for non-planet scanner mode even with detections", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 5, scanner_mode: "asteroids" });
      expect(firedIds()).not.toContain(SURVEY_IDS.planet_found);
    });
  });

  // ── Launch ──────────────────────────────────────────────────────────────────

  describe("launch survey", () => {
    it("fires on mission_launch_started at mission_stage 1", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_launch_started", { mission_stage: 1 });
      expect(firedIds()).toContain(SURVEY_IDS.launch);
    });

    it("fires on rocket_launched at mission_stage 1", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("rocket_launched", { mission_stage: 1 });
      expect(firedIds()).toContain(SURVEY_IDS.launch);
    });

    it("does not fire at stages other than 1", () => {
      for (const stage of [0, 2, 3, 4]) {
        const { bridge, firedIds } = makeBridge();
        bridge.handleGameEvent("mission_launch_started", { mission_stage: stage });
        expect(firedIds()).not.toContain(SURVEY_IDS.launch);
      }
    });
  });

  // ── Difficulty ──────────────────────────────────────────────────────────────

  describe("difficulty survey", () => {
    it("fires on player_stuck_detected", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("player_stuck_detected");
      expect(firedIds()).toContain(SURVEY_IDS.difficulty);
    });
  });

  // ── First mission + progression routing ─────────────────────────────────────

  describe("first_mission survey", () => {
    it("fires on first_mission_completed", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("first_mission_completed", { mission_stage: 1 });
      expect(firedIds()).toContain(SURVEY_IDS.first_mission);
    });

    it("fires on mission_debrief_resolved", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 1 });
      expect(firedIds()).toContain(SURVEY_IDS.first_mission);
    });

    it("does not fire twice even when both events occur", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("first_mission_completed", { mission_stage: 1 });
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 1 });
      expect(firedIds().filter((id) => id === SURVEY_IDS.first_mission)).toHaveLength(1);
    });
  });

  describe("progression survey", () => {
    it("fires at stage 2", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 2 });
      expect(firedIds()).toContain(SURVEY_IDS.progression);
    });

    it("fires at stage 3", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 3 });
      expect(firedIds()).toContain(SURVEY_IDS.progression);
    });

    it("fires for both stage 2 and stage 3 using separate gate keys", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 2 });
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 3 });
      expect(firedIds().filter((id) => id === SURVEY_IDS.progression)).toHaveLength(2);
    });

    it("does not fire at stage 1 or stage 4", () => {
      for (const stage of [1, 4]) {
        const { bridge, firedIds } = makeBridge();
        bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: stage });
        expect(firedIds()).not.toContain(SURVEY_IDS.progression);
      }
    });
  });

  describe("m4_complete survey", () => {
    it("fires at stage 4", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 4 });
      expect(firedIds()).toContain(SURVEY_IDS.m4_complete);
    });

    it("does not fire progression survey at stage 4", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: 4 });
      expect(firedIds()).not.toContain(SURVEY_IDS.progression);
    });

    it("does not fire at stages 1, 2, or 3", () => {
      for (const stage of [1, 2, 3]) {
        const { bridge, firedIds } = makeBridge();
        bridge.handleGameEvent("mission_debrief_resolved", { mission_stage: stage });
        expect(firedIds()).not.toContain(SURVEY_IDS.m4_complete);
      }
    });
  });

  // ── nav_test (launchpad back-press counter) ─────────────────────────────────

  describe("nav_test survey", () => {
    it("does not fire on the 1st or 2nd back-press", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("launchpad_back_pressed");
      expect(firedIds()).not.toContain(SURVEY_IDS.nav_test);
      bridge.handleGameEvent("launchpad_back_pressed");
      expect(firedIds()).not.toContain(SURVEY_IDS.nav_test);
    });

    it("fires on the 3rd back-press", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.handleGameEvent("launchpad_back_pressed");
      bridge.handleGameEvent("launchpad_back_pressed");
      bridge.handleGameEvent("launchpad_back_pressed");
      expect(firedIds()).toContain(SURVEY_IDS.nav_test);
    });

    it("fires at most once even after many back-presses", () => {
      const { bridge, firedIds } = makeBridge();
      for (let i = 0; i < 10; i++) bridge.handleGameEvent("launchpad_back_pressed");
      expect(firedIds().filter((id) => id === SURVEY_IDS.nav_test)).toHaveLength(1);
    });

    it("back-press counter persists across bridge instances (same store)", () => {
      const store = makeStore();
      const { bridge } = makeBridge(store);
      bridge.handleGameEvent("launchpad_back_pressed"); // 1
      bridge.handleGameEvent("launchpad_back_pressed"); // 2

      const { bridge: b2, firedIds } = makeBridge(store);
      b2.handleGameEvent("launchpad_back_pressed");    // 3 → fires
      expect(firedIds()).toContain(SURVEY_IDS.nav_test);
    });

    it("increments the back-press counter in the store", () => {
      const { bridge, store } = makeBridge();
      bridge.handleGameEvent("launchpad_back_pressed");
      expect(store.getItem(LAUNCHPAD_BACK_COUNT_KEY)).toBe("1");
      bridge.handleGameEvent("launchpad_back_pressed");
      expect(store.getItem(LAUNCHPAD_BACK_COUNT_KEY)).toBe("2");
    });
  });

  // ── Overlay lock ────────────────────────────────────────────────────────────

  describe("overlay lock", () => {
    it("blocks all surveys while an overlay is open", () => {
      const store = makeStore();
      const fired: SurveyFiredEvent[] = [];
      const bridge = new SurveyBridge({
        store,
        isOverlayOpen: () => true,
        onFire: (e) => fired.push(e),
      });
      bridge.handleGameEvent("contractor_signed");
      bridge.handleGameEvent("mining_run_completed");
      bridge.handleGameEvent("player_stuck_detected");
      expect(fired).toHaveLength(0);
    });

    it("fires once the overlay is closed", () => {
      const store = makeStore();
      const fired: SurveyFiredEvent[] = [];
      let overlayOpen = true;
      const bridge = new SurveyBridge({
        store,
        isOverlayOpen: () => overlayOpen,
        onFire: (e) => fired.push(e),
      });
      bridge.handleGameEvent("contractor_signed");
      expect(fired).toHaveLength(0);

      overlayOpen = false;
      // Gate was NOT set while overlay was open, so it fires now
      bridge.handleGameEvent("contractor_signed");
      expect(fired.map((e) => e.surveyId)).toContain(SURVEY_IDS.contractor);
    });
  });

  // ── Level-up ────────────────────────────────────────────────────────────────

  describe("level_up survey", () => {
    it("fires when the level increases", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.notifyLevelUp(2, 1);
      expect(firedIds()).toContain(SURVEY_IDS.level_up);
    });

    it("does not fire when the level is unchanged", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.notifyLevelUp(1, 1);
      expect(firedIds()).not.toContain(SURVEY_IDS.level_up);
    });

    it("fires at most once (single gate key regardless of level)", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.notifyLevelUp(2, 1);
      bridge.notifyLevelUp(3, 2);
      expect(firedIds().filter((id) => id === SURVEY_IDS.level_up)).toHaveLength(1);
    });

    it("passes experience_level in the payload", () => {
      const { bridge, fired } = makeBridge();
      bridge.notifyLevelUp(5, 4);
      expect(fired[0]?.payload.experience_level).toBe(5);
    });
  });

  // ── Return-visit survey ─────────────────────────────────────────────────────

  describe("return_visit survey", () => {
    it("fires on the first completion event of the 2nd session", () => {
      const store = makeStore();
      store.setItem(SESSION_COUNT_KEY, "1"); // 1 prior session

      const { bridge, firedIds } = makeBridge(store);
      bridge.notifySessionStart();            // count → 2, arms flag
      bridge.handleGameEvent("mining_run_completed");
      expect(firedIds()).toContain(SURVEY_IDS.return_visit);
    });

    it("does not fire on the 1st session (no prior sessions)", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.notifySessionStart(); // count → 1
      bridge.handleGameEvent("mining_run_completed");
      expect(firedIds()).not.toContain(SURVEY_IDS.return_visit);
    });

    it("does not fire on session 3+ (only session 2 arms the flag)", () => {
      const store = makeStore();
      store.setItem(SESSION_COUNT_KEY, "2"); // 2 prior sessions

      const { bridge, firedIds } = makeBridge(store);
      bridge.notifySessionStart(); // count → 3, no arm
      bridge.handleGameEvent("mining_run_completed");
      expect(firedIds()).not.toContain(SURVEY_IDS.return_visit);
    });

    it("only fires once per session (subsequent completion events are ignored)", () => {
      const store = makeStore();
      store.setItem(SESSION_COUNT_KEY, "1");

      const { bridge, firedIds } = makeBridge(store);
      bridge.notifySessionStart();
      bridge.handleGameEvent("mining_run_completed");
      bridge.handleGameEvent("contractor_signed");
      bridge.handleGameEvent("scanner_scan_completed", { detected_count: 0 });
      expect(firedIds().filter((id) => id === SURVEY_IDS.return_visit)).toHaveLength(1);
    });

    it("fires for every completion event type", () => {
      const completionEvents = [
        "rocket_landed",
        "mining_run_completed",
        "contractor_signed",
        "mission_debrief_resolved",
        "scanner_scan_completed",
      ];
      for (const eventName of completionEvents) {
        const store = makeStore();
        store.setItem(SESSION_COUNT_KEY, "1");
        const { bridge, firedIds } = makeBridge(store);
        bridge.notifySessionStart();
        bridge.handleGameEvent(eventName, { detected_count: 0 });
        expect(firedIds()).toContain(SURVEY_IDS.return_visit);
      }
    });

    it("does not fire if already shown in a prior session (gate persists)", () => {
      const store = makeStore();
      // Simulate that return_visit was already shown
      store.setItem(SURVEY_GATE_KEYS.return_visit, "2025-01-01T00:00:00.000Z");
      store.setItem(SESSION_COUNT_KEY, "1");

      const { bridge, firedIds } = makeBridge(store);
      bridge.notifySessionStart(); // count → 2, arms flag
      bridge.handleGameEvent("mining_run_completed");
      expect(firedIds()).not.toContain(SURVEY_IDS.return_visit);
    });
  });

  // ── PWA install ─────────────────────────────────────────────────────────────

  describe("pwa_install survey", () => {
    it("fires on notifyPwaInstalled", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.notifyPwaInstalled();
      expect(firedIds()).toContain(SURVEY_IDS.pwa_install);
    });

    it("does not fire twice", () => {
      const { bridge, firedIds } = makeBridge();
      bridge.notifyPwaInstalled();
      bridge.notifyPwaInstalled();
      expect(firedIds().filter((id) => id === SURVEY_IDS.pwa_install)).toHaveLength(1);
    });
  });

  // ── Fired event shape ───────────────────────────────────────────────────────

  describe("fired event shape", () => {
    it("includes surveyId, gateKey, context, and payload", () => {
      const { bridge, fired } = makeBridge();
      bridge.handleGameEvent("contractor_signed", { mission_stage: 1 });
      const event = fired[0];
      expect(event).toMatchObject({
        surveyId: SURVEY_IDS.contractor,
        gateKey:  SURVEY_GATE_KEYS.contractor,
        context:  "micro_contractor_first_impression",
        payload:  { mission_stage: 1 },
      });
    });
  });
});
