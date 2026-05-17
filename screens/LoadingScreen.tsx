import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Text,
  View,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useSyncState, setLocalSyncState, loadSyncState, resetSyncState } from '../utils/syncState';
import { commonStyles } from '../styles/common';

type ScreenNavigationProp = NavigationProp<RootStackParamList>;

interface LoadingScreenProps {
  navigation: ScreenNavigationProp;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ navigation }) => {
  const { signOut } = useAuth();
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [isGameReady, setIsGameReady] = useState(false);
  const [syncLoaded, setSyncLoaded] = useState(false);
  const syncState = useSyncState();

  useEffect(() => {
    loadSyncState().then(() => setSyncLoaded(true));
  }, []);

  const loadingSteps = useMemo(() => [
    'Initializing system...',
    'Loading Godot engine...',
    'Setting up native modules...',
    'Preparing game assets...',
    'Configuring rendering...',
    'Loading scene data...',
    'Finalizing setup...',
    'Ready to play!'
  ], []);

  const simulateLoading = useCallback(() => {
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const nextStep = Math.min(prev + 1, loadingSteps.length - 1);
        setLoadingText(loadingSteps[nextStep]);
        setProgress((nextStep + 1) / loadingSteps.length);

        if (nextStep === loadingSteps.length - 1) {
          setTimeout(() => {
            setIsGameReady(true);
            clearInterval(interval);
          }, 1000);
        }

        return nextStep;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [loadingSteps]);

  useEffect(() => {
    const cleanup = simulateLoading();
    return cleanup;
  }, [simulateLoading]);

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      await signOut();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenGame = () => {
    if (isGameReady && syncLoaded) {
      navigation.navigate("Game");
    }
  };

  const incrementCounter = () => {
    setLocalSyncState({ counter: syncState.counter + 1 });
  };

  const decrementCounter = () => {
    setLocalSyncState({ counter: syncState.counter - 1 });
  };

  const clearAllState = async () => {
    try {
      await resetSyncState();
      console.log('All state cleared');
    } catch (e) {
      console.error('Failed to clear state:', e);
    }
  };

  const formattedFranc = useMemo(() => {
    const val = syncState.francBalance;
    if (Math.abs(val) >= 1000000000) return Math.round(val / 1000000000) + 'B';
    if (Math.abs(val) >= 1000000) return Math.round(val / 1000000) + 'M';
    if (Math.abs(val) >= 1000) return Math.round(val / 1000) + 'K';
    return String(val);
  }, [syncState.francBalance]);

  return (
    <SafeAreaView style={commonStyles.loadingContainer}>
      <ScrollView contentContainerStyle={commonStyles.scrollContent} bounces={false}>
        <View style={commonStyles.loadingContent}>
          <Text style={commonStyles.appTitle}>Landnám</Text>
          <Text style={commonStyles.appSubtitle}>Godot + React Native</Text>

          <View style={commonStyles.progressContainer}>
            <View style={commonStyles.circularProgress}>
              <Text style={commonStyles.progressText}>{Math.round(progress * 100)}%</Text>
            </View>
          </View>

          <Text style={commonStyles.loadingText}>{loadingText}</Text>

          <View style={commonStyles.progressBarContainer}>
            <View style={commonStyles.progressBarBackground}>
              <View style={[commonStyles.progressBarFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>

          <Text style={commonStyles.stepText}>
            Step {loadingStep + 1} of {loadingSteps.length}
          </Text>

          <View style={commonStyles.counterSection}>
            <View style={commonStyles.counterContainer}>
              <Text style={commonStyles.counterLabel}>Game Counter</Text>
              <View style={commonStyles.counterControls}>
                <Button title="-" onPress={decrementCounter} color="#ff5a6a" />
                <Text style={commonStyles.counterValue}>{syncState.counter}</Text>
                <Button title="+" onPress={incrementCounter} color="#39d36a" />
              </View>
            </View>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={commonStyles.counterLabel}>Franc Balance</Text>
              <Text style={[commonStyles.counterValue, { fontSize: 18 }]}>{formattedFranc} F</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={commonStyles.buttonContainer}>
        <View style={isGameReady && syncLoaded ? commonStyles.gameButton : commonStyles.gameButtonDisabled}>
          <Button
            title={isGameReady && syncLoaded ? "Start Game" : "Please Wait..."}
            onPress={handleOpenGame}
            disabled={!isGameReady || !syncLoaded}
            color={isGameReady && syncLoaded ? "#3fa9ff" : "#5d7390"}
          />
        </View>
        <View style={commonStyles.logoutButton}>
          <Button
            title="Log Out"
            onPress={handleLogout}
            color="#ff5a6a"
          />
        </View>
        <View style={[commonStyles.logoutButton, { marginTop: 8 }]}>
          <Button
            title="Clear All State"
            onPress={clearAllState}
            color="#ffb347"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};
