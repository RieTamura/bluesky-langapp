import React, { useEffect, useState } from 'react';
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
import { useThemeColors, useTheme } from './src/stores/theme';
import { MainScreen } from './src/screens/MainScreen';
import { AppHeader, SettingsMenu, FooterNav } from './src/components';
import { navigationRef } from './src/navigation/rootNavigation';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LicenseScreen } from './src/screens/LicenseScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const { hydrate, refreshBrightness } = useTheme();
  useEffect(()=> {
    hydrate();
    let timer: number | null = null;
    let stopped = false;
    // 30秒毎に明るさを再取得 (permission が拒否された場合は noop)
    const loop = async () => {
      try {
        await refreshBrightness();
      } catch (e) {
        // 予期しない例外は握りつぶし (ログ追加するならここ)
      }
      if (!stopped) {
        timer = setTimeout(loop, 30000) as unknown as number; // React Native は number 戻り値
      }
    };
    loop();
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [hydrate, refreshBrightness]);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
  <NavigationContainer ref={navigationRef}>
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
