import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useAuth } from '../hooks/useAuth';
import { useUserPosts, useFollowingFeed, useDiscoverFeed } from '../hooks/usePosts';
import { useFeedStore } from '../stores/feed';
import { useQuiz } from '../hooks/useQuiz';
import { WordDetailModal } from '../components/WordDetailModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// メイン画面: 1) フィード 2) クイズ 3) 進捗
export const MainScreen: React.FC = () => {
  const { identifier } = useAuth();
  const userPosts = useUserPosts(identifier || undefined, 20);
  const following = useFollowingFeed(20);
  const discover = useDiscoverFeed(20);
  const feedTab = useFeedStore(s => s.feedTab);
  const setFeedTab = useFeedStore(s => s.setFeedTab);
  const loadingFeed = userPosts.isLoading || following.isLoading || discover.isLoading;
  const currentFeed = useMemo(() => {
    switch (feedTab) {
      case 'posts': return userPosts.data || [];
      case 'following': return following.data || [];
      case 'discover': return discover.data || [];
    }
  }, [feedTab, userPosts.data, following.data, discover.data]);
  const refetchCurrentFeed = () => {
    if (feedTab === 'posts') userPosts.refetch();
    else if (feedTab === 'following') following.refetch();
    else discover.refetch();
  };

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

  const c = useThemeColors();
  return (
    <>
    <SafeAreaView style={[styles.container,{ backgroundColor: c.background }]}> 
      <View style={styles.tabsWrapper}>
        {([
          { key: 'posts', label: 'Posts' },
          { key: 'following', label: 'Following' },
          { key: 'discover', label: 'Discover' }
        ] as const).map(t => {
          const active = feedTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? c.accent : c.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: active ? c.accent : c.border
                }
              ]}
              onPress={() => setFeedTab(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, { color: active ? '#fff' : c.text }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
  <ScrollView contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }} refreshControl={<RefreshControl refreshing={loadingFeed} onRefresh={refetchCurrentFeed} />}> 
        {loadingFeed && <ActivityIndicator style={{ marginVertical: 12 }} />}
        {!loadingFeed && currentFeed.map((item: any, i: number) => (
          <View key={feedTab + '-' + i} style={[styles.feedRow,{ borderColor: c.border }]}> 
            <Text style={[styles.handle,{ color: c.accent }]}>@{item.author?.handle}</Text>
            <SelectableText text={item.text} />
            <Text style={[styles.time,{ color: c.secondaryText }]}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        ))}

        {/* Quiz Section */}
        <Text style={[styles.sectionTitle,{ color: c.text }]}>Quiz</Text>
        {quiz.isLoading && !quiz.current && !quiz.completed && <ActivityIndicator />}
        {quiz.current && !quiz.completed && (
          <View style={[styles.quizBox,{ backgroundColor: c.background, borderColor: c.border }]}> 
            <Text style={styles.quizQ}>{quiz.current.question}</Text>
            {quiz.current.questionType === 'usage' && (
              <Text style={[styles.quizHint,{ color: c.secondaryText }]}>語の用法を選択してください</Text>
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
          <View style={[styles.quizBox,{ backgroundColor: c.background, borderColor: c.border }]}> 
            <Text style={styles.quizResult}>Finished! Accuracy {Math.round((quiz.accuracy || 0) * 100)}%</Text>
          </View>
        )}

        {/* Progress Section */}
        <Text style={[styles.sectionTitle,{ color: c.text }]}>Progress</Text>
        {statsQuery.isLoading && <ActivityIndicator />}
        {!statsQuery.isLoading && stats && (
          <View style={[styles.progressBox,{ backgroundColor: c.background, borderColor: c.border }]}> 
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
    </SafeAreaView>
  <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
  </>
  );
};

const ProgressRow: React.FC<{ label: string; value: any }> = ({ label, value }) => {
  const c = useThemeColors();
  return <View style={[styles.row,{ borderColor: c.border }]}><Text style={[styles.rowLabel,{ color: c.text }]}>{label}</Text><Text style={[styles.rowVal,{ color: c.text }]}>{value}</Text></View>;
};

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
  // Words / Quiz と同じ開始位置に揃える (SafeArea + paddingTop:48)
  container: { flex: 1, paddingHorizontal: 12, paddingTop: 48 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  feedRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  handle: { fontWeight: '600', marginBottom: 6 },
  postText: { fontSize: 15, lineHeight: 20 },
  tokensWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  token: { fontSize: 15, lineHeight: 20, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 4, borderRadius: 6, backgroundColor: '#eef2f7' },
  space: { fontSize: 15, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11, color: '#555' },
  feedDivider: { fontSize: 16, fontWeight: '600', marginTop: 8 }, // (legacy not used, keep for potential reuse)
  feedHeader: { fontSize: 18, fontWeight: '700', marginBottom: 4, marginTop: 4 }, // (obsolete, kept for potential reuse)
  quizBox: { padding: 16, borderWidth: 1, borderRadius: 12 },
  quizQ: { fontSize: 16, fontWeight: '600' },
  quizHint: { marginTop: 6, fontSize: 13, color: '#555' },
  choice: { backgroundColor: '#eef2f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, fontWeight: '600' },
  feedback: { marginTop: 12, fontWeight: '700' },
  meta: { position: 'absolute', top: 8, right: 12, fontSize: 12, fontWeight: '600' },
  quizResult: { fontSize: 18, fontWeight: '700' },
  progressBox: { borderRadius: 12, padding: 12, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontWeight: '600' },
  rowVal: { fontVariant: ['tabular-nums'] },
  // Tabs (復元)
  tabsWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 8, paddingHorizontal: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, marginRight: 10, marginBottom: 10 },
  tabText: { fontSize: 14, fontWeight: '600' }
});
