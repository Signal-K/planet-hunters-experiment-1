/**
 * Godot Sync Bridge
 * 
 * Handles bidirectional communication between React Native and Godot.
 * Uses worklets for thread-safe Godot API access.
 * 
 * Key principles:
 * - All Godot calls happen on the Godot thread via runOnGodotThread
 * - State changes are pushed immediately (no polling)
 * - React Native persists state, Godot manages runtime state
 */

import { runOnGodotThread, appController } from "./godot";
import {
  loadState,
  getState,
  updateManyFromGodot,
  subscribe,
  type SyncState,
  type SyncStateKey,
} from "./syncState";

// ============================================================================
// Types
// ============================================================================

type GodotAppController = {
  set_counter_from_react: (value: number) => void;
  get_counter: () => number;
  set_tutorial_completed_from_react: (value: boolean) => void;
  get_tutorial_completed: () => boolean;
  set_franc_balance_from_react: (value: number) => void;
  get_franc_balance: () => number;
  set_experience_from_react: (xp: number, level: number) => void;
  get_experience_xp: () => number;
  get_experience_level: () => number;
  counter_updated: { connect: (callback: (value: number) => void) => void };
  tutorial_completed_updated: { connect: (callback: (value: boolean) => void) => void };
  franc_balance_updated: { connect: (callback: (value: number) => void) => void };
  experience_updated: { connect: (callback: (xp: number, level: number) => void) => void };
};

// ============================================================================
// State Tracking
// ============================================================================

let _initialized = false;
let _pollingTimer: ReturnType<typeof setInterval> | null = null;
let _unsubscribe: (() => void) | null = null;

// ============================================================================
// Push State to Godot
// ============================================================================

/**
 * Push a single value to Godot
 */
export function pushToGodot<K extends SyncStateKey>(
  key: K,
  value: SyncState[K]
): void {
  runOnGodotThread(() => {
    "worklet";
    const controller = appController() as GodotAppController | null;
    if (!controller) {
      return;
    }

    switch (key) {
      case "counter":
        controller.set_counter_from_react(value as number);
        break;
      case "tutorialCompleted":
        controller.set_tutorial_completed_from_react(value as boolean);
        break;
      case "francBalance":
        controller.set_franc_balance_from_react(value as number);
        break;
      case "experienceXp":
      case "experienceLevel":
        // Experience requires both values
        break;
    }
  });
}

/**
 * Push all current state to Godot
 */
export function pushAllToGodot(): void {
  const state = getState();
  
  runOnGodotThread(() => {
    "worklet";
    const controller = appController() as GodotAppController | null;
    if (!controller) {
      return;
    }

    controller.set_counter_from_react(state.counter);
    controller.set_tutorial_completed_from_react(state.tutorialCompleted);
    controller.set_franc_balance_from_react(state.francBalance);
    controller.set_experience_from_react(state.experienceXp, state.experienceLevel);
  });
}

// ============================================================================
// Pull State from Godot
// ============================================================================

/**
 * Pull current state from Godot and update React Native
 */
export async function pullFromGodot(): Promise<SyncState | null> {
  return new Promise((resolve) => {
    runOnGodotThread(() => {
      "worklet";
      const controller = appController() as GodotAppController | null;
      if (!controller) {
        return null;
      }

      return {
        counter: controller.get_counter(),
        tutorialCompleted: controller.get_tutorial_completed(),
        francBalance: controller.get_franc_balance(),
        experienceXp: controller.get_experience_xp(),
        experienceLevel: controller.get_experience_level(),
      };
    }).then((godotState: SyncState | null) => {
      if (godotState) {
        updateManyFromGodot(godotState);
        resolve(godotState);
      } else {
        resolve(null);
      }
    }).catch((e) => {
      console.error("[GodotSync] Pull error:", e);
      resolve(null);
    });
  });
}

// ============================================================================
// Initialization & Sync Loop
// ============================================================================

/**
 * Initialize the sync bridge
 * - Loads persisted state
 * - Pushes initial state to Godot
 * - Sets up listeners for React Native state changes
 * - Starts polling for Godot state changes (fallback)
 */
export async function initSync(): Promise<void> {
  if (_initialized) {
    console.log("[GodotSync] Already initialized");
    return;
  }

  // Load persisted state
  await loadState();
  
  // Prefer Godot as source of truth on startup to avoid overwriting its saves.
  // If Godot isn't ready, fall back to pushing React state.
  setTimeout(() => {
    pullFromGodot()
      .then((godotState) => {
        if (!godotState) {
          pushAllToGodot();
        }
      })
      .catch(() => {
        pushAllToGodot();
      });
  }, 500);

  // Subscribe to React Native state changes and push to Godot
  _unsubscribe = subscribe((state, event) => {
    if (event && event.source === "react") {
      // Only push if the change came from React Native
      pushToGodot(event.key, state[event.key]);
    }
  });

  _initialized = true;
  console.log("[GodotSync] Initialized");
}

/**
 * Start a polling loop to sync state from Godot
 * This is a fallback for when Godot signals can't be connected
 */
export function startPolling(intervalMs = 1000): () => void {
  if (_pollingTimer) {
    clearInterval(_pollingTimer);
  }

  _pollingTimer = setInterval(() => {
    pullFromGodot().catch((e) => {
      console.error("[GodotSync] Polling error:", e);
    });
  }, intervalMs);

  return () => {
    if (_pollingTimer) {
      clearInterval(_pollingTimer);
      _pollingTimer = null;
    }
  };
}

/**
 * Stop all sync operations
 */
export function stopSync(): void {
  if (_pollingTimer) {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }

  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  _initialized = false;
  console.log("[GodotSync] Stopped");
}

/**
 * Start the sync loop (init + polling)
 * Returns a cleanup function
 */
export function startSyncLoop(intervalMs = 1000): () => void {
  initSync();
  const stopPolling = startPolling(intervalMs);

  return () => {
    stopPolling();
    stopSync();
  };
}
