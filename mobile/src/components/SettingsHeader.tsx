import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/rootNavigation';
import { ArrowLeft } from './Icons';

export const SettingsHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
  <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: colors.background, borderColor: colors.border }]}> 
  <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="戻る">
    <ArrowLeft color={colors.accent || '#007aff'} size={20} accessible={false} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <View style={{ width: 64 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { padding: 8, minWidth: 64 },
  
});
