import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// シンプル化: システム追随 or 手動 (light/dark)
// 永続化に残っている 'auto' / 'adaptive' は 'system' へマイグレーション
// system のみ (ユーザー選択肢を廃止)
export type ThemeMode = 'system';

export interface ThemeColors {
  background: string;
  surface: string; // 画面を統一白背景にする設計だが今後拡張用
  text: string;
  secondaryText: string;
  border: string;
  accent: string;
  error: string;      // 追加: エラー表示用 (従来ハードコード #ff5959)
  success: string;    // 追加: 成功/ポジティブ表示用 (従来 accent / badgeKnown を流用)
  badgeUnknown: string;
  badgeLearning: string;
  badgeKnown: string;
}

export interface ThemeState {
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
      error: '#ff5f56',      // vivid but accessible on dark bg
      success: '#10b981',    // tailwind emerald-500-ish
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
    error: '#dc2626',        // tailwind red-600
    success: '#059669',      // tailwind green-600 (近似) ※ badgeKnown とは微妙に差
    badgeUnknown: '#9ca3af',
    badgeLearning: '#f59e0b',
    badgeKnown: '#10b981'
  };
};

const STORAGE_KEY = 'app.theme.mode';

// DEPRECATED (2025-09-07): 以下 2 定数は過去の "adaptive" / 明るさベース自動テーマ時代のしきい値残骸。
//  - 互換性: 旧バージョンでソース参照していた import が残っているアプリを OTA 更新した際に
//    "export が消える" ことでバンドル差異エラーを避けるため一時的に残している。
//  - 現行: 明るさ判定ロジックは完全削除済み (AsyncStorage にもしきい値は保存していない)。
//  - 削除予定: 2025-10 以降のクリーンアップ (#theme-cleanup-ticket) にて remove 予定。問題なければその時点で削除可。
//  - 早期削除してもランタイム影響は無いが、フォールバック期間 (約1か月) を設け安全側に倒す。
// TODO(2025-10-15 #theme-cleanup-ticket): 参照 0 を確認後この 2 定数を削除する。
export const DEFAULT_BRIGHTNESS_DARK_THRESHOLD = 0.35; // legacy placeholder (unused)
export const DEFAULT_HYSTERESIS = 0.12; // legacy placeholder (unused)

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

// Appearance リスナーはグローバルではなく App.tsx 内 useEffect で動的に登録・解除する
// (Fast Refresh / アンマウント時のリーク防止)。

// 直接 colors を購読するためのヘルパー
export function useThemeColors(): ThemeColors { return useTheme((s: ThemeState) => s.colors); }

export function useResolvedTheme(): 'light' | 'dark' { return useTheme((s: ThemeState) => s.resolved); }
// removed: brightness threshold hook
