import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

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
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
  colors: ThemeColors;
}

const palette = (mode: ThemeMode): ThemeColors => {
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

export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'light',
  setMode: (m: ThemeMode) => set({ mode: m }),
  toggle: () => set({ mode: get().mode === 'light' ? 'dark' : 'light' }),
  get colors() { return palette(get().mode); }
}) as any);

// 直接 colors を購読するためのヘルパー
export function useThemeColors(): ThemeColors { return useTheme(s => s.colors); }
