import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WordsScreen } from './src/screens/WordsScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ShareScreen } from './src/screens/ShareScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { useAuth } from './src/hooks/useAuth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function Placeholder() { return <Text>Coming Soon</Text>; }

function AuthedTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Words" component={WordsScreen} />
      <Tab.Screen name="Quiz" component={QuizScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Share" component={ShareScreen} />
    </Tab.Navigator>
  );
}

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
  return <AuthedTabs />;
}
