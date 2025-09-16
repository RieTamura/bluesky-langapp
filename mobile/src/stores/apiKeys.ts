// AI features have been disabled. This file provides a minimal, non-networking
// implementation that preserves the original function names so imports do not break.
// The original implementation has been moved to `mobile/ai-archive/apiKeys.ts`.

const removedMsg = 'AI-related module removed from src; original archived at mobile/ai-archive/apiKeys.ts';

function removed() {
  throw new Error(removedMsg);
}

export const saveApiKey = removed as any;
export const getApiKey = removed as any;
export const deleteApiKey = removed as any;
export const hasApiKey = removed as any;
export const validateRawKey = removed as any;
export const validateApiKey = removed as any;
