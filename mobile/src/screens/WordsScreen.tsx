import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Text, Animated } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useWords } from '../hooks/useWords';
import { WordCard } from '../components/WordCard';
import { ListFilter, RefreshCw } from 'lucide-react-native';
import { authApi } from '../services/api';

export const WordsScreen: React.FC = () => {
  const { words, isLoading, updateStatus } = useWords();
  // Exclude locally-created temporary words (ids starting with 'temp_') from the
  // main synced list used for status grouping/counts so it matches server-side stats.
  const syncedWords = React.useMemo(() => words.filter(w => w.id && !w.id.startsWith('temp_')), [words]);
  const unregisteredLocalCount = React.useMemo(() => words.filter(w => w.id && w.id.startsWith('temp_')).length, [words]);  // 並び順要求: 1.復習 2.LEARNING 3.KNOWN 4.UNKNOWN 5.ステータス(グループ表示) 6.A-Z
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
  const anim = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const loopRef = React.useRef<Animated.CompositeAnimation | null>(null);

  const runOneRotation = React.useCallback(() => {
    return new Promise<void>((resolve) => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {
        rotateAnim.setValue(0);
        resolve();
      });
    });
  }, [rotateAnim]);

  const startContinuous = React.useCallback(() => {
    loopRef.current = Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true }));
    loopRef.current.start();
  }, [rotateAnim]);

  const stopContinuous = React.useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current = null;
    }
    rotateAnim.setValue(0);
  }, [rotateAnim]);

  // When syncing starts, always perform at least one full rotation; if still syncing, continue rotating
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isSyncing) {
        await runOneRotation();
        if (cancelled) return;
        // if still syncing, start continuous rotation
        if (isSyncing) startContinuous();
      } else {
        stopContinuous();
      }
    })();
    return () => { cancelled = true; };
  }, [isSyncing, runOneRotation, startContinuous, stopContinuous]);

  // When app becomes online and there are pending tasks, trigger a one-rotation and start sync
  React.useEffect(() => {
    let mounted = true;
    const tryAutoSync = async () => {
      if (pq > 0 && !isSyncing) {
        try {
          await authApi.me(); // throws NETWORK_OFFLINE if offline
          if (!mounted) return;
          // play one rotation then start sync
          await runOneRotation();
          if (!mounted) return;
          syncNow();
        } catch (e) {
          // offline or auth error; do nothing
        }
      }
    };
    tryAutoSync();
    return () => { mounted = false; };
  }, [pq, isSyncing, runOneRotation, syncNow]);

  const openFilters = () => {
    setShowFilterModal(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true
    }).start();
  };

  const closeFilters = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true
    }).start(() => setShowFilterModal(false));
  };

  const toggleFilters = () => {
    if (showFilterModal) closeFilters(); else openFilters();
  };

      return (
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => syncNow()} accessibilityRole="button" style={{ padding: 8 }} accessibilityLabel="同期">
            <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
              <RefreshCw size={20} color={c.text} />
            </Animated.View>
          </TouchableOpacity>
          <Text style={{ marginLeft: 8, color: pq > 0 ? c.accent : c.secondaryText, fontSize: 14, fontWeight: '700' }}>{pq > 0 ? `未同期 ${pq} 件` : '同期済み'}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={toggleFilters} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="フィルター">
            <ListFilter size={22} color={c.text} />
          </TouchableOpacity>
        </View>
      </View>
      {showFilterModal && (
        <Animated.View style={{ paddingHorizontal: 16, alignItems: 'flex-end', opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }}>
          <SortTabs current={sortKey} onChange={(k) => { setSortKey(k); closeFilters(); }} />
        </Animated.View>
      )}
  {/* debug UI removed */}
      <FlatList
        data={listData}
        refreshing={isLoading}
  keyExtractor={(item, index) => item.type === 'word' ? (item.data.id || `temp_${index}`) : item.id}
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
