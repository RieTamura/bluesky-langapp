// Archived original: src/stores/apiKeys.ts
// This file was archived because AI features are temporarily disabled.
// Original implementation saved for reference.

import * as SecureStore from 'expo-secure-store';
import { ANTHROPIC_VERSION, OPENAI_API_VERSION } from '../config/apiVersions';

// Use a dot in the storage prefix because SecureStore disallows ':' in keys on some platforms
const STORAGE_KEY_PREFIX = 'apiKey.';
// Keep a legacy prefix for migration from older installs that used ':'
const LEGACY_STORAGE_KEY_PREFIX = 'apiKey:';

function normalizeProvider(provider: string) {
  return provider
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
}

function canonicalProvider(provider: string) {
  return provider.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function saveApiKey(
  provider: string,
  key: string,
  options?: SecureStore.SecureStoreOptions | undefined
): Promise<void> {
  const name = STORAGE_KEY_PREFIX + normalizeProvider(provider);
  await SecureStore.setItemAsync(name, key, options);
  try {
    const legacyName = LEGACY_STORAGE_KEY_PREFIX + normalizeProvider(provider);
    if (legacyName !== name) {
      const old = await SecureStore.getItemAsync(legacyName);
      if (old != null) {
        await SecureStore.deleteItemAsync(legacyName);
      }
    }
  } catch (e) {}
}

export async function getApiKey(provider: string): Promise<string | null> {
  const name = STORAGE_KEY_PREFIX + normalizeProvider(provider);
  let val = await SecureStore.getItemAsync(name);
  if (val != null) return val;
  try {
    const legacyName = LEGACY_STORAGE_KEY_PREFIX + normalizeProvider(provider);
    const legacyVal = await SecureStore.getItemAsync(legacyName);
    if (legacyVal != null) {
      await SecureStore.setItemAsync(name, legacyVal);
      await SecureStore.deleteItemAsync(legacyName);
      return legacyVal;
    }
  } catch (e) {}
  return null;
}

export async function deleteApiKey(provider: string): Promise<void> {
  const name = STORAGE_KEY_PREFIX + normalizeProvider(provider);
  await SecureStore.deleteItemAsync(name);
  try {
    const legacyName = LEGACY_STORAGE_KEY_PREFIX + normalizeProvider(provider);
    if (legacyName !== name) await SecureStore.deleteItemAsync(legacyName);
  } catch (e) {}
}

export async function hasApiKey(provider: string): Promise<boolean> {
  const k = await getApiKey(provider);
  return !!k;
}

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

export async function validateApiKey(provider: string): Promise<boolean> {
  const key = await getApiKey(provider);
  if (!key) return false;
  const r = await validateRawKey(provider, key);
  return !!r.ok;
}
