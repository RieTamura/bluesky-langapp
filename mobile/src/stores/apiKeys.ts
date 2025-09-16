// Placeholder API key store: AI features are disabled in this build.
// Keep the same API surface as the original so imports resolve.

export async function saveApiKey(provider: string, key: string, _opts?: any): Promise<void> {
  // no-op when AI disabled
  return;
}

export async function getApiKey(provider: string): Promise<string | null> {
  return null;
}

export async function deleteApiKey(provider: string): Promise<void> {
  return;
}

export async function hasApiKey(provider: string): Promise<boolean> {
  return false;
}

export async function validateRawKey(provider: string, key: string): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> {
  // Return a deterministic 'ai-disabled' result so tests can be tolerant
  // of either the real implementation or this disabled stub.
  if (provider !== 'openai' && provider !== 'anthropic') {
    return { ok: false, error: 'unsupported-provider' };
  }
  return { ok: false, error: 'ai-disabled' };
}

export async function validateApiKey(provider: string): Promise<boolean> {
  const r = await validateRawKey(provider, '');
  return !!r.ok;
}

export default {
  saveApiKey,
  getApiKey,
  deleteApiKey,
  hasApiKey,
  validateRawKey,
  validateApiKey,
};
