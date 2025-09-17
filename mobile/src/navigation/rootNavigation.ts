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
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// 型安全化: navigationRef を RootStackParamList として作成しました。
// もしアプリ内で汎用的な名前/params を渡している箇所があれば、呼び出し側を
// `navigate<Name extends keyof RootStackParamList>(name: Name, params?: RootStackParamList[Name])`
// の形で型に合わせるか、ここでオーバーロードを追加してください。

// 型簡略化用ユーティリティ
export function navigate<Name extends keyof RootStackParamList>(name: Name, params?: RootStackParamList[Name]) {
  if (navigationRef.isReady()) {
    // navigationRef.navigate のシグネチャはジェネリックなので、型安全に渡せます。
    // 一部の環境で呼び出し側の params が any の場合は呼び出し側を調整してください。
    (navigationRef as any).navigate(name as any, params as any);
  }
}

export function getCurrentRouteName(): string | undefined {
  return navigationRef.getCurrentRoute()?.name;
}
