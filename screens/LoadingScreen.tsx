import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Text,
  View,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { setSharedCounterValue, setSharedFrancBalance } from '../utils/godot';
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
  const [counter, setCounter] = useState(0);
  const [counterLoaded, setCounterLoaded] = useState(false);
  const [francBalance, setFrancBalance] = useState(10000000000); // 10B default
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  // Load counter from storage on mount
  useEffect(() => {
    const loadCounter = async () => {
      try {
        const saved = await AsyncStorage.getItem('gameCounter');
        if (saved !== null) {
          const value = parseInt(saved, 10);
          setCounter(value);
          console.log('Loaded counter from storage:', value);
        }
      } catch (e) {
        console.error('Failed to load counter:', e);
      } finally {
        setCounterLoaded(true);
      }
    };
    loadCounter();
  }, []);

  // Load Franc balance from storage on mount
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const saved = await AsyncStorage.getItem('francBalance');
        if (saved !== null) {
          const value = parseInt(saved, 10);
          setFrancBalance(value);
          console.log('Loaded franc balance from storage:', value);
        }
      } catch (e) {
        console.error('Failed to load franc balance:', e);
      } finally {
        setBalanceLoaded(true);
      }
    };
    loadBalance();
  }, []);

  // Save counter to storage whenever it changes
  useEffect(() => {
    if (counterLoaded) {
      AsyncStorage.setItem('gameCounter', counter.toString())
        .then(() => console.log('Saved counter to storage:', counter))
        .catch(e => console.error('Failed to save counter:', e));
    }
  }, [counter, counterLoaded]);

  // Save Franc balance to storage whenever it changes
  useEffect(() => {
    if (balanceLoaded) {
      AsyncStorage.setItem('francBalance', francBalance.toString())
        .then(() => console.log('Saved franc balance to storage:', francBalance))
        .catch(e => console.error('Failed to save franc balance:', e));
    }
  }, [francBalance, balanceLoaded]);

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
    }, 2000); // Each step takes 2 seconds
    
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
    if (isGameReady) {
      // Store counter and balance in module-level variables accessible from worklet
      setSharedCounterValue(counter);
      setSharedFrancBalance(francBalance);
      console.log("Setting initial counter for game:", counter);
      console.log("Setting initial franc balance for game:", francBalance);
      navigation.navigate("Game");
    }
  };

  const incrementCounter = () => setCounter(prev => prev + 1);
  const decrementCounter = () => setCounter(prev => prev - 1);

  const formattedFranc = useMemo(() => {
    const val = francBalance;
    if (Math.abs(val) >= 1000000000) return Math.round(val / 1000000000) + 'B';
    if (Math.abs(val) >= 1000000) return Math.round(val / 1000000) + 'M';
    if (Math.abs(val) >= 1000) return Math.round(val / 1000) + 'K';
    return String(val);
  }, [francBalance]);

  return (
    <SafeAreaView style={commonStyles.loadingContainer}>
      <ScrollView contentContainerStyle={commonStyles.scrollContent} bounces={false}>
        <View style={commonStyles.loadingContent}>
          <Text style={commonStyles.appTitle}>Planet Hunters</Text>
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
                <Button title="-" onPress={decrementCounter} color="#FF3B30" />
                <Text style={commonStyles.counterValue}>{counter}</Text>
                <Button title="+" onPress={incrementCounter} color="#34C759" />
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
        <View style={isGameReady ? commonStyles.gameButton : commonStyles.gameButtonDisabled}>
          <Button
            title={isGameReady ? "Start Game" : "Please Wait..."}
            onPress={handleOpenGame}
            disabled={!isGameReady}
            color={isGameReady ? "#34C759" : "#8E8E93"}
          />
        </View>
        <View style={commonStyles.logoutButton}>
          <Button
            title="Log Out"
            onPress={handleLogout}
            color="#FF3B30"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};