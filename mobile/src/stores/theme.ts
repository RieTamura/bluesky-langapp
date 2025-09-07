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
  brightnessThreshold: number;     // ダーク判定用閾値 (0-1)
  setMode: (m: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
  refreshBrightness: () => Promise<void>;
  syncAutoResolution: () => void;
  colors: ThemeColors;
  hydrate: () => Promise<void>;
  setBrightnessThreshold: (v: number) => Promise<void>;
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
const STORAGE_KEY_THRESHOLD = 'app.theme.brightnessThreshold';
export const DEFAULT_BRIGHTNESS_DARK_THRESHOLD = 0.35;

async function readStoredMode(): Promise<ThemeMode | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch (err) {
    // 永続化読み込み失敗は致命的ではないため null を返しフォールバック。
    console.error('[theme] failed to read stored theme mode', err);
  }
  return null;
}
async function writeStoredMode(mode: ThemeMode) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  } catch (err) {
    console.error('[theme] failed to write stored theme mode', mode, err);
  }
}
async function readThreshold(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY_THRESHOLD);
    if (v != null) {
      const num = parseFloat(v);
      if (Number.isFinite(num) && num >= 0 && num <= 1) return num;
    }
  } catch (err) {
    console.error('[theme] failed to read brightness threshold', err);
  }
  return null;
}
async function writeThreshold(v: number) {
  try { await AsyncStorage.setItem(STORAGE_KEY_THRESHOLD, String(v)); } catch (err) { console.error('[theme] failed to write brightness threshold', v, err); }
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'auto',
  resolved: 'light',
  brightness: null,
  brightnessThreshold: DEFAULT_BRIGHTNESS_DARK_THRESHOLD,
  async setMode(m: ThemeMode) {
    set({ mode: m });
    await writeStoredMode(m);
    if (m !== 'auto') {
      set({ resolved: m });
    } else {
      get().syncAutoResolution();
    }
  },
  async setBrightnessThreshold(v: number) {
    // clamp 0..1, 最低差分 0.01 で冗長な更新を避ける
    const nv = Math.min(1, Math.max(0, Number.isFinite(v) ? v : DEFAULT_BRIGHTNESS_DARK_THRESHOLD));
    set({ brightnessThreshold: nv });
    await writeThreshold(nv);
    if (get().mode === 'auto') get().syncAutoResolution();
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
      // 閾値: 設定値 (既定 0.35) 未満をダークとみなす
      const threshold = s.brightnessThreshold ?? DEFAULT_BRIGHTNESS_DARK_THRESHOLD;
      const resolved = b !== null && b < threshold ? 'dark' : 'light';
      set({ resolved });
    } else {
      set({ resolved: s.mode });
    }
  },
  async hydrate() {
    const stored = await readStoredMode();
    if (stored) set({ mode: stored });
    const th = await readThreshold();
    if (th !== null) set({ brightnessThreshold: th });
    await get().refreshBrightness();
    get().syncAutoResolution();
  },
  get colors() { return palette(get().resolved); }
}) as any);

// 直接 colors を購読するためのヘルパー
export function useThemeColors(): ThemeColors { return useTheme(s => s.colors); }

export function useResolvedTheme(): 'light' | 'dark' { return useTheme(s => s.resolved); }
export function useBrightnessThreshold(): number { return useTheme(s => s.brightnessThreshold); }
