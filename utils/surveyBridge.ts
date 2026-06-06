/**
 * Survey trigger bridge for the web game.
 *
 * TSX game components import from this module to fire surveys at the same
 * points in the player journey that the Godot game used to.  All logic is
 * dependency-injected so the module is fully testable without a browser.
 *
 * react-shell.js mirrors the same trigger mapping via its onGameMessage
 * handler; this module is the canonical source of truth for the web game.
 */

// ── Survey IDs (PostHog UUIDs) ────────────────────────────────────────────────

export const SURVEY_IDS = {
  first_mission: "019c9df8-db7f-0000-072f-73b3347a4d6c",
  contractor:    "019ccaf8-4299-0000-b3ad-92a57ab75b95",
  mining:        "019ccaf8-c4d8-0000-901b-aa850dfd43c5",
  science:       "019ccaf9-0259-0000-d411-e11fdc643d97",
  progression:   "019ccaf9-3453-0000-b6b9-0e41fcae8f1c",
  launch:        "019e5a4e-46ab-0000-df9e-81f0e919a252",
  pwa_install:   "019e5a4e-4c83-0000-1c17-7bd8754ad640",
  m4_complete:   "019e5a4e-532f-0000-da2b-18527d4e3299",
  return_visit:  "019e5a4e-5958-0000-e011-fc51b26ca89d",
  level_up:      "019e5a4e-5f74-0000-2470-c06526c3e36d",
  planet_found:  "019e5a4e-6528-0000-b69d-e5745079ffd5",
  difficulty:    "019e5a4e-6b23-0000-dbb1-0bed0fad9910",
  nav_test:      "019e5a8a-840d-0000-7d68-d43089c0fd61",
} as const;

export type SurveyName = keyof typeof SURVEY_IDS;

// ── localStorage gate keys (each survey shown at most once per device) ────────

export const SURVEY_GATE_KEYS: Record<string, string> = {
  first_mission: "landnam_exit_survey_first_mission_v1",
  contractor:    "landnam_micro_survey_contractor_v1",
  mining:        "landnam_micro_survey_mining_v1",
  science:       "landnam_micro_survey_science_v1",
  progression2:  "landnam_micro_survey_progression_stage2_v1",
  progression3:  "landnam_micro_survey_progression_stage3_v1",
  launch:        "landnam_micro_survey_first_launch_v1",
  pwa_install:   "landnam_micro_survey_pwa_install_v1",
  m4_complete:   "landnam_micro_survey_m4_complete_v1",
  return_visit:  "landnam_micro_survey_return_visit_v1",
  level_up:      "landnam_micro_survey_level_up_v1",
  planet_found:  "landnam_micro_survey_planet_found_v1",
  difficulty:    "landnam_micro_survey_difficulty_v1",
  nav_test:      "landnam_micro_survey_nav_test_v1",
};

export const LAUNCHPAD_BACK_COUNT_KEY = "landnam_launchpad_back_count_v1";
export const SESSION_COUNT_KEY        = "landnam_session_count_v1";
export const SURVEY_OVERLAY_ID        = "landnam-survey-overlay";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GameEventPayload = Record<string, unknown>;

export interface SurveyFiredEvent {
  surveyId: string;
  gateKey: string;
  context: string;
  payload: GameEventPayload;
}

/** Minimal key-value store interface (localStorage-compatible). */
export interface SurveyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SurveyBridgeOptions {
  /**
   * Persistent store for survey gates and counters.
   * Defaults to window.localStorage when running in a browser.
   */
  store?: SurveyStore;
  /**
   * Returns true when a survey overlay is already visible.
   * Defaults to checking document.getElementById(SURVEY_OVERLAY_ID).
   */
  isOverlayOpen?: () => boolean;
  /** Called once each time a survey should be shown to the player. */
  onFire: (event: SurveyFiredEvent) => void;
}

// ── Completion events that can trigger the return-visit survey ────────────────

const COMPLETION_EVENTS = new Set([
  "rocket_landed",
  "mining_run_completed",
  "contractor_signed",
  "mission_debrief_resolved",
  "scanner_scan_completed",
]);

// ── SurveyBridge ──────────────────────────────────────────────────────────────

export class SurveyBridge {
  private store: SurveyStore;
  private isOverlayOpen: () => boolean;
  private onFire: (event: SurveyFiredEvent) => void;
  private pendingReturnVisit = false;

