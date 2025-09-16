// Archived original: src/services/openaiTTS.ts
// NOTE: This archived file is kept for reference. We avoid file-wide
// TypeScript/ESLint suppression. If specific lint/type errors are
// reported, add focused per-line or per-rule disables instead.
// This file was archived because AI features are temporarily disabled.

import * as Speech from 'expo-speech';
import { getApiKey } from '../stores/apiKeys';
import { OPENAI_API_VERSION } from '../config/apiVersions';

export async function requestSpeechAudio(text: string, voice = 'alloy'): Promise<ArrayBuffer> {
  const key = await getApiKey('openai');
  if (!key) throw new Error('No OpenAI API key configured');

  const endpoint = 'https://api.openai.com/v1/audio/speech';
  const body = {
    model: 'tts-1-hd',
    voice,
    input: text,
    format: 'mp3'
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'OpenAI-Version': OPENAI_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`TTS API error: ${res.status} ${t}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return arrayBuffer;
}

export async function speakWithDevice(text: string) {
  Speech.speak(text);
}
