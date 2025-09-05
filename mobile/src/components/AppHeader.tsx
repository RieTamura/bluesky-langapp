import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props { onOpenMenu: () => void; }

// グローバルヘッダー: Feed | 単語集 | ☰
export const AppHeader: React.FC<Props> = ({ onOpenMenu }) => {
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 4, height: insets.top + 72 }]}> 
      <View style={styles.leftGroup}>
        <Pressable style={styles.navBtn} onPress={() => navigation.navigate('Main')} accessibilityLabel="Feed へ">
          <Text style={styles.navBtnText}>Feed</Text>
        </Pressable>
      </View>
      <Pressable onPress={onOpenMenu} style={styles.menuBtn} accessibilityLabel="設定画面へ">
        <Text style={styles.menuText}>☰</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingBottom: 10 },
  leftGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eef2f5' },
  navBtnText: { fontWeight: '600', fontSize: 14 },
  menuBtn: { padding: 8 },
  menuText: { fontSize: 22, fontWeight: '600' }
});
