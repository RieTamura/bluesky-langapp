import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY_PREFIX = 'apiKey:';

export async function saveApiKey(provider: string, key: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY_PREFIX + provider, key);
}

export async function getApiKey(provider: string): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEY_PREFIX + provider);
}

export async function deleteApiKey(provider: string): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY_PREFIX + provider);
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

  if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/models';
    headers['Authorization'] = `Bearer ${key}`;
  } else if (provider === 'anthropic') {
    // Anthropic may accept Bearer or x-api-key depending on account; try Bearer first.
    endpoint = 'https://api.anthropic.com/v1/models';
    headers['Authorization'] = `Bearer ${key}`;
  } else {
    return false;
  }

  try {
    const res = await fetch(endpoint, { method: 'GET', headers });
    return res.ok;
  } catch (e) {
    return false;
  }
}
