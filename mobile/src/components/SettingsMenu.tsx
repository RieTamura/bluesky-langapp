import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/rootNavigation';
import { useTheme } from '../stores/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SettingsMenu: React.FC<Props> = ({ visible, onClose }) => {
  const { identifier, logout } = useAuth();
  const resolved = useTheme((s:any) => s.resolved);
  const colors = useTheme((s:any) => s.colors);
  // debug removed
  const subtleBg = resolved === 'dark' ? '#1d252b' : '#eef2f5';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
  <View style={[styles.sheet,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
        <Text style={[styles.title,{ color: colors.text }]}>設定</Text>
        <View style={styles.section}>
          <Text style={[styles.label,{ color: colors.secondaryText }]}>ログイン情報</Text>
          <Text style={[styles.value,{ color: colors.text }]}>{identifier}</Text>
        </View>
        <View style={[styles.section,{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }]}> 
          <Text style={[styles.label,{ color: colors.secondaryText }]}>テーマ (システム)</Text>
        </View>
  <Pressable style={[styles.navBtn,{ backgroundColor: subtleBg }]} onPress={() => { onClose(); navigation.navigate('Settings'); }} accessibilityLabel="設定画面へ">
          <Text style={[styles.navText,{ color: colors.text }]}>設定画面へ</Text>
        </Pressable>
        <View style={{ height:12 }} />
        <Pressable style={[styles.logoutBtn,{backgroundColor:'#e53935'}]} onPress={logout} accessibilityLabel="ログアウト">
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={[styles.closeText,{ color: colors.text }]}>閉じる</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { position: 'absolute', top: 70, right: 12, width: 240, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  section: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#e53935', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '700' },
  navBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  navText: { fontWeight: '700' },
  closeBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  closeText: { fontWeight: '600' }
});
