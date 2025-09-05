import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useQuiz } from '../hooks/useQuiz';
import { QuizCard } from '../components/QuizCard';

const MAX_WIDTH = 680;

export const QuizScreen: React.FC = () => {
  const { start, answer, current, completed, isLoading, accuracy, answered, totalQuestions, lastResult } = useQuiz(5);

  useEffect(() => { start(); }, [start]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {isLoading && !current && !completed && <ActivityIndicator />}
        {current && (
          <View style={styles.cardWrap}>
            <QuizCard
              question={current.question}
              questionType={current.questionType}
              word={current.word}
              onAnswer={answer}
              disabled={isLoading}
            />
          </View>
        )}
        {completed && (
          <View style={styles.result}>
            <Text style={styles.resultText}>Finished!</Text>
            <Text style={styles.resultText}>Accuracy: {Math.round((accuracy || 0) * 100)}%</Text>
          </View>
        )}
        {lastResult && !completed && (
          <Text style={styles.feedback}>{lastResult.correct ? '✔ Correct' : `✖ ${lastResult.correctAnswer}`}</Text>
        )}
        {!!totalQuestions && (
          <Text style={styles.meta}>{answered}/{totalQuestions}</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16, paddingBottom: 140 },
  inner: { flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16 },
  cardWrap: { width: '100%' },
  result: { marginTop: 24, alignItems: 'center' },
  resultText: { fontSize: 18, fontWeight: '600' },
  feedback: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  meta: { position: 'absolute', top: 12, right: 16, fontWeight: '600' }
});
