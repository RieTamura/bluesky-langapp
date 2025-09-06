import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';
import { useFeedStore } from '../stores/feed';

interface Props { onOpenMenu: () => void; showFeedTabs?: boolean; }

// グローバルヘッダー: Feed | 単語集 | ☰
export const AppHeader: React.FC<Props> = ({ onOpenMenu, showFeedTabs }) => {
  // navigation 参照は今後の拡張用（現状未使用）
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const feedTab = useFeedStore(s => s.feedTab);
  const setFeedTab = useFeedStore(s => s.setFeedTab);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 4, backgroundColor: c.background, borderColor: c.border }]}> 
      {showFeedTabs ? (
        <View style={styles.tabsRow} accessibilityRole="tablist">
          {([
            { key: 'posts', label: 'Posts' },
            { key: 'following', label: 'Following' },
            { key: 'discover', label: 'Discover' }
          ] as const).map(t => {
            const active = feedTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setFeedTab(t.key)}
                style={[styles.tabBtn, active && { borderBottomColor: c.accent }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, { color: active ? c.accent : c.text }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Pressable onPress={onOpenMenu} style={styles.menuBtn} accessibilityLabel="設定メニューを開く">
        <Text style={[styles.menuText,{ color: c.text }]}>☰</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // 最小限の高さ + 下線を透明化
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent', paddingBottom: 4 },
  menuBtn: { padding: 8, minWidth: 48, alignItems: 'center' },
  menuText: { fontSize: 22, fontWeight: '600' },
  tabsRow: { flexDirection: 'row', flex: 1, justifyContent: 'flex-start' },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 10, marginHorizontal: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  sideSpacer: { width: 48 }
});
