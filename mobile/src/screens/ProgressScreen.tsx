import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from '../components/Icons';
import { useThemeColors } from '../stores/theme';
import MiniChart from '../components/MiniChart';
import BlueskyProfile from '../components/BlueskyProfile';
import { commonStyles } from '../styles/commonStyles';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// Chart bar sizing constants are defined in MiniChart component

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

  // history for chart: configurable number of days (persisted)
  const [days, setDays] = React.useState<number>(7);
  // Ref to hold debounce timer id for persisting `days`
  // Use ReturnType<typeof setTimeout> to be compatible across environments (node/browser/react-native)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted choice on mount
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('progress_days');
        if (!mounted) return;
        if (raw) {
          const parsed = Number(raw);
          // Only accept whitelisted values to avoid restoring unexpected values
          const allowed = [7, 14, 30];
          if (!Number.isNaN(parsed) && allowed.includes(parsed)) setDays(parsed);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persist choice when changed
  // Persist choice when changed, but debounce writes to avoid redundant AsyncStorage calls
  React.useEffect(() => {
    // Clear any existing timer then start a new one
    if (saveTimerRef.current != null) {
      try { clearTimeout(saveTimerRef.current); } catch (e) { /* ignore */ }
      saveTimerRef.current = null;
    }
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem('progress_days', String(days)).catch(() => { /* ignore */ });
      saveTimerRef.current = null;
    }, 200);

    return () => {
      if (saveTimerRef.current != null) {
        try { clearTimeout(saveTimerRef.current); } catch (e) { /* ignore */ }
        saveTimerRef.current = null;
      }
    };
  }, [days]);

  const historyQ = useQuery({
    queryKey: ['learning-history', days],
    queryFn: async () => {
      const res: any = await api.get<any>(`/api/learning/history?days=${days}`);
      return res.data || res;
    },
    // Keep previous data visible while refetching when `days` changes
    keepPreviousData: true,
    // Consider data fresh for 5 minutes to avoid frequent background refetches
    staleTime: 300000
  } as any);

  // Reference for view shot capture
  const viewRef = React.useRef<any>(null);

  const onShareCapture = async () => {
    try {
      if (!viewRef.current) return;
      const uri = await viewRef.current.capture?.();
      if (!uri) return;
      // Try using expo-sharing to share the image file; fallback to Share API with uri
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Share.share({ url: uri });
      }
    } catch (e) {
      // ignore share errors
    }
  };

  if (isLoading) return <View style={[styles.center,{ backgroundColor: c.background }]}><ActivityIndicator /></View>;
  if (error) return <View style={[styles.center,{ backgroundColor: c.background }]}><Text style={{ color: c.text }}>エラー</Text></View>;

  const stats: any = data?.data || (data as any);

  const schedule = stats?.reviewSchedule || {};

  const items = [
    { k: '総語彙', v: stats?.totalWords ?? 0 },
  // Removed per request: unknown/learning/known are shown in the header status boxes
    { k: '総レビュー', v: stats?.totalReviews ?? 0 },
    { k: '平均正答率', v: ((stats?.averageAccuracy ?? 0) * 100).toFixed(1) + '%' },
    { k: 'レビュー対象', v: stats?.wordsForReview ?? 0 },
    { k: '平均Ease', v: typeof stats?.averageEaseFactor === 'number' ? (stats!.averageEaseFactor).toFixed(2) : '' },
    { k: '今日', v: schedule?.today ?? 0 },
    { k: '明日', v: schedule?.tomorrow ?? 0 },
    { k: '今週', v: schedule?.thisWeek ?? 0 },
    { k: '来週', v: schedule?.nextWeek ?? 0 }
  ];


  // Build header element once (stable within render) rather than passing an inline function
  const headerElement = (
  <ViewShot ref={viewRef} options={{ format: 'png', quality: 0.9 }} style={{ borderRadius: 12, overflow: 'hidden' }}>
  <View style={[commonStyles.card, { backgroundColor: c.surface, borderColor: c.border, marginBottom: 0 }]}>
        <TouchableOpacity style={styles.shareBtn} onPress={onShareCapture} accessibilityRole='button'>
          <Share2 color={c.accent} width={18} height={18} />
        </TouchableOpacity>
        <BlueskyProfile />
        <View style={commonStyles.statusRow}>
          <View style={[commonStyles.statusBox, { backgroundColor: c.badgeUnknown }]}>
            <Text style={[commonStyles.statusLabel, { color: '#fff' }]}>UNKNOWN</Text>
            <Text style={[commonStyles.statusNumber, { color: '#fff' }]}>{progressQ.data?.unknownWords ?? stats?.unknownWords ?? 0}</Text>
          </View>
          <View style={[commonStyles.statusBox, { backgroundColor: c.badgeLearning }]}>
            <Text style={[commonStyles.statusLabel, { color: '#fff' }]}>LEARNING</Text>
            <Text style={[commonStyles.statusNumber, { color: '#fff' }]}>{progressQ.data?.learningWords ?? stats?.learningWords ?? 0}</Text>
          </View>
          <View style={[commonStyles.statusBox, { backgroundColor: c.badgeKnown }]}>
            <Text style={[commonStyles.statusLabel, { color: '#fff' }]}>KNOWN</Text>
            <Text style={[commonStyles.statusNumber, { color: '#fff' }]}>{progressQ.data?.knownWords ?? stats?.knownWords ?? 0}</Text>
          </View>
        </View>

        <View style={[commonStyles.chartContainer, { backgroundColor: c.background }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[commonStyles.chartTitle, { color: c.text }]}>過去{days}日間の回答数</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[7,14,30].map(d => (
                <TouchableOpacity key={d} onPress={() => setDays(d)} accessibilityRole='button' style={[styles.periodBtn, days === d ? { borderColor: c.accent, backgroundColor: c.surface } : { borderColor: c.border, backgroundColor: 'transparent' }]}>
                  <Text style={{ color: days === d ? c.accent : c.secondaryText, fontWeight: days === d ? '700' : '500' }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {historyQ.isLoading && <ActivityIndicator />}
          {!historyQ.isLoading && Array.isArray(historyQ.data) && historyQ.data.length > 0 && (
            (() => {
              const arr = historyQ.data as any[];
              const sliced = arr.slice(-days);
              const values = sliced.map(d => Number(d.quizzesTaken ?? d.answers ?? 0));
              const rawDates = sliced.map(d => String(d.date || d.day || ''));
              return <MiniChart data={values} labels={rawDates} />;
            })()
          )}
          {!historyQ.isLoading && (!historyQ.data || (Array.isArray(historyQ.data) && historyQ.data.length === 0)) && (
            <Text style={{ color: c.secondaryText, paddingVertical: 8 }}>データなし</Text>
          )}
        </View>
      </View>
    </ViewShot>
  );

  return (
    <FlatList
      ListHeaderComponent={headerElement}
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
  shareBtn: { position: 'absolute', top: 16, right: 12, zIndex: 10 },
  periodBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  // header/status and chart styles moved to `commonStyles` to avoid duplication
});
