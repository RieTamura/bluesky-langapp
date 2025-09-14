import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, Platform } from 'react-native';
import { saveApiKey, getApiKey } from '../stores/apiKeys';
import { generateExampleSentence } from '../services/claude';
import { requestSpeechAudio, speakWithDevice } from '../services/openaiTTS';
import { getSelectedLevel } from '../stores/userLevel';
import { getWordsForLevel } from '../services/ngslService';

export default function APISetupScreen() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  async function saveKeys() {
    // Validate trimmed keys first to avoid accidental empty saves
    const openaiTrim = openaiKey?.trim() ?? '';
    const anthropicTrim = anthropicKey?.trim() ?? '';
    if (!openaiTrim && !anthropicTrim) {
      Alert.alert('No keys provided', 'Please enter at least one API key before saving.');
      return;
    }

    // Ask user whether to require device authentication when saving keys.
    Alert.alert(
      'Save API keys',
      'Require device authentication (FaceID/TouchID/passcode) when saving these API keys?',
      [
        {
          text: 'Require',
          onPress: async () => {
            const opts = Platform.OS ? { requireAuthentication: true } : undefined;
            try {
              if (openaiTrim) await saveApiKey('openai', openaiTrim, opts as any);
              if (anthropicTrim) await saveApiKey('anthropic', anthropicTrim, opts as any);
              Alert.alert('Saved', 'API keys saved to secure store (authentication required)');
            } catch (e: any) {
              Alert.alert('Save error', e.message || String(e));
            }
          },
        },
        {
          text: "Don't require",
          style: 'cancel',
          onPress: async () => {
            try {
              if (openaiTrim) await saveApiKey('openai', openaiTrim);
              if (anthropicTrim) await saveApiKey('anthropic', anthropicTrim);
              Alert.alert('Saved', 'API keys saved to secure store');
            } catch (e: any) {
              Alert.alert('Save error', e.message || String(e));
            }
          },
        },
      ],
    );
  }

  async function quickTest() {
    try {
      const level = getSelectedLevel() || 1;
      const words = getWordsForLevel(level);
      const w = words[0] || 'example';
      const sent = await generateExampleSentence(w, level);
      Alert.alert('Example', sent);
      // optional: generate TTS via OpenAI (if key provided) and fallback to device TTS
      try {
        const audio = await requestSpeechAudio(sent);
        // We currently do not wire binary playback; use device TTS as fallback to listen
        speakWithDevice(sent);
      } catch (e) {
        // Fallback: use device TTS so tester can still hear the sentence
        speakWithDevice(sent);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  }

  return (
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
        placeholder="ak-..."
        secureTextEntry={true}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        style={{ borderWidth: 1, padding: 8, marginBottom: 12 }}
      />

      <Button title="Save Keys" onPress={saveKeys} />
      <View style={{ height: 12 }} />
      <Button title="Quick Test: Generate + Play" onPress={quickTest} />
    </View>
  );
}
