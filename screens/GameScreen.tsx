import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { RTNGodotView, runOnGodotThread } from "@borndotcom/react-native-godot";
import type { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initGodot, destroyGodot, appController, getSharedCounterValue, getSharedFrancBalance, getSharedTutorialCompleted, connectGodotSignals, subscribeToSyncUpdates, getSyncUpdates } from '../utils/godot';
import { FrancBalance } from '../components/FrancBalance';
import { commonStyles } from '../styles/common';

type ScreenNavigationProp = NavigationProp<RootStackParamList>;

interface GameScreenProps {
  navigation: ScreenNavigationProp;
}

export const GameScreen: React.FC<GameScreenProps> = ({ navigation: _navigation }) => {
  useEffect(() => {
    // Process sync updates from Godot queue
    const processSyncUpdates = () => {
      const updates = getSyncUpdates();
      for (const update of updates) {
        switch (update.type) {
          case 'counter':
            AsyncStorage.setItem('gameCounter', update.value.toString())
              .then(() => console.log("[GameScreen] Counter saved to storage:", update.value))
              .catch(e => console.error("[GameScreen] Failed to save counter:", e));
            break;
          case 'tutorial':
            AsyncStorage.setItem('tutorialCompleted', update.value.toString())
              .then(() => console.log("[GameScreen] Tutorial completed saved to storage:", update.value))
              .catch(e => console.error("[GameScreen] Failed to save tutorial completed:", e));
            break;
          case 'balance':
            AsyncStorage.setItem('francBalance', update.value.toString())
              .then(() => console.log("[GameScreen] Franc balance saved to storage:", update.value))
              .catch(e => console.error("[GameScreen] Failed to save franc balance:", e));
            break;
          case 'resetAll':
            AsyncStorage.multiRemove(['gameCounter', 'francBalance', 'tutorialCompleted'])
              .then(() => console.log("[GameScreen] Storage cleared"))
              .catch(e => console.error("[GameScreen] Failed to clear storage:", e));
            break;
        }
      }
    };

    // Subscribe to sync updates and process them
    const unsubscribe = subscribeToSyncUpdates(processSyncUpdates);
    
    // Also poll periodically to catch any updates
    const pollInterval = setInterval(processSyncUpdates, 100);

    // Initialize Godot when entering the Game screen
    initGodot("GodotTest");

    let retryCount = 0;
    const maxRetries = 10;
    let retryTimerId: ReturnType<typeof setTimeout> | null = null;

    // Retry until AppController is found, counter/balance are synced, and signals are connected
    let signalsConnected = false;
    let dataSynced = false;
    const checkAndSyncData = () => {
      // Capture values from React Native context before entering worklet
      const counterVal = getSharedCounterValue();
      const balanceVal = getSharedFrancBalance();
      const tutorialVal = getSharedTutorialCompleted();
      
      console.log(`[GameScreen] Preparing to sync: counter=${counterVal}, balance=${balanceVal}, tutorial=${tutorialVal}`);
      
      runOnGodotThread(() => {
        "worklet";
        try {
          console.log(`[GameScreen] Attempt ${retryCount + 1} to find AppController...`);
          const controller = appController();
          if (controller) {
            console.log("[GameScreen] AppController found! Syncing data...");
            
            // Use captured values from closure (these are captured before worklet)
            console.log(`[GameScreen] Syncing counter=${counterVal}, balance=${balanceVal}, tutorial=${tutorialVal}`);
            
            // Try calling methods using Godot's call() method (required in worklet context)
            try {
              console.log("[GameScreen] Attempting to call set_counter_from_react...");
              if (typeof (controller as any).call === 'function') {
                (controller as any).call("set_counter_from_react", counterVal);
                console.log("[GameScreen] ✓ set_counter_from_react called via call()");
              } else if (controller.set_counter_from_react) {
                controller.set_counter_from_react(counterVal);
                console.log("[GameScreen] ✓ set_counter_from_react called directly");
              } else {
                console.log("[GameScreen] ✗ set_counter_from_react method not found");
              }
            } catch (e1) {
              console.log("[GameScreen] ✗ Exception calling set_counter_from_react:", e1);
              console.log("[GameScreen] Error details:", String(e1));
            }
            
            try {
              console.log("[GameScreen] Attempting to call set_franc_balance_from_react...");
              if (typeof (controller as any).call === 'function') {
                (controller as any).call("set_franc_balance_from_react", balanceVal);
                console.log("[GameScreen] ✓ set_franc_balance_from_react called via call()");
              } else if (controller.set_franc_balance_from_react) {
                controller.set_franc_balance_from_react(balanceVal);
                console.log("[GameScreen] ✓ set_franc_balance_from_react called directly");
              } else {
                console.log("[GameScreen] ✗ set_franc_balance_from_react method not found");
              }
            } catch (e2) {
              console.log("[GameScreen] ✗ Exception calling set_franc_balance_from_react:", e2);
              console.log("[GameScreen] Error details:", String(e2));
            }
            
            try {
              console.log("[GameScreen] Attempting to call set_tutorial_completed_from_react...");
              if (typeof (controller as any).call === 'function') {
                (controller as any).call("set_tutorial_completed_from_react", tutorialVal);
                console.log("[GameScreen] ✓ set_tutorial_completed_from_react called via call()");
              } else if (controller.set_tutorial_completed_from_react) {
                controller.set_tutorial_completed_from_react(tutorialVal);
                console.log("[GameScreen] ✓ set_tutorial_completed_from_react called directly");
              } else {
                console.log("[GameScreen] ✗ set_tutorial_completed_from_react method not found");
              }
            } catch (e3) {
              console.log("[GameScreen] ✗ Exception calling set_tutorial_completed_from_react:", e3);
              console.log("[GameScreen] Error details:", String(e3));
            }
            
            // Verify the counter was set by reading it back
            try {
              if (controller.get_counter) {
                const readBack = controller.get_counter();
                console.log(`[GameScreen] Verified counter in Godot: ${readBack} (expected: ${counterVal})`);
                if (readBack === counterVal) {
                  console.log("[GameScreen] ✓ Counter sync verified!");
                  dataSynced = true;
                } else {
                  console.log("[GameScreen] ✗ Counter sync failed - values don't match");
                }
              }
            } catch (e4) {
              console.log("[GameScreen] ✗ Exception verifying counter:", e4);
            }
            
            if (dataSynced) {
              console.log("[GameScreen] Data synced successfully");
            }
            
            // Connect signals for bidirectional sync (only once)
            if (!signalsConnected) {
              console.log("[GameScreen] Connecting Godot signals...");
              const connected = connectGodotSignals();
              if (connected) {
                signalsConnected = true;
                console.log("[GameScreen] Godot signals connected successfully");
              } else {
                console.log("[GameScreen] Failed to connect Godot signals");
              }
            }
          } else {
            console.log(`[GameScreen] AppController not found yet (attempt ${retryCount + 1}/${maxRetries})`);
          }
        } catch (e) {
          console.log("[GameScreen] Exception in checkAndSyncData:", e);
          console.log("[GameScreen] Exception type:", typeof e);
          console.log("[GameScreen] Exception message:", e?.message || "No message");
          console.log("[GameScreen] Exception stack:", e?.stack || "No stack");
          if (e && typeof e === 'object') {
            console.log("[GameScreen] Exception keys:", Object.keys(e));
          }
        }
      });
      
      retryCount++;
      if (retryCount < maxRetries && (!dataSynced || !signalsConnected)) {
        retryTimerId = setTimeout(checkAndSyncData, 500);
      } else if (retryCount >= maxRetries) {
        console.log("[GameScreen] Max retries reached. Data synced:", dataSynced, "Signals connected:", signalsConnected);
      }
    };

    // Start checking after initial delay
    const timerId = setTimeout(checkAndSyncData, 1000);

    return () => {
      clearTimeout(timerId);
      if (retryTimerId) clearTimeout(retryTimerId);
      clearInterval(pollInterval);
      unsubscribe();
      // Destroy Godot when leaving the Game screen
      destroyGodot();
    };
  }, []);

  return (
    <View style={commonStyles.gameContainer}>
      <RTNGodotView style={commonStyles.fullscreenGodot} />
      <FrancBalance />
    </View>
  );
};