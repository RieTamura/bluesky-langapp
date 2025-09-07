import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
// useNavigation は本コンポーネントが Stack.Navigator 外にあるため利用できない。
// 代わりに navigationRef を使用。
import { navigationRef, navigate, getCurrentRouteName } from '../navigation/rootNavigation';
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
  const insets = useSafeAreaInsets();
  const [routeName, setRouteName] = React.useState<string | undefined>(() => getCurrentRouteName());

  // 画面遷移イベントを購読してアクティブ表示を更新
  React.useEffect(() => {
    const sub = navigationRef.addListener?.('state', () => {
      setRouteName(getCurrentRouteName());
    });
    // 初期化遅延対策
    const id = setTimeout(() => setRouteName(getCurrentRouteName()), 300);
    return () => { sub && (sub as any).remove?.(); clearTimeout(id); };
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 8 ? insets.bottom : 12 }]}> 
      {items.map(it => {
        const active = routeName === it.target;
        return (
          <Pressable
            key={it.key}
            accessibilityRole="button"
            accessibilityLabel={it.accessibilityLabel}
            onPress={() => navigate(it.target)}
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
