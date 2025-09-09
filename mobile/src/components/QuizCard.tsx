import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { useThemeColors } from '../stores/theme';

interface Props {
  question: string;
  questionType: string; // 'meaning' | 'usage'
  word: string; // 正解単語（usage用）
  disabled?: boolean;
  onAnswer: (answer: string) => void;
  lastResult?: { correct: boolean; correctAnswer: string } | null;
  onNext?: () => void;
  answered?: number;
  totalQuestions?: number;
}

export const QuizCard: React.FC<Props> = ({ question, questionType, word, onAnswer, disabled, lastResult, onNext, answered, totalQuestions }) => {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  // flip animation value (0 = front, 180 = back)
  const flipAnim = useRef(new Animated.Value(0)).current;
  // opacity fallback to reliably show/hide faces across platforms
  const opacityAnim = useRef(new Animated.Value(submitted ? 1 : 0)).current;

  // 質問が変わったら入力リセット
  useEffect(() => {
    setText('');
    setSubmitted(false);
  // reset flip to front when question changes
  Animated.timing(flipAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
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
    // flip then call onAnswer to show the answer locally; parent will progress the quiz
    onAnswer(word);
  };

  // animate when submitted changes
  useEffect(() => {
    if (submitted) {
  Animated.timing(flipAnim, { toValue: 180, duration: 400, useNativeDriver: true }).start();
  Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
  Animated.timing(flipAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [submitted, flipAnim]);

  // when lastResult is provided by parent (server responded), show the back
  useEffect(() => {
    if (lastResult) setSubmitted(true);
  }, [lastResult]);

  useEffect(() => {
    try { console.log('QuizCard lastResult', lastResult); } catch (_) {}
  }, [lastResult]);

  // debug: log displayed answer and animation state
  const displayedAnswer = lastResult?.correctAnswer ?? word;
  useEffect(() => {
    try {
      const op = (opacityAnim as any).__getValue ? (opacityAnim as any).__getValue() : undefined;
      console.log('QuizCard debug', { displayedAnswer, submitted, opacity: op });
    } catch (_) {}
  }, [displayedAnswer, submitted]);

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = opacityAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const backOpacity = opacityAnim;

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
    {/* progress badge inside card (top-right) */}
    {typeof answered === 'number' && typeof totalQuestions === 'number' && (
      <Text style={styles.progressBadge}>{answered}/{totalQuestions}</Text>
    )}
  <View style={[styles.inner, styles.perspective]}> 
        {/* front side */}
  <Animated.View pointerEvents={submitted ? 'none' : 'auto'} style={[styles.cardFace, { transform: [{ rotateY: frontInterpolate }], zIndex: submitted ? 0 : 2, elevation: submitted ? 0 : 2, opacity: frontOpacity }]}> 
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
        </Animated.View>

        {/* back side: show correct answer and user's input */}
  <Animated.View pointerEvents={submitted ? 'auto' : 'none'} style={[styles.cardBack, { transform: [{ rotateY: backInterpolate }], backgroundColor: c.surface, zIndex: submitted ? 2 : 0, elevation: submitted ? 2 : 0, opacity: backOpacity }]}> 
          <View style={styles.backContent}>
            {typeof lastResult?.correct === 'boolean' && (
              <Text
                style={[styles.resultIcon, { color: lastResult!.correct ? c.badgeKnown : c.badgeUnknown }]}
                accessibilityRole="image"
                accessibilityLabel={lastResult!.correct ? '正解' : '不正解'}
              >
                {lastResult!.correct ? '✅' : '❌'}
              </Text>
            )}
            <Text style={[styles.type, { color: c.accent }]}>回答</Text>
            {
              /* Prefer server-provided correct answer (for meaning questions). Fallback to word for usage questions. */
            }
            <Text style={[styles.answer, { color: c.text }]}>{lastResult?.correctAnswer ?? word}</Text>
            {text !== '' && <Text style={[styles.yourAnswer, { color: c.secondaryText }]}>Your answer: {text}</Text>}
              <View style={{ width: '100%', marginTop: 20, alignItems: 'center' }}>
                <TouchableOpacity style={[styles.nextBtn, { backgroundColor: c.accent }]} onPress={() => { try { console.log('Next pressed, onNext exists:', !!onNext); } catch (_) {} if (onNext) onNext(); }} accessibilityLabel="次の問題">
                  <Text style={styles.nextBtnText}>次の問題</Text>
                </TouchableOpacity>
              </View>
          </View>
        </Animated.View>
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
  overflow: 'hidden',
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
  question: { fontSize: 20, fontWeight: '600', marginBottom: 24, textAlign: 'center', lineHeight: 28, width: '92%', alignSelf: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 17, marginBottom: 18, width: '92%', textAlign: 'center', alignSelf: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  // faces for flip animation
  cardFace: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' as any },
  cardBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' as any },
  answer: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  yourAnswer: { marginTop: 12, fontSize: 14 },
  // ensure back content is inset from rounded corners
  backContent: { paddingHorizontal: 18, paddingVertical: 24, width: '100%', alignItems: 'center' },
  perspective: { transform: [{ perspective: 1000 }] },
  nextBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, width: '100%' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  progressBadge: { position: 'absolute', top: 12, right: 18, backgroundColor: 'transparent', fontWeight: '700' },
  resultIcon: { fontSize: 32, marginBottom: 6 },
});