  constructor({ store, isOverlayOpen, onFire }: SurveyBridgeOptions) {
    this.store = store ?? {
      getItem: (key) => {
        try { return localStorage.getItem(key); } catch { return null; }
      },
      setItem: (key, value) => {
        try { localStorage.setItem(key, value); } catch {}
      },
    };
    this.isOverlayOpen = isOverlayOpen ?? (() => {
      if (typeof document === "undefined") return false;
      return document.getElementById(SURVEY_OVERLAY_ID) !== null;
    });
    this.onFire = onFire;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Dispatch a game event.  Call this from TSX components whenever a
   * survey-worthy mechanic completes.
   *
   * Event names mirror the Godot WebEventBridge events so the same PostHog
   * survey definitions apply.
   */
  handleGameEvent(eventName: string, payload: GameEventPayload = {}): void {
    const stage = Number(payload.mission_stage ?? 0);

    switch (eventName) {
      case "first_mission_completed":
      case "mission_debrief_resolved":
        this.fire("first_mission", SURVEY_IDS.first_mission, "experiment1_first_mission", payload);
        if (stage === 2 || stage === 3) {
          this.fire(
            stage === 2 ? "progression2" : "progression3",
            SURVEY_IDS.progression,
            "micro_mission_progression_clarity",
            payload,
          );
        } else if (stage === 4) {
          this.fire("m4_complete", SURVEY_IDS.m4_complete, "micro_m4_end_of_content", payload);
        }
        break;

      case "contractor_signed":
        this.fire("contractor", SURVEY_IDS.contractor, "micro_contractor_first_impression", payload);
        break;

      case "mining_run_completed":
        this.fire("mining", SURVEY_IDS.mining, "micro_mining_loop_feel", payload);
        break;

      case "scanner_scan_completed":
        this.fire("science", SURVEY_IDS.science, "micro_real_science_awareness", payload);
        if (Number(payload.detected_count) > 0 && payload.scanner_mode === "planets") {
          this.fire("planet_found", SURVEY_IDS.planet_found, "micro_planet_discovery_excitement", payload);
        }
        break;

      case "mission_launch_started":
      case "rocket_launched":
        if (stage === 1) {
          this.fire("launch", SURVEY_IDS.launch, "micro_first_launch_feel", payload);
        }
        break;

      case "player_stuck_detected":
        this.fire("difficulty", SURVEY_IDS.difficulty, "micro_mission_difficulty_friction", payload);
        break;

      case "launchpad_back_pressed":
        this.handleNavTest(payload);
        break;
    }

    // Return-visit: fires on the first completion event of the 2nd session.
    if (this.pendingReturnVisit && this.store.getItem(SURVEY_GATE_KEYS.return_visit) === null) {
      if (COMPLETION_EVENTS.has(eventName)) {
        this.pendingReturnVisit = false;
        this.fire("return_visit", SURVEY_IDS.return_visit, "micro_return_visit_motivation", payload);
      }
    }
  }

  /**
   * Call once on each app initialisation (page load / app mount).
   * Arms the return-visit survey on the player's second session.
   */
  notifySessionStart(): void {
    const count = Number(this.store.getItem(SESSION_COUNT_KEY) ?? "0") + 1;
    this.store.setItem(SESSION_COUNT_KEY, String(count));
    if (count === 2) this.pendingReturnVisit = true;
  }

  /**
   * Call when the player's experience level increases.
   * @param newLevel  Current level after the increase.
   * @param prevLevel Level before the increase.
   */
  notifyLevelUp(newLevel: number, prevLevel: number, payload: GameEventPayload = {}): void {
    if (newLevel > prevLevel) {
      this.fire("level_up", SURVEY_IDS.level_up, "micro_level_up_progression_speed", {
        ...payload,
        experience_level: newLevel,
      });
    }
  }

  /** Call after the user accepts the PWA install prompt. */
  notifyPwaInstalled(payload: GameEventPayload = {}): void {
    this.fire("pwa_install", SURVEY_IDS.pwa_install, "micro_pwa_install_motivation", payload);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private fire(
    key: string,
    surveyId: string,
    context: string,
    payload: GameEventPayload,
  ): void {
    const gateKey = SURVEY_GATE_KEYS[key];
    if (!gateKey) return;
    if (this.isOverlayOpen()) return;
    if (this.store.getItem(gateKey) !== null) return;
    this.store.setItem(gateKey, new Date().toISOString());
    this.onFire({ surveyId, gateKey, context, payload });
  }

  private handleNavTest(payload: GameEventPayload): void {
    const count = Number(this.store.getItem(LAUNCHPAD_BACK_COUNT_KEY) ?? "0") + 1;
    this.store.setItem(LAUNCHPAD_BACK_COUNT_KEY, String(count));
    if (count >= 3) {
      this.fire("nav_test", SURVEY_IDS.nav_test, "nav_test", payload);
    }
  }
}
