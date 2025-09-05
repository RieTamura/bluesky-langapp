import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Item { key: string; icon: string; target: string; accessibilityLabel: string; }
// ホームボタンを含め、ラベルテキストは表示せずアイコンのみ
const items: Item[] = [
  { key: 'home', icon: '🏠', target: 'Main', accessibilityLabel: 'ホーム' },
  { key: 'words', icon: '📘', target: 'Words', accessibilityLabel: '単語' },
  { key: 'quiz', icon: '📝', target: 'Quiz', accessibilityLabel: 'クイズ' },
  { key: 'progress', icon: '📊', target: 'Progress', accessibilityLabel: '進捗' }
];

export const FooterNav: React.FC = () => {
  const navigation: any = useNavigation();
  let current: string | undefined;
  try {
    const st = navigation?.getState?.();
    if (st?.routes?.length) {
      const idx = typeof st.index === 'number' ? st.index : 0;
      current = st.routes[idx]?.name;
    }
  } catch { /* ignore early render */ }
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 8 ? insets.bottom : 12 }]}> 
      {items.map(it => {
        const active = current === it.target;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="button"
            accessibilityLabel={it.accessibilityLabel}
            onPress={() => navigation.navigate(it.target as never)}
            style={[styles.item, active && styles.activeItem]}
          >
            <Text style={[styles.icon, active && styles.activeText]}>{it.icon}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', justifyContent: 'space-around', paddingTop: 10 },
  item: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 6 },
  icon: { fontSize: 22 },
  activeItem: { },
  activeText: { color: '#007aff', fontWeight: '600' }
});
