import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  question: string;
  questionType: string;
  word: string;
  disabled?: boolean;
  onAnswer: (answer: string) => void;
}

export const QuizCard: React.FC<Props> = ({ question, questionType, word, onAnswer, disabled }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.type}>{questionType.toUpperCase()}</Text>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.skip]} disabled={disabled} onPress={() => onAnswer('')}><Text style={styles.btnText}>SKIP</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.correct]} disabled={disabled} onPress={() => onAnswer(word)}><Text style={styles.btnText}>I KNOW</Text></TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2 },
  type: { fontSize: 12, fontWeight: '700', color: '#6366f1', marginBottom: 4 },
  question: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  skip: { backgroundColor: '#9ca3af' },
  correct: { backgroundColor: '#10b981' },
  btnText: { color: '#fff', fontWeight: '600' }
});
