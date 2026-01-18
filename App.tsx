/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import "setimmediate"; // Required by New Architecture
import React from "react";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RTNGodot,
  RTNGodotView,
  runOnGodotThread,
} from "@borndotcom/react-native-godot";
import type { NavigationProp } from '@react-navigation/native';
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";

// Type definitions for Godot objects
interface AppController {
  has_signal_connections(signal: string): boolean;
  window_status_update: {
    connect(callback: (message: string) => void): void;
  };
  counter_updated: {
    connect(callback: (newValue: number) => void): void;
  };
  open_window(windowName: string): void;
  close_window(windowName: string): void;
  set_counter_from_react(value: number): void;
  get_counter(): number;
}

type RootStackParamList = {
  Auth: undefined;
  Loading: undefined;
  Game: undefined;
};

type ScreenNavigationProp = NavigationProp<RootStackParamList>;
import * as FileSystem from "expo-file-system/legacy";
import {
  Button,
  StyleSheet,
  View,
  Platform,
  ActivityIndicator,
  Text,
  ScrollView,
  SafeAreaView,
} from "react-native";
import * as Progress from 'react-native-progress';

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import * as Device from "expo-device";

const Stack = createNativeStackNavigator();

// Shared counter value accessible from Godot worklet thread
let sharedCounterValue = 0;

function initGodot(name: string) {
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

function destroyGodot() {
  runOnGodotThread(() => {
    "worklet";
    RTNGodot.destroyInstance();
  });
}

const instance = () => {
  "worklet";

  return RTNGodot.getInstance();
};

const appController = () => {
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

const AppNavigator = () => {
  const { user, isLoading: authLoading } = useAuth();

    const Loading = ({ navigation }: { navigation: ScreenNavigationProp }) => {
    const { signOut } = useAuth();
    const [loadingStep, setLoadingStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Initializing...');
    const [isGameReady, setIsGameReady] = useState(false);
    const [counter, setCounter] = useState(0);
    const [counterLoaded, setCounterLoaded] = useState(false);

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

    // Save counter to storage whenever it changes
    useEffect(() => {
      if (counterLoaded) {
        AsyncStorage.setItem('gameCounter', counter.toString())
          .then(() => console.log('Saved counter to storage:', counter))
          .catch(e => console.error('Failed to save counter:', e));
      }
    }, [counter, counterLoaded]);
    
    const loadingSteps = [
      'Initializing system...',
      'Loading Godot engine...',
      'Setting up native modules...',
      'Preparing game assets...',
      'Configuring rendering...',
      'Loading scene data...',
      'Finalizing setup...',
      'Ready to play!'
    ];

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
        // Store counter in module-level variable accessible from worklet
        sharedCounterValue = counter;
        console.log("Setting initial counter for game:", counter);
        navigation.navigate("Game");
      }
    };

    const incrementCounter = () => setCounter(prev => prev + 1);
    const decrementCounter = () => setCounter(prev => prev - 1);

    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.loadingContent}>
            <Text style={styles.appTitle}>Planet Hunters</Text>
            <Text style={styles.appSubtitle}>Godot + React Native</Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.circularProgress}>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
            
            <Text style={styles.loadingText}>{loadingText}</Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>
            
            <Text style={styles.stepText}>
              Step {loadingStep + 1} of {loadingSteps.length}
            </Text>

            <View style={styles.counterSection}>
              <View style={styles.counterContainer}>
                <Text style={styles.counterLabel}>Game Counter</Text>
                <View style={styles.counterControls}>
                  <Button title="-" onPress={decrementCounter} color="#FF3B30" />
                  <Text style={styles.counterValue}>{counter}</Text>
                  <Button title="+" onPress={incrementCounter} color="#34C759" />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          <View style={[styles.gameButton, { opacity: isGameReady ? 1 : 0.5 }]}>
            <Button
              title={isGameReady ? "Start Game" : "Please Wait..."}
              onPress={handleOpenGame}
              disabled={!isGameReady}
              color={isGameReady ? "#34C759" : "#8E8E93"}
            />
          </View>
          <View style={styles.logoutButton}>
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

  const Game = ({ navigation }: { navigation: ScreenNavigationProp }) => {
    useEffect(() => {
      // Initialize Godot when entering the Game screen
      initGodot("GodotTest");

      let retryCount = 0;
      const maxRetries = 10;
      let retryTimerId: NodeJS.Timeout | null = null;

      // Retry until AppController is found and counter is set
      const checkAndSetCounter = () => {
        runOnGodotThread(() => {
          "worklet";
          const controller = appController();
          if (controller) {
            controller.set_counter_from_react(sharedCounterValue);
            console.log("SUCCESS: Counter synced to Godot:", sharedCounterValue);
          } else {
            console.log("AppController not found, attempt:", retryCount + 1);
          }
        });
        
        retryCount++;
        if (retryCount < maxRetries) {
          retryTimerId = setTimeout(checkAndSetCounter, 500);
        }
      };

      // Start checking after initial delay
      const timerId = setTimeout(checkAndSetCounter, 1000);

      return () => {
        clearTimeout(timerId);
        if (retryTimerId) clearTimeout(retryTimerId);
        // Destroy Godot when leaving the Game screen
        destroyGodot();
      };
    }, []);

    return (
      <View style={styles.gameContainer}>
        <RTNGodotView style={styles.fullscreenGodot} />
      </View>
    );
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Loading"
              component={Loading}
            />
            <Stack.Screen
              name="Game"
              component={Game}
              options={{ presentation: "modal" }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth">
            {() => <LoginScreen />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    flexDirection: "column",
  },
  headerContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "red",
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    height: 20,
  },
  headerText: {
    fontSize: 15,
    color: "white",
  },
  headerButton: {
    flex: 2,
    color: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  godotContainer: {
    flex: 8,
    padding: 0,
  },
  testContainer: {
    flex: 2,
    backgroundColor: "darkblue",
    padding: 10,
  },
  godot: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  fullscreenGodot: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    flexDirection: "column",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
    alignItems: "center",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
    width: "100%",
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  appSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 30,
    textAlign: "center",
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  circularProgress: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: "#E5E5EA",
    borderTopColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
    minHeight: 20,
  },
  progressBarContainer: {
    width: "100%",
    paddingHorizontal: 40,
    marginBottom: 16,
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 30,
  },
  counterSection: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  counterContainer: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2C2C2E',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "80%",
  },
  counterLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    minWidth: 50,
    textAlign: "center",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 40,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#3C3C3E",
  },
  gameButton: {
    minHeight: 44,
    justifyContent: "center",
  },
  logoutButton: {
    minHeight: 44,
    justifyContent: "center",
  },
  gameContainer: {
    flex: 1,
    backgroundColor: "black",
  },
});

export default App;
