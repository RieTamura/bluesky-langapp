import { createNavigationContainerRef } from '@react-navigation/native';

// 画面スタックの ParamList 型 (App.tsx の Stack.Screen 構成と同期すること)
export type RootStackParamList = {
  Main: undefined;
  Words: undefined;
  Quiz: undefined;
  Progress: undefined;
  Settings: undefined;
  TTSSettings: undefined;
  License: undefined;
};

// グローバルに参照可能な NavigationContainerRef
export const navigationRef = createNavigationContainerRef<any>(); // 型安全にする場合は createNavigationContainerRef<RootStackParamList>() ただし依存箇所の遷移汎用化のため any

// 型簡略化用ユーティリティ
export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
  (navigationRef as any).navigate(name, params);
  }
}

export function getCurrentRouteName(): string | undefined {
  return navigationRef.getCurrentRoute()?.name;
}
