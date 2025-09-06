// シンプルなヒューリスティック言語判定 (高精度ではないが依存無しで軽量)
// 必要なら将来サーバー側や ML ライブラリに置き換え可能

export interface DetectResult { code: string; confidence: number; }

const patterns: { code: string; regex: RegExp }[] = [
  { code: 'ja', regex: /[\u3040-\u30ff\u4e00-\u9faf]/ }, // ひらがな / カタカナ / 漢字
  { code: 'ko', regex: /[\uac00-\ud7af]/ },
  { code: 'zh', regex: /[\u3400-\u9fff]/ },
  { code: 'ru', regex: /[\u0400-\u04FF]/ },
  { code: 'ar', regex: /[\u0600-\u06FF]/ },
  { code: 'hi', regex: /[\u0900-\u097F]/ }
];

export function detectLanguage(text: string): DetectResult {
  if (!text.trim()) return { code: 'en', confidence: 0 };
  const scores: { code: string; score: number }[] = [];
  for (const p of patterns) {
    const m = text.match(p.regex);
    if (m) {
      scores.push({ code: p.code, score: m.length });
    }
  }
  if (scores.length === 0) {
    // Alphabet & simple heuristics for Romance vs Germanic could be attempted, keep 'en'
    return { code: 'en', confidence: 0.2 };
  }
  scores.sort((a,b)=> b.score - a.score);
  const top = scores[0];
  const total = scores.reduce((s,x)=> s + x.score, 0);
  return { code: top.code, confidence: top.score / total };
}

// Map to a voice language code supported by expo-speech (subset). Adjust if needed.
export function mapToSpeechCode(code: string): string {
  switch(code) {
    case 'ja': return 'ja-JP';
    case 'ko': return 'ko-KR';
    case 'zh': return 'zh-CN';
    case 'ru': return 'ru-RU';
    case 'ar': return 'ar';
    case 'hi': return 'hi-IN';
    default: return 'en-US';
  }
}