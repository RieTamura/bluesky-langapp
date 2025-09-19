import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

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

async function makeCacheKeyAsync(text: string, targetLang: string) {
  // Normalize text: trim, normalize newlines to \n and collapse repeated newlines
  const normalized = (text || '').trim().replace(/\r\n|\r/g, '\n').replace(/\n+/g, '\n');

  // Validate or encode targetLang to a safe token (allow common language tag chars)
  const safeLang = /^[A-Za-z0-9_-]+$/.test(targetLang) ? targetLang : encodeURIComponent(targetLang);

  // Use expo-crypto to compute SHA-256 hex digest
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);

  const rawKey = `${CACHE_PREFIX}${safeLang}:${hash}`;

  // Ensure key length is within a safe limit for AsyncStorage/platforms. Truncate if necessary.
  const MAX_KEY_LENGTH = 1024; // conservative limit
  if (rawKey.length <= MAX_KEY_LENGTH) return rawKey;
  return rawKey.slice(0, MAX_KEY_LENGTH);
}

// synchronous wrapper (not recommended) - returns a placeholder if called synchronously
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
function makeCacheKey(text: string, targetLang: string) {
  // callers should use makeCacheKeyAsync; fallback to a simple encoded key
  const safeLang = /^[A-Za-z0-9_-]+$/.test(targetLang) ? targetLang : encodeURIComponent(targetLang);
  const truncated = (text || '').slice(0, 128).replace(/\r\n|\r/g, '\n').replace(/\n+/g, '\n');
  return `${CACHE_PREFIX}${safeLang}:${encodeURIComponent(truncated)}`;
}



async function getFromCache(text: string, targetLang: string, ttl = DEFAULT_TTL_MS): Promise<TranslationResult | null> {
  try {
    const key = await makeCacheKeyAsync(text, targetLang);
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
  const key = await makeCacheKeyAsync(text, targetLang);
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
  try {
    const res = await provider.translate(text, targetLang);
    // store to cache after successful translation
    await setCache(text, targetLang, res);
    return res;
  } catch (e) {
    // log the provider error and fall back to cache or a safe default
    // eslint-disable-next-line no-console
    console.error('[translation] provider.translate failed:', e);
    if (cached) return cached;
    return { text: '' };
  }
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
    try {
      const fetched = await provider.translateBatch(texts, targetLang);
      // validate fetched
      let valid = Array.isArray(fetched) && fetched.length === texts.length;
      if (valid) {
        for (let j = 0; j < fetched.length; j++) {
          const item = fetched[j];
          if (!item || typeof item.text !== 'string') {
            valid = false;
            break;
          }
        }
      }
      if (!valid) throw new Error('Invalid batch translation result');

      // assign results and perform cache writes in parallel
      const cachePromises: Promise<void>[] = [];
      for (let j = 0; j < fetched.length; j++) {
        const idx = toFetch[j].index;
        results[idx] = fetched[j];
        cachePromises.push(
          setCache(toFetch[j].text, targetLang, fetched[j]).catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[translation] setCache failed for batch item:', toFetch[j].text, err);
          })
        );
      }
      await Promise.all(cachePromises);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[translation] provider.translateBatch failed or invalid result:', e);
      // fallback: perform per-item translations with bounded concurrency
      const CONCURRENCY = 5;
      const tasks: Array<() => Promise<void>> = [];
      const cachePromises: Promise<void>[] = [];
      for (const t of toFetch) {
        tasks.push(async () => {
          try {
            const r = await provider.translate(t.text, targetLang);
            results[t.index] = r;
            cachePromises.push(
              setCache(t.text, targetLang, r).catch((err) => {
                // eslint-disable-next-line no-console
                console.error('[translation] setCache failed for item:', t.text, err);
              })
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[translation] provider.translate per-item failed for:', t.text, err);
            const c = await getFromCache(t.text, targetLang);
            if (c) {
              results[t.index] = c;
            } else {
              results[t.index] = { text: '' };
            }
          }
        });
      }
      // run tasks in batches
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY).map((fn) => fn());
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(batch);
      }
      // wait for all cache writes
      await Promise.all(cachePromises);
    }
    return results;
  }
  // fallback to sequential translate
  // When no batch API, perform per-item translations with bounded concurrency
  const CONCURRENCY = 5;
  const tasks: Array<() => Promise<void>> = [];
  const cachePromises: Promise<void>[] = [];
  for (const item of toFetch) {
    tasks.push(async () => {
      try {
        const r = await provider.translate(item.text, targetLang);
        results[item.index] = r;
        cachePromises.push(
          setCache(item.text, targetLang, r).catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[translation] setCache failed for item:', item.text, err);
          })
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[translation] provider.translate failed for item:', item.text, e);
        const c = await getFromCache(item.text, targetLang);
        if (c) {
          results[item.index] = c;
        } else {
          results[item.index] = { text: '' };
        }
      }
    });
  }
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY).map((fn) => fn());
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(batch);
  }
  // wait for cache writes
  await Promise.all(cachePromises);
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
