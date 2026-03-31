import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View, Button, TouchableOpacity } from 'react-native';
import { useFocusEffect, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { commonStyles } from '../styles/common';
import { useSyncState, resetState, updateManyFromReact } from '../utils/syncState';
import { setGamePaused, triggerInstantMining, skipToMission } from '../utils/godot';
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const handleSkipToMission = async (stage: number) => {
    const balances: Record<number, number> = {
      2: 120000,
      3: 250000,
      4: 500000,
      5: 1000000
    };
    await updateManyFromReact({
      experienceLevel: stage,
      experienceXp: 0,
      francBalance: balances[stage] || 1000000,
    });
    skipToMission(stage);
    alert(`Progress skipped to Mission ${stage}!`);
  };

  const handleInstantMining = () => {
    navigation.navigate('Game');
    // We give Godot a small moment to unpause and transition
    setTimeout(() => {
      triggerInstantMining();
    }, 500);
  };

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

        <TouchableOpacity 
          style={{ paddingVertical: 15, alignItems: 'center' }} 
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={{ color: '#0A84FF', fontSize: 13, textDecorationLine: 'underline' }}>
            {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={[commonStyles.menuCard, { borderColor: '#FF453A', borderWidth: 1 }]}>
            <Text style={[commonStyles.menuCardTitle, { color: '#FF453A' }]}>Testing Shortcuts</Text>
            
            <View style={{ marginBottom: 12 }}>
              <Button
                title="🚀 Instant Mining (Auto-Setup)"
                onPress={handleInstantMining}
                color="#FF9F0A"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Button
                title="📈 Skip to Mission 3 (Scanner)"
                onPress={() => handleSkipToMission(3)}
                color="#64D2FF"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Button
                title="📈 Skip to Mission 4 (Autonomy)"
                onPress={() => handleSkipToMission(4)}
                color="#BF5AF2"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Button
                title="📈 Skip to Free Ops (M5)"
                onPress={() => handleSkipToMission(5)}
                color="#5E5CE6"
              />
            </View>

            <View>
              <Button
                title="🗑️ Reset All Progress (Cloud & Local)"
                onPress={() => resetState()}
                color="#FF453A"
              />
            </View>
          </View>
        )}
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
