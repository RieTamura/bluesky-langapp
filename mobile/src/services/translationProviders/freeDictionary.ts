import { TranslatorProvider, TranslationResult } from '../../services/translation';

// Simple Free Dictionary provider (dictionaryapi.dev)
// Assumptions:
// - This provider is a lightweight fallback. It attempts to look up the first
//   word-like token from the input text and returns the first definition found.
// - It is NOT a full translation service. For multi-word sentences it will
//   generally return an empty translation. This matches the user's note that
//   the Free Dictionary API is a fallback.

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Minimal types for the dictionary API response
type Definition = {
  definition?: string;
  // other fields intentionally omitted
};

type Meaning = {
  partOfSpeech?: string;
  definitions?: Definition[];
};

type Entry = {
  word?: string;
  phonetics?: any[];
  meanings?: Meaning[];
};

function isValidBody(b: unknown): b is Entry[] {
  if (!Array.isArray(b) || b.length === 0) return false;
  const first = b[0];
  if (!first || typeof first !== 'object') return false;
  // meanings should be an array if present
  const meanings = (first as any).meanings;
  if (meanings === undefined) return true; // it's acceptable if meanings missing; later checks handle it
  return Array.isArray(meanings);
}

const FreeDictionaryProvider: TranslatorProvider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async translate(text: string, _targetLang: string): Promise<TranslationResult> {
    if (!text) return { text: '' };
  // extract a plausible standalone word token (Unicode letters, apostrophes, hyphens)
  // Use lookbehind/lookahead to ensure we don't match a substring of a larger word.
  // Matches up to 128 chars to avoid extremely long tokens.
  const wordRegex = /(?<![\p{L}'’])([\p{L}][\p{L}'’-]{0,127})(?![\p{L}'’])/u;
  const m = String(text).match(wordRegex);
    if (!m) return { text: '' };
    const word = m[1];
    try {
      const url = `${API_BASE}/${encodeURIComponent(word.toLowerCase())}`;
      let res: Response;
      try {
        res = await fetch(url);
      } catch (netErr) {
        // network-level failure (DNS, connection, CORS, etc.)
        const ne: any = new Error('FreeDictionary network error: ' + (((netErr as any)?.message) || 'network failure'));
        ne.type = 'NetworkError';
        // surface network errors to callers
        throw ne;
      }

      // 404 = word not found -> valid negative result (not an API error)
      if (res.status === 404) {
        return { text: '' };
      }

      // other non-OK statuses -> treat as API error and include status/body for callers
      if (!res.ok) {
        let bodyText = '';
        try { bodyText = await res.text(); } catch (e) { bodyText = res.statusText || ''; }
        const apiErr: any = new Error(`FreeDictionary API error: ${res.status} ${bodyText || res.statusText}`);
        apiErr.status = res.status;
        apiErr.body = bodyText;
        throw apiErr;
      }

      const body = await res.json();
      if (!isValidBody(body)) return { text: '' };
      // pick first meaning and first definition if available (safe after guard)
      const entries = body as Entry[];
      const entry: Entry = entries[0];
      const def: string | undefined = entry.meanings?.[0]?.definitions?.[0]?.definition;
      if (def && typeof def === 'string') {
        return { text: def, detectedLanguage: 'en' };
      }
      return { text: '' };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[free-dict] lookup failed', e);
      return { text: '' };
    }
  },
  async isAvailable() {
    // Check the dictionary entry endpoint for a known token (the API returns
    // 200 for found words and 404 for unknown words). If we can successfully
    // reach that endpoint and receive either OK or 404 it indicates the host
    // is reachable and the service is available.
    try {
      const checkUrl = `${API_BASE}/test`;
      const r = await fetch(checkUrl);
      return r.ok || r.status === 404;
    } catch (e) {
      // network error or other failure -> treat as unavailable
      return false;
    }
  }
};

export default FreeDictionaryProvider;
