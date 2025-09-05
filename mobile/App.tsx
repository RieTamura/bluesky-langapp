import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WordsScreen } from './src/screens/WordsScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useAuth } from './src/hooks/useAuth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { useThemeColors } from './src/stores/theme';
import { MainScreen } from './src/screens/MainScreen';
import { AppHeader, SettingsMenu, FooterNav } from './src/components';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AuthGate />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Text>Loading...</Text>;
  if (!isAuthenticated) return <LoginScreen />;
  return <AuthedStack />;
}

function AuthedStack() {
  const [menuOpen, setMenuOpen] = useState(false);
  const c = useThemeColors();
  return (
    <>
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: c.background } }}>
          <Stack.Screen name="Main" component={MainScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Words" component={WordsScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Quiz" component={QuizScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Progress" component={ProgressScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
        <FooterNav />
      </View>
  <SettingsMenu visible={menuOpen} onClose={() => { setMenuOpen(false); }} />
    </>
  );
}
