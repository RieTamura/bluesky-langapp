import React from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useTTSStore } from '../stores/tts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../stores/theme';

// (プロフィール取得) 型定義とバリデーション付きの実装
type Profile = {
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  [key: string]: any;
};

// Possible shapes returned by /api/auth/me
type MeResUserWrapped = { data: { user: Profile } };
type MeResProfileDirect = { data: Profile };
type MeResNull = { data: null };
type MeResponse = MeResUserWrapped | MeResProfileDirect | MeResNull | { data?: any };

// Pluggable logger abstraction: allows injecting a centralized logger (Sentry/remote)
// while safely falling back to console.error. Export a setter so other modules can
// provide the upstream logger when available.
type Logger = { error: (msg: string, meta?: any) => void };
let externalLogger: Logger | null = null;
export function setSettingsScreenLogger(l: Logger | null) {
  externalLogger = l;
}

const logger: Logger = {
  error(msg: string, meta?: any) {
    // Prefer forwarding to injected external logger. If it throws, fall back to console.error.
    if (externalLogger && typeof externalLogger.error === 'function') {
      try {
        externalLogger.error(msg, meta);
        return;
      } catch (e) {
        // If upstream logger fails, swallow and fallback to console below
      }
    }
    try { console.error(msg, meta); } catch (_) { /* noop */ }
  }
};

function isProfile(obj: any): obj is Profile {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.handle !== 'string') return false;
  if ('displayName' in obj && obj.displayName != null && typeof obj.displayName !== 'string') return false;
  if ('description' in obj && obj.description != null && typeof obj.description !== 'string') return false;
  if ('avatar' in obj && obj.avatar != null && typeof obj.avatar !== 'string') return false;
  return true;
}

async function fetchProfile(identifier: string | null | undefined): Promise<Profile | null> {
  // Try the atprotocol profile endpoint first
  const q = identifier ? `?actor=${encodeURIComponent(identifier)}` : '';
  try {
    const res: any = await api.get<any>(`/api/atprotocol/profile${q}`);
    const data = res?.data;
    if (isProfile(data)) return data;
    // If the shape isn't what we expect, log and continue to fallback
    logger.error('fetchProfile: /api/atprotocol/profile returned unexpected shape', { response: res });
  } catch (err) {
    logger.error('fetchProfile: /api/atprotocol/profile failed', { error: err });
  }

  // Fallback to /api/auth/me — validate structure instead of assuming me.data.user
  try {
    const meRes = await api.get<MeResponse>('/api/auth/me');
    const meData = meRes?.data;
    // If response wraps user: { data: { user: Profile } }
    if (meData && typeof meData === 'object' && 'user' in meData && isProfile((meData as any).user)) {
      return (meData as any).user as Profile;
    }
    // If response is directly a Profile object: { data: Profile }
    if (meData && isProfile(meData)) {
      return meData as Profile;
    }
    // Null or unexpected shapes are logged with full response for diagnostics
    logger.error('fetchProfile: /api/auth/me returned unexpected shape', { response: meRes });
  } catch (err) {
    logger.error('fetchProfile: /api/auth/me failed', { error: err });
  }

  // Final stable fallback shape matching Profile so callers get a consistent type
  if (identifier) {
    return { handle: identifier, displayName: identifier, description: 'プロフィール取得未実装' };
  }
  return null;
}

