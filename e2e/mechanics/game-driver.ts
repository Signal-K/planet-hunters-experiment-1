/**
 * GameDriver — reusable helper for mechanic integration tests.
 *
 * These tests load the real Godot web export in a headless browser and
 * interact with it via:
 *   - localStorage injection (seed game state before the WASM reads it)
 *   - postMessage capture (assert what the game emits to the shell)
 *   - postMessage simulation (inject events as if the game sent them)
 *
 * The game emits all events via WebEventBridge.gd:
 *   window.parent.postMessage({ source: "planet-hunters", event: "...", payload: {...} }, origin)
 *
 * AppController._ready() emits "app_ready" after reading localStorage state —
 * this is the reliable signal that the WASM has fully initialised.
 */
import type { Page } from "@playwright/test";

export const XP_STATE_KEY = "planet_hunters_xp_state_v1";
export const PROGRESS_COOKIE_KEY = "planet_hunters_progress_v1";
export const ACTION_LOG_KEY = "planet_hunters_action_log_v1";
export const SURVEY_FLAG_KEY = "planet_hunters_exit_survey_first_mission_v1";

export interface XpState {
  experience_level: number;
  experience_xp: number;
  updated_at?: string;
}

export interface GameEvent {
  event: string;
  payload: Record<string, unknown>;
  receivedAt: number;
}

export class GameDriver {
  constructor(private page: Page) {}

  /**
   * Seed XP/level state into localStorage before the game reads it.
   * Call this BEFORE page.goto() so the game loads with the desired state.
   */
  async seedXpState(state: XpState): Promise<void> {
    await this.page.addInitScript(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      {
        key: XP_STATE_KEY,
        value: JSON.stringify({
          ...state,
          updated_at: state.updated_at ?? new Date().toISOString(),
        }),
      }
    );
  }

  /**
   * Clear all game state from localStorage before the game loads.
   * Call this BEFORE page.goto() for a clean-slate test.
   */
  async clearGameState(): Promise<void> {
    await this.page.addInitScript(
      ({ keys }: { keys: string[] }) => {
        for (const key of keys) {
          localStorage.removeItem(key);
        }
      },
      {
        keys: [XP_STATE_KEY, ACTION_LOG_KEY, SURVEY_FLAG_KEY],
      }
    );
  }

  /**
   * Load the game page and start collecting postMessage events from the game.
   * Returns a handle to the collected events array (live reference).
   */
  async load(url: string = "/"): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForSelector("#game-frame");
  }

  /**
   * Wait for the Godot WASM to finish initialising.
   * AppController._ready() emits "app_ready" as its last startup step.
   *
   * @param timeoutMs - how long to wait (WASM can take 10-20s on first load)
   */
  async waitForGameReady(timeoutMs: number = 60_000): Promise<GameEvent> {
    return this.waitForGameEvent("app_ready", timeoutMs);
  }

  /**
   * Wait for a specific event from the game (postMessage from iframe).
   * The shell receives these on window "message" events.
   */
  async waitForGameEvent(eventName: string, timeoutMs: number = 30_000): Promise<GameEvent> {
    return this.page.evaluate(
      ({ eventName, timeoutMs }: { eventName: string; timeoutMs: number }) =>
        new Promise<{ event: string; payload: Record<string, unknown>; receivedAt: number }>(
          (resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error(`Timed out waiting for game event: ${eventName}`)),
              timeoutMs
            );
            const handler = (e: MessageEvent) => {
              const data = e.data as { source?: string; event?: string; payload?: Record<string, unknown> };
              if (data?.source === "planet-hunters" && data?.event === eventName) {
                clearTimeout(timer);
                window.removeEventListener("message", handler);
                resolve({
                  event: data.event!,
                  payload: data.payload ?? {},
                  receivedAt: Date.now(),
                });
              }
            };
            window.addEventListener("message", handler);
          }
        ),
      { eventName, timeoutMs }
    );
  }

  /**
   * Collect all game events emitted within the next `durationMs` milliseconds.
   */
  async collectGameEvents(durationMs: number = 3_000): Promise<GameEvent[]> {
    return this.page.evaluate(
      ({ durationMs }: { durationMs: number }) =>
        new Promise<{ event: string; payload: Record<string, unknown>; receivedAt: number }[]>(
          (resolve) => {
            const events: { event: string; payload: Record<string, unknown>; receivedAt: number }[] = [];
            const handler = (e: MessageEvent) => {
              const data = e.data as { source?: string; event?: string; payload?: Record<string, unknown> };
              if (data?.source === "planet-hunters") {
                events.push({
                  event: data.event ?? "",
                  payload: data.payload ?? {},
                  receivedAt: Date.now(),
                });
              }
            };
            window.addEventListener("message", handler);
            setTimeout(() => {
              window.removeEventListener("message", handler);
              resolve(events);
            }, durationMs);
          }
        ),
      { durationMs }
    );
  }

  /**
   * Simulate a game event as if it came from the Godot iframe.
   * Useful for testing shell responses without needing the full game path.
   */
  async simulateGameEvent(
    eventName: string,
    payload: Record<string, unknown> = {}
  ): Promise<void> {
    await this.page.evaluate(
      ({ eventName, payload }: { eventName: string; payload: Record<string, unknown> }) => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { source: "planet-hunters", event: eventName, payload },
            origin: window.location.origin,
          })
        );
      },
      { eventName, payload }
    );
  }

  /**
   * Read the current XP state from localStorage (reflects what the shell last wrote).
   */
  async readXpState(): Promise<XpState | null> {
    return this.page.evaluate((key: string) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as { experience_level: number; experience_xp: number };
      } catch {
        return null;
      }
    }, XP_STATE_KEY);
  }

  /**
   * Spoof PWA standalone mode so the shell renders the full HUD.
   * Call this BEFORE page.goto().
   */
  async spoofPwaMode(): Promise<void> {
    await this.page.addInitScript(() => {
      const orig = window.matchMedia.bind(window);
      (window as Window & typeof globalThis).matchMedia = (query: string): MediaQueryList => {
        if (
          query === "(display-mode: standalone)" ||
          query === "(display-mode: minimal-ui)"
        ) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList;
        }
        return orig(query);
      };
    });
  }

  /**
   * Navigate to advanced settings via the PWA HUD.
   * Requires spoofPwaMode() to have been called before load().
   */
  async openAdvancedSettings(): Promise<void> {
    await this.page.click("text=Show HUD");
    await this.page.click("text=Exit to Menu");
    await this.page.click("text=Show Advanced Settings");
  }
}
