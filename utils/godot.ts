import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RTNGodot,
  runOnGodotThread,
} from "@borndotcom/react-native-godot";
import type { AppController } from "../types/navigation";

// Shared counter value accessible from Godot worklet thread
let sharedCounterValue = 0;

export const setSharedCounterValue = (value: number) => {
  sharedCounterValue = value;
};

// Getter that works in both React Native and worklet contexts
export const getSharedCounterValue = () => {
  return sharedCounterValue;
};

// Worklet version for use inside worklets
export const getSharedCounterValueWorklet = () => {
  "worklet";
  return sharedCounterValue;
};

// Shared Franc balance value accessible from Godot worklet thread
let sharedFrancBalance = 10000000000; // Default 10B

export const setSharedFrancBalance = (value: number) => {
  sharedFrancBalance = value;
};

// Getter that works in both React Native and worklet contexts
export const getSharedFrancBalance = () => {
  return sharedFrancBalance;
};

// Worklet version for use inside worklets
export const getSharedFrancBalanceWorklet = () => {
  "worklet";
  return sharedFrancBalance;
};

// Shared tutorial completion state accessible from Godot worklet thread
let sharedTutorialCompleted = false;

export const setSharedTutorialCompleted = (value: boolean) => {
  sharedTutorialCompleted = value;
};

// Getter that works in both React Native and worklet contexts
export const getSharedTutorialCompleted = () => {
  return sharedTutorialCompleted;
};

// Worklet version for use inside worklets
export const getSharedTutorialCompletedWorklet = () => {
  "worklet";
  return sharedTutorialCompleted;
};

// Also push tutorial completion immediately to Godot if available
export const pushTutorialCompletedToGodot = (value: boolean) => {
  try {
    runOnGodotThread(() => {
      "worklet";
      const controller = appController();
      if (controller && (controller as any).set_tutorial_completed_from_react) {
        (controller as any).set_tutorial_completed_from_react(value);
      }
    });
  } catch (e) {
    // Silently fail - Godot may not be ready yet
  }
};


// Wrap setSharedTutorialCompleted so external callers can update both JS and Godot
export const updateSharedTutorialCompleted = (value: boolean) => {
  setSharedTutorialCompleted(value);
  pushTutorialCompletedToGodot(value);
};

export function initGodot(name: string) {
  if (RTNGodot.getInstance() != null) {
    console.log("Godot was already initialized.");
    return;
  }
  console.log("Initializing Godot");

  runOnGodotThread(() => {
    "worklet";
    console.log("Running on Godot Thread");

    if (Platform.OS === "android") {
      RTNGodot.createInstance([
        // Uncomment and fill in the correct IP address and port for debugging in the Godot Editor.
        // Check the documentation for the complete procedure.
        // "--remote-debug",
        // "tcp://IP_ADDRESS:6007",
        "--verbose",
        "--path",
        "/" + name,
        "--rendering-driver",
        "opengl3",
        "--rendering-method",
        "gl_compatibility",
        "--display-driver",
        "embedded",
      ]);
    } else {
      let args = [
        // Uncomment and fill in the correct IP address and port for debugging in the Godot Editor.
        // Check the documentation for the complete procedure.
        // "--remote-debug",
        // "tcp://IP_ADDRESS:6007",
        "--verbose",
        "--main-pack",
        FileSystem.bundleDirectory + name + ".pck",
        "--display-driver",
        "embedded",
      ];

      if (Device.isDevice) {
        args.push(
          "--rendering-driver",
          "opengl3",
          "--rendering-method",
          "gl_compatibility"
        );
      } else {
        args.push(
          "--rendering-driver",
          "metal",
          "--rendering-method",
          "mobile"
        );
      }

      RTNGodot.createInstance(args);
    }

    let Godot = RTNGodot.API();
    var v = Godot.Vector2();
    v.x = 1.0;
    v.y = 2.0;
    console.log("Godot Engine initialized:" + v.x + "," + v.y);
    console.log("After Engine");
    console.log("After Main Loop");
  });
}