async function fetchProgress() {
  try {
    const res: any = await api.get<any>('/api/learning/progress');
    return res.data || res;
  } catch { return null; }
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { identifier, logout } = useAuth();
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ['profile', identifier], queryFn: () => fetchProfile(identifier) });
  const progressQ = useQuery({ queryKey: ['progress-mini'], queryFn: () => fetchProgress() });
  const ttsMode = useTTSStore(s => s.mode);
  const setMode = useTTSStore(s => s.setMode);
  const manualLanguage = useTTSStore(s => s.manualLanguage);
  const setManualLanguage = useTTSStore(s => s.setManualLanguage);
  const detectionConfidenceThreshold = useTTSStore(s => s.detectionConfidenceThreshold);
  const setDetectionConfidenceThreshold = useTTSStore(s => s.setDetectionConfidenceThreshold);
  const pauseSentenceMs = useTTSStore(s => s.pauseSentenceMs);
  const setPauseSentenceMs = useTTSStore(s => s.setPauseSentenceMs);
  const pauseShortMs = useTTSStore(s => s.pauseShortMs);
  const setPauseShortMs = useTTSStore(s => s.setPauseShortMs);
  const pauseWordMs = useTTSStore(s => s.pauseWordMs);
  const setPauseWordMs = useTTSStore(s => s.setPauseWordMs);
  const chunkMaxWords = useTTSStore(s => s.chunkMaxWords);
  const setChunkMaxWords = useTTSStore(s => s.setChunkMaxWords);
  const ttsRate = useTTSStore(s => s.ttsRate);
  const setTtsRate = (useTTSStore as any).getState().setTtsRate as (v: number)=>void;
  const ttsPitch = useTTSStore(s => s.ttsPitch);
  const setTtsPitch = (useTTSStore as any).getState().setTtsPitch as (v: number)=>void;
  const hydrate = useTTSStore(s => s.hydrate);
  const { resolved, colors } = useTheme();
  React.useEffect(()=> { hydrate(); }, [hydrate]);

  // Slider: iOS/Android ネイティブ側で 0.1 / 0.05 などの浮動小数ステップが精度警告を出すケースがあるため
  // 内部的に 100 倍した整数スケール (rate 10-200, pitch 50-200) に変換して扱う。
  // 防御: NaN / 非有限 / 範囲外値をここで補正 (UI 表示用)。ストア側でもクランプ済みだが二重防御。
  const safeRate = Number.isFinite(ttsRate) ? ttsRate : 1.0;
  const safePitch = Number.isFinite(ttsPitch) ? ttsPitch : 1.0;
  const clampedRate = Math.min(2.0, Math.max(0.1, safeRate));
  const clampedPitch = Math.min(2.0, Math.max(0.5, safePitch));
  const rateScaled = Math.round(clampedRate * 100);   // 10 - 200
  const pitchScaled = Math.round(clampedPitch * 100); // 50 - 200
  // NOTE: ストア setTtsRate / setTtsPitch でもクランプ + NaN 防御を実施し、persist 前に不正値を排除。
  // NOTE: ストア setTtsRate / setTtsPitch でもクランプ + NaN 防御を実施し、persist 前に不正値を排除。

  // derive profile data & avatar state early so hooks are stable across renders
  const p: any = profileQ.data || {};
  const [avatarFailed, setAvatarFailed] = React.useState(false);

  // Reset avatar failure when avatar URL changes
  React.useEffect(() => {
    setAvatarFailed(false);
  }, [profileQ.data]);

  if (profileQ.isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  const prog: any = progressQ.data || {};
  const history: number[] = (prog?.recentAccuracies || prog?.accuracyHistory || []).slice(-10);

  // derive initials for fallback avatar
  const getInitials = (nameOrHandle?: string) => {
    const s = (nameOrHandle || '').trim();
    if (!s) return '';
    const parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Open profile in Bluesky app if possible, otherwise fall back to web
  const openInBluesky = async (handle?: string) => {
    if (!handle) return;
    const encoded = encodeURIComponent(handle);
    const appUrl = `bsky://profile?handle=${encoded}`;
    const webUrl = `https://bsky.app/profile/${encoded}`;
    try {
      const can = await Linking.canOpenURL(appUrl);
      const target = can ? appUrl : webUrl;
      await Linking.openURL(target);
    } catch (e) {
      try { await Linking.openURL(webUrl); } catch (_) { /* ignore */ }
    }
  };

  return (
    <ScrollView style={[styles.container,{ backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 30 }}>
  <Text style={[styles.title,{ color: colors.text }]}>設定</Text>
  <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
    <Text style={[styles.sectionTitle,{ color: colors.text }]}>テーマ (システム固定)</Text>
  <Text style={[styles.help,{ color: colors.secondaryText }]}>現在適用: {resolved}. 端末の外観設定を変更すると自動で切替わります。</Text>
      </View>
  <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
        <Text style={[styles.sectionTitle,{ color: colors.text }]}>Bluesky プロフィール</Text>
        <View style={styles.profileColumn}>
          {p?.avatar && !avatarFailed ? (
            <Image
              source={{ uri: p.avatar, cache: 'force-cache' as any }}
              style={[styles.avatar, styles.avatarSpacing]}
              resizeMode='cover'
              accessibilityLabel='User avatar'
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }, styles.avatarSpacing] }>
              <Text style={[styles.avatarInitials, { color: colors.surface }]}>{getInitials(p.displayName || p.handle || identifier)}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={[styles.display,{ color: colors.text }]}>{p.displayName || identifier || ''}</Text>
            <TouchableOpacity accessibilityRole='link' onPress={() => openInBluesky(p.handle || identifier || '')} activeOpacity={0.7}>
              <Text style={[styles.handle,{ color: colors.accent }]}>@{p.handle || (identifier || '')}</Text>
            </TouchableOpacity>
            {!!p.description && <Text style={[styles.desc,{ color: colors.secondaryText }]}>{p.description}</Text>}
          </View>

          {profileQ.isError && (
            <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['profile', identifier || ''] })} style={[styles.licenseBtn, { marginTop: 12, backgroundColor: colors.accent }]} accessibilityRole='button'>
              <Text style={[styles.licenseBtnText]}>プロフィール再取得</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
  <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
        <Text style={[styles.sectionTitle,{ color: colors.text }]}>進捗 (Accuracy)</Text>
        {progressQ.isLoading && <ActivityIndicator />}
        {!progressQ.isLoading && history.length === 0 && <Text style={[styles.muted,{ color: colors.secondaryText }]}>データなし</Text>}
        {!progressQ.isLoading && history.length > 0 && <MiniChart data={history} />}
      </View>
  <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
        <Text style={[styles.sectionTitle,{ color: colors.text }]}>読み上げ (TTS)</Text>
        <View style={styles.row}> 
          {(['auto','auto-multi','manual'] as const).map(m => {
            const active = ttsMode === m;
            return (
              <TouchableOpacity key={m} style={[styles.modeBtn, { borderColor: active ? colors.accent : colors.border }, active && { backgroundColor: colors.accent }]} onPress={()=> setMode(m)} accessibilityRole="button" accessibilityState={{ selected: active }}>
                <Text style={[styles.modeBtnText, { color: active ? '#fff' : colors.accent }]}>{m === 'auto' ? '自動' : '手動'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {ttsMode === 'manual' && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label,{ color: colors.text }]}>言語コード (例: en-US, ja-JP)</Text>
            <TextInput
              value={manualLanguage}
              onChangeText={setManualLanguage}
              placeholder="en-US"
              style={[styles.input,{ borderColor: colors.border, color: colors.text }]}
              autoCapitalize='none'
              autoCorrect={false}
              accessibilityLabel='TTS manual language code'
            />
          </View>
        )}
        {ttsMode === 'auto' && (
          <Text style={[styles.help,{ color: colors.secondaryText }]}>自動: 投稿全体で主要言語を 1 つ判定します。</Text>
        )}
        {ttsMode === 'auto-multi' && (
          <Text style={[styles.help,{ color: colors.secondaryText }]}>複数: 単語ごとに文字種を見て最適な言語へ切替えます (精度は簡易)。</Text>
        )}
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label,{ color: colors.text }]}>言語判定信頼度しきい値 (0-1)</Text>
          <TextInput value={String(detectionConfidenceThreshold)} onChangeText={(v)=> {
            const num = parseFloat(v); if (!isNaN(num)) setDetectionConfidenceThreshold(Math.max(0, Math.min(1, num)));
          }} style={[styles.input,{ borderColor: colors.border, color: colors.text }]} keyboardType='decimal-pad' accessibilityLabel='Detection confidence threshold' />
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label,{ color: colors.text }]}>ポーズ (ms)</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
            <View style={styles.pauseBox}><Text style={[styles.pauseLabel,{ color: colors.secondaryText }]}>文末</Text><TextInput value={String(pauseSentenceMs)} onChangeText={(v)=> { const n = parseInt(v, 10); if(!Number.isNaN(n)) setPauseSentenceMs(n); }} style={[styles.pauseInput,{ borderColor: colors.border, color: colors.text }]} keyboardType='number-pad' /></View>
            <View style={styles.pauseBox}><Text style={[styles.pauseLabel,{ color: colors.secondaryText }]}>区切り</Text><TextInput value={String(pauseShortMs)} onChangeText={(v)=> { const n = parseInt(v, 10); if(!Number.isNaN(n)) setPauseShortMs(n); }} style={[styles.pauseInput,{ borderColor: colors.border, color: colors.text }]} keyboardType='number-pad' /></View>
            <View style={styles.pauseBox}><Text style={[styles.pauseLabel,{ color: colors.secondaryText }]}>単語</Text><TextInput value={String(pauseWordMs)} onChangeText={(v)=> { const n = parseInt(v, 10); if(!Number.isNaN(n)) setPauseWordMs(n); }} style={[styles.pauseInput,{ borderColor: colors.border, color: colors.text }]} keyboardType='number-pad' /></View>
            <View style={styles.pauseBox}><Text style={[styles.pauseLabel,{ color: colors.secondaryText }]}>Chunk</Text><TextInput value={String(chunkMaxWords)} onChangeText={(v)=> { const n = parseInt(v, 10); if(!Number.isNaN(n)) setChunkMaxWords(Math.max(1, n)); }} style={[styles.pauseInput,{ borderColor: colors.border, color: colors.text }]} keyboardType='number-pad' /></View>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label,{ color: colors.text }]}>速度 / ピッチ</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.pauseLabel,{ color: colors.secondaryText }]}>Rate: {ttsRate.toFixed(2)}</Text>
            <Slider
              minimumValue={10}
              maximumValue={200}
              step={5}
              value={rateScaled}
              onValueChange={(v)=> setTtsRate(v/100)}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              accessibilityLabel="読み上げ速度"
              accessibilityHint="読み上げの再生速度を遅くから速くへ調整します"
              accessibilityRole="adjustable"
              // NOTE: Slider の min/max/value は 10-200 の整数スケールを使用しているため
              // accessibilityValue も同一スケールに合わせる (以前は 0.1-2.0 で変換ミス -> 精度警告発生)
              accessibilityValue={{ min: 10, max: 200, now: rateScaled, text: `速度 ${clampedRate.toFixed(2)}` }}
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.pauseLabel,{ color: colors.secondaryText }]}>Pitch: {ttsPitch.toFixed(2)}</Text>
            <Slider
              minimumValue={50}
              maximumValue={200}
              step={5}
              value={pitchScaled}
              onValueChange={(v)=> setTtsPitch(v/100)}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              accessibilityLabel="ピッチ"
              accessibilityHint="テキスト読み上げのピッチを調整します"
              accessibilityRole="adjustable"
              accessibilityValue={{ min: 50, max: 200, now: pitchScaled, text: `ピッチ ${clampedPitch.toFixed(2)}` }}
              accessible={true}
            />
          </View>
        </View>
      </View>
  <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
    <Text style={[styles.logout,{ color: colors.error || '#e53935' }]} onPress={logout}>ログアウト</Text>
      </View>
  <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
    <Text style={[styles.licenseTitle,{ color: colors.text }]}>ライセンス / 使用ライブラリ</Text>
    <Text style={[styles.licenseItem,{ color: colors.secondaryText }]}>アイコン: Lucide Icons (ISC)</Text>
    <TouchableOpacity accessibilityRole='button' accessibilityLabel='ライセンス全文を表示' onPress={()=> (navigation as any).navigate('License')} style={[styles.licenseBtn,{ backgroundColor: colors.accent }]}>
      <Text style={styles.licenseBtnText}>ライセンスを表示</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const MiniChart: React.FC<{ data: number[] }> = ({ data }) => {
  const { colors } = useTheme();
  const max = Math.max(...data, 1);
  return (
    <View style={styles.chartRow}>
      {data.map((v, i) => (
        <View key={i} style={[styles.chartBar, { height: 60 * (v / max) + 4, backgroundColor: colors.accent }]} />
      ))}
    </View>
  );
};

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
