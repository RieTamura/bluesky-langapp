import React from 'react';
import { View, Pressable, StyleSheet, Text, Image } from 'react-native';
import { useTheme } from '../stores/theme';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
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
  const qc = useQueryClient();
  const { identifier } = useAuth();
  const [routeName, setRouteName] = React.useState<string | undefined>(() => getCurrentRouteName());

  // Subscribe to profile cache entries so FooterNav updates when profile data arrives.
  const profileMeQ = useQuery({ queryKey: ['profile','me'], queryFn: async () => null as any, enabled: false });
  // When an identifier is available, enable a query to fetch the atproto profile.
  // The queryFn is guarded but will only be invoked when `enabled: !!identifier` is true.
  const profileAtprotoQ = useQuery({
    queryKey: ['profile','atproto', identifier],
    enabled: !!identifier,
    queryFn: async () => {
      if (!identifier) return null as any;
      try {
        // Attempt to fetch profile from a local API proxy route. Adjust the URL
        // if your app uses a different endpoint for fetching profiles.
        const url = `/api/profile/atproto/${encodeURIComponent(identifier)}`;
        const res = await fetch(url);
        if (!res.ok) {
          // Return null for non-2xx responses to keep UI stable; callers may
          // inspect `error` on the query if they need to handle it.
          return null as any;
        }
        const data = await res.json();
        return data;
      } catch (e) {
        // Don't throw here if you want to avoid showing global errors; returning
        // null keeps FooterNav resilient. If you prefer to surfacing errors,
        // rethrow or return Promise.reject(e).
        return null as any;
      }
    }
  });

  // 画面遷移イベントを購読してアクティブ表示を更新
  React.useEffect(() => {
    const handler = () => setRouteName(getCurrentRouteName());
    // navigationRef がまだ準備できていない可能性があるため安全に購読する。
    // addListener が利用可能になるまで短い間隔で試行し、購読できたら interval を解除する。
  let unsub: (() => void) | undefined;
  let intervalId: ReturnType<typeof setInterval> | undefined;

    const trySubscribe = () => {
      try {
        if (navigationRef.isReady() && typeof (navigationRef as any).addListener === 'function') {
          unsub = (navigationRef as any).addListener('state', handler);
          return true;
        }
      } catch (e) {
        // ignore and retry
      }
      return false;
    };

    if (!trySubscribe()) {
      intervalId = setInterval(() => {
        if (trySubscribe() && intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      }, 100);

      // In case trySubscribe becomes true immediately after assigning intervalId,
      // re-check and clear right away to avoid an unnecessary tick.
      if (trySubscribe() && intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    }

    // 初期化遅延対策（リスナー登録が遅れた場合にも初期のルート名を取得する）
    const id = setTimeout(() => setRouteName(getCurrentRouteName()), 300);
    return () => {
      try { unsub && unsub(); } catch (e) { /* ignore */ }
      try { if (intervalId !== undefined) clearInterval(intervalId); } catch (e) { /* ignore */ }
      clearTimeout(id);
    };
  }, []);

  return (
  <View style={[styles.container, { paddingBottom: insets.bottom > 8 ? insets.bottom : 12, backgroundColor: colors.surface, borderColor: colors.border }]}> 
      {items.map(it => {
        const active = routeName === it.target;
        // For the progress tab, attempt to render the user's avatar instead of the default icon
        const isProgress = it.key === 'progress';
        let avatarElement: React.ReactNode | null = null;
        if (isProgress) {
          try {
            // Prefer reactive cached queries (useQuery(-, enabled:false) above) so FooterNav re-renders
            const cached = profileAtprotoQ.data || profileMeQ.data || qc.getQueryData(['profile','atproto', identifier]) || qc.getQueryData(['profile','me']) || qc.getQueryData(['auth','me']) || undefined;
            const p: any = cached && typeof cached === 'object' ? ((cached as any).user || (cached as any)) : null;
            if (p && p.avatar) {
              avatarElement = React.createElement(Image, { source: { uri: p.avatar }, style: [styles.avatar, active ? { borderColor: colors.accent } : { borderColor: 'transparent' }] });
            } else if (p && (p.displayName || p.handle || identifier)) {
              const initials = ((p.displayName || p.handle || identifier) + '').trim().split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
              avatarElement = React.createElement(View, { style: [styles.avatar, { backgroundColor: colors.border, alignItems:'center', justifyContent:'center' }] }, React.createElement(Text, { style: { color: colors.surface, fontWeight: '700' } }, initials));
            }
          } catch (e) {
            avatarElement = null;
          }
        }
        return (
          <Pressable
            key={it.key}
            accessibilityRole="button"
            accessibilityLabel={it.accessibilityLabel}
            onPress={() => navigate(it.target)}
            style={[styles.item, active && styles.activeItem]}
          >
            {isProgress && avatarElement ? (
              avatarElement
            ) : (
              <it.Icon size={24} color={active ? colors.accent : colors.secondaryText} />
            )}
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
  ,avatar: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden', borderWidth: 1 }
});
