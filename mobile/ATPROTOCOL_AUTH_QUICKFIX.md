# ATProtocol認証 クイックフィックスガイド

## 現在の問題

ATProtocol (Bluesky) の OAuth 認証が失敗している可能性があります。

## 即座に確認すべきポイント

### 1. Client Metadata の redirect_uri

GitHub Pages でホストされている client metadata には、以下の redirect_uri が登録されています:

```json
{
  "redirect_uris": [
    "blueskylearning://auth",
    "exp://localhost:8081",
    "https://auth.expo.io/@rietamura/bluesky-langapp"
  ]
}
```

✅ これは正しい設定です。

### 2. ローカルの client-metadata.json を同期

ローカルファイルが古い場合は更新してください:

```powershell
# mobile ディレクトリで実行
cd bluesky-langapp\mobile
```

`client-metadata.json` を以下の内容で更新:

```json
{
  "client_id": "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json",
  "client_name": "Bluesky LangApp Dev",
  "client_uri": "https://rietamura.github.io/bluelang-oauth",
  "logo_uri": "https://rietamura.github.io/bluelang-oauth/logo.png",
  "application_type": "native",
  "dpop_bound_access_tokens": true,
  "redirect_uris": [
    "https://auth.expo.io/@rietamura/bluesky-langapp",
    "blueskylearning://auth"
  ],
  "scope": "atproto transition:generic transition:chat.bsky",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

### 3. バックエンドが起動しているか確認

```powershell
# backend ディレクトリで
cd bluesky-langapp\backend
npm start
```

バックエンドは `http://localhost:3000` で起動する必要があります。

### 4. app.json の設定確認

`mobile/app.json` の `extra` セクション:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.11.27:3000",
      "blueskyClientId": "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json",
      "useAuthProxy": true,
      "authProxyUrl": "https://auth.expo.io/@rietamura/bluesky-langapp"
    }
  }
}
```

**重要**: `apiUrl` のIPアドレスを確認してください。
- ローカルマシンの IP アドレスに変更する必要がある場合があります
- エミュレータの場合: `http://10.0.2.2:3000` (Android) または `http://localhost:3000` (iOS)
- 実機の場合: PC の LAN IP アドレス（例: `http://192.168.x.x:3000`）

### 5. 実際のエラーを確認

#### モバイルアプリのログ

Expo 開発コンソールで以下のようなログを探してください:

```
[LoginScreen] resolvedClientId (before OAuth) = https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json
[LoginScreen] makeRedirectUri returned: https://auth.expo.io/@rietamura/bluesky-langapp
[LoginScreen] authUrl= https://bsky.social/oauth/authorize?...
[LoginScreen] auth result= { type: 'success', params: { code: '...', state: '...' } }
[LoginScreen DEBUG] Handling auth result for exchange, code: abc123...
```

エラーがある場合:
```
[LoginScreen] Code exchange result: false
(エラーメッセージを確認)
```

#### バックエンドのログ

```
[atProtocol] initializeATProtocol called, bodyKeys= [ 'oauth' ] oauth= { code: 'abc123...', ... }
[atProtocol] Token exchange: endpoint= https://bsky.social/oauth/token
[atProtocol] Token exchange: params(masked)= grant_type=authorization_code&code=abc123...
[atProtocol] Token exchange: client_id= https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json
[atProtocol] Token exchange: redirect_uri= https://auth.expo.io/@rietamura/bluesky-langapp
[atProtocol] Token endpoint response status= 200 headers= {...}
```

エラーがある場合:
```
[atProtocol] Token endpoint error: { status: 400, body: '{"error":"invalid_grant",...}' }
```

## よくあるエラーと対処法

### エラー: "redirect_uri_mismatch"

**原因**: アプリが送信した redirect_uri が client metadata に登録されていない

**対処法**:
1. ログで実際に使用されている redirect_uri を確認
2. GitHub Pages の client metadata に追加する必要がある場合は、`bluelang-oauth` リポジトリを更新
3. 開発環境では `useAuthProxy: true` を使用し、Expo Proxy URL を使用する

### エラー: "invalid_grant" または "invalid_client"

**原因**: 
- Authorization code が既に使用済み
- code_verifier が一致しない
- client_id が間違っている

