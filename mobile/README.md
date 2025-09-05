# Bluesky LangApp Mobile

Expo + React Native クライアント初期セットアップ。

## セットアップ
```
cd mobile
npm install
npm run start
```
Expo Dev Tools をブラウザで開き、Android/iOS シミュレータか実機で起動。

## 主なスタック
- Expo 49 (React Native 0.72)
- React Navigation (Bottom Tabs)
- React Query (学習/単語データ取得)
- SecureStore (セッション保持予定)

## ディレクトリ概要
```
mobile/
  App.tsx              # ルート (Provider + Tabs)
  src/
    services/api.ts    # API クライアント
    hooks/useWords.ts  # 単語管理フック
    hooks/useQuiz.ts   # クイズ進行フック
    components/        # UI コンポーネント
    screens/           # 画面
```

## 次のステップ
1. backend を起動 (ポート 3000) し通信確認
2. 認証フロー (login 保存) の SecureStore 実装
3. Progress / Share タブ実装
4. 単語一覧フィルタ (status, languageCode)
5. エラートースト/オフラインキュー実装

## 環境変数
`app.json` の `extra.apiUrl` を本番用に設定予定。

## テスト
後続で Jest + React Native Testing Library を追加予定。
