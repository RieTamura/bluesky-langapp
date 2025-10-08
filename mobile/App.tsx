import React, { useEffect, useState, useMemo } from "react";
import { useColorScheme, Appearance } from "react-native";
import { type ThemeState, type ThemeColors } from "./src/stores/theme";
import {
  NavigationContainer,
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WordsScreen } from "./src/screens/WordsScreen";
import { QuizScreen } from "./src/screens/QuizScreen";
import { ProgressScreen } from "./src/screens/ProgressScreen";
import LoginScreen from "./src/screens/LoginScreen";
import LevelSelectionScreen from "./src/screens/LevelSelectionScreen";
import APISetupScreen from "./src/screens/APISetupScreen";
import { useAuth } from "./src/hooks/useAuth";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useThemeColors, useTheme } from "./src/stores/theme";
import { getSelectedLevel } from "./src/stores/userLevel";
import { hasApiKey } from "./src/stores/apiKeys";
import { StatusBar } from "react-native";
import { MainScreen } from "./src/screens/MainScreen";
import { AppHeader, SettingsMenu, FooterNav } from "./src/components";
import { navigationRef } from "./src/navigation/rootNavigation";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { TTSSettingsScreen } from "./src/screens/TTSSettingsScreen";
import { SettingsHeader } from "./src/components/SettingsHeader";
import { LicenseScreen } from "./src/screens/LicenseScreen";
import { loadOfflineQueue } from "./src/stores/offlineQueue";
import { useAIModeStore } from "./src/stores/aiMode";
import { setTranslatorProvider } from "./src/services/translation";
import FreeDictionaryProvider from "./src/services/translationProviders/freeDictionary";

const Stack = createNativeStackNavigator();
// Hoist a separate navigator for onboarding so it's not recreated on every render
const OnboardStackNav = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  // 必要プロパティのみ購読 (再レンダー効率化 & 一貫性向上)
  const hydrate = useTheme((state: ThemeState) => state.hydrate);
  const resolved = useTheme((state: ThemeState) => state.resolved);
  const colors: ThemeColors = useTheme((state: ThemeState) => state.colors);
  const systemScheme = useColorScheme();
  const syncAutoResolution = useTheme(
    (state: ThemeState) => state.syncAutoResolution,
  );
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  // Restore offline queue from storage at startup
  useEffect(() => {
    loadOfflineQueue().catch(() => {});
  }, []);
  // Register fallback translator provider (Free Dictionary) at startup
  useEffect(() => {
    try {
      setTranslatorProvider(FreeDictionaryProvider);
    } catch (e) {
      /* ignore */
    }
  }, []);
  // Hydrate AI mode from stored OpenAI key
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const hasOpen = await hasApiKey("openai");
        if (mounted) {
          useAIModeStore.getState().setEnabled(!!hasOpen);
          useAIModeStore
            .getState()
            .hydrate()
            .catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  // フォールバック: Appearance listener が片方向で失敗する端末向けに hook の値で再同期
  useEffect(() => {
    syncAutoResolution();
  }, [systemScheme, syncAutoResolution]);
  // 公式リスナー (クリーンアップ付き) — Fast Refresh でも多重登録を避ける
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      syncAutoResolution();
    });
    return () => {
      try {
        (sub as any).remove?.();
      } catch (e) {
        /* ignore */
      }
    };
  }, [syncAutoResolution]);
  // 明るさポーリング削除 (adaptive 廃止)
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar
          barStyle={resolved === "dark" ? "light-content" : "dark-content"}
        />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <NavigationContainer
            ref={navigationRef}
            theme={useMemo(() => {
              if (resolved === "dark")
                return {
                  ...NavDarkTheme,
                  colors: {
                    ...NavDarkTheme.colors,
                    background: colors.background,
                    card: colors.surface,
                    text: colors.text,
                    border: colors.border,
                    primary: colors.accent,
                  },
                };
              return {
                ...NavLightTheme,
                colors: {
                  ...NavLightTheme.colors,
                  background: colors.background,
                  card: colors.surface,
                  text: colors.text,
                  border: colors.border,
                  primary: colors.accent,
                },
              };
            }, [
              resolved,
              colors.background,
              colors.surface,
              colors.text,
              colors.border,
              colors.accent,
            ])}
          >
            <AuthGate />
          </NavigationContainer>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Text>Loading...</Text>;
  if (!isAuthenticated) return <LoginScreen />;
  // After login, choose between onboarding flow or main app depending on stored level and API keys
  return <OnboardingGate />;
}

function OnboardingGate() {
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        // synchronous read for level
        const level = getSelectedLevel();
        // Historically we required an OpenAI key before entering the app, but
        // the new flow should allow users to proceed to the feed without an
        // API key (device TTS / expo-speech will be used). Only the missing
        // level should trigger onboarding. Keep APISetup accessible from
        // Settings for later key entry.
        const onboardingNeeded = level == null;
        if (mounted) {
          setNeedsOnboarding(onboardingNeeded);
        }
      } catch (e) {
        if (mounted) setNeedsOnboarding(true);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return <Text>Checking onboarding status...</Text>;
  return needsOnboarding ? <OnboardStack /> : <AuthedStack />;
}

function OnboardStack() {
  return (
    <OnboardStackNav.Navigator screenOptions={{ headerShown: false }}>
      <OnboardStackNav.Screen
        name="LevelSelection"
        component={LevelSelectionScreen}
      />
      <OnboardStackNav.Screen name="APISetup" component={APISetupScreen} />
      <OnboardStackNav.Screen name="MainApp" component={AuthedStackWrapper} />
    </OnboardStackNav.Navigator>
  );
}

function AuthedStackWrapper() {
  // Wrap the existing AuthedStack so it can be used as a screen in OnboardStack
  return <AuthedStack />;
}

function AuthedStack() {
  const [menuOpen, setMenuOpen] = useState(false);
  const c = useThemeColors();
  return (
    <>
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          screenOptions={{ contentStyle: { backgroundColor: c.background } }}
        >
          <Stack.Screen
            name="Main"
            component={MainScreen}
            options={{
              header: () => (
                <AppHeader showFeedTabs onOpenMenu={() => setMenuOpen(true)} />
              ),
            }}
          />
          <Stack.Screen
            name="Words"
            component={WordsScreen}
            options={{
              header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} />,
            }}
          />
          <Stack.Screen
            name="Quiz"
            component={QuizScreen}
            options={{
              header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} />,
            }}
          />
          <Stack.Screen
            name="Progress"
            component={ProgressScreen}
            options={{
              header: () => <AppHeader onOpenMenu={() => setMenuOpen(true)} />,
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false, title: "設定" }}
          />
          <Stack.Screen
            name="TTSSettings"
            component={TTSSettingsScreen}
            options={{ header: () => <SettingsHeader /> }}
          />
          <Stack.Screen
            name="License"
            component={LicenseScreen}
            options={{ title: "ライセンス" }}
          />
        </Stack.Navigator>
        <FooterNav />
      </View>
      <SettingsMenu
        visible={menuOpen}
        onClose={() => {
          setMenuOpen(false);
        }}
      />
    </>
  );
}
