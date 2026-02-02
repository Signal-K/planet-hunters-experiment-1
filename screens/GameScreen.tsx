import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { RTNGodotView, runOnGodotThread } from "@borndotcom/react-native-godot";
import type { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initGodot, destroyGodot, appController, getSharedCounterValue, getSharedFrancBalance, getSharedTutorialCompleted, getSharedExperienceXp, getSharedExperienceLevel, connectGodotSignals, subscribeToSyncUpdates, getSyncUpdates, setSharedFrancBalance, setSharedExperienceXp, setSharedExperienceLevel, pollGodotFrancBalance, pollGodotExperience } from '../utils/godot';
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
            setSharedFrancBalance(update.value);
            AsyncStorage.setItem('francBalance', update.value.toString())
              .then(() => console.log("[GameScreen] Franc balance saved to storage:", update.value))
              .catch(e => console.error("[GameScreen] Failed to save franc balance:", e));
            break;
          case 'experience':
            setSharedExperienceXp(update.xp);
            setSharedExperienceLevel(update.level);
            AsyncStorage.multiSet([
              ['experienceXp', update.xp.toString()],
              ['experienceLevel', update.level.toString()],
            ])
              .then(() => console.log("[GameScreen] Experience saved to storage:", update.xp, update.level))
              .catch(e => console.error("[GameScreen] Failed to save experience:", e));
            break;
          case 'resetAll':
            AsyncStorage.multiRemove(['gameCounter', 'francBalance', 'tutorialCompleted', 'experienceXp', 'experienceLevel'])
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
    const balancePollInterval = setInterval(() => pollGodotFrancBalance(), 500);
    const experiencePollInterval = setInterval(() => pollGodotExperience(), 500);

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
      const experienceXpVal = getSharedExperienceXp();
      const experienceLevelVal = getSharedExperienceLevel();
      
      console.log(`[GameScreen] Preparing to sync: counter=${counterVal}, balance=${balanceVal}, tutorial=${tutorialVal}, xp=${experienceXpVal}, level=${experienceLevelVal}`);
      
      runOnGodotThread(() => {
        "worklet";
        try {
          console.log(`[GameScreen] Attempt ${retryCount + 1} to find AppController...`);
          const controller = appController();
          if (controller) {
            console.log("[GameScreen] AppController found! Syncing data...");
            
            // Use captured values from closure (these are captured before worklet)
            console.log(`[GameScreen] Syncing counter=${counterVal}, balance=${balanceVal}, tutorial=${tutorialVal}, xp=${experienceXpVal}, level=${experienceLevelVal}`);
            
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
              var godotBalance = null;
              if ((controller as any).get_franc_balance) {
                godotBalance = (controller as any).get_franc_balance();
              }
              var shouldSetBalance = true;
              if (balanceVal === 10000000000 && godotBalance !== null && godotBalance !== 10000000000) {
                shouldSetBalance = false;
                console.log("[GameScreen] Skipping balance overwrite; Godot has saved value:", godotBalance);
              }
              if (shouldSetBalance) {
                if (typeof (controller as any).call === 'function') {
                  (controller as any).call("set_franc_balance_from_react", balanceVal);
                  console.log("[GameScreen] ✓ set_franc_balance_from_react called via call()");
                } else if (controller.set_franc_balance_from_react) {
                  controller.set_franc_balance_from_react(balanceVal);
                  console.log("[GameScreen] ✓ set_franc_balance_from_react called directly");
                } else {
                  console.log("[GameScreen] ✗ set_franc_balance_from_react method not found");
                }
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

            try {
              console.log("[GameScreen] Attempting to call set_experience_from_react...");
              var godotXp = null;
              var godotLevel = null;
              if ((controller as any).get_experience_xp) {
                godotXp = (controller as any).get_experience_xp();
              }
              if ((controller as any).get_experience_level) {
                godotLevel = (controller as any).get_experience_level();
              }
              var shouldSetExperience = true;
              if (experienceXpVal === 0 && experienceLevelVal === 1 && (godotXp !== null || godotLevel !== null)) {
                if ((godotXp !== null && godotXp !== 0) || (godotLevel !== null && godotLevel !== 1)) {
                  shouldSetExperience = false;
                  console.log("[GameScreen] Skipping experience overwrite; Godot has saved value:", godotXp, godotLevel);
                }
              }
              if (shouldSetExperience) {
                if (typeof (controller as any).call === 'function') {
                  (controller as any).call("set_experience_from_react", experienceXpVal, experienceLevelVal);
                  console.log("[GameScreen] ✓ set_experience_from_react called via call()");
                } else if (controller.set_experience_from_react) {
                  controller.set_experience_from_react(experienceXpVal, experienceLevelVal);
                  console.log("[GameScreen] ✓ set_experience_from_react called directly");
                } else {
                  console.log("[GameScreen] ✗ set_experience_from_react method not found");
                }
              }
            } catch (e5) {
              console.log("[GameScreen] ✗ Exception calling set_experience_from_react:", e5);
              console.log("[GameScreen] Error details:", String(e5));
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
      clearInterval(balancePollInterval);
      clearInterval(experiencePollInterval);
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
