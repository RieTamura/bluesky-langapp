import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useTTSStore } from '../stores/tts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Placeholder Bluesky profile fetch (should map to real endpoint later)
async function fetchProfile(identifier: string | null | undefined) {
  if (!identifier) return null;
  try {
    const res: any = await api.get<any>(`/api/atproto/profile?identifier=${encodeURIComponent(identifier)}`);
    return res.data || res;
  } catch {
    return { handle: identifier, displayName: identifier, description: 'プロフィール取得未実装' };
  }
}

async function fetchProgress() {
  try {
    const res: any = await api.get<any>('/api/learning/progress');
    return res.data || res;
  } catch { return null; }
}

export const SettingsScreen: React.FC = () => {
  const { identifier, logout } = useAuth();
  const profileQ = useQuery({ queryKey: ['profile', identifier], queryFn: () => fetchProfile(identifier) });
  const progressQ = useQuery({ queryKey: ['progress-mini'], queryFn: () => fetchProgress() });
  const ttsMode = useTTSStore(s => s.mode);
  const setMode = useTTSStore(s => s.setMode);
  const manualLanguage = useTTSStore(s => s.manualLanguage);
  const setManualLanguage = useTTSStore(s => s.setManualLanguage);
  const hydrate = useTTSStore(s => s.hydrate);
  React.useEffect(()=> { hydrate(); }, [hydrate]);

  if (profileQ.isLoading) return <View style={styles.center}><ActivityIndicator /></View>;

  const p: any = profileQ.data || {};
  const prog: any = progressQ.data || {};
  const history: number[] = (prog?.recentAccuracies || prog?.accuracyHistory || []).slice(-10);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>設定</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bluesky プロフィール</Text>
        <Text style={styles.handle}>@{p.handle}</Text>
        <Text style={styles.display}>{p.displayName}</Text>
        {!!p.description && <Text style={styles.desc}>{p.description}</Text>}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>進捗 (Accuracy)</Text>
        {progressQ.isLoading && <ActivityIndicator />}
        {!progressQ.isLoading && history.length === 0 && <Text style={styles.muted}>データなし</Text>}
        {!progressQ.isLoading && history.length > 0 && <MiniChart data={history} />}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>読み上げ (TTS)</Text>
        <View style={styles.row}> 
          {(['auto','manual'] as const).map(m => {
            const active = ttsMode === m;
            return (
              <TouchableOpacity key={m} style={[styles.modeBtn, active && styles.modeBtnActive]} onPress={()=> setMode(m)} accessibilityRole="button" accessibilityState={{ selected: active }}>
                <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>{m === 'auto' ? '自動' : '手動'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {ttsMode === 'manual' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>言語コード (例: en-US, ja-JP)</Text>
            <TextInput
              value={manualLanguage}
              onChangeText={setManualLanguage}
              placeholder="en-US"
              style={styles.input}
              autoCapitalize='none'
              autoCorrect={false}
              accessibilityLabel='TTS manual language code'
            />
          </View>
        )}
        {ttsMode === 'auto' && (
          <Text style={styles.help}>自動: 投稿テキストの文字種から簡易判定します。</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.logout} onPress={logout}>ログアウト</Text>
      </View>
    </ScrollView>
  );
};

const MiniChart: React.FC<{ data: number[] }> = ({ data }) => {
  const max = Math.max(...data, 1);
  return (
    <View style={styles.chartRow}>
      {data.map((v, i) => (
        <View key={i} style={[styles.chartBar, { height: 60 * (v / max) + 4 }]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  handle: { fontWeight: '600', fontSize: 14 },
  display: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  desc: { marginTop: 8, lineHeight: 18 },
  muted: { color: '#666', fontSize: 12 },
  logout: { color: '#e53935', fontWeight: '700', textAlign: 'center' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 8 },
  chartBar: { flex: 1, backgroundColor: '#007aff', borderRadius: 3 },
  row: { flexDirection: 'row', gap: 8 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  modeBtnActive: { backgroundColor: '#007aff', borderColor: '#007aff' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#007aff' },
  modeBtnTextActive: { color: '#fff' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#444' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  help: { marginTop: 8, fontSize: 12, color: '#666' }
});
