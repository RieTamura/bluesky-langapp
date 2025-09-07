import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../stores/theme';
import { Home, BookOpen, Pencil, BarChart3 } from 'lucide-react-native';
// useNavigation は本コンポーネントが Stack.Navigator 外にあるため利用できない。
// 代わりに navigationRef を使用。
import { navigationRef, navigate, getCurrentRouteName } from '../navigation/rootNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lucide React Native icons受け取り props を最小限に絞った型 (size/color + a11y ラベル程度)
type IconComponent = React.ComponentType<{ size?: number; color?: string; accessibilityLabel?: string }>;
interface Item { key: string; target: string; accessibilityLabel: string; Icon: IconComponent; }
// ホームボタンを含め、ラベルテキストは表示せずアイコンのみ
const items: Item[] = [
  { key: 'home', target: 'Main', accessibilityLabel: 'ホーム', Icon: Home },
  { key: 'words', target: 'Words', accessibilityLabel: '単語', Icon: BookOpen },
  { key: 'quiz', target: 'Quiz', accessibilityLabel: 'クイズ', Icon: Pencil },
  { key: 'progress', target: 'Progress', accessibilityLabel: '進捗', Icon: BarChart3 }
];

export const FooterNav: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
  <View style={[styles.container, { paddingBottom: insets.bottom > 8 ? insets.bottom : 12, backgroundColor: colors.surface, borderColor: colors.border }]}> 
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
            <it.Icon size={24} color={active ? colors.accent : colors.secondaryText} />
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  // 背景 / 境界線色は動的注入 (inline) するためここでは固定値を指定しない
  container: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, justifyContent: 'space-around', paddingTop: 10 },
  item: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 6 },
  icon: { fontSize: 22 },
  activeItem: { },
  activeText: { color: '#007aff', fontWeight: '600' }
});
