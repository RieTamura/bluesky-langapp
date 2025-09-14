# Bluesky LangApp

Blueskyの投稿を活用した言語学習アプリケーション

## 概要

Bluesky LangAppは、Blueskyソーシャルネットワークの投稿を利用して言語学習を支援するWebアプリケーションです。投稿から新しい単語を学習し、個人の単語帳を作成して学習進捗を管理できます。

## 主な機能

- 🔐 **Bluesky認証**: App Passwordを使用した安全なログイン
- 📝 **投稿閲覧**: 自分のタイムラインやフォロー中のユーザーの投稿を表示
- 📚 **単語学習**: 投稿から単語をクリックして学習リストに追加
- 📊 **学習管理**: 単語の学習状況（未学習・学習中・習得済み）を管理
- 🎯 **クイズ機能**: 学習した単語のクイズで復習
- 📈 **進捗追跡**: 学習統計と進捗の可視化

## 技術スタック

### フロントエンド
- **Astro** - 静的サイトジェネレーター
- **React** - UIコンポーネント
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Nanostores** - 状態管理

### バックエンド
- **Node.js** - ランタイム
- **Express.js** - Webフレームワーク
- **TypeScript** - 型安全性
- **AT Protocol** - Bluesky API連携

## セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/[your-username]/bluesky-langapp.git
cd bluesky-langapp
```

2. バックエンドのセットアップ
```bash
cd backend
npm install
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定
npm run dev
```

3. フロントエンドのセットアップ
```bash
cd astro-frontend
npm install
npm run dev
```

### 環境変数

バックエンドの `.env` ファイルに以下を設定：

```env
PORT=3000
FRONTEND_URL=http://localhost:4321
NODE_ENV=development
```

## 使用方法

1. バックエンドサーバーを起動: `cd backend && npm run dev`
2. フロントエンドサーバーを起動: `cd astro-frontend && npm run dev`
3. ブラウザで `http://localhost:4321` にアクセス
4. BlueskyのApp Passwordでログイン
5. 投稿を閲覧し、単語をクリックして学習リストに追加
6. 単語帳で学習進捗を管理

## 開発

### プロジェクト構造

```
bluesky-langapp/
├── backend/                 # バックエンドAPI
│   ├── src/
│   │   ├── controllers/     # APIコントローラー
│   │   ├── routes/         # ルート定義
│   │   ├── services/       # ビジネスロジック
│   │   ├── middleware/     # ミドルウェア
│   │   └── types/          # 型定義
│   └── package.json
├── astro-frontend/         # フロントエンド
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── pages/          # Astroページ
│   │   ├── layouts/        # レイアウト
│   │   ├── stores/         # 状態管理
│   │   └── services/       # APIクライアント
│   └── package.json
└── README.md
```

### API仕様

主要なAPIエンドポイント：

- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 認証状態確認
- `GET /api/posts` - 投稿取得
- `GET /api/words` - 単語一覧
- `POST /api/words` - 単語追加
- `PUT /api/words/:id` - 単語更新

### サンプルデータ (app-data.json) について

リポジトリに含まれる `app-data.json` のサンプル単語レコードは、コミット差分のノイズを減らすため以下の固定値を使用しています。

- `date`: すべて `2024-01-01T00:00:00.000Z`
- `userId`: `SAMPLE_USER_ID`

実行時に環境ごとのユーザーIDや現在日時へ差し替える場合は、起動スクリプトやシード処理で環境変数 `APP_SAMPLE_USER_ID` を参照してください。
存在すればその値を使用する実装を追加してください（未実装の場合はそのまま固定値で利用されます）。


## ライセンス

MIT License

## Credits & Third-Party Data

This project includes a sample of the NGSL (New General Service List) wordlist used for language learning features in the mobile app. The NGSL data is provided under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0). For full attribution details and the source URL, see `mobile/CREDITS.md`.

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 注意事項

- このアプリケーションはBlueskyのApp Passwordが必要です
- 開発環境でのみテストされています
- 本番環境での使用前にセキュリティ設定を確認してください
