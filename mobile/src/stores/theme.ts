import { create } from 'zustand';
import * as Brightness from 'expo-brightness';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  background: string;
  surface: string; // 画面を統一白背景にする設計だが今後拡張用
  text: string;
  secondaryText: string;
  border: string;
  accent: string;
  badgeUnknown: string;
  badgeLearning: string;
  badgeKnown: string;
}

interface ThemeState {
  mode: ThemeMode;                 // ユーザー選択値
  resolved: 'light' | 'dark';      // 実際に適用されているテーマ (auto の場合に決定)
  brightness: number | null;      // 0..1 デバイス明るさ (Permission が得られない場合 null)
  setMode: (m: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
  refreshBrightness: () => Promise<void>;
  syncAutoResolution: () => void;
  colors: ThemeColors;
  hydrate: () => Promise<void>;
}

const palette = (mode: 'light' | 'dark'): ThemeColors => {
  if (mode === 'dark') {
    return {
      background: '#0e1113',
      surface: '#0e1113',
      text: '#f5f7fa',
      secondaryText: '#9aa0a6',
      border: '#2a2f33',
      accent: '#3391ff',
      badgeUnknown: '#6b7280',
      badgeLearning: '#d97706',
      badgeKnown: '#059669'
    };
  }
  return {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#111827',
    secondaryText: '#5f6368',
    border: '#e5e7eb',
    accent: '#007aff',
    badgeUnknown: '#9ca3af',
    badgeLearning: '#f59e0b',
    badgeKnown: '#10b981'
  };
};

const STORAGE_KEY = 'app.theme.mode';

async function readStoredMode(): Promise<ThemeMode | null> {
  try { const v = await AsyncStorage.getItem(STORAGE_KEY); if (v === 'light' || v === 'dark' || v === 'auto') return v; } catch {}
  return null;
}
async function writeStoredMode(mode: ThemeMode) { try { await AsyncStorage.setItem(STORAGE_KEY, mode); } catch {} }

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'auto',
  resolved: 'light',
  brightness: null,
  async setMode(m: ThemeMode) {
    set({ mode: m });
    await writeStoredMode(m);
    if (m !== 'auto') {
      set({ resolved: m });
    } else {
      get().syncAutoResolution();
    }
  },
  async toggle() {
    const order: ThemeMode[] = ['light','dark','auto'];
    const cur = get().mode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    await get().setMode(next);
  },
  async refreshBrightness() {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const b = await Brightness.getBrightnessAsync(); // 0..1
        set({ brightness: b });
        if (get().mode === 'auto') get().syncAutoResolution();
      }
    } catch {
      set({ brightness: null });
    }
  },
  syncAutoResolution() {
    const s = get();
    if (s.mode === 'auto') {
      const b = s.brightness;
      // 閾値: 0.35 未満をダークとみなす (環境が暗い)
      const resolved = b !== null && b < 0.35 ? 'dark' : 'light';
      set({ resolved });
    } else {
      set({ resolved: s.mode });
    }
  },
  async hydrate() {
    const stored = await readStoredMode();
    if (stored) set({ mode: stored });
    await get().refreshBrightness();
    get().syncAutoResolution();
  },
  get colors() { return palette(get().resolved); }
}) as any);

// 直接 colors を購読するためのヘルパー
export function useThemeColors(): ThemeColors { return useTheme(s => s.colors); }

export function useResolvedTheme(): 'light' | 'dark' { return useTheme(s => s.resolved); }
