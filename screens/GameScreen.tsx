import React, { useEffect } from 'react';
import { View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { RTNGodotView, runOnGodotThread } from "@borndotcom/react-native-godot";
import type { RootStackParamList } from '../types/navigation';
import { initGodot, destroyGodot, appController, getSharedCounterValue, getSharedFrancBalance } from '../utils/godot';
import { FrancBalance } from '../components/FrancBalance';
import { commonStyles } from '../styles/common';

type ScreenNavigationProp = NavigationProp<RootStackParamList>;

interface GameScreenProps {
  navigation: ScreenNavigationProp;
}

export const GameScreen: React.FC<GameScreenProps> = ({ navigation: _navigation }) => {
  useEffect(() => {
    // Initialize Godot when entering the Game screen
    initGodot("GodotTest");

    let retryCount = 0;
    const maxRetries = 10;
    let retryTimerId: ReturnType<typeof setTimeout> | null = null;

    // Retry until AppController is found and counter/balance are synced
    const checkAndSyncData = () => {
      runOnGodotThread(() => {
        "worklet";
        const controller = appController();
        if (controller) {
          controller.set_counter_from_react(getSharedCounterValue());
          controller.set_franc_balance_from_react(getSharedFrancBalance());
          console.log("SUCCESS: Counter synced to Godot:", getSharedCounterValue());
          console.log("SUCCESS: Franc balance synced to Godot:", getSharedFrancBalance());
        } else {
          console.log("AppController not found, attempt:", retryCount + 1);
        }
      });
      
      retryCount++;
      if (retryCount < maxRetries) {
        retryTimerId = setTimeout(checkAndSyncData, 500);
      }
    };

    // Start checking after initial delay
    const timerId = setTimeout(checkAndSyncData, 1000);

    return () => {
      clearTimeout(timerId);
      if (retryTimerId) clearTimeout(retryTimerId);
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