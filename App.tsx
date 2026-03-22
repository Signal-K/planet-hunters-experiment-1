/**
 * Planet Hunters - React Native + Godot
 */

import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LogBox } from "react-native";
import {
  NavigationContainer,
  type NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RTNGodotView } from "@borndotcom/react-native-godot";
import { getMenuRequest, initGodot } from "./utils/godot";
import { startSyncLoop } from "./utils/godotSync";
import { MenuScreen } from "./screens/MenuScreen";
import { GameScreen } from "./screens/GameScreen";
import { commonStyles } from "./styles/common";
import { AuthProvider } from "./contexts/AuthContext";
import type { RootStackParamList } from "./types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

interface GodotHostProps {
  interactive: boolean;
}

const GodotHost = ({ interactive }: GodotHostProps) => {
  useEffect(() => {
    initGodot("GodotTest");
    const stopSync = startSyncLoop(700);
    const { MissionService } = require("./utils/missionService");
    MissionService.startListening();

    return () => {
      stopSync();
    };
  }, []);

  return (
    <View
      style={commonStyles.godotHost}
      pointerEvents={interactive ? "auto" : "none"}
    >
      <RTNGodotView style={commonStyles.fullscreenGodot} />
    </View>
  );
};

const AppContent = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [activeRoute, setActiveRoute] =
    useState<keyof RootStackParamList>("Game");
  const lastMenuRequestVersion = useRef(0);

  const handleStateChange = () => {
    const routeName = navigationRef.current?.getCurrentRoute()?.name;
    if (routeName) {
      setActiveRoute(routeName as keyof RootStackParamList);
    }
  };

  useEffect(() => {
    LogBox.ignoreAllLogs(true);

    const interval = setInterval(() => {
      getMenuRequest()
        .then((request) => {
          if (!request) {
            return;
          }
          if (request.version <= lastMenuRequestVersion.current) {
            return;
          }
          lastMenuRequestVersion.current = request.version;

          if (request.action === "open") {
            navigationRef.current?.navigate("Menu");
          } else if (request.action === "close") {
            navigationRef.current?.navigate("Game");
          }
        })
        .catch((error) => {
          console.warn("[MenuBridge] Failed to read menu request:", error);
        });
    }, 750);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={commonStyles.appRoot}>
      <GodotHost interactive={activeRoute === "Game"} />
      {activeRoute === "Game" ? (
        <View style={commonStyles.gameOverlay} pointerEvents="box-none">
          <Pressable
            style={commonStyles.menuExitButton}
            onPress={() => navigationRef.current?.navigate("Menu")}
          >
            <Text style={commonStyles.menuExitButtonText}>Exit to Menu</Text>
          </Pressable>
        </View>
      ) : null}
      <View
        style={commonStyles.navigationLayer}
        pointerEvents={activeRoute === "Menu" ? "auto" : "none"}
      >
        <NavigationContainer
          ref={navigationRef}
          onStateChange={handleStateChange}
        >
          <Stack.Navigator
          initialRouteName="Game"
            screenOptions={{
              headerShown: false,
              contentStyle: commonStyles.stackContent,
            }}
          >
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </View>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
