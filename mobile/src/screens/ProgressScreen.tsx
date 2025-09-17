import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from '../components/Icons';
import { useThemeColors } from '../stores/theme';
import MiniChart from '../components/MiniChart';
import LearningCalendarMonth from '../components/LearningCalendarMonth';
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
  const [weekStart, setWeekStart] = React.useState<'sunday'|'monday'>('sunday');
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

  // Load calendar week start preference
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('calendar_week_start');
        if (!mounted) return;
        if (raw === 'monday') setWeekStart('monday');
        else setWeekStart('sunday');
      } catch (e) { }
    })();
    return () => { mounted = false; };
  }, []);

  // Also reload the preference when the screen is focused so changes in Settings reflect immediately
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('calendar_week_start');
          if (!active) return;
          if (raw === 'monday') setWeekStart('monday'); else setWeekStart('sunday');
        } catch (e) { }
      })();
      // Listen for explicit events from Settings so changes reflect while screen is mounted
      const sub = DeviceEventEmitter.addListener('calendar_week_start_changed', (v: any) => {
        try {
          if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('ProgressScreen received calendar_week_start_changed', v);
          if (v === 'monday') setWeekStart('monday'); else setWeekStart('sunday');
        } catch (e) { /* ignore */ }
      });
      return () => { active = false; try { sub.remove(); } catch (e) { /* ignore */ } };
    }, [])
  );

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

  // The detailed list below the chart has been removed per request.


  // LearningCalendarMonth moved to components/LearningCalendarMonth.tsx

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
          {/* カレンダー表示はリスト部分に移動しました */}
        </View>
      </View>
    </ViewShot>
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: c.background }]}> 
      {headerElement}
      <View style={{ marginTop: 16 }}>
  <LearningCalendarMonth data={Array.isArray(historyQ.data) ? historyQ.data : []} weekStart={weekStart} colors={{ background: c.background, text: c.text, secondaryText: c.secondaryText, accent: c.accent, border: c.border }} />
      </View>
    </ScrollView>
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
