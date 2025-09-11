import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Text, Modal, Pressable } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useWords } from '../hooks/useWords';
import { WordCard } from '../components/WordCard';

export const WordsScreen: React.FC = () => {
  const { words, isLoading, updateStatus } = useWords();
  // Exclude locally-created temporary words (ids starting with 'temp_') from the
  // main synced list used for status grouping/counts so it matches server-side stats.
  const syncedWords = React.useMemo(() => words.filter(w => !(w.id || '').startsWith('temp_')), [words]);
  const pendingCount = React.useMemo(() => words.filter(w => (w.id || '').startsWith('temp_')).length, [words]);
  // 並び順要求: 1.復習 2.LEARNING 3.KNOWN 4.UNKNOWN 5.ステータス(グループ表示) 6.A-Z
  const [sortKey, setSortKey] = React.useState<'review' | 'learning' | 'known' | 'unknown' | 'status' | 'alpha'>('review');

  type ListRenderable = { type: 'word'; data: typeof words[number] } | { type: 'header'; id: string; label: string };

  const listData: ListRenderable[] = React.useMemo(() => {
    // If there are no syncedWords but the backend returned words, fall back to showing them
    // This helps diagnose why 'syncedWords' might be empty (e.g., id format mismatch).
    const base = (syncedWords && syncedWords.length > 0) ? [...syncedWords] : [...words];
    const orderStatus: Record<string, number> = { unknown: 0, learning: 1, known: 2 };
    const sorted = (() => {
      switch (sortKey) {
        case 'status':
          return base.sort((a, b) => {
            const diff = orderStatus[a.status] - orderStatus[b.status];
            return diff !== 0 ? diff : a.word.localeCompare(b.word, 'en', { sensitivity: 'base' });
          });
        case 'review':
          return base.sort((a, b) => {
            const ra = a.reviewCount || 0; const rb = b.reviewCount || 0; if (rb !== ra) return rb - ra;
            const ca = a.correctCount || 0; const cb = b.correctCount || 0; if (cb !== ca) return cb - ca;
            return a.word.localeCompare(b.word, 'en', { sensitivity: 'base' });
          });
        case 'learning':
        case 'known':
        case 'unknown':
        case 'alpha':
        default:
          return base.sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
      }
    })();
    // 個別ステータスフィルタ
    if (sortKey === 'learning' || sortKey === 'known' || sortKey === 'unknown') {
      return sorted.filter(w => w.status === sortKey).map(w => ({ type: 'word', data: w }) as ListRenderable);
    }
    if (sortKey !== 'status') {
      return sorted.map(w => ({ type: 'word', data: w }) as ListRenderable);
    }
    // ステータスグループ表示
    const result: ListRenderable[] = [];
    let current: string | undefined;
  for (const w of sorted) {
      if (w.status !== current) {
        current = w.status;
        let label = '';
        if (current === 'unknown') label = 'UNKNOWN';
        else if (current === 'learning') label = 'LEARNING';
        else if (current === 'known') label = 'KNOWN';
    result.push({ type: 'header', id: `hdr_${current}`, label });
      }
      result.push({ type: 'word', data: w });
    }
    return result;
  }, [syncedWords, sortKey]);

  const c = useThemeColors();
  const { isSyncing, lastSyncAt, pendingCount: pq, syncNow } = useSyncQueue(true);

  const [showFilterModal, setShowFilterModal] = React.useState(false);

      return (
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
        <View>
          <TouchableOpacity onPress={() => syncNow()} accessibilityRole="button">
            <Text style={{ color: pq > 0 ? c.accent : c.secondaryText, fontSize: 14, fontWeight: '700' }}>{pq > 0 ? `未同期 ${pq} 件` : '同期済み'}</Text>
          </TouchableOpacity>
          {isSyncing && <Text style={{ color: c.secondaryText, fontSize: 12 }}>同期中…</Text>}
          {!isSyncing && lastSyncAt && <Text style={{ color: c.secondaryText, fontSize: 12 }}>最終同期: {new Date(lastSyncAt).toLocaleString()}</Text>}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={{ padding: 8 }} accessibilityRole="button">
            <Text style={{ fontSize: 20, color: c.text }}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Diagnostic counts: total words from hook, synced words (displayed), pending local words */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: c.secondaryText, fontSize: 12, opacity: 0.9 }}>総単語: {words.length}  表示中: {syncedWords.length}  未同期: {pq}</Text>
      </View>

      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}> 
            <SortTabs current={sortKey} onChange={(k) => { setSortKey(k); setShowFilterModal(false); }} />
          </View>
        </Pressable>
      </Modal>
  {/* debug UI removed */}
      <FlatList
        data={listData}
        refreshing={isLoading}
        keyExtractor={(item) => item.type === 'word' ? item.data.id : item.id}
        // Quiz画面: 外側padding 12 + QuizCard内padding 16 = 28px の開始位置
        // Words画面も同じ視覚的開始位置になるよう contentContainerStyle に 16px を追加
        contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}> 
                <Text style={[styles.sectionHeaderText,{ color: c.text }]}>{item.label}</Text>
              </View>
            );
          }
          return <WordCard word={item.data} onStatusChange={updateStatus} />;
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // paddingHorizontalをMainScreen (12) に合わせて統一
  // ヘッダーと並び替えタブの間隔を広げるため paddingTop を増やす
  // 余白拡大: ヘッダー直下に明確なスペースを設ける
  container: { flex: 1, paddingHorizontal: 12, paddingBottom: 140, paddingTop: 48 },
  sectionHeader: { paddingTop: 18, paddingBottom: 6 },
  sectionHeaderText: { fontSize: 12, fontWeight: '700' }
  ,
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { width: '90%', borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth }
});

// ソートタブコンポーネント
const SortTabs: React.FC<{ current: 'review' | 'learning' | 'known' | 'unknown' | 'status' | 'alpha'; onChange: (k: 'review' | 'learning' | 'known' | 'unknown' | 'status' | 'alpha') => void; }> = ({ current, onChange }) => {
  const c = useThemeColors();
  const options: { key: 'review' | 'learning' | 'known' | 'unknown' | 'status' | 'alpha'; label: string }[] = [
    { key: 'review', label: '復習' },
    { key: 'learning', label: 'LEARNING' },
    { key: 'known', label: 'KNOWN' },
    { key: 'unknown', label: 'UNKNOWN' },
    { key: 'status', label: 'ステータス' },
    { key: 'alpha', label: 'A-Z' }
  ];
  // FlatList の contentContainerStyle で paddingHorizontal:16 を与えているため
  // タブ側も同じ開始位置に合わせる
  return (
    <View style={{ marginBottom: 8, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {options.map(opt => {
          const active = opt.key === current;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 18,
                marginRight: 10,
                marginBottom: 10,
                backgroundColor: active ? c.accent : c.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: active ? c.accent : c.border
              }}
            >
              <Text style={{ color: active ? '#fff' : c.text, fontSize: 13, fontWeight: '600' }}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
