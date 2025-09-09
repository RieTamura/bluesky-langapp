import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface AdvancedStats {
  totalWords: number; unknownWords: number; learningWords: number; knownWords: number;
  totalReviews: number; averageAccuracy: number; wordsForReview: number; averageEaseFactor: number;
  reviewSchedule: { today: number; tomorrow: number; thisWeek: number; nextWeek: number };
}

export const ProgressScreen: React.FC = () => {
  const c = useThemeColors();
  const { data, isLoading, error } = useQuery({
    queryKey: ['advanced-stats'],
    queryFn: () => api.get<AdvancedStats>('/api/learning/advanced-stats')
  });

  // progress summary (unknown/learning/known)
  const progressQ = useQuery({ queryKey: ['learning-progress'], queryFn: async () => {
    const res: any = await api.get<any>('/api/learning/progress');
    return res.data || res;
  }});

  // history for chart (last 14 days)
  const historyQ = useQuery({ queryKey: ['learning-history'], queryFn: async () => {
    const res: any = await api.get<any>('/api/learning/history?days=14');
    return res.data || res;
  }});

  if (isLoading) return <View style={[styles.center,{ backgroundColor: c.background }]}><ActivityIndicator /></View>;
  if (error) return <View style={[styles.center,{ backgroundColor: c.background }]}><Text style={{ color: c.text }}>エラー</Text></View>;

  const stats: any = data?.data || (data as any);

  const schedule = stats?.reviewSchedule || {};

  const items = [
    { k: '総語彙', v: stats?.totalWords },
    { k: '未知', v: stats?.unknownWords },
    { k: '学習中', v: stats?.learningWords },
    { k: '既知', v: stats?.knownWords },
    { k: '総レビュー', v: stats?.totalReviews },
    { k: '平均正答率', v: ((stats?.averageAccuracy || 0) * 100).toFixed(1) + '%' },
    { k: 'レビュー対象', v: stats?.wordsForReview },
    { k: '平均Ease', v: stats?.averageEaseFactor?.toFixed(2) },
    { k: '今日', v: schedule.today },
    { k: '明日', v: schedule.tomorrow },
    { k: '今週', v: schedule.thisWeek },
    { k: '来週', v: schedule.nextWeek }
  ];

  return (
    <FlatList
      ListHeaderComponent={() => (
        <>
          <View style={[styles.statusRow, { paddingHorizontal: 16 }]}>
            <View style={[styles.statusBox, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.statusLabel, { color: c.secondaryText }]}>未知</Text>
              <Text style={[styles.statusNumber, { color: c.text }]}>{progressQ.data?.unknownWords ?? stats?.unknownWords ?? 0}</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.statusLabel, { color: c.secondaryText }]}>学習中</Text>
              <Text style={[styles.statusNumber, { color: c.text }]}>{progressQ.data?.learningWords ?? stats?.learningWords ?? 0}</Text>
            </View>
            <View style={[styles.statusBox, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.statusLabel, { color: c.secondaryText }]}>既知</Text>
              <Text style={[styles.statusNumber, { color: c.text }]}>{progressQ.data?.knownWords ?? stats?.knownWords ?? 0}</Text>
            </View>
          </View>

          <View style={[styles.chartContainer, { paddingHorizontal: 16, backgroundColor: c.background }]}> 
            <Text style={[styles.chartTitle, { color: c.text }]}>過去14日間の回答数</Text>
            {historyQ.isLoading && <ActivityIndicator />}
            {!historyQ.isLoading && Array.isArray(historyQ.data) && historyQ.data.length > 0 && (
              <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }} showsHorizontalScrollIndicator={false}>
                <View style={styles.chartRow}>
                  {(historyQ.data as any[]).map((d, i) => {
                    const val = Number(d.quizzesTaken ?? d.answers ?? 0);
                    return (
                      <View key={i} style={styles.chartCol}>
                        <View style={[styles.chartBar, { height: Math.min(120, 8 + val * 12), backgroundColor: c.accent }]} />
                        <Text style={[styles.chartLabel, { color: c.secondaryText }]}>{String(d.date).slice(5)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
            {!historyQ.isLoading && (!historyQ.data || (Array.isArray(historyQ.data) && historyQ.data.length === 0)) && (
              <Text style={{ color: c.secondaryText, paddingVertical: 8 }}>データなし</Text>
            )}
          </View>
        </>
      )}
      contentContainerStyle={[styles.container,{ backgroundColor: c.background }]}
      data={items}
      keyExtractor={i => i.k}
      renderItem={({ item }) => (
        <View style={[styles.row,{ borderColor: c.border }]}><Text style={[styles.key,{ color: c.text }]}>{item.k}</Text><Text style={[styles.val,{ color: c.text }]}>{item.v}</Text></View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 140, paddingTop: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  key: { fontWeight: '600' },
  val: { fontVariant: ['tabular-nums'] }
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
