import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useThemeColors } from '../stores/theme';

interface Props {
  question: string;
  questionType: string; // 'meaning' | 'usage'
  word: string; // 正解単語（usage用）
  disabled?: boolean;
  onAnswer: (answer: string) => void;
}

export const QuizCard: React.FC<Props> = ({ question, questionType, word, onAnswer, disabled }) => {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // 質問が変わったら入力リセット
  useEffect(() => {
    setText('');
    setSubmitted(false);
  }, [question]);

  const handleSubmit = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    onAnswer(text.trim());
  };

  const handleIKnow = () => {
    if (disabled || submitted) return;
    setSubmitted(true);
    // usage の場合のみ単語そのものが正解
    onAnswer(word);
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: c.background,
        borderColor: c.border,
        shadowColor: c.text,
        // iOS/Android両対応の影
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      },
    ]}>
      <View style={styles.inner}>
        <Text style={[styles.type, { color: c.accent }]}>{questionType.toUpperCase()}</Text>
        <Text style={[styles.question, { color: c.text }]}>{question}</Text>
        <TextInput
          style={[styles.input, { borderColor: c.border, backgroundColor: c.surface, color: c.text }]}
          value={text}
          onChangeText={setText}
          editable={!disabled && !submitted}
          placeholder={questionType === 'meaning' ? '意味を入力' : '単語を入力'}
          placeholderTextColor={c.text + '80'}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
        />
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.badgeUnknown, opacity: (disabled || submitted) ? 0.6 : 1 }]}
            disabled={disabled || submitted}
            onPress={() => { setSubmitted(true); onAnswer(''); }}
            accessibilityLabel="Skip question"
          >
            <Text style={styles.btnText}>SKIP</Text>
          </TouchableOpacity>
          {questionType === 'usage' && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: c.badgeKnown, opacity: (disabled || submitted) ? 0.6 : 1 }]}
              disabled={disabled || submitted}
              onPress={handleIKnow}
              accessibilityLabel="I know this word"
            >
              <Text style={styles.btnText}>I KNOW</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.accent, opacity: (disabled || submitted || text.trim() === '') ? 0.6 : 1 }]}
            disabled={disabled || submitted || text.trim() === ''}
            onPress={handleSubmit}
            accessibilityLabel="Submit answer"
          >
            <Text style={styles.btnText}>送信</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 400,
    minHeight: 340,
    alignSelf: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
    marginVertical: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    // 影はView側で付与
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 18,
  },
  type: { fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 1.2 },
  question: { fontSize: 20, fontWeight: '600', marginBottom: 24, textAlign: 'center', lineHeight: 28 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 17, marginBottom: 18, width: '100%', textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
