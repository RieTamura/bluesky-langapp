# Error Handling & Retry Policy
Version: 2025-09-05
Status: Confirmed (MVP)

## Goals
- 一貫した失敗レスポンス構造
- 再試行すべき/即時中止すべきエラーの分類
- モバイル UX を阻害しない最小限のダイアログ

## Standard API Error Shape
```
{
  success: false,
  error: string,      // machine code e.g. AUTH_REQUIRED
  message: string,    // human readable
  data?: any          // optional context
}
```

## Categories
| Code | HTTP | Retry? | User Message (JP) | Action |
|------|------|--------|-------------------|--------|
| AUTH_REQUIRED | 401 | No | セッションが期限切れです | ログイン画面遷移 |
| ACCESS_DENIED | 403 | No | 権限がありません | サポート誘導/戻る |
| NOT_FOUND | 404 | No | 見つかりません | 画面を閉じる |
| CONFLICT | 409 | No | 既に登録済みです | スナック表示 |
| RATE_LIMIT | 429 | Yes (after delay) | リクエストが多すぎます | 5秒後自動再試行 |
| VALIDATION_ERROR | 400 | No | 入力内容を確認してください | フォーム強調 |
| DICT_TIMEOUT | 504 | Yes (1回) | 辞書サービスが混雑中 | 1回再試行ボタン |
| DICT_UPSTREAM | 502 | Yes (1回) | 辞書サービス障害 | 後でもう一度 |
| SERVER_ERROR | 500 | Yes (exponential 2 max) | サーバーエラー | 自動再試行/報告 |
| NETWORK_OFFLINE | - | Yes (queue) | オフラインです | 復帰時送信 |
| PARSE_ERROR | - | No | データ解析に失敗 | ログ送信 |

## Retry Strategy
```
function retry(delays=[1000, 2000]) { // ms
  for each delay in delays:
    await wait(delay)
    attempt()
    if success break
}
```
- 429: 固定 5000ms で 1 回
- 500: 1000ms, 2000ms の最大 2 回
- 502/504: 1500ms で 1 回
- ネットワークオフライン: Connectivity listenerで再送

## Client Error Handling Flow
1. fetch → network error? -> offline queue
2. parse JSON 失敗 -> PARSE_ERROR (開発ログのみ)
3. HTTP status >=400 -> マッピング表参照
4. retry 条件一致 → 再試行実行
5. 全て失敗 → UI error state emit

## UI Components
- <InlineError message actionLabel?>: 局所 (list, card)
- <RetryBoundary scope="network"> children </RetryBoundary>
- Toast/Snackbar: 成功/軽微エラー
- Modal: 認証切れ / 重大障害のみ

## Mobile Specific
- Expo NetInfo でオンライン状態を監視
- オフライン時: POST/PUT/DELETE を {method,url,body,ts} キューへ保存 -> 再接続時 flush

## Logging & Observability
| Layer | What | Where |
|-------|------|-------|
| API Client | request meta, duration, status | console.debug (dev) |
| Error Mapper | code, http, retries | console.warn |
| Unhandled | stack | Sentry (future) |

## Metrics (Future)
- error_rate_by_code
- retry_success_ratio
- avg_first_byte_ms

## Open Questions
- クイズ回答結果の失敗再送は冪等ID必要? (session+questionId で可)
- オフライン時の辞書 API キャッシュ層を挟むか?
