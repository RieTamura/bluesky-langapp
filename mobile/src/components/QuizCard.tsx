import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../stores/theme';

interface Props {
  question: string;
  questionType: string;
  word: string;
  disabled?: boolean;
  onAnswer: (answer: string) => void;
}

export const QuizCard: React.FC<Props> = ({ question, questionType, word, onAnswer, disabled }) => {
  const c = useThemeColors();
  return (
    <View style={[styles.container,{ backgroundColor: c.background, borderColor: c.border }]}> 
      <Text style={[styles.type,{ color: c.accent }]}>{questionType.toUpperCase()}</Text>
      <Text style={[styles.question,{ color: c.text }]}>{question}</Text>
      <View style={styles.actions}>
  <TouchableOpacity style={[styles.btn, { backgroundColor: c.badgeUnknown }]} disabled={disabled} onPress={() => onAnswer('')}><Text style={styles.btnText}>SKIP</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: c.badgeKnown }]} disabled={disabled} onPress={() => onAnswer(word)}><Text style={styles.btnText}>I KNOW</Text></TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12, borderWidth: 1 },
  type: { fontSize: 12, fontWeight: '700', color: '#6366f1', marginBottom: 4 },
  question: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnText: { color: '#fff', fontWeight: '600' }
});
