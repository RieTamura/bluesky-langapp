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
          console.log('ProgressScreen received calendar_week_start_changed', v);
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


  // Build header element once (stable within render) rather than passing an inline function
  // iOS-style month calendar component inside a bordered card
  const LearningCalendarMonth: React.FC<{ data?: any[]; colors: { background: string; text: string; secondaryText: string; accent: string; border?: string }, weekStart?: 'sunday'|'monday' }> = ({ data = [], colors, weekStart = 'sunday' }) => {
    const map: Record<string, number> = {};
    (data || []).forEach(d => {
      const key = String(d.date || d.day || '').slice(0, 10);
      if (key) map[key] = (map[key] || 0) + (Number(d.quizzesTaken ?? d.answers ?? 0) || 0);
    });

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
  // First day of current month
  const first = new Date(year, month, 1);
  // Last day of current month
  const last = new Date(year, month + 1, 0);

  // Days to render: include leading empty days to align weekday
  const daysInMonth = last.getDate();
  // Compute leading based on weekStart
  const rawLeading = first.getDay(); // 0=Sun .. 6=Sat
  const leading = weekStart === 'sunday' ? rawLeading : (rawLeading === 0 ? 6 : rawLeading - 1);

  // We'll compute max within the month
  let max = 0;
    const dayEntries: Array<{ day: number; key: string; count: number }> = [];
    const localKey = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    for (let d = 1; d <= daysInMonth; d++) {
      const key = localKey(new Date(year, month, d));
      const cnt = map[key] || 0;
      dayEntries.push({ day: d, key, count: cnt });
      if (cnt > max) max = cnt;
    }

    // Reuse the same color calculation used by MiniChart to ensure visual consistency.
    // We'll recreate the relevant color helpers here (parse/mix/darken) so this file
    // doesn't need to import MiniChart internals.
    const parseColorToRgb = (c: string): { r: number; g: number; b: number } => {
      if (!c) return { r: 0, g: 0, b: 0 };
      const s = c.trim();
      if (s[0] === '#') {
        const hex = s.slice(1);
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16);
          const g = parseInt(hex[1] + hex[1], 16);
          const b = parseInt(hex[2] + hex[2], 16);
          return { r, g, b };
        }
        if (hex.length === 6) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return { r, g, b };
        }
        if (hex.length === 8) {
          try {
            const r = parseInt(hex.slice(2, 4), 16);
            const g = parseInt(hex.slice(4, 6), 16);
            const b = parseInt(hex.slice(6, 8), 16);
            return { r, g, b };
          } catch (e) { return { r: 0, g: 0, b: 0 }; }
        }
      }
      const rgbMatch = s.match(/rgba?\(([^)]+)\)/i);
      if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map(p => p.trim());
        const r = Number(parts[0]) || 0;
        const g = Number(parts[1]) || 0;
        const b = Number(parts[2]) || 0;
        return { r, g, b };
      }
      return { r: 0, g: 0, b: 0 };
    };

    const darkenColor = (bgColor: string, fraction: number): string => {
      const { r, g, b } = parseColorToRgb(bgColor);
      const f = Math.max(0, Math.min(1, fraction));
      const eased = Math.pow(f, 0.6);
      const maxReduce = 0.3;
      const reduce = (v: number) => Math.round(v * (1 - maxReduce * eased));
      const nr = reduce(r), ng = reduce(g), nb = reduce(b);
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
    };

    const mixColors = (a: string, b: string, t: number): string => {
      const { r: ra, g: ga, b: ba } = parseColorToRgb(a);
      const { r: rb, g: gb, b: bb } = parseColorToRgb(b);
      const clamped = Math.max(0, Math.min(1, t));
      const r = Math.round(ra + (rb - ra) * clamped);
      const g = Math.round(ga + (gb - ga) * clamped);
      const b2 = Math.round(ba + (bb - ba) * clamped);
      const toHex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b2)}`;
    };

    // Build light/dark accent variants based on theme accent color
    const darkestAccent = darkenColor(colors.accent, 1);
    const lightAccent = mixColors('#ffffff', colors.accent, 0.18);

    const colorFor = (cnt: number) => {
      if (cnt <= 0) return '#ebedf0';
      if (max <= 1) return '#40c463';
      const p = cnt / max;
      const tRaw = Math.max(0, Math.min(1, p));
      const tEased = Math.pow(tRaw, 0.8);
      return mixColors(lightAccent, darkestAccent, tEased);
    };

    // Weekday labels (short Japanese forms). Rotate labels when weekStart === 'monday'
    const baseWeekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayLabels = weekStart === 'sunday'
      ? baseWeekdayLabels
      : // monday-start: shift so index 0 is Monday
        ['月', '火', '水', '木', '金', '土', '日'];

  // layout constants for alignment (match chart column sizing: chartCol width=32, marginHorizontal=6)
  const cellWidth = 32;
  const cellMargin = 6; // margin applied on each side via style { margin: cellMargin }
    const cellTotal = cellWidth + cellMargin * 2; // total horizontal space per cell
    const gridWidth = cellTotal * 7;

    return (
      <View style={[commonStyles.card, { padding: 12, borderRadius: 12, borderColor: colors.border ?? colors.secondaryText, borderWidth: 1 }]}> 
        {/* Header and weekday row are placed inside a fixed-width container equal to grid width
            and then centered in the card; within that container the content is left-aligned so
            the left edge lines up with the Sunday column of the grid. */}
        <View style={{ width: gridWidth, alignSelf: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{year}年{month + 1}月</Text>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {weekdayLabels.map((w, i) => (
              <View key={i} style={{ width: cellWidth, margin: cellMargin, alignItems: 'center' }}>
                <Text style={{ color: colors.secondaryText, fontSize: 12 }}>{w}</Text>
              </View>
            ))}
          </View>
        </View>

  {/* Grid of days rendered per-week to guarantee alignment with weekday headers (week starts Sunday) */}
  <View style={{ alignItems: 'center' }}>
          {(() => {
            const totalSlots = leading + daysInMonth;
            const weeksCount = Math.ceil(totalSlots / 7);
            const weeks: Array<Array<{ day?: number; key?: string; count?: number } | null>> = Array.from({ length: weeksCount }, () => Array(7).fill(null));
            // Fill days into weeks
            let slot = leading; // index of first day
            for (let d = 0; d < dayEntries.length; d++, slot++) {
              const wi = Math.floor(slot / 7);
              const di = slot % 7;
              weeks[wi][di] = { day: dayEntries[d].day, key: dayEntries[d].key, count: dayEntries[d].count };
            }

            return weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'row', marginBottom: 4, justifyContent: 'center' }}>
                {week.map((cell, ci) => (
                  <View key={ci} style={{ width: cellWidth, height: 36, margin: cellMargin, alignItems: 'center', justifyContent: 'flex-start' }}>
                    {cell ? (
                      <>
                        <Text style={{ color: colors.text, fontSize: 12 }}>{cell.day}</Text>
                        <View style={{ marginTop: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colorFor(cell.count || 0) }} />
                      </>
                    ) : (
                      <></>
                    )}
                  </View>
                ))}
              </View>
            ));
          })()}
        </View>
      </View>
    );
  };

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
