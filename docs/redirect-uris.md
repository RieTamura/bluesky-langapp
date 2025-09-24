# Redirect URIs: HTTPS vs HTTP loopback

このプロジェクトで使用する OAuth2 / atproto クライアントメタデータの `redirect_uris` についての方針と開発時の注意点をまとめます。

## 変更内容
- `docs/.well-known/atproto_client_metadata.json` の `redirect_uris` にある `http://127.0.0.1/callback` を `https://127.0.0.1/callback` に変更しました。これは本番環境では HTTPS を使用するのが安全で望ましいためです。

## 開発 (ローカル) 環境について
- OAuth2 の仕様では "loopback"（`http://127.0.0.1` や `http://localhost`）はローカルクライアントのリダイレクトに特例として許容される場合があります。ただしプロバイダによってはローカル HTTP を拒否し、HTTPS を必須にするものがあります。
- ローカル開発で HTTP ループバックを使う場合は、次の点を留意してください：
  - `http://127.0.0.1/callback` のようなエントリは**開発専用**とし、公開（本番）クライアントメタデータには含めないでください。
  - 共有リポジトリにそのまま HTTP の redirect URI を残すのは避け、環境ごとに切り替える（例：デプロイ用の `atproto_client_metadata.json` は HTTPS のみを含める）ことを推奨します。

## 安全なローカル HTTPS の代替案
もしローカルでも HTTPS を使いたい場合（推奨）：
- `mkcert` などを使ってローカル用の自己署名証明書を生成し、ローカルサーバを HTTPS で起動する。
  - 例（一般例）:
    1. mkcert をインストール
    2. `mkcert -install`
    3. `mkcert 127.0.0.1` → `127.0.0.1.pem` / `127.0.0.1-key.pem` が作成される
    4. 作成した証明書をローカルサーバに渡して HTTPS を起動
- `ngrok` / `localhost.run` 等のトンネリングサービスを使って HTTPS の公開 URL を得る（ただし第三者を経由するためセキュリティ/プライバシーに注意）。

## Expo 環境（推奨の方法）
- Expo（特に Expo Go / 開発）では `https://auth.expo.io/@owner/slug` のようなプロキシ redirect URI を使うことが多く、Provider の設定にこちらを登録しておくと便利です（`app.json` の `extra` に `authProxyUrl` を入れておくと管理しやすい）。

## トークンエンドポイントの構成

このプロジェクトのバックエンドは、OAuthのトークンエンドポイントを環境変数`AT_PROTOCOL_TOKEN_ENDPOINT`から読み取ります。
デフォルトは`https://bsky.social/oauth/token`です。

- 開発／ステージング／本番で異なるOAuth提供者やプロキシを使う場合は、環境変数でエンドポイントを上書きしてください。
- サーバー起動時に値が有効なURLかどうか簡易バリデーションを行います。誤った値が設定されていると起動時にエラーになります。

例（PowerShell）：

```powershell
$env:AT_PROTOCOL_TOKEN_ENDPOINT = 'https://staging-bsky.example.com/oauth/token'
npm run start
```

注：デフォルトを使う場合は特別な設定は不要です。プロキシやカスタム認証ゲートウェイを導入する場合は、環境変数で上書きしてください。実装は`backend/src/controllers/atProtocolController.ts`にあります。

## 推奨運用
- 本番用公開クライアントのメタデータには HTTPS のリダイレクト URI のみを含める。
- ローカル開発用の設定（HTTP ループバックを許可するか、ローカル HTTPS を使うか）はドキュメント化し、チームに周知する。

---
このドキュメントは `docs/.well-known/atproto_client_metadata.json` の更新に伴って追加されました。必要ならこの内容を `README.md` やデプロイ手順にも追記します。

## client_id の変更について
`docs/.well-known/atproto_client_metadata.json` の `client_id` を当該 JSON ファイル自体の URL から、クライアントの起点となるオリジン URL (`https://rietamura.github.io/bluelang-oauth`) に変更しました。
既存の消費者（アプリやサーバ）が古い `client_id` を参照している場合は、新しい値に切り替えてください。`client_id` はクライアントの恒久的な識別子として扱うのが望ましく、自己参照するファイル URL は避けるべきです。