/* eslint-disable @typescript-eslint/no-unused-vars */
import { TranslatorProvider, TranslationResult } from '../../services/translation';

// Simple Free Dictionary provider (dictionaryapi.dev)
// Assumptions:
// - This provider is a lightweight fallback. It attempts to look up the first
//   word-like token from the input text and returns the first definition found.
// - It is NOT a full translation service. For multi-word sentences it will
//   generally return an empty translation. This matches the user's note that
//   the Free Dictionary API is a fallback.

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const FreeDictionaryProvider: TranslatorProvider = {
  async translate(text: string, _targetLang: string): Promise<TranslationResult> {
    if (!text) return { text: '' };
    // extract a plausible word token (letters, apostrophes, hyphens)
    const m = String(text).match(/([\p{L}'’-]+)/u);
    if (!m) return { text: '' };
    const word = m[1];
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(word.toLowerCase())}`);
      if (!res.ok) return { text: '' };
      const body = await res.json();
      if (!Array.isArray(body) || body.length === 0) return { text: '' };
      // pick first meaning and first definition if available
      const entry: any = body[0];
      const meaning = entry.meanings && entry.meanings[0];
      const def = meaning && meaning.definitions && meaning.definitions[0] && meaning.definitions[0].definition;
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
    // naive availability: try a tiny HEAD/fetch to base url (but avoid heavy calls)
    try {
      const r = await fetch(API_BASE + '/test');
      // dictionaryapi.dev returns 404 for unknown word; treat reachable host as available
      return r.status !== 0;
    } catch (e) {
      return false;
    }
  }
};

export default FreeDictionaryProvider;
