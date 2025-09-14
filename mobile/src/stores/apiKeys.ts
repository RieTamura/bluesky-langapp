import * as SecureStore from 'expo-secure-store';
import { ANTHROPIC_VERSION, OPENAI_API_VERSION } from '../config/apiVersions';

const STORAGE_KEY_PREFIX = 'apiKey:';

// Normalize provider identifier used for storage keys.
// - trim whitespace
// - lower-case
// - collapse internal whitespace runs to a single dash
function normalizeProvider(provider: string) {
  return provider.trim().toLowerCase().replace(/\s+/g, '-');
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
  await SecureStore.setItemAsync(STORAGE_KEY_PREFIX + normalizeProvider(provider), key, options);
}

export async function getApiKey(provider: string): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEY_PREFIX + normalizeProvider(provider));
}

export async function deleteApiKey(provider: string): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY_PREFIX + normalizeProvider(provider));
}

export async function hasApiKey(provider: string): Promise<boolean> {
  const k = await getApiKey(provider);
  return !!k;
}

// Validate stored API key by hitting a lightweight provider endpoint.
// Returns true if the key appears valid (HTTP 200-range). This is a best-effort check
// and may need provider-specific header adjustments.
export async function validateApiKey(provider: string): Promise<boolean> {
  const key = await getApiKey(provider);
  if (!key) return false;
  let endpoint = '';
  const headers: Record<string, string> = {};

  const canonical = canonicalProvider(provider);

  if (canonical === 'openai') {
    endpoint = 'https://api.openai.com/v1/models';
    headers['Authorization'] = `Bearer ${key}`;
    // Include version header for OpenAI if desired (adjust header name if provider expects different key)
    headers['OpenAI-Version'] = OPENAI_API_VERSION;
  } else if (canonical === 'anthropic') {
    // Anthropic requires x-api-key and an anthropic-version header for the /v1/messages/models endpoints
    endpoint = 'https://api.anthropic.com/v1/models';
    headers['x-api-key'] = key;
    headers['anthropic-version'] = ANTHROPIC_VERSION;
  } else {
    return false;
  }

  let timeoutId: any = null;
  const controller = new AbortController();
  try {
    timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(endpoint, { method: 'GET', headers, signal: controller.signal });
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    return res.ok;
  } catch (e: any) {
    // Treat aborts and other errors as validation failure
    if (e && e.name === 'AbortError') {
      return false;
    }
    return false;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
