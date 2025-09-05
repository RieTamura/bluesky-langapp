import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useUserPosts, useFollowingFeed } from '../hooks/usePosts';
import { useQuiz } from '../hooks/useQuiz';
import { WordDetailModal } from '../components/WordDetailModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// メイン画面: 1) フィード 2) クイズ 3) 進捗
export const MainScreen: React.FC = () => {
  const { identifier } = useAuth();
  const userPosts = useUserPosts(identifier || undefined, 20);
  const following = useFollowingFeed(20);
  const loadingFeed = userPosts.isLoading || following.isLoading;

  const quiz = useQuiz(5);
  useEffect(() => { quiz.start(); }, [quiz.start]);

  const statsQuery = useQuery({
    queryKey: ['advanced-stats-inline'],
    queryFn: () => api.get<any>('/api/learning/advanced-stats')
  });

  const stats: any = (statsQuery.data as any)?.data || statsQuery.data;
  const schedule = stats?.reviewSchedule || {};

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  // expose setter for inner token components (quick solution without context)
  (MainScreen as any)._setWord = (w: string) => setSelectedWord(w);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 140 }}>
      {/* Feed Section */}
      <Text style={styles.sectionTitle}>My Posts</Text>
      {loadingFeed && <ActivityIndicator style={{ marginVertical: 12 }} />}
      {!loadingFeed && (
        <View style={{ gap: 12 }}>
          {(userPosts.data || []).map((item: any, i: number) => (
            <View key={'up-' + i} style={styles.card}>
              <Text style={styles.handle}>@{item.author?.handle}</Text>
              <SelectableText text={item.text} />
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          ))}
          <Text style={styles.feedDivider}>Following Feed</Text>
          {(following.data || []).map((item: any, i: number) => (
            <View key={'fw-' + i} style={styles.card}>
              <Text style={styles.handle}>@{item.author?.handle}</Text>
              <SelectableText text={item.text} />
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quiz Section */}
      <Text style={styles.sectionTitle}>Quiz</Text>
      {quiz.isLoading && !quiz.current && !quiz.completed && <ActivityIndicator />}
      {quiz.current && !quiz.completed && (
        <View style={styles.quizBox}>
          <Text style={styles.quizQ}>{quiz.current.question}</Text>
          {quiz.current.questionType === 'usage' && (
            <Text style={styles.quizHint}>語の用法を選択してください</Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {(quiz.current.options || []).map((c: string) => (
              <Text key={c} onPress={() => quiz.answer(c)} style={styles.choice}>{c}</Text>
            ))}
          </View>
          {quiz.lastResult && (
            <Text style={styles.feedback}>{quiz.lastResult.correct ? '✔ Correct' : `✖ ${quiz.lastResult.correctAnswer}`}</Text>
          )}
          <Text style={styles.meta}>{quiz.answered}/{quiz.totalQuestions}</Text>
        </View>
      )}
      {quiz.completed && (
        <View style={styles.quizBox}> 
          <Text style={styles.quizResult}>Finished! Accuracy {Math.round((quiz.accuracy || 0) * 100)}%</Text>
        </View>
      )}

      {/* Progress Section */}
      <Text style={styles.sectionTitle}>Progress</Text>
      {statsQuery.isLoading && <ActivityIndicator />}
      {!statsQuery.isLoading && stats && (
        <View style={styles.progressBox}>
          <ProgressRow label="総語彙" value={stats.totalWords} />
          <ProgressRow label="未知" value={stats.unknownWords} />
            <ProgressRow label="学習中" value={stats.learningWords} />
            <ProgressRow label="既知" value={stats.knownWords} />
            <ProgressRow label="正答率" value={((stats.averageAccuracy || 0) * 100).toFixed(1) + '%'} />
            <ProgressRow label="レビュー対象" value={stats.wordsForReview} />
            <ProgressRow label="平均Ease" value={stats.averageEaseFactor?.toFixed(2)} />
            <ProgressRow label="今日" value={schedule.today} />
            <ProgressRow label="明日" value={schedule.tomorrow} />
            <ProgressRow label="今週" value={schedule.thisWeek} />
            <ProgressRow label="来週" value={schedule.nextWeek} />
        </View>
      )}
  </ScrollView>
  <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
  </>
  );
};

const ProgressRow: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowVal}>{value}</Text></View>
);

const SelectableText: React.FC<{ text: string }> = ({ text }) => {
  // Pass selectedWord setter through closure by attaching to each token via captured function from outer component (prop drilling alternative).
  // For simplicity we rely on a temporary global setter injection replaced just-in-time below.
  const setWord = (MainScreen as any)._setWord as (w: string)=>void;
  return (
    <View style={styles.tokensWrap}>
      {text.split(/(\s+)/).filter(t => t.length > 0).map((tok, i) => {
        if (tok.trim() === '') return <Text key={i} style={styles.space}>{tok}</Text>;
        return <Text key={i} onPress={() => setWord && setWord(tok)} style={styles.token}>{tok}</Text>;
      })}
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7', paddingHorizontal: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  handle: { fontWeight: '600', marginBottom: 6 },
  postText: { fontSize: 15, lineHeight: 20 },
  tokensWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  token: { fontSize: 15, lineHeight: 20, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 4, borderRadius: 6, backgroundColor: '#eef2f7' },
  space: { fontSize: 15, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11, color: '#555' },
  feedDivider: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  quizBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  quizQ: { fontSize: 16, fontWeight: '600' },
  quizHint: { marginTop: 6, fontSize: 13, color: '#555' },
  choice: { backgroundColor: '#eef2f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, fontWeight: '600' },
  feedback: { marginTop: 12, fontWeight: '700' },
  meta: { position: 'absolute', top: 8, right: 12, fontSize: 12, fontWeight: '600' },
  quizResult: { fontSize: 18, fontWeight: '700' },
  progressBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  rowLabel: { fontWeight: '600' },
  rowVal: { fontVariant: ['tabular-nums'] }
});
