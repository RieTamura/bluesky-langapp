import * as Speech from 'expo-speech';
import { getApiKey } from '../stores/apiKeys';

// Minimal fallback for Phase1: use device TTS via expo-speech.
// This avoids binary download/playback complexity and lets testers hear output.
export async function generateSpeechAndPlay(text: string, voice = 'default') {
  const key = await getApiKey('openai');
  if (!key) {
    // If no API key configured, still allow local device TTS for testing
    Speech.speak(text);
    return { played: true };
  }

  // For Phase1 we fallback to device TTS; production should call OpenAI TTS API
  Speech.speak(text);
  return { played: true };
}
