import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
// navigation import intentionally omitted for now
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';
import { Settings as SettingsIcon } from './Icons';

interface Props { onOpenMenu: () => void; showFeedTabs?: boolean; }

// グローバルヘッダー: Feed | 単語集 | ☰
export const AppHeader: React.FC<Props> = ({ onOpenMenu }) => {
  // navigation 参照は今後の拡張用（現状未使用）
  // (unused) const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  // feedTab and setFeedTab intentionally unused in header; kept for future if needed

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: c.background, borderColor: c.border }]}> 
      <View style={{ flex: 1 }} />
      <Pressable onPress={onOpenMenu} style={styles.menuBtn} accessibilityLabel="設定メニューを開く">
        <SettingsIcon color={c.text} size={22} />
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
