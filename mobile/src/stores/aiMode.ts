import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app.aiMode.v1';

export interface AIModeState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useAIModeStore = create<AIModeState>((set) => ({
  enabled: false,
  setEnabled: (v: boolean) => { set({ enabled: v }); persist(); },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.enabled === 'boolean') set({ enabled: parsed.enabled });
      }
    } catch (e) {
      // ignore
    }
  }
}));

async function persist() {
  try {
    const { enabled } = useAIModeStore.getState();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled }));
  } catch {
    // ignore
  }
}
