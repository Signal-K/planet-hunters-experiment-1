import * as FileSystem from "expo-file-system/legacy";
import { RTNGodot, runOnGodotThread } from "@borndotcom/react-native-godot";
import type { AppController } from "../types/navigation";

// Compute pack path at module initialization (not in worklet)
const PACK_PATH = (FileSystem.bundleDirectory || "") + "Landnam.pck";

export function initGodot(_name: string) {
  if (RTNGodot.getInstance() != null) {
    return;
  }

  // Capture the string value before entering worklet
  const packPath = PACK_PATH;

  runOnGodotThread(() => {
    "worklet";
    RTNGodot.createInstance([
      "--verbose",
      "--main-pack",
      packPath,
      "--display-driver",
      "embedded",
      "--rendering-driver",
      "opengl3",
      "--rendering-method",
      "gl_compatibility",
    ]);

    RTNGodot.API();
  });
}

export function destroyGodot() {
  runOnGodotThread(() => {
    "worklet";
    RTNGodot.destroyInstance();
  });
}

export function setGamePaused(paused: boolean) {
  runOnGodotThread(() => {
    "worklet";
    const controller = appController();
    if (!controller || !controller.set_game_paused) {
      return;
    }
    controller.set_game_paused(paused);
  });
}

export function getMenuRequest(): Promise<{
  version: number;
  action: string;
} | null> {
  return runOnGodotThread(() => {
    "worklet";
    const controller = appController();
    if (
      !controller ||
      !controller.get_menu_request_version ||
      !controller.get_menu_request_action
    ) {
      return null;
    }

    return {
      version: controller.get_menu_request_version(),
      action: controller.get_menu_request_action(),
    };
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
      return null;
    }

    const Godot = RTNGodot.API();
    const engine = Godot.Engine;
    const sceneTree = engine.get_main_loop();
    if (!sceneTree) {
      return null;
    }

    const root = sceneTree.get_root();
    if (!root) {
      return null;
    }

    const controller = root.find_child(
      "AppController",
      true,
      false
    ) as AppController;

    return controller || null;
  } catch (e) {
    return null;
  }
};

export const syncBridge = (): any | null => {
  "worklet";
  try {
    if (!instance()) {
      return null;
    }

    const Godot = RTNGodot.API();
    const engine = Godot.Engine;
    const sceneTree = engine.get_main_loop();
    if (!sceneTree) {
      return null;
    }

    const root = sceneTree.get_root();
    if (!root) {
      return null;
    }

    const bridge = root.find_child("SyncBridge", true, false);
    return bridge || null;
  } catch (e) {
    return null;
  }
};

export function triggerInstantMining() {
  runOnGodotThread(() => {
    "worklet";
    const controller = appController();
    if (controller && (controller as any).trigger_instant_mining) {
      (controller as any).trigger_instant_mining();
    }
  });
}

export function skipToMission(stage: number) {
  runOnGodotThread(() => {
    "worklet";
    const controller = appController();
    if (controller && (controller as any).debug_skip_to_mission) {
      (controller as any).debug_skip_to_mission(stage);
    }
  });
}

export { runOnGodotThread };
