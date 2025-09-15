import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTTSStore } from '../stores/tts';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../stores/theme';
import { useAIModeStore } from '../stores/aiMode';
import { deleteApiKey, hasApiKey } from '../stores/apiKeys';


// progress fetching removed — progress UI was removed from settings

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
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

  // progress data removed

  // Open profile in Bluesky app if possible, otherwise fall back to web

  const aiEnabled = useAIModeStore(s => s.enabled);
  const setAiEnabled = useAIModeStore(s => s.setEnabled);

  return (
    <ScrollView style={[styles.container,{ backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 30 }}>
  <Text style={[styles.title,{ color: colors.text }]}>設定</Text>
  <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
    <Text style={[styles.sectionTitle,{ color: colors.text }]}>テーマ (システム固定)</Text>
  <Text style={[styles.help,{ color: colors.secondaryText }]}>現在適用: {resolved}. 端末の外観設定を変更すると自動で切替わります。</Text>
      </View>
  {/* Bluesky profile moved to a reusable component and shown on Progress screen */}
  {/* Progress section removed from settings */}
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
    <View style={[styles.section,{ backgroundColor: colors.surface, borderColor: colors.border }] }>
    <Text style={[styles.sectionTitle,{ color: colors.text }]}>AI / API Keys</Text>
    <Text style={[styles.help,{ color: colors.secondaryText }]}>API keys can be entered to enable AI features (OpenAI/Anthropic). You can add keys or disable AI mode here.</Text>
    <View style={{ marginTop: 12 }}>
      <TouchableOpacity style={[styles.licenseBtn,{ backgroundColor: colors.accent }]} onPress={() => (navigation as any).navigate('APISetup')}>
        <Text style={styles.licenseBtnText}>API キーを設定</Text>
      </TouchableOpacity>
    </View>
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.help,{ color: colors.secondaryText }]}>AI mode: {aiEnabled ? '有効' : '無効'}</Text>
      {aiEnabled && (
        <TouchableOpacity style={[styles.licenseBtn,{ backgroundColor: colors.error, marginTop:8 }]} onPress={async () => {
          try {
            // remove stored OpenAI key and disable AI mode
            await deleteApiKey('openai');
            setAiEnabled(false);
            Alert.alert('AI disabled', 'OpenAI key removed and AI mode disabled');
          } catch (e) {
            Alert.alert('Error', String(e));
          }
        }}>
          <Text style={styles.licenseBtnText}>AI を無効化</Text>
        </TouchableOpacity>
      )}
      <View style={{ marginTop: 8 }}>
        <TouchableOpacity style={[styles.licenseBtn,{ backgroundColor: '#666', marginTop:4 }]} onPress={async () => {
          try {
            await deleteApiKey('anthropic');
            Alert.alert('Anthropic key removed', 'Anthropic の API キーを削除しました。');
          } catch (e) {
            Alert.alert('Error', String(e));
          }
        }}>
          <Text style={styles.licenseBtnText}>Anthropic キーを削除</Text>
        </TouchableOpacity>
      </View>
    </View>
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
