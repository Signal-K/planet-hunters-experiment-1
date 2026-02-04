/**
 * Unified Sync State Tests
 * 
 * Tests the React Native side of the Expo ↔ Godot sync system.
 * Verifies:
 * - State loading and persistence
 * - State updates and notifications
 * - Legacy state migration
 */

import type { SyncState } from "../utils/syncState";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach(key => delete mockStorage[key]);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    return Promise.resolve();
  }),
}));

// Helper to get fresh module instance
function getSyncModule() {
  jest.resetModules();
  // Re-apply the mock after reset
  jest.doMock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach(key => delete mockStorage[key]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
      return Promise.resolve();
    }),
  }));
  return require("../utils/syncState");
}

describe("syncState", () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe("loadState", () => {
    it("returns default state when no stored data", async () => {
      const { loadState: load } = getSyncModule();
      const state = await load();
      
      expect(state).toEqual({
        counter: 0,
        tutorialCompleted: false,
        francBalance: 10000000000,
        experienceXp: 0,
        experienceLevel: 1,
      });
    });

    it("loads persisted state from storage", async () => {
      const stored: SyncState = {
        counter: 42,
        tutorialCompleted: true,
        francBalance: 5000,
        experienceXp: 100,
        experienceLevel: 3,
      };
      mockStorage.unified_sync_state_v2 = JSON.stringify(stored);

      const { loadState: load } = getSyncModule();
      const state = await load();

      expect(state.counter).toBe(42);
      expect(state.tutorialCompleted).toBe(true);
      expect(state.francBalance).toBe(5000);
      expect(state.experienceXp).toBe(100);
      expect(state.experienceLevel).toBe(3);
    });

    it("migrates from v1 state format", async () => {
      const v1State = {
        counter: 10,
        tutorialCompleted: false,
        francBalance: 99999,
        experienceXp: 50,
        experienceLevel: 2,
      };
      mockStorage.sync_state_v1 = JSON.stringify(v1State);

      const { loadState: load, getState: get } = getSyncModule();
      await load();
      const state = get();

      expect(state.counter).toBe(10);
      expect(state.francBalance).toBe(99999);
      
      // v1 key should be removed
      expect(mockStorage.sync_state_v1).toBeUndefined();
    });
  });

  describe("updateFromReact", () => {
    it("updates state and persists", async () => {
      const { loadState: load, updateFromReact: update, getState: get } = getSyncModule();
      await load();

      await update("counter", 77);
      const state = get();

      expect(state.counter).toBe(77);

      // Verify persistence
      const stored = mockStorage.unified_sync_state_v2;
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored);
      expect(parsed.counter).toBe(77);
    });

    it("notifies subscribers with event", async () => {
      const { loadState: load, updateFromReact: update, subscribe: sub } = getSyncModule();
      await load();

      const events: any[] = [];
      sub((state: SyncState, event: any) => {
        if (event) events.push(event);
      });

      await update("tutorialCompleted", true);

      expect(events).toHaveLength(1);
      expect(events[0].key).toBe("tutorialCompleted");
      expect(events[0].value).toBe(true);
      expect(events[0].source).toBe("react");
    });
  });

  describe("updateFromGodot", () => {
    it("updates state with godot source", async () => {
      const { loadState: load, updateFromGodot: update, subscribe: sub } = getSyncModule();
      await load();

      const events: any[] = [];
      sub((state: SyncState, event: any) => {
        if (event) events.push(event);
      });

      await update("francBalance", 12345);

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe("godot");
      expect(events[0].value).toBe(12345);
    });
  });

  describe("updateManyFromReact", () => {
    it("updates multiple values at once", async () => {
      const { loadState: load, updateManyFromReact: update, getState: get } = getSyncModule();
      await load();

      await update({
        counter: 5,
        tutorialCompleted: true,
        francBalance: 999,
      });

      const state = get();
      expect(state.counter).toBe(5);
      expect(state.tutorialCompleted).toBe(true);
      expect(state.francBalance).toBe(999);
    });
  });

  describe("resetState", () => {
    it("resets to defaults", async () => {
      const { loadState: load, updateFromReact: update, resetState: reset, getState: get } = getSyncModule();
      await load();
      await update("counter", 100);
      await update("francBalance", 1);

      await reset();
      const state = get();

      expect(state.counter).toBe(0);
      expect(state.francBalance).toBe(10000000000);
    });
  });

  describe("subscribe", () => {
    it("returns unsubscribe function", async () => {
      const { loadState: load, updateFromReact: update, subscribe: sub } = getSyncModule();
      await load();

      let callCount = 0;
      const unsubscribe = sub(() => { callCount++; });

      await update("counter", 1);
      expect(callCount).toBe(1);

      unsubscribe();
      await update("counter", 2);
      expect(callCount).toBe(1); // Should not increase
    });
  });

  describe("getValue", () => {
    it("returns specific value", async () => {
      const { loadState: load, updateFromReact: update, getValue: get } = getSyncModule();
      await load();
      await update("experienceLevel", 5);

      expect(get("experienceLevel")).toBe(5);
    });
  });
});
