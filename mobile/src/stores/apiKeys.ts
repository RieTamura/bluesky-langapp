// Placeholder store for API key utilities.
// Original implementations have been archived in mobile/ai-archive/apiKeys.ts

export function hasApiKey(_provider?: string): boolean {
  // AI functionality is intentionally disabled in this build.
  // The original implementation accepted an optional provider argument.
  return false;
}

export async function getApiKey(): Promise<string | null> {
  return null;
}

export async function saveApiKey(_provider: string, _key: string): Promise<void> {
  // no-op in disabled mode
}

export async function validateRawKey(provider: string, _key: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  // In disabled mode we return a deterministic result so tests can accept either real validation
  // or this disabled indicator.
  if (provider !== 'openai' && provider !== 'anthropic') {
    return { ok: false, error: 'unsupported-provider' };
  }
  return { ok: false, error: 'ai-disabled' };
}

export async function validateApiKey(provider: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  return validateRawKey(provider, '');
}
// AI features have been disabled. The original implementation has been moved to
// `mobile/ai-archive/apiKeys.ts`. This file supplies minimal functions used by
// the app and tests so imports resolve and network access is avoided.
