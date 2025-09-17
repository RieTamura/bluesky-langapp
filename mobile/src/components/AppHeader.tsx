import React from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
// navigation import intentionally omitted for now
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';
import { useFeedStore } from '../stores/feed';
import { Settings as SettingsIcon } from './Icons';

interface Props { onOpenMenu: () => void; showFeedTabs?: boolean; }

// グローバルヘッダー: Feed | 単語集 | ☰
export const AppHeader: React.FC<Props> = ({ onOpenMenu, showFeedTabs }) => {
  // navigation 参照は今後の拡張用（現状未使用）
  // (unused) const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const feedTab = useFeedStore(s => s.feedTab);
  const setFeedTab = useFeedStore(s => s.setFeedTab);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: c.background, borderColor: c.border }]}> 
      <View style={{ flex: 1 }} />
      <Pressable onPress={onOpenMenu} style={styles.menuBtn} accessibilityLabel="設定メニューを開く">
        <SettingsIcon color={c.text} size={22} accessibilityLabel="設定メニューを開く" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // 最小限の高さ + 下線を透明化
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent', paddingBottom: 8 },
  menuBtn: { padding: 8, minWidth: 48, alignItems: 'center' },
  menuText: { fontSize: 22, fontWeight: '600' },
  tabsRow: { flexDirection: 'row', flex: 1, justifyContent: 'flex-start' },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 10, marginHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  sideSpacer: { width: 48 }
});
