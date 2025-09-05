import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Item { key: string; label: string; icon: string; target: string; }
const items: Item[] = [
  { key: 'words', label: '単語', icon: '📘', target: 'Words' },
  { key: 'quiz', label: 'クイズ', icon: '📝', target: 'Quiz' },
  { key: 'progress', label: '進捗', icon: '📊', target: 'Progress' }
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
          <Pressable key={it.key} onPress={() => navigation.navigate(it.target as never)} style={[styles.item, active && styles.activeItem]}>
            <Text style={[styles.icon, active && styles.activeText]}>{it.icon}</Text>
            <Text style={[styles.label, active && styles.activeText]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', justifyContent: 'space-around', paddingTop: 8 },
  item: { alignItems: 'center', paddingHorizontal: 12 },
  icon: { fontSize: 20 },
  label: { fontSize: 11, marginTop: 2, color: '#444' },
  activeItem: { },
  activeText: { color: '#007aff', fontWeight: '600' }
});
