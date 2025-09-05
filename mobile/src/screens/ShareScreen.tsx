import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const ShareScreen: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['share-advanced'],
    queryFn: () => api.get<any>('/api/learning/advanced-stats')
  });
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = () => {
    const s: any = stats?.data || stats;
    const text = `学習進捗: 総語彙 ${s?.totalWords}, 既知 ${s?.knownWords}, 正答率 ${(s?.averageAccuracy*100).toFixed(1)}%`; 
    setDraft(text);
  };

  const post = async () => {
    setPosting(true); setResult(null);
    try {
      // Placeholder: real Bluesky posting endpoint when integrated
      await new Promise(r => setTimeout(r, 800));
      setResult('投稿シミュレーション完了 (実API未接続)');
    } catch (e: any) {
      setResult(e?.message || '失敗');
    } finally { setPosting(false); }
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <Button title="進捗テキスト生成" onPress={generate} />
      <TextInput style={styles.input} multiline value={draft} onChangeText={setDraft} placeholder="共有テキスト" />
      <Button title={posting ? '投稿中...' : 'Blueskyへ投稿 (Mock)'} onPress={post} disabled={!draft || posting} />
      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: { minHeight: 120, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, textAlignVertical: 'top' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  result: { marginTop: 12, color: '#555' }
});
