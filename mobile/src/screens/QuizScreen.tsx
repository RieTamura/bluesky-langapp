import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { useQuiz } from '../hooks/useQuiz';
import { QuizCard } from '../components/QuizCard';
import { useThemeColors } from '../stores/theme';
import { Confetti } from '../components/Confetti';
import { TouchableOpacity } from 'react-native';
import { navigate } from '../navigation/rootNavigation';

export const QuizScreen: React.FC = () => {
  const { start, answer, current, completed, isLoading, accuracy, answered, totalQuestions, lastResult } = useQuiz(5);
  const [lastAck, setLastAck] = useState(true);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<any>(null);

  useEffect(() => { start(); }, [start]);
  const c = useThemeColors();


  // keep a reference to the last shown question so we can display the answer
  const lastShownQuestionRef = useRef(current);
  useEffect(() => {
    if (current) lastShownQuestionRef.current = current;
  }, [current]);

  // If quiz is completed, don't show the QuizCard even if we have a last question—show completed screen only
  let questionToShow;
  if (completed) {
    questionToShow = undefined;
  } else if (!lastAck && lastResult) {
    // last result hasn't been acknowledged by the user; continue showing the last shown question
    questionToShow = lastShownQuestionRef.current;
  } else if (current) {
    // there's a current question from the quiz state
    questionToShow = current;
  } else if (lastResult) {
    // fallback: show last shown question when there's no current but we have a lastResult
    questionToShow = lastShownQuestionRef.current;
  } else {
    questionToShow = undefined;
  }

  return (
  <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
  {/* Quiz content only (progress moved to Progress screen) */}

      {isLoading && !current && !completed && <ActivityIndicator />}
  {questionToShow && !completed && (
        <QuizCard
          question={questionToShow.question}
          questionType={questionToShow.questionType}
          word={questionToShow.word}
          onAnswer={(text: string) => { setLastAck(false); answer(text); }}
          onNext={() => { setLastAck(true); }}
          disabled={isLoading}
          lastResult={lastResult}
          answered={typeof answered === 'number' ? answered + 1 : answered}
          totalQuestions={totalQuestions}
        />
      )}
      {completed && (
        <View style={styles.result}>
          <Confetti
            run={true}
            originX={origin?.x}
            originY={origin?.y}
            bursts={[
              { particleCount: 60, angle: 90, spread: 95, velocity: 34, gravity: 0.45, scalar: 1, colors: ['#fbbf24','#fde68a','#f59e0b','#fef9c3'] }
            ]}
          />
          <Text
            ref={iconRef}
            style={styles.celebration}
            accessibilityRole="image"
            accessibilityLabel="celebration"
            onLayout={() => {
              // defer measurement until after layout pass to get stable coordinates
              requestAnimationFrame(() => {
                if (!iconRef.current) return;
                try {
                  iconRef.current.measure((fx: number, fy: number, w: number, h: number, px: number, py: number) => {
                    setOrigin({ x: px + w / 2, y: py + h / 2 });
                  });
                } catch (e) { /* ignore */ }
              });
            }}
          >🎉</Text>
          <Text style={[styles.resultTitle, { color: c.text }]}>Great Job!</Text>
          <Text style={[styles.resultText, { color: c.text }]}>Accuracy: {Math.round((accuracy || 0) * 100)}%</Text>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={[styles.actionBtn,{ backgroundColor: c.accent }]} onPress={() => start()} accessibilityRole="button" accessibilityLabel="もう一度プレイ">
              <Text style={styles.actionBtnText}>もう一度プレイ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn,{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]} onPress={() => navigate('Words')} accessibilityRole="button" accessibilityLabel="単語帳へ">
              <Text style={[styles.actionBtnText,{ color: c.text }]}>単語帳へ</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
  {/* lastResult is now handled inside QuizCard; remove duplicate bottom feedback text */}
  {/* progress badge moved into QuizCard */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // paddingHorizontalをMainScreen (12) に合わせて統一
  // WordsScreen と統一したヘッダー下余白 (増加)
  container: { flex: 1, paddingHorizontal: 12, paddingBottom: 140, paddingTop: 48 },
  result: { marginTop: 24, alignItems: 'center' },
  resultText: { fontSize: 18, fontWeight: '600' },
  resultTitle: { fontSize: 22, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  celebration: { fontSize: 64, marginBottom: 4 },
  resultButtons: { marginTop: 16, width: '100%', paddingHorizontal: 24 },
  actionBtn: { paddingVertical: 14, borderRadius: 10, marginBottom: 12, alignItems: 'center' },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  feedback: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  meta: { position: 'absolute', top: 22, right: 28, fontWeight: '600' }
  ,
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  statusBox: { flex: 1, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusNumber: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  chartContainer: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 140, paddingHorizontal: 4 },
  chartCol: { width: 32, alignItems: 'center', marginHorizontal: 6 },
  chartBar: { width: 20, borderRadius: 6 },
  chartLabel: { fontSize: 10, marginTop: 6 }
});
