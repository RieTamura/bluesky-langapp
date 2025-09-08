import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuiz } from '../hooks/useQuiz';
import { QuizCard } from '../components/QuizCard';
import { useThemeColors } from '../stores/theme';
import { Confetti } from '../components/Confetti';
import { TouchableOpacity } from 'react-native';
import { navigate } from '../navigation/rootNavigation';

export const QuizScreen: React.FC = () => {
  const { start, answer, current, completed, isLoading, accuracy, answered, totalQuestions, lastResult } = useQuiz(5);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<any>(null);

  useEffect(() => { start(); }, [start]);
  const c = useThemeColors();

  return (
  <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      {isLoading && !current && !completed && <ActivityIndicator />}
      {current && (
        <QuizCard
          question={current.question}
            questionType={current.questionType}
            word={current.word}
            onAnswer={answer}
            disabled={isLoading}
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
                } catch (_) {}
              });
            }}
          >🎉</Text>
          <Text style={styles.resultTitle}>Great Job!</Text>
          <Text style={styles.resultText}>Accuracy: {Math.round((accuracy || 0) * 100)}%</Text>
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
      {lastResult && !completed && (
        <Text style={styles.feedback}>{lastResult.correct ? '✔ Correct' : `✖ ${lastResult.correctAnswer}`}</Text>
      )}
      {!!totalQuestions && (
        <Text style={styles.meta}>{answered}/{totalQuestions}</Text>
      )}
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
  meta: { position: 'absolute', top: 12, right: 16, fontWeight: '600' }
});
