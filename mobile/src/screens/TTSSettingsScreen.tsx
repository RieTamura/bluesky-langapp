import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTTSStore } from '../stores/tts';
import { useTheme } from '../stores/theme';

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

  const safeRate = Number.isFinite(ttsRate) ? ttsRate : 1.0;
  const safePitch = Number.isFinite(ttsPitch) ? ttsPitch : 1.0;
  const clampedRate = Math.min(2.0, Math.max(0.1, safeRate));
  const clampedPitch = Math.min(2.0, Math.max(0.5, safePitch));
  const rateScaled = Math.round(clampedRate * 100);
  const pitchScaled = Math.round(clampedPitch * 100);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
    >
      {/* Header title is provided by navigator; render a descriptive heading below the header */}
  <Text style={[styles.title, { color: colors.text, marginLeft: 16 }]}>読み上げ設定画面</Text>
  <View style={[styles.section, { backgroundColor: 'transparent' }]}> 
        {/* Section title */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>動作モード</Text>
        <View style={styles.row}>
          {(['auto', 'auto-multi', 'manual'] as const).map(m => {
            const active = ttsMode === m;
            const labelMap: Record<typeof m, string> = {
              auto: '自動',
              'auto-multi': '自動（マルチ）',
              manual: '手動'
            };
            return (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, { borderColor: active ? colors.accent : colors.border }, active && { backgroundColor: colors.accent }]}
                onPress={() => setMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.modeBtnText, { color: active ? '#fff' : colors.accent }]}>{labelMap[m]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {ttsMode === 'manual' && (
          <View style={{ marginTop: 12 }}>
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
        )}

        {ttsMode === 'auto' && (
          <Text style={[styles.help, { color: colors.secondaryText }]}>自動: 投稿全体で主要言語を 1 つ判定します。</Text>
        )}
        {ttsMode === 'auto-multi' && (
          <Text style={[styles.help, { color: colors.secondaryText }]}>複数: 単語ごとに文字種を見て最適な言語へ切替えます (精度は簡易)。</Text>
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
                value={String(pauseSentenceMs)}
                onChangeText={(v) => {
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
                value={String(pauseShortMs)}
                onChangeText={(v) => {
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
                value={String(pauseWordMs)}
                onChangeText={(v) => {
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
                value={String(chunkMaxWords)}
                onChangeText={(v) => { const n = parseInt(v, 10); if (!Number.isNaN(n)) setChunkMaxWords(Math.max(1, n)); }}
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
