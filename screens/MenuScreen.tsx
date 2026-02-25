import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View, Button } from 'react-native';
import { useFocusEffect, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { commonStyles } from '../styles/common';
import { useSyncState } from '../utils/syncState';
import { setGamePaused } from '../utils/godot';
import { pullFromGodot } from '../utils/godotSync';

const MENU_TEXT = [
  'Welcome back, Captain.',
  'Your crew is ready and the scanners are warm.',
];

type ScreenNavigationProp = NavigationProp<RootStackParamList>;

interface MenuScreenProps {
  navigation: ScreenNavigationProp;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ navigation }) => {
  const syncState = useSyncState();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      await pullFromGodot();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useFocusEffect(
    useCallback(() => {
      setGamePaused(true);
      handleRefresh();
      return () => setGamePaused(false);
    }, [handleRefresh])
  );

  const formattedFranc = useMemo(() => {
    const val = syncState.francBalance;
    if (Math.abs(val) >= 1000000000) return Math.round(val / 1000000000) + 'B';
    if (Math.abs(val) >= 1000000) return Math.round(val / 1000000) + 'M';
    if (Math.abs(val) >= 1000) return Math.round(val / 1000) + 'K';
    return String(val);
  }, [syncState.francBalance]);

  return (
    <SafeAreaView style={commonStyles.menuContainer}>
      <ScrollView
        contentContainerStyle={commonStyles.menuContent}
        bounces={false}
      >
        <View style={commonStyles.menuHeader}>
          <Text style={commonStyles.appTitle}>Planet Hunters</Text>
          <Text style={commonStyles.appSubtitle}>Mission Control</Text>
        </View>

        <View style={commonStyles.menuCard}>
          <Text style={commonStyles.menuCardTitle}>Session Ready</Text>
          {MENU_TEXT.map((line) => (
            <Text key={line} style={commonStyles.menuCardText}>
              {line}
            </Text>
          ))}
        </View>

        <View style={commonStyles.menuCard}>
          <Text style={commonStyles.menuCardTitle}>Current Status</Text>
          <View style={commonStyles.menuStatRow}>
            <Text style={commonStyles.menuStatLabel}>Counter</Text>
            <Text style={commonStyles.menuStatValue}>{syncState.counter}</Text>
          </View>
          <View style={commonStyles.menuStatRow}>
            <Text style={commonStyles.menuStatLabel}>Franc Balance</Text>
            <Text style={commonStyles.menuStatValue}>{formattedFranc} F</Text>
          </View>
          <View style={commonStyles.menuStatRow}>
            <Text style={commonStyles.menuStatLabel}>Experience</Text>
            <Text style={commonStyles.menuStatValue}>
              {syncState.experienceXp} XP · Lvl {syncState.experienceLevel}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={commonStyles.menuButtonContainer}>
        <View style={commonStyles.menuPrimaryButton}>
          <Button
            title="Resume Game"
            onPress={() => navigation.navigate('Game')}
            color="#34C759"
          />
        </View>
        <View style={commonStyles.menuSecondaryButton}>
          <Button
            title={isRefreshing ? "Refreshing..." : "Refresh Data"}
            onPress={handleRefresh}
            disabled={isRefreshing}
            color="#0A84FF"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};