**対処法**:
1. アプリを再起動して新しい認証フローを開始
2. StrictMode が原因の場合: 重複リクエストの防止機構が働いているか確認
3. PKCE verifier が SecureStore に正しく保存されているか確認

### エラー: "NETWORK_OFFLINE" または "オフラインです"

**原因**: バックエンドに接続できない

**対処法**:
1. バックエンドが起動しているか確認
2. `apiUrl` が正しいか確認（IP アドレス、ポート番号）
3. ファイアウォールで 3000 ポートがブロックされていないか確認
4. 同じネットワーク上にいるか確認（実機の場合）

### エラー: "Token missing required scope: atproto"

**原因**: 返却されたトークンに `atproto` スコープが含まれていない

**対処法**:
1. Authorization URL に `scope=atproto` が含まれているか確認
2. Client metadata の scope を確認
3. Bluesky のアカウント設定で必要な権限が付与されているか確認

## テスト手順

### 1. 基本的な動作確認

```powershell
# 1. バックエンド起動
cd bluesky-langapp\backend
npm start

# 2. 別のターミナルでモバイルアプリ起動
cd bluesky-langapp\mobile
npx expo start
```

### 2. 認証フロー実行

1. アプリで「Sign in with Bluesky (PKCE)」ボタンをタップ
2. ブラウザが開き、Bluesky の認証画面が表示される
3. 認証情報を入力してログイン
4. アプリにリダイレクトされる
5. Token exchange が成功すると「ログイン成功」アラートが表示される

### 3. デバッグモード（開発環境のみ）

開発モードでは Authorization URL が Alert で表示されます:
- この URL をコピーしてブラウザで開くことができます
- Redirect 後の URL をコピーして Debug Exchange エンドポイントでテストできます

## まだ問題が解決しない場合

### 詳細なログを取得

1. **モバイルアプリ**:
   ```javascript
   // LoginScreen.tsx の __DEV__ ブロック内のログをすべて確認
   console.log('[LoginScreen] ...');
   ```

2. **バックエンド**:
   ```javascript
   // atProtocolController.ts のログをすべて確認
   console.log('[atProtocol] ...');
   ```

### 手動での Token Exchange テスト

```bash
# Authorization URL から取得した code を使用
curl -X POST http://localhost:3000/api/atprotocol/debug-exchange \
  -H "Content-Type: application/json" \
  -d '{
    "oauth": {
      "code": "<AUTHORIZATION_CODE>",
      "code_verifier": "<YOUR_VERIFIER>",
      "redirect_uri": "https://auth.expo.io/@rietamura/bluesky-langapp",
      "client_id": "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json"
    }
  }'
```

### SecureStore の状態確認

PKCE verifier が保存されているか確認:

```javascript
// React Native Debugger または開発ツールで実行
import * as SecureStore from 'expo-secure-store';

SecureStore.getItemAsync('pkce.verifier').then(console.log);
SecureStore.getItemAsync('auth.sessionId').then(console.log);
```

## チェックリスト

認証が失敗する場合、以下を順番に確認してください:

- [ ] バックエンドが起動している（`http://localhost:3000`）
- [ ] `app.json` の `apiUrl` が正しい
- [ ] `app.json` の `blueskyClientId` が正しい URL
- [ ] GitHub Pages の client metadata が最新（redirect_uris を確認）
- [ ] モバイルアプリのログでエラーメッセージを確認
- [ ] バックエンドのログでエラーメッセージを確認
- [ ] Authorization URL が正しく生成されている
- [ ] Authorization code が取得できている
- [ ] Token exchange でエラーが発生していない
- [ ] Session ID が返却されている

## 改善内容（最近の修正）

### バックエンドの改善

1. **詳細なエラーログ**:
   - Token endpoint のレスポンスをすべてログに出力
   - client_id と redirect_uri を明示的にログ出力
   - エラーの詳細情報を JSON で返却

2. **エラーメッセージの改善**:
   - エラーの種類に応じた詳細なメッセージ
   - デバッグ情報を含む response body

3. **client-metadata.json の更新**:
   - native scheme (`blueskylearning://auth`) を追加
   - redirect_uris の順序を調整

これらの改善により、問題の原因をより簡単に特定できるようになりました。