export function destroyGodot() {
  runOnGodotThread(() => {
    "worklet";
    RTNGodot.destroyInstance();
  });
}

const instance = () => {
  "worklet";
  return RTNGodot.getInstance();
};

export const appController = (): AppController | null => {
  "worklet";
  try {
    if (!instance()) {
      console.log("[appController] Godot instance not available");
      return null;
    }

    const Godot = RTNGodot.API();
    const engine = Godot.Engine;
    const sceneTree = engine.get_main_loop();
    if (!sceneTree) {
      console.log("[appController] Scene tree not available");
      return null;
    }
    
    const root = sceneTree.get_root();
    if (!root) {
      console.log("[appController] Root node not available");
      return null;
    }
    
    console.log("[appController] Searching for AppController in scene tree...");
    const controller = root.find_child(
      "AppController",
      true,
      false
    ) as AppController;

    if (controller) {
      console.log("[appController] AppController found!");
    } else {
      console.log("[appController] AppController not found in scene tree");
      // Try to list children for debugging
      const children = root.get_children();
      console.log("[appController] Root has", children.size(), "children");
      for (let i = 0; i < children.size(); i++) {
        const child = children.get(i);
        console.log("[appController] Child", i, ":", child.get_name());
      }
    }

    return controller || null;
  } catch (e) {
    console.log("[appController] Exception:", e);
    return null;
  }
};

// Track if signals are connected to avoid duplicates
let signalsConnected = false;

// Queue for storing updates from Godot that need to be processed on React Native thread
type SyncUpdate = 
  | { type: 'counter'; value: number }
  | { type: 'tutorial'; value: boolean }
  | { type: 'balance'; value: number }
  | { type: 'resetAll' };

const syncQueue: SyncUpdate[] = [];
let syncQueueListeners: Array<() => void> = [];

/**
 * Get and clear pending sync updates from the queue
 * This should be called from React Native thread (not worklet)
 */
export function getSyncUpdates(): SyncUpdate[] {
  const updates = [...syncQueue];
  syncQueue.length = 0;
  return updates;
}

/**
 * Subscribe to sync updates
 */
export function subscribeToSyncUpdates(callback: () => void): () => void {
  syncQueueListeners.push(callback);
  return () => {
    syncQueueListeners = syncQueueListeners.filter(cb => cb !== callback);
  };
}

/**
 * Add an update to the sync queue (can be called from worklet)
 * Just push to queue - polling will pick it up
 */
function enqueueSyncUpdate(update: SyncUpdate) {
  "worklet";
  syncQueue.push(update);
}

/**
 * Connect Godot signals for bidirectional sync
 * This should be called after Godot is initialized and AppController is available
 * Must be called from within runOnGodotThread
 */
export function connectGodotSignals(): boolean {
  "worklet";
  try {
    const controller = appController();
    if (!controller) {
      console.warn("[SYNC] AppController not available, cannot connect signals");
      return false;
    }
    // Only connect once
    if (signalsConnected) {
      console.log("[SYNC] Signals already connected, skipping");
      return true;
    }

    // NOTE: Connecting Godot signals with JS callbacks that run on the Godot
    // thread can lead to unsafe cross-thread JSI calls and crashes on iOS
    // simulators. To avoid that class of crash we skip attaching callbacks
    // that directly call back into JS from the Godot thread. Instead the
    // app will poll for state (via `getSyncUpdates`) or perform explicit
    // worklet-mediated syncs where safe.
    console.log("[SYNC] Skipping connecting Godot->JS signal callbacks to avoid unsafe JSI calls from Godot thread");

    signalsConnected = true;
    return true;
  } catch (e) {
    console.warn("[SYNC] Failed to connect Godot signals:", e);
    return false;
  }
}