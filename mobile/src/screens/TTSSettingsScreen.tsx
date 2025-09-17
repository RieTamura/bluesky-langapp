import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTTSStore } from '../stores/tts';
import { useTheme } from '../stores/theme';

export type TtsPreset = Readonly<{
  key: string;
  label: string;
  rate: number;
  pitch: number;
  pauseSentenceMs: number;
  pauseShortMs: number;
  pauseWordMs: number;
  chunkMaxWords: number;
  detectionConfidenceThreshold: number;
}>;

export const TTS_PRESETS = [
  { key: 'slow', label: 'ゆっくり', rate: 0.85, pitch: 0.9, pauseSentenceMs: 600, pauseShortMs: 250, pauseWordMs: 120, chunkMaxWords: 12, detectionConfidenceThreshold: 0.5 },
  { key: 'normal', label: '標準', rate: 1.0, pitch: 1.0, pauseSentenceMs: 400, pauseShortMs: 180, pauseWordMs: 80, chunkMaxWords: 10, detectionConfidenceThreshold: 0.6 },
  { key: 'fast', label: 'はやい', rate: 1.25, pitch: 1.05, pauseSentenceMs: 250, pauseShortMs: 120, pauseWordMs: 50, chunkMaxWords: 20, detectionConfidenceThreshold: 0.55 }
] as const as ReadonlyArray<TtsPreset>;

