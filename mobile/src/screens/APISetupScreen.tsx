import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Placeholder screen shown while AI features are disabled.
// Original screen archived at `mobile/ai-archive/APISetupScreen.tsx`.

export default function APISetupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>API 設定 (無効)</Text>
      <Text style={styles.body}>AI 機能は無効化されています。実装は mobile/ai-archive/ に保存されています。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, color: '#666' },
});
