import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useWords } from '../hooks/useWords';
import { WordCard } from '../components/WordCard';

export const WordsScreen: React.FC = () => {
  const { words, isLoading, updateStatus } = useWords();
  const [sortKey, setSortKey] = React.useState<'alpha' | 'status' | 'review'>('alpha');

  const sortedWords = React.useMemo(() => {
    const list = [...words];
    switch (sortKey) {
      case 'status': {
        const order: Record<string, number> = { unknown: 0, learning: 1, known: 2 };
        return list.sort((a, b) => {
          const diff = order[a.status] - order[b.status];
          return diff !== 0 ? diff : a.word.localeCompare(b.word, 'en', { sensitivity: 'base' });
        });
      }
      case 'review': {
        // reviewCount (desc) -> correctCount (desc) -> word (asc)
        return list.sort((a, b) => {
          const ra = a.reviewCount || 0; const rb = b.reviewCount || 0;
            if (rb !== ra) return rb - ra;
          const ca = a.correctCount || 0; const cb = b.correctCount || 0;
            if (cb !== ca) return cb - ca;
          return a.word.localeCompare(b.word, 'en', { sensitivity: 'base' });
        });
      }
      case 'alpha':
      default:
        return list.sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));
    }
  }, [words, sortKey]);

  const c = useThemeColors();
  return (
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <SortTabs current={sortKey} onChange={setSortKey} />
      <FlatList
        data={sortedWords}
        refreshing={isLoading}
        keyExtractor={item => item.id}
        // Quiz画面: 外側padding 12 + QuizCard内padding 16 = 28px の開始位置
        // Words画面も同じ視覚的開始位置になるよう contentContainerStyle に 16px を追加
        contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <WordCard word={item} onStatusChange={updateStatus} />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // paddingHorizontalをMainScreen (12) に合わせて統一
  // ヘッダーと並び替えタブの間隔を広げるため paddingTop を増やす
  // 余白拡大: ヘッダー直下に明確なスペースを設ける
  container: { flex: 1, paddingHorizontal: 12, paddingBottom: 140, paddingTop: 48 }
});

// ソートタブコンポーネント
const SortTabs: React.FC<{ current: 'alpha' | 'status' | 'review'; onChange: (k: 'alpha' | 'status' | 'review') => void; }> = ({ current, onChange }) => {
  const c = useThemeColors();
  const options: { key: 'alpha' | 'status' | 'review'; label: string }[] = [
    { key: 'alpha', label: 'A-Z' },
    { key: 'status', label: 'ステータス' },
    { key: 'review', label: '復習' }
  ];
  // FlatList の contentContainerStyle で paddingHorizontal:16 を与えているため
  // タブ側も同じ開始位置に合わせる
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8, paddingHorizontal: 16 }}>
      {options.map(opt => {
        const active = opt.key === current;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 16,
              marginRight: 8,
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
  );
};
