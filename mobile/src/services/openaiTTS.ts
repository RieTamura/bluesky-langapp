// AI TTS is disabled. The original implementation was archived at
// `mobile/ai-archive/openaiTTS.ts`.
const removedMsg = 'AI-related module removed from src; original archived at mobile/ai-archive/openaiTTS.ts';

function removed() { throw new Error(removedMsg); }

export const requestSpeechAudio = removed as any;
export const speakWithDevice = removed as any;
