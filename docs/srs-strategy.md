# SRS Strategy (SM-2 Adapted)
Version: 2025-09-05
Status: Confirmed (MVP)

## Overview
Backend `LearningService` implements a modified SM-2 spaced repetition with difficulty modulation.

## Data Points
| Name | Source | Purpose |
|------|--------|---------|
| reviewCount | Word.reviewCount | Total review attempts |
| correctCount | Word.correctCount | Correct attempts |
| srsInterval | Word.srsInterval | Days until next review (snapshot) |
| srsRepetition | Word.srsRepetition | Successful streak (resets on fail) |
| srsEaseFactor | Word.srsEaseFactor | 1.3–2.5 difficulty scaling |
| srsNextReviewDate | Word.srsNextReviewDate | Scheduling reference |
| lastReviewedAt | Word.lastReviewedAt | Recency |

## Quality Score Mapping
Current implementation: boolean correctness + responseTime -> quality (0–5)
| Condition | Quality |
|-----------|---------|
| incorrect | 0 |
| correct & <3s | 5 |
| correct & <8s | 4 |
| correct & <15s | 3 |
| correct & >=15s | 3 |

## SM-2 Core (Simplified)
```
if quality >=3:
  if repetition == 0: interval = 1
  else if repetition == 1: interval = 6
  else: interval = round(interval * easeFactor)
  repetition += 1
else:
  repetition = 0
  interval = 1

// Ease factor update
EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
Clamp(EF', 1.3, 2.5)
```

## Difficulty Adjustment Layer
Separate multiplier (0.8 easy / 1.0 normal / 1.5 hard) from rolling performance history (last 10 attempts).
EffectiveInterval = interval * difficultyMultiplier (rounded, min 1)

## Status Promotion Logic
| From | To | Condition |
|------|----|-----------|
| unknown | learning | reviewCount >0 OR first correct |
| learning | known | srsRepetition >=5 AND srsEaseFactor >=2.0 |
| known | learning | accuracy <0.6 over last 5 attempts (future) |

## Client Responsibilities
- Display due count (wordsForReview) from advanced stats
- For quiz: prioritize due words then fill with learning/unknown
- Show spaced preview: today/tomorrow/thisWeek counts (server computed)

## Edge Cases
| Case | Handling |
|------|----------|
| Word newly added | srsRepetition=0, interval=1 day |
| Long inactivity | nextReviewDate passed -> due immediately |
| Interval inflation (EF high) | natural clamp by EF max 2.5 |
| Rapid failures | repetition reset, interval=1 |

## Future Enhancements
- Lapse handling: track lapseCount, apply EF penalty (−0.2) after failure streak
- Leech detection: failures ≥ 5 → flag for manual study
- Multiple algorithms: add algorithmVersion field
- Adaptive initial interval based on difficulty setting
- Known word reinjection: 10% (Phase 2, config `knownReinjectionRatio`)

## API Additions (Proposed)
- GET /api/learning/advanced -> enriched stats (already partially implemented)
- GET /api/words/due -> explicit list (pagination ready)
- POST /api/quiz/session -> start (questionCount)
- POST /api/quiz/:sessionId/answer -> answer { answerText, responseTimeMs }
- GET /api/quiz/:sessionId/result

## Telemetry (Future)
- quiz_answer {wordId, correct, responseTimeMs}
- srs_transition {wordId, fromStatus, toStatus}

## Open Questions
- Per-language tuning thresholds? (Defer)
- EaseFactor floor dynamic by language? (Defer)
