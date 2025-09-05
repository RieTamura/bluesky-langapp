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
        contentContainerStyle={{ paddingVertical: 4 }}
        renderItem={({ item }) => (
          <WordCard word={item} onStatusChange={updateStatus} />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 140, paddingTop: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 8 },
  input: { flex: 1, padding: 10, borderRadius: 8, fontSize: 15, borderWidth: 1 }
});
