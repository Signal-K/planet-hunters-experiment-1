import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, type NavigationProp } from '@react-navigation/native';
import { commonStyles } from '../styles/common';
import type { RootStackParamList } from '../types/navigation';
import { setGamePaused } from '../utils/godot';

type ScreenNavigationProp = NavigationProp<RootStackParamList>;

interface GameScreenProps {
  navigation: ScreenNavigationProp;
}

export const GameScreen: React.FC<GameScreenProps> = ({ navigation: _navigation }) => {
  useFocusEffect(
    useCallback(() => {
      setGamePaused(false);
      return () => setGamePaused(true);
    }, [])
  );

  return (
    <View style={commonStyles.gameContainer} pointerEvents="none" />
  );
};
