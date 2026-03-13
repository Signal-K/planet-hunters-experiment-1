/**
 * Unified Sync State Manager
 * 
 * Single source of truth for React Native ↔ Godot state synchronization.
 * 
 * Architecture:
 * - React Native owns persistence (AsyncStorage)
 * - Godot owns runtime game state (in-memory, authoritative during gameplay)
 * - Events flow both directions via explicit method calls
 * - No polling - all updates are event-driven
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

// ============================================================================
// Types
// ============================================================================

export interface SyncState {
  counter: number;
  francBalance: number;
  experienceXp: number;
  experienceLevel: number;
}

export type SyncStateKey = keyof SyncState;

export interface SyncEvent {
  key: SyncStateKey;
  value: SyncState[SyncStateKey];
  source: "react" | "godot" | "cloud";
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "unified_sync_state_v2";

const DEFAULT_STATE: SyncState = {
  counter: 0,
  francBalance: 10000000000,
  experienceXp: 0,
  experienceLevel: 1,
};

// ============================================================================
// State Management
// ============================================================================

let _state: SyncState = { ...DEFAULT_STATE };
let _loaded = false;
const _listeners: Set<(state: SyncState, event?: SyncEvent) => void> = new Set();

/**
 * Get current cached state (synchronous)
 */
export function getState(): SyncState {
  return { ..._state };
}

/**
 * Get a specific value from state
 */
export function getValue<K extends SyncStateKey>(key: K): SyncState[K] {
  return _state[key];
}

/**
 * Check if state has been loaded from storage
 */
export function isLoaded(): boolean {
  return _loaded;
}

/**
 * Subscribe to state changes
 */
export function subscribe(
  listener: (state: SyncState, event?: SyncEvent) => void
): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/**
 * Notify all subscribers of state change
 */
function notify(event?: SyncEvent): void {
  const snapshot = { ..._state };
  _listeners.forEach((listener) => {
    try {
      listener(snapshot, event);
    } catch (e) {
      console.error("[SyncState] Listener error:", e);
    }
  });
}

// ============================================================================
// Persistence (Local & Cloud)
// ============================================================================

/**
 * Load state from AsyncStorage and Supabase
 */
export async function loadState(): Promise<SyncState> {
  if (_loaded) {
    return { ..._state };
  }

  try {
    // 1. Load from local storage first (fast)
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncState>;
      _state = { ...DEFAULT_STATE, ...parsed };
    } else {
      _state = await migrateLegacyState();
    }

    // 2. Try to sync with Supabase cloud if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: cloudProfile, error } = await supabase
        .from('player_profiles')
        .select('franc_balance, xp, level')
        .eq('id', session.user.id)
        .single();

      if (!error && cloudProfile) {
        _state.francBalance = cloudProfile.franc_balance;
        _state.experienceXp = cloudProfile.xp;
        _state.experienceLevel = cloudProfile.level;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
      }
    }
  } catch (e) {
    console.error("[SyncState] Load error:", e);
    _state = { ...DEFAULT_STATE };
  }

  _loaded = true;
  notify({ key: "counter", value: _state.counter, source: "cloud", timestamp: Date.now() });
  return { ..._state };
}

/**
 * Save state to AsyncStorage and Supabase
 */
async function saveState(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_state));

    // Push to Supabase if authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('player_profiles').upsert({
        id: session.user.id,
        franc_balance: _state.francBalance,
        xp: _state.experienceXp,
        level: _state.experienceLevel,
        updated_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error("[SyncState] Save error:", e);
  }
}

/**
 * Migrate from legacy storage keys
 */
