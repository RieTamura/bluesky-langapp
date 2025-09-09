import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useThemeColors } from '../stores/theme';
import { commonStyles } from '../styles/commonStyles';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// Chart bar sizing constants (centralized for easy tuning)
const MAX_BAR_HEIGHT = 120; // maximum height in pixels for a bar
const BASE_BAR_HEIGHT = 8; // base/minimum height in pixels for a bar
const BAR_HEIGHT_MULTIPLIER = 12; // multiplier applied to value to compute bar height

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
  // Removed per request: unknown/learning/known are shown in the header status boxes
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
          <View style={commonStyles.statusRow}>
            <View style={[commonStyles.statusBox, { backgroundColor: c.badgeUnknown, borderColor: c.badgeUnknown }]}>
              <Text style={[commonStyles.statusLabel, { color: '#fff' }]}>UNKNOWN</Text>
              <Text style={[commonStyles.statusNumber, { color: '#fff' }]}>{progressQ.data?.unknownWords ?? stats?.unknownWords ?? 0}</Text>
            </View>
            <View style={[commonStyles.statusBox, { backgroundColor: c.badgeLearning, borderColor: c.badgeLearning }]}>
              <Text style={[commonStyles.statusLabel, { color: '#fff' }]}>LEARNING</Text>
              <Text style={[commonStyles.statusNumber, { color: '#fff' }]}>{progressQ.data?.learningWords ?? stats?.learningWords ?? 0}</Text>
            </View>
            <View style={[commonStyles.statusBox, { backgroundColor: c.badgeKnown, borderColor: c.badgeKnown }]}>
              <Text style={[commonStyles.statusLabel, { color: '#fff' }]}>KNOWN</Text>
              <Text style={[commonStyles.statusNumber, { color: '#fff' }]}>{progressQ.data?.knownWords ?? stats?.knownWords ?? 0}</Text>
            </View>
          </View>

          <View style={[commonStyles.chartContainer, { backgroundColor: c.background, borderColor: c.border }]}> 
            <Text style={[commonStyles.chartTitle, { color: c.text }]}>過去14日間の回答数</Text>
            {historyQ.isLoading && <ActivityIndicator />}
            {!historyQ.isLoading && Array.isArray(historyQ.data) && historyQ.data.length > 0 && (
              <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }} showsHorizontalScrollIndicator={false}>
                <View style={commonStyles.chartRow}>
                  {(historyQ.data as any[]).map((d, i) => {
                    const val = Number(d.quizzesTaken ?? d.answers ?? 0);
                    return (
                      <View key={i} style={commonStyles.chartCol}>
                        <View style={[commonStyles.chartBar, { height: Math.min(MAX_BAR_HEIGHT, BASE_BAR_HEIGHT + val * BAR_HEIGHT_MULTIPLIER), backgroundColor: c.accent }]} />
                        <Text style={[commonStyles.chartLabel, { color: c.secondaryText }]}>{String(d.date).slice(5)}</Text>
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
  // header/status and chart styles moved to `commonStyles` to avoid duplication
});
