import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// シンプル化: システム追随 or 手動 (light/dark)
// 永続化に残っている 'auto' / 'adaptive' は 'system' へマイグレーション
// system のみ (ユーザー選択肢を廃止)
export type ThemeMode = 'system';

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
  mode: ThemeMode;            // 常に 'system'
  resolved: 'light' | 'dark'; // システムから解決
  colors: ThemeColors;        // resolved に依存して都度更新
  syncAutoResolution: () => void;
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
export const DEFAULT_BRIGHTNESS_DARK_THRESHOLD = 0.35; // unused (kept for migration safety)
export const DEFAULT_HYSTERESIS = 0.12; // unused

async function readStoredMode(): Promise<ThemeMode> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'auto' || v === 'adaptive' || v === 'light' || v === 'dark' || v === 'system') {
      if (v !== 'system') console.log('[theme:migrate] -> system (legacy value:', v, ')');
    }
  } catch (err) {
    console.error('[theme] failed to read stored theme mode', err);
  }
  return 'system';
}
// 永続化は過去互換のために一応 system を書く (失敗しても影響無し)
async function writeStoredMode() {
  try { await AsyncStorage.setItem(STORAGE_KEY, 'system'); } catch {}
}
// threshold / hysteresis persistence removed

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: (Appearance.getColorScheme?.() === 'dark') ? 'dark' : 'light',
  colors: palette((Appearance.getColorScheme?.() === 'dark') ? 'dark' : 'light'),
  syncAutoResolution() {
    const sys = Appearance.getColorScheme();
    const next = sys === 'dark' ? 'dark' : 'light';
    set({ resolved: next, colors: palette(next) });
  // production: silent; enable console.log here if debugging theme issues
  },
  async hydrate() {
  await readStoredMode(); // legacy value consume (ignored)
    get().syncAutoResolution();
    writeStoredMode();
  }
})) as any;

// -----------------------------
// System appearance change listener (once)
// -----------------------------
let appearanceListenerAttached = false;
if (!appearanceListenerAttached) {
  try {
  Appearance.addChangeListener(({ colorScheme }) => {
      const { syncAutoResolution } = useTheme.getState();
      syncAutoResolution();
    });
    appearanceListenerAttached = true;
  } catch (err) {
    console.warn('[theme] failed to attach appearance listener', err);
  }
}

// 直接 colors を購読するためのヘルパー
export function useThemeColors(): ThemeColors { return useTheme((s: ThemeState) => s.colors); }

export function useResolvedTheme(): 'light' | 'dark' { return useTheme((s: ThemeState) => s.resolved); }
// removed: brightness threshold hook
