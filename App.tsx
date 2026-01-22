/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import "setimmediate"; // Required by New Architecture
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { GameScreen } from "./screens/GameScreen";
import { commonStyles } from "./styles/common";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={commonStyles.loadingText}>Initializing...</Text>
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
              component={LoadingScreen}
            />
            <Stack.Screen
              name="Game"
              component={GameScreen}
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

export default App;
