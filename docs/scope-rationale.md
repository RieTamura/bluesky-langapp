# Scope rationale for Bluesky LangApp

Changed scope in `client-metadata.json`.
Replaced `posts:write` with `posts:create` to follow least-privilege.

## Rationale

- `posts:write` は広範な権限です。プロバイダによっては編集や削除も許可される可能性があります。

- 当アプリは学習進捗（マイルストーンや連続学習の投稿）を作成するだけが主な目的です。

- 当アプリは投稿の「作成」だけを行う仕様です。したがって、`posts:create`の方がリスクは小さくなります。

## If provider does not support `posts:create`

- プロバイダが `posts:create` を認識しない場合は、`posts:write` を使う代わりにユーザの明示的な同意を求めるフローを導入してください。具体的には、書き込みが必要になった時点で追加のスコープをリクエストします。

## Testing

- 投稿フローの統合テストを実行してください。トークンに`posts:create`が含まれていることを確認し、投稿API呼び出しが成功することを検証します。

- もしアクセストークンに必要なスコープが含まれない場合は、トークン応答を確認し、ユーザに追加の権限を求めるフォールバックを実装してください。
