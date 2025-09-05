import React, { useCallback } from 'react';
import { View, FlatList, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useWords } from '../hooks/useWords';
import { WordCard } from '../components/WordCard';

export const WordsScreen: React.FC = () => {
  const { words, isLoading, addWord, updateStatus } = useWords();
  const [text, setText] = React.useState('');

  const submit = useCallback(() => {
    if (text.trim().length === 0) return;
    addWord(text.trim());
    setText('');
  }, [text, addWord]);

  const c = useThemeColors();
  return (
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <View style={[styles.inputRow,{ borderColor: c.border }]}> 
        <TextInput
          placeholder="Add word"
          style={[styles.input,{ backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
      </View>
      <FlatList
        data={words}
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
  container: { flex: 1, paddingHorizontal: 12, paddingBottom: 140, paddingTop: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
  input: { flex: 1, padding: 10, borderRadius: 8, fontSize: 15, borderWidth: 1 }
});
