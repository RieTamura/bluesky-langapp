import AsyncStorage from '@react-native-async-storage/async-storage';

export type TranslationResult = {
  text: string;
  detectedLanguage?: string | null;
};

export type TranslatorProvider = {
  translate: (text: string, targetLang: string) => Promise<TranslationResult>;
  translateBatch?: (items: string[], targetLang: string) => Promise<TranslationResult[]>;
  isAvailable: () => Promise<boolean>;
};

// Default mock provider: returns the original text prefixed to indicate mock
const MockProvider: TranslatorProvider = {
  async translate(text: string, targetLang: string) {
    return { text: `[mock ${targetLang}] ${text}`, detectedLanguage: 'en' };
  },
  async translateBatch(items: string[], targetLang: string) {
    return items.map((t) => ({ text: `[mock ${targetLang}] ${t}`, detectedLanguage: 'en' }));
  },
  async isAvailable() { return true; }
};

// Singleton provider - can be replaced at runtime by native/cloud provider
let provider: TranslatorProvider = MockProvider;

export function setTranslatorProvider(p: TranslatorProvider) {
  provider = p;
}

// Simple AsyncStorage-backed cache with TTL and maxEntries (LRU-like by timestamp)
const CACHE_PREFIX = 'translation_cache_v1:';
const INDEX_KEY = `${CACHE_PREFIX}__index`;
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const DEFAULT_MAX_ENTRIES = 1000;

type CacheEntry = {
  key: string;
  createdAt: number;
  accessedAt: number;
  value: TranslationResult;
};

async function loadIndex(): Promise<Record<string, { createdAt: number; accessedAt: number }>> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

async function saveIndex(index: Record<string, { createdAt: number; accessedAt: number }>) {
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    // ignore
  }
}

function makeCacheKey(text: string, targetLang: string) {
  // Simple stable key; could be improved with hashing for long texts
  return `${CACHE_PREFIX}${targetLang}:${text}`;
}

async function getFromCache(text: string, targetLang: string, ttl = DEFAULT_TTL_MS): Promise<TranslationResult | null> {
  try {
    const key = makeCacheKey(text, targetLang);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    const now = Date.now();
    if (entry.createdAt + ttl < now) {
      // expired
      await AsyncStorage.removeItem(key);
      const idx = await loadIndex();
      delete idx[key];
      await saveIndex(idx);
      return null;
    }
    // update accessedAt
    entry.accessedAt = now;
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    const idx = await loadIndex();
    idx[key] = { createdAt: entry.createdAt, accessedAt: entry.accessedAt };
    await saveIndex(idx);
    return entry.value;
  } catch (e) {
    return null;
  }
}

async function setCache(text: string, targetLang: string, value: TranslationResult, maxEntries = DEFAULT_MAX_ENTRIES) {
  try {
    const key = makeCacheKey(text, targetLang);
    const now = Date.now();
    const entry: CacheEntry = { key, createdAt: now, accessedAt: now, value };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    const idx = await loadIndex();
    idx[key] = { createdAt: entry.createdAt, accessedAt: entry.accessedAt };
    // enforce max entries (simple LRU eviction based on accessedAt)
    const keys = Object.keys(idx);
    if (keys.length > maxEntries) {
      const sorted = keys.sort((a, b) => (idx[a].accessedAt || 0) - (idx[b].accessedAt || 0));
      const toDelete = sorted.slice(0, keys.length - maxEntries);
      for (const k of toDelete) {
        await AsyncStorage.removeItem(k).catch(() => {});
        delete idx[k];
      }
    }
    await saveIndex(idx);
  } catch (e) {
    // ignore cache errors
  }
}

export async function translate(text: string, targetLang: string): Promise<TranslationResult> {
  if (!text) return { text: '' };
  // try cache first
  const cached = await getFromCache(text, targetLang);
  if (cached) return cached;
  const res = await provider.translate(text, targetLang);
  // store to cache
  await setCache(text, targetLang, res);
  return res;
}

export async function translateBatch(items: string[], targetLang: string): Promise<TranslationResult[]> {
  if (!items || items.length === 0) return [];
  const results: TranslationResult[] = [];
  const toFetch: Array<{ index: number; text: string }> = [];
  // first, try cache for each
  for (let i = 0; i < items.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const c = await getFromCache(items[i], targetLang);
    if (c) {
      results[i] = c;
    } else {
      toFetch.push({ index: i, text: items[i] });
    }
  }
  if (toFetch.length === 0) return results;
  // if provider has batch, use it
  if (provider.translateBatch) {
    const texts = toFetch.map((t) => t.text);
    const fetched = await provider.translateBatch(texts, targetLang);
    for (let j = 0; j < fetched.length; j++) {
      const idx = toFetch[j].index;
      results[idx] = fetched[j];
      // eslint-disable-next-line no-await-in-loop
      await setCache(toFetch[j].text, targetLang, fetched[j]);
    }
    return results;
  }
  // fallback to sequential translate
  for (const item of toFetch) {
    // eslint-disable-next-line no-await-in-loop
    const r = await provider.translate(item.text, targetLang);
    results[item.index] = r;
    // eslint-disable-next-line no-await-in-loop
    await setCache(item.text, targetLang, r);
  }
  return results;
}

export async function isTranslatorAvailable(): Promise<boolean> {
  return provider.isAvailable();
}

export default {
  translate,
  translateBatch,
  setTranslatorProvider,
  isTranslatorAvailable,
};
