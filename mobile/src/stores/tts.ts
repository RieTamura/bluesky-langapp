import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tts.settings.v1';

export interface TTSState {
  mode: 'auto' | 'manual';
  manualLanguage: string; // e.g. 'en'
  setMode: (m: 'auto' | 'manual') => void;
  setManualLanguage: (code: string) => void;
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

export const useTTSStore = create<TTSState>((set, get) => ({
  mode: 'auto',
  manualLanguage: 'en',
  hydrated: false,
  setMode: (mode) => { set({ mode }); persist(); },
  setManualLanguage: (manualLanguage) => { set({ manualLanguage }); persist(); },
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ ...parsed, hydrated: true });
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
    const { mode, manualLanguage } = useTTSStore.getState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, manualLanguage }));
  } catch {/* ignore */}
}

// Utility selector helpers
export const useTTSMode = () => useTTSStore(s => s.mode);
export const useTTSManualLanguage = () => useTTSStore(s => s.manualLanguage);