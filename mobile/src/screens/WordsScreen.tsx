import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useWords } from '../hooks/useWords';
import { WordCard } from '../components/WordCard';
import { WordDetailModal } from '../components/WordDetailModal';

const MAX_WIDTH = 680;

export const WordsScreen: React.FC = () => {
  const { words, isLoading, addWord, updateStatus } = useWords();
  const [text, setText] = React.useState('');
  const [selectedWord, setSelectedWord] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<'added' | 'alpha' | 'status'>('added');

  const submit = useCallback(() => {
    if (text.trim().length === 0) return;
    addWord(text.trim());
    setText('');
  }, [text, addWord]);

  const sortedWords = useMemo(() => {
    if (sortKey === 'added') return words; // API順(追加順)
    if (sortKey === 'alpha') return [...words].sort((a,b)=>a.word.localeCompare(b.word));
    if (sortKey === 'status') return [...words].sort((a,b)=>a.status.localeCompare(b.status) || a.word.localeCompare(b.word));
    return words;
  }, [words, sortKey]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Add word"
            style={styles.input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
        </View>
        <View style={styles.sortRow}>
          <SortButton label="追加順" active={sortKey==='added'} onPress={()=>setSortKey('added')} />
          <SortButton label="ABC" active={sortKey==='alpha'} onPress={()=>setSortKey('alpha')} />
          <SortButton label="ステータス" active={sortKey==='status'} onPress={()=>setSortKey('status')} />
        </View>
        <FlatList
          data={sortedWords}
          refreshing={isLoading}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <WordCard word={item} onStatusChange={updateStatus} onPress={(w)=>setSelectedWord(w.word)} />
            </View>
          )}
        />
        <WordDetailModal word={selectedWord} onClose={()=>setSelectedWord(null)} />
      </View>
    </SafeAreaView>
  );
};

const SortButton: React.FC<{ label: string; active?: boolean; onPress: ()=>void }> = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[styles.sortBtn, active && styles.sortBtnActive]} accessibilityRole="button">
    <Text style={[styles.sortBtnText, active && styles.sortBtnTextActive]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 0, paddingBottom: 140 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16 },
  cardWrap: { width: '100%' },
  inputRow: { flexDirection: 'row', marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, fontSize: 16 },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eef2f5' },
  sortBtnActive: { backgroundColor: '#007aff' },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  sortBtnTextActive: { color: '#fff' }
});
