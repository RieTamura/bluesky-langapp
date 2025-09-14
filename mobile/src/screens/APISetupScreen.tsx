import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { saveApiKey, getApiKey } from '../stores/apiKeys';
import { generateExampleSentence } from '../services/claude';
import { generateSpeechAndPlay } from '../services/openaiTTS';
import { getSelectedLevel } from '../stores/userLevel';
import { getWordsForLevel } from '../services/ngslService';

export default function APISetupScreen() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');

  async function saveKeys() {
    if (openaiKey) await saveApiKey('openai', openaiKey);
    if (anthropicKey) await saveApiKey('anthropic', anthropicKey);
    Alert.alert('Saved', 'API keys saved to secure store');
  }

  async function quickTest() {
    try {
      const level = getSelectedLevel() || 1;
      const words = getWordsForLevel(level);
      const w = words[0] || 'example';
      const sent = await generateExampleSentence(w, level);
      Alert.alert('Example', sent);

      // optional: generate TTS
      await generateSpeechAndPlay(sent);
    } catch (e: any) {
      Alert.alert('Error', e.message || String(e));
    }
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>OpenAI API Key</Text>
      <TextInput value={openaiKey} onChangeText={setOpenaiKey} placeholder="sk-..." style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />

      <Text>Anthropic API Key</Text>
      <TextInput value={anthropicKey} onChangeText={setAnthropicKey} placeholder="ak-..." style={{ borderWidth: 1, padding: 8, marginBottom: 12 }} />

      <Button title="Save Keys" onPress={saveKeys} />
      <View style={{ height: 12 }} />
      <Button title="Quick Test: Generate + Play" onPress={quickTest} />
    </View>
  );
}