export const TTSSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
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
  const setTtsRate = useTTSStore(s => s.setTtsRate) as (v: number) => void;
  const ttsPitch = useTTSStore(s => s.ttsPitch);
  const setTtsPitch = useTTSStore(s => s.setTtsPitch) as (v: number) => void;
  const hydrate = useTTSStore(s => s.hydrate);
  const { colors } = useTheme();
  React.useEffect(()=> { hydrate(); }, [hydrate]);

  // UI-level mode: 'simple' = かんたんモード, 'custom' = カスタムモード (manual)
  const [uiMode, setUiMode] = React.useState<'simple' | 'custom'>(ttsMode === 'manual' ? 'custom' : 'simple');

  // Keep uiMode in sync if external ttsMode changes elsewhere
  React.useEffect(() => {
    if (ttsMode === 'manual' && uiMode !== 'custom') setUiMode('custom');
    if (ttsMode !== 'manual' && uiMode !== 'simple') setUiMode('simple');
  }, [ttsMode, uiMode]);

  const safeRate = Number.isFinite(ttsRate) ? ttsRate : 1.0;
  const safePitch = Number.isFinite(ttsPitch) ? ttsPitch : 1.0;
  const clampedRate = Math.min(2.0, Math.max(0.1, safeRate));
  const clampedPitch = Math.min(2.0, Math.max(0.5, safePitch));
  const rateScaled = Math.round(clampedRate * 100);
  const pitchScaled = Math.round(clampedPitch * 100);

  // Local string state for inputs to allow editing and commit on blur
  const [localPauseSentence, setLocalPauseSentence] = React.useState(String(pauseSentenceMs));
  const [localPauseShort, setLocalPauseShort] = React.useState(String(pauseShortMs));
  const [localPauseWord, setLocalPauseWord] = React.useState(String(pauseWordMs));
  const [localChunkMax, setLocalChunkMax] = React.useState(String(chunkMaxWords));

  // Sync local state when store values change (e.g., preset applied)
  React.useEffect(() => { setLocalPauseSentence(String(pauseSentenceMs)); }, [pauseSentenceMs]);
  React.useEffect(() => { setLocalPauseShort(String(pauseShortMs)); }, [pauseShortMs]);
  React.useEffect(() => { setLocalPauseWord(String(pauseWordMs)); }, [pauseWordMs]);
  React.useEffect(() => { setLocalChunkMax(String(chunkMaxWords)); }, [chunkMaxWords]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      {/* Header title is provided by navigator; render a descriptive heading below the header */}
  <Text style={[styles.title, { color: colors.text, marginLeft: 16 }]}>読み上げ設定画面</Text>
  <View style={[styles.section, { backgroundColor: 'transparent' }]}> 
        {/* Section title */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>操作モード</Text>
        <View style={[styles.row, { marginBottom: 12 }]}> 
          <TouchableOpacity
            style={[styles.modeBtn, { borderColor: uiMode === 'simple' ? colors.accent : colors.border }, uiMode === 'simple' && { backgroundColor: colors.accent }]}
            onPress={() => { setUiMode('simple'); setMode('auto'); }}
            accessibilityRole="button"
            accessibilityState={{ selected: uiMode === 'simple' }}
          >
            <Text style={[styles.modeBtnText, { color: uiMode === 'simple' ? '#fff' : colors.accent }]}>かんたん</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, { borderColor: uiMode === 'custom' ? colors.accent : colors.border }, uiMode === 'custom' && { backgroundColor: colors.accent }]}
            onPress={() => { setUiMode('custom'); setMode('manual'); }}
            accessibilityRole="button"
            accessibilityState={{ selected: uiMode === 'custom' }}
          >
            <Text style={[styles.modeBtnText, { color: uiMode === 'custom' ? '#fff' : colors.accent }]}>カスタム</Text>
          </TouchableOpacity>
        </View>

        {uiMode === 'custom' && (
          <>
            {/* Existing manual UI: keep unchanged */}
            <View style={{ marginTop: 0 }}>
              <Text style={[styles.label, { color: colors.text }]}>言語コード (例: en-US, ja-JP)</Text>
              <TextInput
                value={manualLanguage}
                onChangeText={setManualLanguage}
                placeholder="en-US"
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                autoCapitalize='none'
                autoCorrect={false}
                accessibilityLabel='TTS manual language code'
              />
            </View>
          </>
        )}

        {uiMode === 'simple' && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.help, { color: colors.secondaryText }]}>かんたんモード: よく使う設定から選んでボタンで適用します。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {TTS_PRESETS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => {
                    setTtsRate(p.rate);
                    setTtsPitch(p.pitch);
                    setPauseSentenceMs(p.pauseSentenceMs);
                    setPauseShortMs(p.pauseShortMs);
                    setPauseWordMs(p.pauseWordMs);
                    setChunkMaxWords(p.chunkMaxWords);
                    setDetectionConfidenceThreshold(p.detectionConfidenceThreshold);
                  }}
                  style={[styles.modeBtn, { borderColor: colors.border, paddingHorizontal: 14 }]}
                  accessibilityRole='button'
                >
                  <Text style={[styles.modeBtnText, { color: colors.accent }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label, { color: colors.text }]}>言語判定信頼度しきい値 (0-1)</Text>
          <TextInput
            value={String(detectionConfidenceThreshold)}
            onChangeText={(v) => { const num = parseFloat(v); if (!isNaN(num)) setDetectionConfidenceThreshold(Math.max(0, Math.min(1, num))); }}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            keyboardType='decimal-pad'
            accessibilityLabel='Detection confidence threshold'
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label, { color: colors.text }]}>ポーズ (ms)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View style={styles.pauseBox}>
              <Text style={[styles.pauseLabel, { color: colors.secondaryText }]}>文末</Text>
              <TextInput
                value={localPauseSentence}
                onChangeText={(v) => setLocalPauseSentence(v)}
                onEndEditing={() => {
                  const v = localPauseSentence.trim();
                  if (v === '') { setPauseSentenceMs(0); return; }
                  const n = parseInt(v, 10);
                  if (Number.isNaN(n)) return;
                  setPauseSentenceMs(n >= 0 ? n : 0);
                }}
                style={[styles.pauseInput, { borderColor: colors.border, color: colors.text }]}
                keyboardType='number-pad'
              />
            </View>

            <View style={styles.pauseBox}>
              <Text style={[styles.pauseLabel, { color: colors.secondaryText }]}>区切り</Text>
              <TextInput
                value={localPauseShort}
                onChangeText={(v) => setLocalPauseShort(v)}
                onEndEditing={() => {
                  const v = localPauseShort.trim();
                  if (v === '') { setPauseShortMs(0); return; }
                  const n = parseInt(v, 10);
                  if (Number.isNaN(n)) return;
                  setPauseShortMs(n >= 0 ? n : 0);
                }}
                style={[styles.pauseInput, { borderColor: colors.border, color: colors.text }]}
                keyboardType='number-pad'
              />
            </View>

            <View style={styles.pauseBox}>
              <Text style={[styles.pauseLabel, { color: colors.secondaryText }]}>単語</Text>
              <TextInput
                value={localPauseWord}
                onChangeText={(v) => setLocalPauseWord(v)}
                onEndEditing={() => {
                  const v = localPauseWord.trim();
                  if (v === '') { setPauseWordMs(0); return; }
                  const n = parseInt(v, 10);
                  if (Number.isNaN(n)) return;
                  setPauseWordMs(n >= 0 ? n : 0);
                }}
                style={[styles.pauseInput, { borderColor: colors.border, color: colors.text }]}
                keyboardType='number-pad'
              />
            </View>

            <View style={styles.pauseBox}>
              <Text style={[styles.pauseLabel, { color: colors.secondaryText }]}>Chunk</Text>
              <TextInput
                value={localChunkMax}
                onChangeText={(v) => setLocalChunkMax(v)}
                onEndEditing={() => {
                  const v = localChunkMax.trim();
                  if (v === '') { setChunkMaxWords(0); return; }
                  const n = parseInt(v, 10);
                  if (Number.isNaN(n)) return;
                  setChunkMaxWords(Math.max(0, n));
                }}
                style={[styles.pauseInput, { borderColor: colors.border, color: colors.text }]}
                keyboardType='number-pad'
              />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label, { color: colors.text }]}>速度 / ピッチ</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.pauseLabel, { color: colors.secondaryText }]}>Rate: {ttsRate.toFixed(2)}</Text>
            <Slider
              minimumValue={10}
              maximumValue={200}
              step={5}
              value={rateScaled}
              onValueChange={(v) => setTtsRate(v / 100)}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              accessibilityLabel="読み上げ速度"
              accessibilityHint="読み上げの再生速度を遅くから速くへ調整します"
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.pauseLabel, { color: colors.secondaryText }]}>Pitch: {ttsPitch.toFixed(2)}</Text>
            <Slider
              minimumValue={50}
              maximumValue={200}
              step={5}
              value={pitchScaled}
              onValueChange={(v) => setTtsPitch(v / 100)}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              accessibilityLabel="ピッチ"
              accessibilityHint="テキスト読み上げのピッチを調整します"
            />
          </View>
        </View>
  </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  section: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  modeBtnText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  help: { marginTop: 8, fontSize: 12 },
  pauseBox: { width: 90 },
  pauseLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  pauseInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, fontSize: 13, textAlign: 'center' },
});
