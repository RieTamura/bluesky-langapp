# Cloudflare Workers と ATProtocol を活用した言語学習アプリの設計

## 目次
1. [OAuth認証の実装戦略](#1-oauth認証の実装戦略)
2. [GitHub Pages vs Cloudflare Workers](#2-github-pages-vs-cloudflare-workers)
3. [段階的な実装アプローチ](#3-段階的な実装アプローチ)
4. [Cloudflare AI Search](#4-cloudflare-ai-search)
5. [プライバシーとデータ保護](#5-プライバシーとデータ保護)
6. [ATProtocol PDS統合](#6-atprotocol-pds統合)
7. [コンテンツモデレーション](#7-コンテンツモデレーション)
8. [推奨アーキテクチャ](#8-推奨アーキテクチャ)

---

## 1. OAuth認証の実装戦略

### ATProtocolのOAuth認証
- **DPoP (Demonstrating Proof-of-Possession)対応が必須**
- PAR (Pushed Authorization Request)のサポート
- PKCE (Proof Key for Code Exchange)による認証

### Cloudflare Workersでの実装
参考Gist: [jacob-ebey/bf27aa94aef0f6e409dd1d20febe6636](https://gist.github.com/jacob-ebey/bf27aa94aef0f6e409dd1d20febe6636)

**主な機能:**
- KV Namespaceでセッション状態を管理
- DPoP対応のトークン管理
- リフレッシュトークンの自動更新
- エッジでの高速処理

**実装例:**
```typescript
import { AtpAgent } from '@atproto/api';

export default {
  async fetch(request: Request, env: Env) {
    const oauthClient = new AtprotoOAuthClient({
      AtpBaseClient,
      callbackPathname: '/oauth/callback',
      clientMetadataPathname: '/client-metadata.json',
      clientMetadata: {
        client_name: "BlueLanguage App",
        client_uri: new URL("/", request.url).href,
        scope: "atproto transition:generic",
      },
      namespace: env.OAUTH_STORAGE,
      request,
    });
    
    // OAuth処理...
  }
}
```

---

## 2. GitHub Pages vs Cloudflare Workers

### 現在の構成（GitHub Pages）
```
✅ 静的なクライアントメタデータをホスト
✅ 無料で簡単
✅ メンテナンス不要
❌ サーバーサイド処理不可
❌ トークン管理不可
```

### Cloudflare Workersの利点
```
✅ サーバーサイド処理
✅ DPoP対応
✅ セッション管理（KV Storage）
✅ エッジで高速
✅ 無料枠: 100,000リクエスト/日
❌ 実装が複雑
```

### 判断基準

**現状維持（GitHub Pages）が適している場合:**
- ネイティブアプリのみ
- クライアント側でトークン管理（expo-secure-store）
- シンプルさ重視

**Cloudflare Workersが必要な場合:**
- Webアプリとネイティブの同期
- ブラウザにリフレッシュトークンを保存したくない
- 高度なセッション管理が必要

---

## 3. 段階的な実装アプローチ

### 推奨: 段階的移行戦略

```
Phase 1: 独立実装（現在）
├─ Webアプリ: GitHub Pages + 直接OAuth
│  └─ @atproto/oauth-client-browser使用
└─ ネイティブ: GitHub Pages + expo-auth-session
   └─ 既存実装を完成させる

Phase 2: 動作確認・改善
├─ ユーザーテスト
└─ 問題点の洗い出し

Phase 3: Workers統合（必要に応じて）
└─ WebアプリをWorkers経由に移行
   └─ ネイティブは選択的に対応
```

### 統合判断のチェックリスト
- [ ] 両プラットフォームで基本フローが動作
- [ ] ユーザーが実際に使い始めている
- [ ] デバイス間セッション同期が必要
- [ ] Webのセキュリティ強化が必要
- [ ] トークン管理の一元化が必要
- [ ] Workers実装の工数を割ける

---

## 4. Cloudflare AI Search

### 概要
**AI Search（旧AutoRAG）**: マネージド検索サービス
- 自動インデックス作成・更新
- 自然言語検索
- RAG (Retrieval-Augmented Generation)サポート
- マルチテナンシー対応
- Workers統合

### プロジェクトでの活用例

#### 1. 学習コンテンツの自然言語検索
```typescript
// 「旅行に関連する単語」を検索
const results = await env.AI_SEARCH.search({
  query: "words related to travel",
  metadata: {
    level: 'NGSL_1000',
    userId: hashUserId(userId)
  }
});
```

#### 2. Blueskyポストの意味検索
```typescript
// 意味で検索（完全一致不要）
const posts = await env.AI_SEARCH.search({
  query: "posts about traveling and vacation",
  metadata: {
    source: "bluesky_feed",
    language: "en"
  }
});
```

#### 3. AI学習アシスタント（RAG）
```typescript
// コンテキストを取得してAIに回答生成させる
const context = await env.AI_SEARCH.search({
  query: "How do I use 'achieve'?",
  metadata: { type: 'vocabulary' }
});

const answer = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
  messages: [
    {
      role: 'system',
      content: `Context: ${JSON.stringify(context)}`
    },
    {
      role: 'user',
      content: "How do I use 'achieve'?"
    }
  ]
});
```

---

## 5. プライバシーとデータ保護

### AI Searchでのプライバシー設計

#### ✅ 個人情報の分離
```typescript
// ❌ 避けるべき
await env.AI_SEARCH.index({
  content: "User John learned 'achieve'",
  metadata: { email: "john@example.com" }
});

// ✅ 推奨
await env.AI_SEARCH.index({
  content: "Word 'achieve': I want to achieve my goals",
  metadata: { 
    userId: hashUserId(userId),  // ハッシュ化
    wordId: "achieve_001",
    level: "NGSL_1000"
  }
});
```

#### ✅ マルチテナンシーでデータ分離
```typescript
// ユーザーAのデータのみ検索
const results = await env.AI_SEARCH.search({
  query: query,
  metadata: { userId: hashUserId(userA) }
});
// → 他のユーザーのデータは絶対に返らない
```

#### ✅ Blueskyポストのサニタイズ
```typescript
function sanitizeExample(text: string): string {
  return text
    .replace(/@[\w.]+/g, '@user')        // メンション匿名化
    .replace(/https?:\/\/\S+/g, '[URL]') // URL削除
    .slice(0, 200);                      // 長さ制限
}
```

#### ✅ データ削除権（GDPR対応）
```typescript
async function deleteUserData(userId: string, env: Env) {
  const hashedUserId = hashUserId(userId);
  
  // AI Searchから削除
  await env.AI_SEARCH.deleteByMetadata({ userId: hashedUserId });
  
  // KVから削除
  await env.KV.delete(`user:${hashedUserId}`);
  
  // R2から削除
  await env.R2.delete(`learning-history/${hashedUserId}.json`);
}
```

### プライバシー保護チェックリスト
- [ ] 個人情報をインデックスに含めない
- [ ] ユーザーIDはハッシュ化
- [ ] マルチテナンシーで完全分離
- [ ] データ削除機能を実装
- [ ] アクセス制御（自分のデータのみ）
- [ ] Blueskyポストは単語・例文のみ抽出
- [ ] メンション・URL匿名化
- [ ] プライバシーポリシー明記

---

## 6. ATProtocol PDS統合

### 理想的なアーキテクチャ

```
┌─────────────────────────────────┐
│  ATProtocol PDS (ユーザー所有)   │
│  - 学習履歴                      │
│  - 単語リスト                    │
│  - クイズ結果                    │
│  - 進捗統計                      │
└─────────────────────────────────┘
         ↕ sync/query
┌─────────────────────────────────┐
│  Cloudflare Workers             │
│  - OAuth認証                     │
│  - AI Search（検索・キャッシュ） │
│  - Workers AI（AI処理）          │
└─────────────────────────────────┘
         ↕
┌─────────────────────────────────┐
│  クライアント (Web / Mobile)     │
└─────────────────────────────────┘
```

### Lexiconスキーマ定義例

```json
{
  "lexicon": 1,
  "id": "app.bsky.vocabulary.word",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["word", "level", "status", "createdAt"],
        "properties": {
          "word": { "type": "string", "maxLength": 100 },
          "level": { 
            "type": "string", 
            "enum": ["NGSL_1000", "NGSL_2000", "NAWL", "TSL", "BSL"] 
          },
          "status": { 
            "type": "string", 
            "enum": ["new", "learning", "learned", "mastered"] 
          },
          "examples": { 
            "type": "array", 
            "items": { "type": "string" } 
          },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    }
  }
}
```

### WorkersからPDSへ保存

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const { word, level, examples } = await request.json();
    const session = await getSession(request, env);
    
    // 1. PDSに保存
    const agent = new AtpAgent({ service: session.serviceEndpoint });
    await agent.resumeSession(session);
    
    const record = await agent.com.atproto.repo.createRecord({
      repo: session.did,
      collection: 'app.bsky.vocabulary.word',
      record: {
        word: word,
        level: level,
        status: 'learning',
        examples: examples,
        createdAt: new Date().toISOString()
      }
    });
    
    // 2. AI Searchにもインデックス化（検索用）
    await env.AI_SEARCH.index({
      content: `${word}: ${examples.join(' ')}`,
      metadata: {
        userId: hashUserId(session.did),
        pdsUri: record.uri // PDSへのリンク
      }
    });
    
    return Response.json({ success: true, pdsUri: record.uri });
  }
}
```

### ATProtocolの利点

**✅ データポータビリティ**
- ユーザーは別のPDSに移行可能
- アプリを変えてもデータ保持

**✅ 他アプリとのデータ共有**
- 別の学習アプリでも使える
- エコシステム全体で活用

**✅ 自動バックアップ**
- PDSが管理
- JSONでエクスポート可能

---

## 7. コンテンツモデレーション

### Cloudflareのモデレーション機能

#### 1. **Llama Guard 3**（推奨）
コンテンツ安全性分類用AI
- LLM入力・出力の両方をチェック
- 14のカテゴリで危険性判定
- 違反カテゴリを自動リストアップ

#### 2. **AI Gateway Guardrails**
リアルタイムフィルタリング

#### 3. **Firewall for AI**
プロンプトインジェクション対策

### 実装例: Blueskyポストのモデレーション

```typescript
async function moderateBlueskyPost(post: BlueskyPost, env: Env) {
  // Llama Guard 3でチェック
  const result = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    messages: [{
      role: 'user',
      content: `Check if this is safe for a language learning app: "${post.text}"`
    }]
  });
  
  const isSafe = result.response.includes('safe');
  
  if (isSafe) {
    // 安全: 単語抽出・学習データに追加
    await extractWordsFromPost(post);
  } else {
    // 危険: ブロック
    console.log('Post blocked:', result.response);
  }
  
  return { allowed: isSafe };
}
```

### 多層モデレーションシステム

```typescript
async function comprehensiveModeration(content: string, env: Env) {
  // Layer 1: 基本フィルタ（正規表現）
  if (!basicProfanityFilter(content).passed) {
    return { allowed: false, layer: 1 };
  }
  
  // Layer 2: AI モデレーション（Llama Guard 3）
  const aiCheck = await env.AI.run('@cf/meta/llama-guard-3-8b', {
    messages: [{ role: 'user', content: content }]
  });
  
  if (!aiCheck.response.includes('safe')) {
    return { allowed: false, layer: 2 };
  }
  
  // Layer 3: 教育的コンテキスト分析
  const eduCheck = await analyzeEducationalContext(content, env);
  if (!eduCheck.isEducational) {
    return { allowed: false, layer: 3 };
  }
  
  return { allowed: true };
}
```

### Llama Guard 3の検出カテゴリ

- **S1**: 暴力的犯罪
- **S2**: 非暴力的犯罪
- **S3**: 性的犯罪
- **S4**: 児童性的搾取
- **S5**: 名誉毀損
- **S6**: 専門的助言（医療・法律）
- **S7**: プライバシー侵害
- **S8**: 知的財産権
- **S9**: 無差別兵器
- **S10**: ヘイト
- **S11**: 自殺・自傷
- **S12**: 性的コンテンツ
- **S13**: 選挙関連
- **S14**: コードインタプリタ悪用

---

## 8. 推奨アーキテクチャ

### 最終的な構成

```
┌──────────────────────────────────────────────┐
│  Cloudflare Workers                          │
├──────────────────────────────────────────────┤
│  [OAuth認証] KV Storage                      │
│  - セッション管理                             │
│  - トークン管理（暗号化）                     │
│                                              │
│  [検索] AI Search                            │
│  - 単語・例文のインデックス                  │
│  - 自然言語検索                               │
│  - マルチテナンシー                           │
│                                              │
│  [AI処理] Workers AI                         │
│  - Llama Guard 3（モデレーション）           │
│  - Llama 3.1（翻訳・説明生成）               │
│                                              │
│  [キャッシュ] KV / R2                        │
│  - PDSクエリ結果                             │
│  - モデレーションログ                         │
└──────────────────────────────────────────────┘
         ↕                           ↕
┌─────────────────┐      ┌──────────────────────┐
│  ATProtocol PDS │      │ GitHub Pages          │
│  (ユーザー所有)  │      │ - クライアントメタデータ│
│  - 学習履歴     │      └──────────────────────┘
│  - 単語リスト   │
│  - 進捗統計     │
└─────────────────┘
         ↕
┌──────────────────────────────────────────────┐
│  クライアント                                 │
│  - Astro Webアプリ                           │
│  - React Native アプリ                       │
└──────────────────────────────────────────────┘
```

### wrangler.toml 完全版

```toml
name = "bluelang-workers"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# OAuth セッション
[[kv_namespaces]]
binding = "OAUTH_STORAGE"
id = "your-oauth-kv-id"

# キャッシュ
[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-kv-id"

# AI Search
[[ai_search]]
binding = "AI_SEARCH"
index_name = "bluelang-vocabulary"

# Workers AI
[ai]
binding = "AI"

# R2（ログ・バックアップ）
[[r2_buckets]]
binding = "R2"
bucket_name = "bluelang-data"

# Cron（定期同期）
[triggers]
crons = ["0 */6 * * *"]  # 6時間ごとにPDS→AI Search同期

# 環境変数
[env.production]
vars = { 
  MODERATION_ENABLED = "true",
  PDS_SYNC_ENABLED = "true"
}
```

### データフロー

```
[ユーザー操作: 単語を学習]
    ↓
[Cloudflare Workers]
    ↓
  ┌─────────────────────────────┐
  │ 1. モデレーションチェック    │ (Llama Guard 3)
  │ 2. PDSに保存               │ (ユーザー所有)
  │ 3. AI Searchに索引         │ (高速検索)
  │ 4. KVにキャッシュ          │ (高速アクセス)
  └─────────────────────────────┘
    ↓
[どのクライアントからも利用可能]
```

---

## コスト試算

### Cloudflare無料枠
- **Workers**: 100,000 リクエスト/日
- **KV 読み取り**: 100,000 リクエスト/日
- **KV 書き込み**: 1,000 リクエスト/日
- **KV ストレージ**: 1GB
- **Workers AI**: 10,000 ニューロン/日
- **AI Search**: 詳細未発表（無料枠あり見込み）
- **R2 ストレージ**: 10GB

**想定コスト**: 1日1,000アクティブユーザーでも無料枠内で運用可能

---

## 実装タイムライン（提案）

### Week 1-2: 現状完成（GitHub Pages）
- Web/Nativeそれぞれ独立で完成
- 基本的なOAuthフロー動作確認

### Week 3-4: ユーザーテスト
- 実際のユーザーフィードバック収集
- 問題点の洗い出し

### Week 5-6: Workers OAuth実装
- Gistコードをベースに実装
- ローカルテスト

### Week 7: Webアプリ統合
- AstroをWorkers経由に変更
- セッション管理移行

### Week 8-9: AI Search導入
- 学習データのインデックス化
- 自然言語検索実装

### Week 10: モデレーション実装
- Llama Guard 3統合
- 多層防御システム構築

### Week 11-12: PDS統合
- Lexiconスキーマ定義
- 同期機能実装

### Week 13-: 本番運用・監視

---

## まとめ

### ✅ 段階的アプローチが最適
1. まずGitHub Pagesで両プラットフォーム完成
2. 必要に応じてWorkers統合
3. AI機能は後から追加可能

### ✅ Cloudflare エコシステムの活用
- **Workers**: OAuth認証・API処理
- **AI Search**: 自然言語検索・RAG
- **Workers AI**: モデレーション・翻訳
- **KV/R2**: キャッシュ・ストレージ

### ✅ ATProtocol + Cloudflareは理想的
- **PDS**: データの所有権・ポータビリティ
- **Cloudflare**: 高速化・検索・AI処理

### ✅ プライバシー・セキュリティ重視
- 個人情報の分離
- マルチテナンシー
- モデレーション
- GDPR対応

**この設計により、ユーザーはデータを所有しながら、高速で安全な学習体験を得られます！** 🚀