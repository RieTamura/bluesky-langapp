import React, { useCallback } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, SafeAreaView } from 'react-native';
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Words</Text>
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
      <FlatList
        data={words}
        refreshing={isLoading}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <WordCard word={item} onStatusChange={updateStatus} />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: '700', marginVertical: 12 },
  inputRow: { flexDirection: 'row', marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 8, fontSize: 16 }
});
