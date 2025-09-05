# Data Model Specification (Mobile + Backend Unified)

Version: 2025-09-05
Status: Confirmed (MVP)
Owner: Mobile Platform Team

## 基本方針
1. サーバが唯一の正。クライアントはキャッシュのみ。
2. SRS 拡張可能: interval / repetition / easeFactor / nextReviewDate を将来互換。
3. 集計系はサーバ側で計算し API 提供。
4. ID はサーバ生成。クライアントは楽観追加用 tempId を一時使用可。
5. 多言語対応: `languageCode` を即時導入 (初期値 `en`). 将来 `ja`, `es` など拡張。

## Core Entities

### User
| Field | Type | Notes |
|-------|------|-------|
| id | string | Bluesky identifier reused as logical userId (short term) |
| blueskyId | string | Same as id now; future DID mapping |
| displayName | string? | Optional profile cache |
| avatarUrl | string? | Cached avatar |
| createdAt / updatedAt | ISO string | Backend time |

### Word
| Field | Type | Req | 説明 |
|-------|------|-----|------|
| id | string | ✔ | サーバ生成 |
| userId | string | ✔ | User FK |
| word | string | ✔ | 正規化済小文字 |
| languageCode | string | ✔ | ISO 言語コード (初期 `en`) |
| status | enum | ✔ | unknown / learning / known |
| definition | string? |  | 定義 (<=2000文字) |
| exampleSentence | string? |  | 例文 (<=500文字) |
| pronunciation | string? |  | IPA など |
| difficultyLevel | number | ✔ | 1–25 (easeFactor*10) |
| reviewCount | number | ✔ | 0 初期 |
| correctCount | number | ✔ | 0 初期 |
| firstEncounteredAt | ISO | ✔ | 初遭遇時刻 |
| lastReviewedAt | ISO? |  | 最終レビュー |
| srsInterval | number? |  | 次回まで日数 (スナップショット) |
| srsRepetition | number? |  | 連続成功回数 |
| srsEaseFactor | number? |  | 1.3–2.5 |
| srsNextReviewDate | ISO? |  | 予定レビュー日時 |

Derived (client side only): accuracy = correctCount / reviewCount (guard 0).

### Post
Simplified for word extraction context.
| Field | Type | Notes |
| id | string | PK |
| userId | string | |
| blueskyPostId | string | From Bluesky API |
| content | string | Raw text |
| postedAt | ISO string | Source time |
| processedAt | ISO string | When extraction ran |
| words | ProcessedWord[] | Inline mapping for highlighting |

### ProcessedWord
| Field | Type | Notes |
| text | string | Token |
| status | enum | Mirror Word.status at processing time |
| startIndex / endIndex | number | UTF-16 indices |

### LearningSession
| Field | Type | Notes |
| id | string | session_{timestamp}_{rand} |
| userId | string | |
| sessionType | enum | quiz | review |
| startedAt / completedAt | ISO string | |
| totalQuestions | number | |
| correctAnswers | number | |

### QuizQuestion (Transient Server -> Client)
| Field | Type | Notes |
| id | string | q_... |
| word | Word | Embedded snapshot |
| questionType | enum | meaning | usage | pronunciation (future) |
| question | string | Text prompt |
| options | string[]? | For multiple-choice future |
| correctAnswer | string | Reference answer |

### Aggregated Stats (Advanced)
Returned from /api/learning/advanced (proposed)
```
{
  totalWords: number,
  unknownWords: number,
  learningWords: number,
  knownWords: number,
  totalReviews: number,
  averageAccuracy: number, // 0-1
  wordsForReview: number,
  averageEaseFactor: number,
  reviewSchedule: { today: number, tomorrow: number, thisWeek: number, nextWeek: number }
}
```

## 状態遷移 (Word.status)
unknown → learning: 初回正解 または 明示昇格
learning → known: srsRepetition ≥ 5 かつ srsEaseFactor ≥ 2.0
known → learning: （Phase2）直近5回答の正答率 < 0.6 または手動降格

## Validation
| 項目 | ルール |
|------|--------|
| word | `/^[a-zA-Z\-']+$/` （正規化後） |
| definition | 2000 文字以下 |
| exampleSentence | 500 文字以下 |
| languageCode | ISO 2~5 (例: en, ja) |
| difficultyLevel | round(srsEaseFactor * 10) |

## 正規化パイプライン (Tokenization)
1. trim
2. lowercase (en-US 基準: Turkish i 問題回避)
3. 末尾句読点除去 `[,.!?;:]`
4. 連続空白 1 個に圧縮

## 主要 API（抜粋）
GET /api/words?status=&limit=&offset=&languageCode=
  応答: `{ success, data: Word[], meta: { total, count, offset, limit } }`
POST /api/words { word, definition?, exampleSentence?, languageCode? }
  応答: 201 `{ success, data: Word }` / 409 重複
PUT /api/words/:id { status?, definition?, exampleSentence?, reviewCount?, correctCount?, languageCode? }
DELETE /api/words/:id → `{ success }`

## オフライン / キャッシュ方針
| 項目 | 方針 |
|------|------|
| 単語一覧 | AsyncStorage キャッシュ key `words:{userId}:v1` |
| 失効 | ログインユーザ変更 / 手動更新 |
| 楽観追加 | tempId + pending=true → 成功で置換 |
| キュー保持 | 24h / 最大 50 件 |

## 拡張余地
| 分類 | 例 |
|------|----|
| SRS | srsAlgorithmVersion, lapseCount |
| 多言語 | languageCode 既定 `en`, 追加: `ja`, `es` |
| 音声 | pronunciationAudioUrl |

## 保留事項（次フェーズ）
- タグ分類（必要性分析後）
- difficultyAdjustment の履歴永続化

## 多言語対応 初期スコープ
| 項目 | 内容 |
|------|------|
| 保存 | Word.languageCode |
| 追加時 | 未指定→`en` |
| UI フィルタ | 言語別タブ/フィルタ (Phase2) |
| 集計 | Advanced Stats は言語横断 (将来: languageCode 集計拡張) |
| クイズ | 同一 languageCode 内で出題（MVP） |

完了基準: フィールド追加・API 経由保存・既存データに `languageCode:"en"` 補完。