async function migrateLegacyState(): Promise<SyncState> {
  const legacyKeys = [
    "gameCounter",
    "francBalance",
    "experienceXp",
    "experienceLevel",
    "sync_state_v1",
  ];

  try {
    // Try v1 format first
    const v1Raw = await AsyncStorage.getItem("sync_state_v1");
    if (v1Raw) {
      const parsed = JSON.parse(v1Raw) as Partial<SyncState>;
      const state = { ...DEFAULT_STATE, ...parsed };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      await AsyncStorage.multiRemove(legacyKeys);
      return state;
    }

    // Fall back to individual keys
    const [counter, balance, xp, level] = await Promise.all([
      AsyncStorage.getItem("gameCounter"),
      AsyncStorage.getItem("francBalance"),
      AsyncStorage.getItem("experienceXp"),
      AsyncStorage.getItem("experienceLevel"),
    ]);

    const state: SyncState = {
      counter: counter ? parseInt(counter, 10) : DEFAULT_STATE.counter,
      francBalance: balance ? parseInt(balance, 10) : DEFAULT_STATE.francBalance,
      experienceXp: xp ? parseInt(xp, 10) : DEFAULT_STATE.experienceXp,
      experienceLevel: level ? parseInt(level, 10) : DEFAULT_STATE.experienceLevel,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await AsyncStorage.multiRemove(legacyKeys);
    return state;
  } catch (e) {
    console.error("[SyncState] Migration error:", e);
    return { ...DEFAULT_STATE };
  }
}

/**
 * Reset state to defaults
 */
export async function resetState(): Promise<void> {
  _state = { ...DEFAULT_STATE };
  await saveState();
  notify({ key: "counter", value: 0, source: "react", timestamp: Date.now() });
}

// ============================================================================
// State Updates - React Native Side
// ============================================================================

/**
 * Update state from React Native side
 * This is called when React Native needs to update state (e.g., from user action)
 */
export async function updateFromReact<K extends SyncStateKey>(
  key: K,
  value: SyncState[K]
): Promise<void> {
  _state[key] = value;
  await saveState();

  const event: SyncEvent = {
    key,
    value,
    source: "react",
    timestamp: Date.now(),
  };

  notify(event);
}

/**
 * Update multiple state values from React Native
 */
export async function updateManyFromReact(
  updates: Partial<SyncState>
): Promise<void> {
  Object.assign(_state, updates);
  await saveState();
  notify();
}

// ============================================================================
// State Updates - Godot Side
// ============================================================================

/**
 * Update state from Godot side
 * Called when Godot reports a state change (game events)
 */
export async function updateFromGodot<K extends SyncStateKey>(
  key: K,
  value: SyncState[K]
): Promise<void> {
  _state[key] = value;
  await saveState();

  const event: SyncEvent = {
    key,
    value,
    source: "godot",
    timestamp: Date.now(),
  };

  notify(event);
}

/**
 * Update multiple state values from Godot
 */
export async function updateManyFromGodot(
  updates: Partial<SyncState>
): Promise<void> {
  Object.assign(_state, updates);
  await saveState();
  notify();
}

/**
 * Sync current React Native state to Godot
 * Called when game starts to initialize Godot with persisted state
 */
export function getStateForGodot(): SyncState {
  return { ..._state };
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * React hook to use sync state
 */
export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(getState);

  useEffect(() => {
    let mounted = true;

    loadState().then((loadedState) => {
      if (mounted) {
        setState(loadedState);
      }
    });

    const unsubscribe = subscribe((newState) => {
      if (mounted) {
        setState(newState);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}

/**
 * React hook to use a specific sync state value
 */
export function useSyncValue<K extends SyncStateKey>(key: K): SyncState[K] {
  const state = useSyncState();
  return state[key];
}

/**
 * React hook for sync state with setter
 */
export function useSyncStateWithSetter(): [
  SyncState,
  <K extends SyncStateKey>(key: K, value: SyncState[K]) => Promise<void>
] {
  const state = useSyncState();
  
  const setValue = useCallback(async <K extends SyncStateKey>(
    key: K,
    value: SyncState[K]
  ): Promise<void> => {
    await updateFromReact(key, value);
  }, []);

  return [state, setValue];
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * Alias for updateManyFromReact (backward compatibility)
 * @deprecated Use updateManyFromReact instead
 */
export async function setLocalSyncState(
  partial: Partial<SyncState>
): Promise<void> {
  await updateManyFromReact(partial);
}

/**
 * Alias for loadState (backward compatibility)
 * @deprecated Use loadState instead
 */
export { loadState as loadSyncState };

/**
 * Alias for resetState (backward compatibility)
 * @deprecated Use resetState instead
 */
export { resetState as resetSyncState };

/**
 * Alias for getState (backward compatibility)
 * @deprecated Use getState instead
 */
export { getState as getCachedSyncState };
