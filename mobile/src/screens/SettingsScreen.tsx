import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/rootNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTTSStore } from '../stores/tts';
import { useAuth } from '../hooks/useAuth';
import { useTheme, ThemeColors } from '../stores/theme';
// AI features removed: imports for aiMode and apiKeys have been removed.


// progress fetching removed — progress UI was removed from settings

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Settings'>>();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const hydrate = useTTSStore(s => s.hydrate);
  const { resolved, colors } = useTheme();
  React.useEffect(()=> { hydrate(); }, [hydrate]);

  // Slider: iOS/Android ネイティブ側で 0.1 / 0.05 などの浮動小数ステップが精度警告を出すケースがあるため
  // 内部的に 100 倍した整数スケール (rate 10-200, pitch 50-200) に変換して扱う。
  // 防御: NaN / 非有限 / 範囲外値をここで補正 (UI 表示用)。ストア側でもクランプ済みだが二重防御。
  // TTS store hydrate only (detailed controls moved to dedicated screen)

  // progress data removed

  // Open profile in Bluesky app if possible, otherwise fall back to web

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 30 }}
    >
      <Text style={[styles.title, { color: colors.text }]}>設定</Text>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>テーマ (システム固定)</Text>
        <Text style={[styles.help, { color: colors.secondaryText }]}>現在適用: {resolved}. 端末の外観設定を変更すると自動で切替わります。</Text>
      </View>

      {/* Bluesky profile moved to a reusable component and shown on Progress screen */}
      {/* Progress section removed from settings */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="読み上げ設定を開く"
          onPress={() => navigation.navigate('TTSSettings')}
          style={{ paddingVertical: 12 }}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>読み上げ (TTS)</Text>
          <Text style={[styles.help, { color: colors.secondaryText }]}>タップして読み上げの詳細設定を開きます</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar settings */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>カレンダー</Text>
        <Text style={[styles.help, { color: colors.secondaryText }]}>カレンダーの週開始を選択します。</Text>
        {/* spacer removed; calendar week setting handled by CalendarWeekSetting component below */}
        <CalendarWeekSetting colors={colors} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.logout, { color: colors.error || '#e53935' }]} onPress={logout}>ログアウト</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Text style={[styles.licenseTitle, { color: colors.text }]}>ライセンス / 使用ライブラリ</Text>
        <Text style={[styles.licenseItem, { color: colors.secondaryText }]}>アイコン: Lucide Icons (ISC)</Text>
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel='ライセンス全文を表示'
          onPress={() => navigation.navigate('License')}
          style={[styles.licenseBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.licenseBtnText}>ライセンスを表示</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// MiniChart component moved to components/MiniChart.tsx

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  section: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  handle: { fontWeight: '600', fontSize: 14 },
  display: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  // profile description should be center aligned within the profile card
  // (e.g. "Early Adopter and Streamer..." block)
  desc: { marginTop: 8, lineHeight: 18, textAlign: 'center' },
  muted: { fontSize: 12 },
  // color は動的にテーマ (colors.error) から適用し fallback (#e53935)
  logout: { fontWeight: '700', textAlign: 'center' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 8 },
  chartBar: { flex: 1, borderRadius: 3 },
  row: { flexDirection: 'row', gap: 8 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  modeBtnText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  help: { marginTop: 8, fontSize: 12 },
  pauseBox: { width: 90 },
  pauseLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  pauseInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, fontSize: 13, textAlign: 'center' },
  licenseTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  licenseItem: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  licenseBody: { fontSize: 10, lineHeight: 14 },
  licenseBtn: { marginTop: 8, paddingVertical:8, paddingHorizontal:12, borderRadius:6, alignSelf:'flex-start' },
  licenseBtnText: { color:'#fff', fontWeight:'700', fontSize:12 }
  ,profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }
  ,avatar: { width: 72, height: 72, borderRadius: 36 }
  ,avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }
  ,avatarInitials: { fontSize: 20, fontWeight: '700' }
  ,profileInfo: { flex: 1, alignItems: 'center' }
  ,avatarColumn: { alignItems: 'center', marginRight: 12 }
  ,profileColumn: { flexDirection: 'column', alignItems: 'center', gap: 6 }
  ,avatarSpacing: { marginBottom: 4 }
  
});

// Calendar week start setting component
const CALENDAR_KEY = 'calendar_week_start';
const CalendarWeekSetting: React.FC<{ colors: ThemeColors }> = ({ colors }) => {
  const [val, setVal] = React.useState<'sunday'|'monday'>('sunday');
  React.useEffect(() => {
    let mounted = true;
    (async ()=>{
      try {
        const raw = await AsyncStorage.getItem(CALENDAR_KEY);
        if (!mounted) return;
        if (raw === 'monday') setVal('monday');
        else setVal('sunday');
      } catch (e: any) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.error('[Settings] failed to read calendar_week_start', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setAndPersist = async (v: 'sunday'|'monday') => {
    setVal(v);
    try { await AsyncStorage.setItem(CALENDAR_KEY, v); } catch (e: any) { if (typeof __DEV__ !== 'undefined' && __DEV__) console.error('[Settings] failed to persist calendar_week_start', e); }
    try { DeviceEventEmitter.emit('calendar_week_start_changed', v); } catch (e: any) { if (typeof __DEV__ !== 'undefined' && __DEV__) console.error('[Settings] failed to emit calendar_week_start_changed', e); }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
      <TouchableOpacity
        accessible={true}
        accessibilityRole='button'
        accessibilityLabel='日曜開始'
        accessibilityState={{ selected: val === 'sunday' }}
        accessibilityHint='週の開始曜日を設定します'
        onPress={() => setAndPersist('sunday')}
        style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: val === 'sunday' ? colors.accent : colors.border, backgroundColor: val === 'sunday' ? colors.accent : 'transparent' }]}
      >
        <Text style={{ color: val === 'sunday' ? '#fff' : colors.text }}>日曜開始</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessible={true}
        accessibilityRole='button'
        accessibilityLabel='月曜開始'
        accessibilityState={{ selected: val === 'monday' }}
        accessibilityHint='週の開始曜日を設定します'
        onPress={() => setAndPersist('monday')}
        style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: val === 'monday' ? colors.accent : colors.border, backgroundColor: val === 'monday' ? colors.accent : 'transparent' }]}
      >
        <Text style={{ color: val === 'monday' ? '#fff' : colors.text }}>月曜開始</Text>
      </TouchableOpacity>
    </View>
  );
};
