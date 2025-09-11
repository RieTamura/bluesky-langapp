import React, { useEffect, useState, useCallback } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { wordsApi, api } from '../services/api';

// Small, dependency-free UUID v4 generator (suitable for temporary IDs).
// Uses Math.random; collisions are astronomically unlikely for temp ids.
const uuidV4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineQueue } from '../stores/offlineQueue';

interface Props {
  word: string | null;
  onClose: () => void;
}

interface WordInfo {
  word: string;
  definition?: string;
  exampleSentence?: string;
  status?: string;
  id?: string;
}

export const WordDetailModal: React.FC<Props> = ({ word, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // React Query のグローバルキャッシュ操作用
  const qc = useQueryClient();
  const enqueue = useOfflineQueue((s) => s.enqueue);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!word) return;
      setLoading(true); setInfo(null); setMessage(null);
      // Unicode-aware: remove surrounding punctuation/symbol runs and zero-width chars
      const target = (word || '').replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').replace(/[\u200B\uFEFF]/g, '').trim();
      if (!target) {
        // nothing meaningful to lookup/register
        if (!cancelled) setInfo({ word: '' });
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        // 1. ユーザー既存語彙一覧から同一語を検索
        let existing: any;
        try {
          const list: any = await wordsApi.list();
          const arr = (list?.data || list) as any[];
          existing = arr?.find(w => (w.word || '').toLowerCase() === target.toLowerCase());
        } catch (e) { /* ignore */ }

        // 2. 既存語があるが definition / example が空、または存在しない → 辞書定義取得
        let definition: string | undefined;
        let exampleSentence: string | undefined;
        if (existing?.definition) definition = existing.definition;
        if (existing?.exampleSentence) exampleSentence = existing.exampleSentence;

        if (!definition) {
          try {
            // バックエンド実装に合わせた正しいエンドポイント (/api/words/:word/definition)
            const dict: any = await api.get<any>(`/api/words/${encodeURIComponent(target)}/definition`);
            const d = dict?.data || dict; // SimplifiedDefinition 期待
            const firstDef = Array.isArray(d?.definitions) ? d.definitions[0] : undefined;
            if (firstDef?.definition) definition = firstDef.definition;
            if (!exampleSentence && firstDef?.example) exampleSentence = firstDef.example;
          } catch (e) {
            // 404 (未定義) やその他は無視して既存情報のみ表示
          }
        }

        if (!cancelled) {
          if (existing) {
            setInfo({
              word: existing.word,
              definition,
              exampleSentence,
              status: existing.status,
              id: existing.id
            });
          } else {
            setInfo({ word: target, definition, exampleSentence });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [word]);

  const ensureCreated = useCallback(async () => {
    if (!info) return undefined;
    if (info.id) return info.id;
    setSaving(true);
  // minimal startup trace removed
    try {
      const res: any = await wordsApi.create({ word: info.word, definition: info.definition, exampleSentence: info.exampleSentence });
      const created = res?.data || res;
      setInfo(s => s ? { ...s, id: created.id, status: created.status } : s);
      // invalidate words queries
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
      return created.id;
    } catch (e: any) {
      // Debug: log full error shape so we can see why offline branch wasn't hit
  console.warn('WordDetailModal.create error:', e);
      // Match behavior of useWords.createMutation: enqueue on offline / auth required
      const err = e || {};
      const isOffline = err?.error === 'NETWORK_OFFLINE' || err?.error === 'AUTH_REQUIRED' || err?.status === 0 || (typeof err?.message === 'string' && err.message.toLowerCase().includes('offline'));
      if (isOffline) {
        // enqueue create operation for offline processing
        try {
          const payload = { word: info.word, definition: info.definition, exampleSentence: info.exampleSentence };
          await enqueue({ type: 'word.create', payload });
          // create a temp id to represent pending item (UUID-based to avoid collisions)
          const tempId = `temp_${uuidV4()}`;
          setInfo(s => s ? { ...s, id: tempId, status: 'unknown' } : s);
          qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
          return tempId;
        } catch (ee) {
          console.error('Failed to enqueue offline create from WordDetailModal:', ee);
          // fallthrough to alert
        }
      }
      Alert.alert('エラー', e?.message || '登録失敗');
    } finally { setSaving(false); }
  }, [info, enqueue, qc]);

  const setStatus = useCallback(async (status: string) => {
    if (!info) return;
    const normalized = status.toLowerCase(); // APIは小文字 (unknown / learning / known)
    if (!['unknown','learning','known'].includes(normalized)) return;
    const wasNew = !info.id;
  // removed verbose debug log
    const id = info.id || await ensureCreated();
    if (!id) return;
    setSaving(true); setMessage(null);
    try {
      await wordsApi.update(id, { status: normalized });
      setInfo(s => s ? { ...s, status: normalized } : s);
      if (normalized === 'known') setMessage('既知に設定しました');
      else if (normalized === 'unknown' && wasNew) setMessage('登録しました (未知)');
      else if (normalized === 'unknown') setMessage('未知に設定しました');
  // 更新後にキャッシュをinvalidateしてフィード側 knownWords セットを更新
  qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
    } catch (e: any) {
  console.warn('[WordDetailModal] update error:', e);
      const err = e || {};
      const isOffline = err?.error === 'NETWORK_OFFLINE' || err?.status === 0 || (typeof err?.message === 'string' && err.message.toLowerCase().includes('offline'));
      if (isOffline) {
        // enqueue an update task (or create if no real id)
        try {
          if (info.id) {
            const payload = { id, patch: { status: normalized } };
              await enqueue({ type: 'word.update', payload });
            setInfo(s => s ? { ...s, status: normalized } : s);
            qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
            setMessage(normalized === 'known' ? '既知に設定しました (オフライン待機中)' : '状態を更新しました (オフライン待機中)');
            return;
          } else {
            // fallback: enqueue a create with status
            const payload = { word: info.word, definition: info.definition, exampleSentence: info.exampleSentence, status: normalized };
            await enqueue({ type: 'word.create', payload });
            const tempId = `temp_${uuidV4()}`;
            setInfo(s => s ? { ...s, id: tempId, status: normalized } : s);
            qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
            setMessage('登録しました (オフライン待機中)');
            return;
          }
        } catch (qe) {
          console.error('[WordDetailModal] Failed to enqueue during update:', qe);
          // fallthrough to alert
        }
      }
      Alert.alert('エラー', e?.message || '更新失敗');
    } finally { setSaving(false); }
  }, [info, ensureCreated]);

  return (
    <Modal visible={!!word} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.centerWrapper} pointerEvents="box-none">
        <View style={styles.sheet}>
          {loading && <ActivityIndicator style={{ marginBottom: 12 }} />}
          {!loading && info && (
            <>
              <Text style={styles.word}>{info.word}</Text>
              {info.definition && <Text style={styles.definition}>{info.definition}</Text>}
              {info.exampleSentence && <Text style={styles.example}>{info.exampleSentence}</Text>}
              <View style={styles.buttonsRow}>
                <Pressable style={[styles.btn, styles.secondary]} disabled={saving} onPress={() => setStatus('unknown')}>
                  <Text style={styles.btnText}>覚えてない</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.primary]} disabled={saving} onPress={() => setStatus('known')}>
                  <Text style={[styles.btnText,{color:'#fff'}]}>覚えている</Text>
                </Pressable>
              </View>
              {message && <Text style={styles.message}>{message}</Text>}
              <Pressable style={styles.closeBtn} onPress={onClose}><Text style={styles.closeText}>閉じる</Text></Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // backdrop削除
  centerWrapper: { flex:1, justifyContent:'flex-end', backgroundColor:'transparent' },
  sheet: { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:'80%', shadowColor:'#000', shadowOpacity:0.15, shadowRadius:12, shadowOffset:{ width:0, height:-2 }, elevation:6 },
  word: { fontSize:22, fontWeight:'700', marginBottom:8 },
  definition: { fontSize:15, lineHeight:20, marginBottom:8 },
  example: { fontSize:13, lineHeight:18, color:'#555', marginBottom:12 },
  buttonsRow: { flexDirection:'row', gap:12, marginBottom:12 },
  btn: { flex:1, alignItems:'center', justifyContent:'center', borderRadius:10, paddingVertical:12 },
  primary: { backgroundColor:'#007aff' },
  secondary: { backgroundColor:'#eef2f7' },
  btnText: { fontWeight:'700', color:'#222' },
  message: { textAlign:'center', color:'#007aff', fontSize:12, marginTop:4 },
  closeBtn: { marginTop:12, alignItems:'center' },
  closeText: { fontWeight:'600', color:'#333' }
});
