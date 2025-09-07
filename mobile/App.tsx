import React, { useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { type ThemeMode } from './src/stores/theme';
type ThemeState = { hydrate: () => Promise<void>; resolved: 'light'|'dark'; colors: any; syncAutoResolution: () => void };
import { NavigationContainer, DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WordsScreen } from './src/screens/WordsScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useAuth } from './src/hooks/useAuth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { useThemeColors, useTheme } from './src/stores/theme';
import { StatusBar } from 'react-native';
import { MainScreen } from './src/screens/MainScreen';
import { AppHeader, SettingsMenu, FooterNav } from './src/components';
import { navigationRef } from './src/navigation/rootNavigation';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LicenseScreen } from './src/screens/LicenseScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  // 必要プロパティのみ購読 (再レンダー効率化 & 一貫性向上)
  const hydrate = useTheme((s: ThemeState) => s.hydrate);
  const resolved = useTheme((s: ThemeState) => s.resolved);
  const colors = useTheme((s: ThemeState) => s.colors);
  const systemScheme = useColorScheme();
  const syncAutoResolution = useTheme((s: ThemeState) => s.syncAutoResolution);
  useEffect(()=> {
    hydrate();
  }, [hydrate]);
  // フォールバック: Appearance listener が片方向で失敗する端末向けに hook の値で再同期
  useEffect(()=> {
    syncAutoResolution();
  }, [systemScheme, syncAutoResolution]);
  // 明るさポーリング削除 (adaptive 廃止)
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex:1, backgroundColor: colors.background }}>
        <NavigationContainer
          ref={navigationRef}
          theme={useMemo(()=> {
            if (resolved === 'dark') return {
              ...NavDarkTheme,
              colors: { ...NavDarkTheme.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent }
            };
            return {
              ...NavLightTheme,
              colors: { ...NavLightTheme.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent }
            };
          }, [resolved, colors.background, colors.surface, colors.text, colors.border, colors.accent])}
        >
          <AuthGate />
        </NavigationContainer>
  <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} />
        </View>
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
          <Stack.Screen name="Main" component={MainScreen} options={{ header: () => <AppHeader showFeedTabs onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Words" component={WordsScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Quiz" component={QuizScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Progress" component={ProgressScreen} options={{ header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} /> }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="License" component={LicenseScreen} options={{ title: 'ライセンス' }} />
        </Stack.Navigator>
        <FooterNav />
      </View>
  <SettingsMenu visible={menuOpen} onClose={() => { setMenuOpen(false); }} />
    </>
  );
}
