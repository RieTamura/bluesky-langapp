# ATProtocol認証デバッグガイド

## 問題の概要

ATProtocol (Bluesky) の OAuth 認証が失敗する場合の診断と修正手順を説明します。

## よくある問題と解決方法

### 1. redirect_uri_mismatch エラー

**症状**: 認証サーバーから `redirect_uri_mismatch` または `invalid_request` エラーが返される

**原因**:
- アプリから送信した `redirect_uri` が client metadata に登録されていない
- 開発環境と本番環境で異なる redirect_uri を使用している
- Expo Proxy URL と Native Scheme の混在

**解決方法**:

1. **Client Metadata の確認**
   
   GitHub Pages でホストされている client metadata を確認:
   ```
   https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json
   ```

   以下の redirect_uris が登録されているか確認:
   - `blueskylearning://auth` (Native scheme for standalone builds)
   - `exp://localhost:8081` (Expo Go for development)
   - `https://auth.expo.io/@rietamura/bluesky-langapp` (Expo Proxy)

2. **アプリ設定の確認**

   `mobile/app.json` の設定:
   ```json
   {
     "expo": {
       "extra": {
         "blueskyClientId": "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json",
         "useAuthProxy": true,
         "authProxyUrl": "https://auth.expo.io/@rietamura/bluesky-langapp"
       }
     }
   }
   ```

3. **開発環境での動作確認**

   デバッグログで実際に使用されている redirect_uri を確認:
   ```javascript
   // LoginScreen.tsx のログを確認
   console.log('[LoginScreen] makeRedirectUri returned:', made, 'useProxy=', useProxy);
   console.log('[LoginScreen] authUrl=', authUrl);
   ```

### 2. Token Exchange の失敗

**症状**: Authorization code は取得できるが、token endpoint でエラーになる

**原因**:
- DPoP proof の生成に失敗
- code_verifier が一致しない（PKCE検証エラー）
- client_id が正しくない
- Token endpoint への nonce の送信漏れ

**解決方法**:

1. **バックエンドログの確認**

   `backend/src/controllers/atProtocolController.ts` のログ出力を確認:
   ```
   [atProtocol] Token exchange: endpoint= https://bsky.social/oauth/token
   [atProtocol] Token exchange: params(masked)= ...
   [atProtocol] Token exchange: client_id= ...
   [atProtocol] Token exchange: redirect_uri= ...
   [atProtocol] Token endpoint response status= 400 headers= {...}
   ```

2. **DPoP の問題**

   DPoP proof が正しく生成されているか確認:
   - ES256 キーペアが生成されている
   - JWK が正しくエクスポートされている
   - nonce が要求された場合は2回目のリクエストで含まれている

3. **PKCE の問題**

   - code_verifier が SecureStore に保存されているか
   - token exchange 時に正しく送信されているか
   - code_challenge_method が S256 であるか

### 3. Scope の問題

**症状**: Token は取得できるが、`atproto` scope がない

**原因**:
- Authorization URL に scope パラメータが含まれていない
- Client metadata の scope が古い

**解決方法**:

1. **Authorization URL の確認**

   URLに `scope=atproto` が含まれているか確認:
   ```
   https://bsky.social/oauth/authorize?
     response_type=code&
     client_id=...&
     redirect_uri=...&
     scope=atproto%20transition:generic%20transition:chat.bsky&
     ...
   ```

2. **バックエンドの検証**

   返却されたトークンのスコープをログで確認:
   ```javascript
   console.log('Token scopes (raw):', tokenJson.scope);
   ```

## デバッグ手順

### ステップ1: Client Metadata の更新

1. ローカルの `mobile/client-metadata.json` を更新:
   ```bash
   cd mobile
   npm run generate:client-metadata
   ```

2. GitHub Pages の client metadata が最新か確認:
   ```bash
   curl https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json
   ```

3. 必要に応じて GitHub リポジトリを更新

### ステップ2: ログの確認

