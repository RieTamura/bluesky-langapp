import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface AdvancedStats {
  totalWords: number; unknownWords: number; learningWords: number; knownWords: number;
  totalReviews: number; averageAccuracy: number; wordsForReview: number; averageEaseFactor: number;
  reviewSchedule: { today: number; tomorrow: number; thisWeek: number; nextWeek: number };
}

export const ProgressScreen: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['advanced-stats'],
    queryFn: () => api.get<AdvancedStats>('/api/learning/advanced-stats')
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (error) return <View style={styles.center}><Text>エラー</Text></View>;

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
      contentContainerStyle={styles.container}
      data={items}
      keyExtractor={i => i.k}
      renderItem={({ item }) => (
        <View style={styles.row}><Text style={styles.key}>{item.k}</Text><Text style={styles.val}>{item.v}</Text></View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 140 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  key: { fontWeight: '600' },
  val: { fontVariant: ['tabular-nums'] }
});
