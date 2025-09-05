import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';

interface Props { onOpenMenu: () => void; }

// グローバルヘッダー: Feed | 単語集 | ☰
export const AppHeader: React.FC<Props> = ({ onOpenMenu }) => {
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 4, backgroundColor: c.background, borderColor: c.border }]}> 
      <View style={{ flex: 1 }} />
      <Pressable onPress={onOpenMenu} style={styles.menuBtn} accessibilityLabel="設定メニューを開く">
        <Text style={[styles.menuText,{ color: c.text }]}>☰</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // 最小限の高さ + 下線を透明化
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent', paddingBottom: 8 },
  menuBtn: { padding: 8 },
  menuText: { fontSize: 22, fontWeight: '600' }
});