1. **モバイルアプリのログ**

   Expo の開発コンソールで以下を確認:
   ```
   [LoginScreen] resolvedClientId (before OAuth) = ...
   [LoginScreen] makeRedirectUri returned: ...
   [LoginScreen] authUrl= ...
   [LoginScreen] auth result= ...
   [LoginScreen DEBUG] Handling auth result for exchange, code: ...
   ```

2. **バックエンドのログ**

   ```
   [atProtocol] initializeATProtocol called, bodyKeys= ...
   [atProtocol] Token exchange: endpoint= ...
   [atProtocol] Token exchange: client_id= ...
   [atProtocol] Token exchange: redirect_uri= ...
   [atProtocol] Token endpoint response status= ...
   [atProtocol] Token endpoint error: ...
   ```

### ステップ3: Debug Exchange の使用

バックエンドに `/api/atprotocol/debug-exchange` エンドポイントがあります（開発環境のみ）:

```bash
curl -X POST http://localhost:3000/api/atprotocol/debug-exchange \
  -H "Content-Type: application/json" \
  -d '{
    "oauth": {
      "code": "YOUR_AUTH_CODE",
      "code_verifier": "YOUR_VERIFIER",
      "redirect_uri": "blueskylearning://auth",
      "client_id": "https://rietamura.github.io/bluelang-oauth/.well-known/atproto_client_metadata.json"
    }
  }'
```

### ステップ4: 手動での認証フロー確認

1. Authorization URL を手動でコピー:
   ```javascript
   // LoginScreen の Alert でURLが表示される（__DEV__モード）
   Alert.alert('Auth URL', authUrl);
   ```

2. ブラウザで URL を開く

3. 認証後の redirect URL をコピー:
   ```
   blueskylearning://auth?code=...&state=...
   ```

4. Debug Exchange エンドポイントでテスト

## 環境別の設定

### Development (Expo Go)

```json
{
  "useAuthProxy": true,
  "authProxyUrl": "https://auth.expo.io/@rietamura/bluesky-langapp",
  "redirect_uri": "https://auth.expo.io/@rietamura/bluesky-langapp" または "exp://localhost:8081"
}
```

### Development (Expo Dev Client)

```json
{
  "useAuthProxy": false,
  "redirect_uri": "blueskylearning://auth"
}
```

### Production (TestFlight / Standalone)

```json
{
  "useAuthProxy": false,
  "redirect_uri": "blueskylearning://auth"
}
```

## よくあるエラーメッセージ

### `invalid_client`
- client_id が間違っている
- Client metadata が取得できない
- Client metadata の URL にアクセスできない

### `invalid_grant`
- Authorization code が既に使用済み
- Authorization code の有効期限切れ
- code_verifier が一致しない

### `invalid_request`
- 必須パラメータが不足している
- redirect_uri が一致しない
- パラメータの形式が不正

### `use_dpop_nonce`
- DPoP nonce が必要（自動リトライされる）
- リトライ後もエラーの場合は DPoP proof の生成に問題がある

## トラブルシューティングチェックリスト

- [ ] GitHub Pages の client metadata に必要な redirect_uri が登録されている
- [ ] app.json の blueskyClientId が正しい URL になっている
- [ ] Backend が起動している（API_BASE_URL が正しい）
- [ ] PKCE verifier が SecureStore に保存されている
- [ ] Authorization URL に必要なパラメータが含まれている
- [ ] Token exchange 時に code_verifier が送信されている
- [ ] DPoP proof が正しく生成されている
- [ ] 返却されたトークンに atproto scope が含まれている
- [ ] セッションが正しく作成されている

## 参考資料

- [AT Protocol OAuth Spec](https://atproto.com/specs/oauth)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [DPoP RFC 9449](https://datatracker.ietf.org/doc/html/rfc9449)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

## サポート

問題が解決しない場合は、以下の情報を添えて報告してください:

1. エラーメッセージ（フルスタックトレース）
2. モバイルアプリのログ（[LoginScreen] で始まる行）
3. バックエンドのログ（[atProtocol] で始まる行）
4. 使用している redirect_uri
5. 開発環境（Expo Go / Dev Client / Standalone）
6. デバイス情報（iOS / Android, バージョン）