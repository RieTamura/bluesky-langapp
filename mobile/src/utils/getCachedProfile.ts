import { QueryClient } from '@tanstack/react-query';

export type Profile = {
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  [key: string]: any;
};

function isProfile(obj: any): obj is Profile {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.handle !== 'string') return false;
  if ('displayName' in obj && obj.displayName != null && typeof obj.displayName !== 'string') return false;
  if ('description' in obj && obj.description != null && typeof obj.description !== 'string') return false;
  if ('avatar' in obj && obj.avatar != null && typeof obj.avatar !== 'string') return false;
  return true;
}

// Search the react-query cache for profile data in the same priority order
// used elsewhere: ['profile','atproto', identifier], ['profile','me'], ['auth','me']
// Suppress errors from getQueryData and only return a fully validated Profile
// (either the object itself or the `.user` wrapper) or undefined.
export const getCachedProfile = (qc: QueryClient, identifier?: string | null): Profile | undefined => {
  const keys = [ ['profile','atproto', identifier], ['profile','me'], ['auth','me'] ] as const;
  for (const k of keys) {
    try {
      const v = qc.getQueryData<any>(k as any);
      if (v === undefined) continue;
      // If wrapper with user
      if (v && typeof v === 'object' && 'user' in v && isProfile((v as any).user)) return (v as any).user as Profile;
      // If direct profile
      if (isProfile(v)) return v as Profile;
    } catch (e) {
      // ignore and continue
    }
  }
  return undefined;
};

export default getCachedProfile;
