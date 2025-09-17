import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from './Icons';

export const SettingsHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const navigation = useNavigation();
  return (
  <View style={[styles.container, { paddingTop: insets.top + 4, backgroundColor: c.background, borderColor: c.border }]}> 
      <Pressable onPress={() => (navigation as any).goBack()} style={styles.back} accessibilityLabel="戻る">
        <ArrowLeft color={c.accent || '#007aff'} size={20} accessibilityLabel="戻る" />
      </Pressable>
      <View style={{ flex: 1 }} />
      <View style={{ width: 64 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  back: { padding: 8, minWidth: 64 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700' }
});
