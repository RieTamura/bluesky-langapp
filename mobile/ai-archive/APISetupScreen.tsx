// @ts-nocheck
/* eslint-disable */
// Archived original: src/screens/APISetupScreen.tsx

// Archived original: src/screens/APISetupScreen.tsx
// This file was archived because AI features are temporarily disabled.

import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Platform, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { saveApiKey, getApiKey, validateApiKey, validateRawKey } from '../stores/apiKeys';
import { useAIModeStore } from '../stores/aiMode';
import { generateExampleSentence } from '../services/claude';
import { requestSpeechAudio, speakWithDevice } from '../services/openaiTTS';
import { getSelectedLevel } from '../stores/userLevel';
import { getWordsForLevel } from '../services/ngslService';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../stores/theme';
import { ArrowLeft } from '../components/Icons';

export default function APISetupScreen() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [saving, setSaving] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  async function saveKeys() {
    const openaiTrim = openaiKey?.trim() ?? '';
    const anthropicTrim = anthropicKey?.trim() ?? '';
    if (!openaiTrim && !anthropicTrim) {
      Alert.alert('No keys provided', 'Please enter at least one API key before saving.');
      return;
    }

    setSaving(true);
    setValidationMessage(null);
    try {
      let openaiRes: any = { ok: true };
      let anthRes: any = { ok: true };
      if (openaiTrim) {
        openaiRes = await validateRawKey('openai', openaiTrim);
      }
      if (anthropicTrim) {
        anthRes = await validateRawKey('anthropic', anthropicTrim);
      }

      const logs: string[] = [];
      if (openaiTrim && !openaiRes.ok) {
        logs.push(`OpenAI: status=${openaiRes.status ?? 'n/a'} error=${openaiRes.error ?? ''}`);
      }
      if (anthropicTrim && !anthRes.ok) {
        logs.push(`Anthropic: status=${anthRes.status ?? 'n/a'} error=${anthRes.error ?? ''}`);
      }
      if (logs.length > 0) {
        const logText = logs.join('\n');
        setValidationMessage('キーの検証で問題が報告されました。保存は中止されました。');
        setSaving(false);
        Alert.alert('検証失敗', logText);
        return;
      }

      setSaving(false);
      Alert.alert('保存方法', '保存時に端末認証（FaceID/TouchID/パスコード）を要求しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '認証ありで保存',
          onPress: async () => {
            setSaving(true);
            try {
              const opts = Platform.OS ? { requireAuthentication: true } : undefined;
              if (openaiTrim) await saveApiKey('openai', openaiTrim, opts as any);
              if (anthropicTrim) await saveApiKey('anthropic', anthropicTrim, opts as any);
              if (openaiTrim) useAIModeStore.getState().setEnabled(true);
              Alert.alert('保存しました', 'API キーを保存しました。');
              navigation.goBack && navigation.goBack();
            } catch (e: any) {
              const msg = e?.message || String(e);
              setValidationMessage(msg);
              Alert.alert('保存エラー', msg);
            } finally {
              setSaving(false);
            }
          }
        },
        {
          text: '認証なしで保存',
          onPress: async () => {
            setSaving(true);
            try {
              if (openaiTrim) await saveApiKey('openai', openaiTrim);
              if (anthropicTrim) await saveApiKey('anthropic', anthropicTrim);
              if (openaiTrim) useAIModeStore.getState().setEnabled(true);
              Alert.alert('保存しました', 'API キーを保存しました。');
              navigation.goBack && navigation.goBack();
            } catch (e: any) {
              const msg = e?.message || String(e);
              setValidationMessage(msg);
              Alert.alert('保存エラー', msg);
            } finally {
              setSaving(false);
            }
          }
        }
      ]);
    } catch (e: any) {
      setSaving(false);
      const msg = e?.message || String(e);
      setValidationMessage(msg);
      Alert.alert('検証エラー', msg);
    }
  }

  async function quickTest() {
    try {
      const level = getSelectedLevel() || 1;
      const words = getWordsForLevel(level);
      const w = words[0] || 'example';
      const sent = await generateExampleSentence(w, level);
      Alert.alert('Example', sent);
      try {
        const audio = await requestSpeechAudio(sent);
        speakWithDevice(sent);
      } catch (e) {
        speakWithDevice(sent);
      }
    } catch (e: any) {
      const msg = (e && (e.message || String(e))) || 'Unknown error';
      if (/Anthropic|Claude|Claude API|credit balance|invalid_request_error/i.test(msg)) {
        Alert.alert('Claude API エラー', 'Anthropic(Claude) API へのリクエストが失敗しました。残高不足やキーの権限が原因の可能性があります。Anthropic のプラン/課金ページを確認してください。');
      } else {
        Alert.alert('Error', msg);
      }
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}> 
        <Pressable onPress={() => navigation.goBack && navigation.goBack()} style={styles.backBtn} accessibilityRole='button' accessibilityLabel='戻る'>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>API 設定</Text>
        <View style={{ width: 56 }} />
      </View>
      <View style={{ flex: 1, padding: 16 }}>
      <Text>OpenAI API Key</Text>
      <TextInput
        value={openaiKey}
        onChangeText={setOpenaiKey}
        placeholder="sk-..."
        secureTextEntry={true}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
      />

      <Text>Anthropic API Key</Text>
      <TextInput
        value={anthropicKey}
        onChangeText={setAnthropicKey}
        placeholder="sk-..."
        secureTextEntry={true}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button title={saving ? '保存中...' : 'Save Keys'} onPress={saveKeys} disabled={saving} />
        {saving && <ActivityIndicator style={{ marginLeft: 8 }} />}
      </View>
      <View style={{ height: 12 }} />
      <Button title="Quick Test: Generate + Play" onPress={quickTest} />
      {validationMessage ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: 'orange' }}>{validationMessage}</Text>
        </View>
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { minWidth: 56, paddingVertical: 8 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' }
});
