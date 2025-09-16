// Placeholder API key store: AI features are disabled in this build.
// Keep the same API surface as the original so imports resolve.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveApiKey(_provider: string, _key: string, _opts?: any): Promise<void> {
  // no-op when AI disabled
  return;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getApiKey(_provider: string): Promise<string | null> {
  return null;
}

export async function deleteApiKey(_provider: string): Promise<void> {
  return;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function hasApiKey(_provider: string): Promise<boolean> {
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function validateRawKey(_provider: string, _key: string): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  // Return a deterministic 'ai-disabled' result so tests can be tolerant
  // of either the real implementation or this disabled stub.
  if (_provider !== 'openai' && _provider !== 'anthropic') {
    return { ok: false, error: 'unsupported-provider' };
  }
  return { ok: false, error: 'ai-disabled' };
}

export async function validateApiKey(provider: string): Promise<boolean> {
  // Attempt to retrieve a stored API key for the provider and validate it.
  // If no key is stored, pass an empty string to the validator (the
  // placeholder validateRawKey will return a deterministic 'ai-disabled').
  const key = await getApiKey(provider as any);
  const r = await validateRawKey(provider, key ?? '');
  return Boolean(r?.ok);
}

export default {
  saveApiKey,
  getApiKey,
  deleteApiKey,
  hasApiKey,
  validateRawKey,
  validateApiKey,
};
