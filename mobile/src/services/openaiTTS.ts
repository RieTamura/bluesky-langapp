import * as Speech from 'expo-speech';
import { getApiKey } from '../stores/apiKeys';
import { OPENAI_API_VERSION } from '../config/apiVersions';

// Request speech audio from OpenAI TTS. Returns ArrayBuffer of audio data.
// This follows a common public-docs pattern for v1/audio/speech. Adjust model/params as needed.
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

// Device TTS fallback for quick listening when audio binary playback is not wired up
export async function speakWithDevice(text: string) {
  Speech.speak(text);
}
