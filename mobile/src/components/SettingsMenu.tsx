import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../stores/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SettingsMenu: React.FC<Props> = ({ visible, onClose }) => {
  const { identifier, logout } = useAuth();
  const { mode, toggle, resolved } = useTheme();
  const navigation: any = useNavigation();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <Text style={styles.title}>設定</Text>
        <View style={styles.section}>
          <Text style={styles.label}>ログイン情報</Text>
          <Text style={styles.value}>{identifier}</Text>
        </View>
        <View style={[styles.section,{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }]}> 
          <Text style={styles.label}>テーマ ({resolved})</Text>
          <Pressable onPress={toggle} style={{ paddingVertical:6, paddingHorizontal:12, backgroundColor:'#eef2f5', borderRadius:16 }} accessibilityLabel="テーマ切替" accessibilityHint="ライト→ダーク→自動の順に切替">
            <Text style={{ fontWeight:'600' }}>{mode === 'light' ? 'ライト' : mode === 'dark' ? 'ダーク' : '自動'}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.logoutBtn} onPress={() => { onClose(); navigation.navigate('Settings'); }} accessibilityLabel="設定画面へ">
          <Text style={styles.logoutText}>設定画面へ</Text>
        </Pressable>
        <View style={{ height:12 }} />
        <Pressable style={[styles.logoutBtn,{backgroundColor:'#e53935'}]} onPress={logout} accessibilityLabel="ログアウト">
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>閉じる</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { position: 'absolute', top: 70, right: 12, width: 240, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  section: { marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: '600' },
  logoutBtn: { backgroundColor: '#e53935', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '700' },
  closeBtn: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  closeText: { color: '#333', fontWeight: '600' }
});
