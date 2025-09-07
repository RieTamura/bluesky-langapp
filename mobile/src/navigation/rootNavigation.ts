import { createNavigationContainerRef } from '@react-navigation/native';

// グローバルに参照可能な NavigationContainerRef
export const navigationRef = createNavigationContainerRef();

// 型簡略化用ユーティリティ
export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    // @ts-ignore - 画面名はスタック定義と一致させる
    navigationRef.navigate(name, params);
  }
}

export function getCurrentRouteName(): string | undefined {
  return navigationRef.getCurrentRoute()?.name;
}
