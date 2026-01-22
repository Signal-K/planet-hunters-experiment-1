import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import * as Device from "expo-device";
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

export const getSharedCounterValue = () => sharedCounterValue;

// Shared Franc balance value accessible from Godot worklet thread
let sharedFrancBalance = 10000000000; // Default 10B

export const setSharedFrancBalance = (value: number) => {
  sharedFrancBalance = value;
};

export const getSharedFrancBalance = () => sharedFrancBalance;

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
  if (!instance()) return null;

  const Godot = RTNGodot.API();
  const engine = Godot.Engine;
  const sceneTree = engine.get_main_loop();
  const root = sceneTree.get_root();
  const controller = root.find_child(
    "AppController",
    true,
    false
  ) as AppController;

  if (!controller) return null;

  if (!controller.has_signal_connections("window_status_update")) {
    controller.window_status_update.connect(function (message: string) {
      console.log(message);
    });
  }

  return controller;
};