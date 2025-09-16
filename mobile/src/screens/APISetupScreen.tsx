import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';

// A simplified placeholder screen shown while AI features are disabled.
// The original screen is archived at `mobile/ai-archive/APISetupScreen.tsx`.

export default function APISetupScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text>AI-related screen removed from source. Original archived at mobile/ai-archive/APISetupScreen.tsx</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 18, fontWeight: '700' }
});
