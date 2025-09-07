import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tts.settings.v1';

export interface TTSState {
  mode: 'auto' | 'manual' | 'auto-multi';
  manualLanguage: string; // e.g. 'en'
  currentPostId: string | null;
  detectionConfidenceThreshold: number; // 0-1
  pauseSentenceMs: number;
  pauseShortMs: number;
  pauseWordMs: number;
  chunkMaxWords: number;
  setMode: (m: 'auto' | 'manual' | 'auto-multi') => void;
  setManualLanguage: (code: string) => void;
  setCurrentPostId: (id: string | null) => void;
  setDetectionConfidenceThreshold: (v: number) => void;
  setPauseSentenceMs: (v: number) => void;
  setPauseShortMs: (v: number) => void;
  setPauseWordMs: (v: number) => void;
  setChunkMaxWords: (v: number) => void;
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

export const useTTSStore = create<TTSState>((set, get) => ({
  mode: 'auto',
  manualLanguage: 'en',
  currentPostId: null,
  detectionConfidenceThreshold: 0.4,
  pauseSentenceMs: 300,
  pauseShortMs: 120,
  pauseWordMs: 10,
  chunkMaxWords: 10,
  hydrated: false,
  setMode: (mode) => { set({ mode }); persist(); },
  setManualLanguage: (manualLanguage) => { set({ manualLanguage }); persist(); },
  setCurrentPostId: (currentPostId) => { set({ currentPostId }); /* ephemeral, no persist */ },
  setDetectionConfidenceThreshold: (detectionConfidenceThreshold) => { set({ detectionConfidenceThreshold }); persist(); },
  setPauseSentenceMs: (pauseSentenceMs) => { set({ pauseSentenceMs }); persist(); },
  setPauseShortMs: (pauseShortMs) => { set({ pauseShortMs }); persist(); },
  setPauseWordMs: (pauseWordMs) => { set({ pauseWordMs }); persist(); },
  setChunkMaxWords: (chunkMaxWords) => { set({ chunkMaxWords }); persist(); },
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ ...parsed, hydrated: true, currentPostId: null });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  }
}));

async function persist() {
  try {
  const { mode, manualLanguage, detectionConfidenceThreshold, pauseSentenceMs, pauseShortMs, pauseWordMs, chunkMaxWords } = useTTSStore.getState();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, manualLanguage, detectionConfidenceThreshold, pauseSentenceMs, pauseShortMs, pauseWordMs, chunkMaxWords }));
  } catch {/* ignore */}
}

// Utility selector helpers
export const useTTSMode = () => useTTSStore(s => s.mode);
export const useTTSManualLanguage = () => useTTSStore(s => s.manualLanguage);
export const useTTSCurrentPostId = () => useTTSStore(s => s.currentPostId);
export const useTTSPauseSettings = () => useTTSStore(s => ({ sentence: s.pauseSentenceMs, short: s.pauseShortMs, word: s.pauseWordMs }));