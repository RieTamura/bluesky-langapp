import * as SecureStore from 'expo-secure-store';
import { ANTHROPIC_VERSION, OPENAI_API_VERSION } from '../config/apiVersions';

// Use a dot in the storage prefix because SecureStore disallows ':' in keys on some platforms
const STORAGE_KEY_PREFIX = 'apiKey.';
// Keep a legacy prefix for migration from older installs that used ':'
const LEGACY_STORAGE_KEY_PREFIX = 'apiKey:';

// Normalize provider identifier used for storage.
// - trim whitespace
// - lower-case
// - collapse internal whitespace runs to a single dash
// - remove any characters not allowed by SecureStore key constraints
//   (allowed: alphanumeric, '.', '-', '_')
function normalizeProvider(provider: string) {
  return provider
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    // remove characters not in the allowed set
    .replace(/[^a-z0-9._-]+/g, '')
    // collapse repeated dashes
    .replace(/-+/g, '-')
    // trim allowed punctuation from ends
    .replace(/^[-_.]+|[-_.]+$/g, '');
}

// Canonicalize provider for comparison (remove non-alphanumeric characters)
// e.g. 'open ai' -> 'openai', 'open-ai' -> 'openai'
function canonicalProvider(provider: string) {
  return provider.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Save an API key for a provider into secure storage.
 *
 * @param provider - Provider identifier (will be normalized for storage). Examples: 'openai', 'Anthropic', 'open ai'
 * @param key - The API key string to store
 * @param options - Optional `SecureStore` options (e.g. `{ requireAuthentication: true }` on supported platforms).
 *                  If omitted, the platform default behavior is used.
 */
export async function saveApiKey(
  provider: string,
  key: string,
  options?: SecureStore.SecureStoreOptions | undefined
): Promise<void> {
  const name = STORAGE_KEY_PREFIX + normalizeProvider(provider);
  await SecureStore.setItemAsync(name, key, options);

  // If an old legacy key exists with ':' prefix, remove it to avoid duplicates.
  try {
    const legacyName = LEGACY_STORAGE_KEY_PREFIX + normalizeProvider(provider);
    if (legacyName !== name) {
      const old = await SecureStore.getItemAsync(legacyName);
      if (old != null) {
        await SecureStore.deleteItemAsync(legacyName);
      }
    }
  } catch (e) {
    // ignore migration errors
  }
}

export async function getApiKey(provider: string): Promise<string | null> {
  const name = STORAGE_KEY_PREFIX + normalizeProvider(provider);
  let val = await SecureStore.getItemAsync(name);
  if (val != null) return val;

  // Attempt to read legacy key and migrate it to new prefix if found
  try {
    const legacyName = LEGACY_STORAGE_KEY_PREFIX + normalizeProvider(provider);
    const legacyVal = await SecureStore.getItemAsync(legacyName);
    if (legacyVal != null) {
      // migrate to new key and remove legacy
      await SecureStore.setItemAsync(name, legacyVal);
      await SecureStore.deleteItemAsync(legacyName);
      return legacyVal;
    }
  } catch (e) {
    // ignore migration errors
  }

  return null;
}

export async function deleteApiKey(provider: string): Promise<void> {
  const name = STORAGE_KEY_PREFIX + normalizeProvider(provider);
  await SecureStore.deleteItemAsync(name);
  // Also ensure legacy key is deleted if present
  try {
    const legacyName = LEGACY_STORAGE_KEY_PREFIX + normalizeProvider(provider);
    if (legacyName !== name) await SecureStore.deleteItemAsync(legacyName);
  } catch (e) {
    // ignore
  }
}

export async function hasApiKey(provider: string): Promise<boolean> {
  const k = await getApiKey(provider);
  return !!k;
}

// Validate a raw API key by provider. Returns structured result with ok/status/body/error
export async function validateRawKey(provider: string, key: string): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  if (!key) return { ok: false, error: 'no-key' };
  let endpoint = '';
  const headers: Record<string, string> = {};
  const canonical = canonicalProvider(provider);

  if (canonical === 'openai') {
    endpoint = 'https://api.openai.com/v1/models';
    headers['Authorization'] = `Bearer ${key}`;
    headers['OpenAI-Version'] = OPENAI_API_VERSION;
  } else if (canonical === 'anthropic') {
    endpoint = 'https://api.anthropic.com/v1/models';
    headers['x-api-key'] = key;
    headers['anthropic-version'] = ANTHROPIC_VERSION;
  } else {
    return { ok: false, error: 'unsupported-provider' };
  }

  const controller = new AbortController();
  let timeoutId: any = null;
  try {
    timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(endpoint, { method: 'GET', headers, signal: controller.signal });
    const text = await res.text().catch(() => '');
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    return { ok: res.ok, status: res.status, body: text };
  } catch (e: any) {
    if (e && e.name === 'AbortError') return { ok: false, error: 'timeout' };
    return { ok: false, error: e?.message || String(e) };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Validate stored API key by hitting a lightweight provider endpoint.
// Returns true if the key appears valid (HTTP 200-range). This is a best-effort check
// and may need provider-specific header adjustments.
export async function validateApiKey(provider: string): Promise<boolean> {
  const key = await getApiKey(provider);
  if (!key) return false;
  const r = await validateRawKey(provider, key);
  return !!r.ok;
}
