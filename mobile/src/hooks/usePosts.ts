import { useQuery } from '@tanstack/react-query';
import { postsApi } from '../services/api';

export function useUserPosts(identifier: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ['posts','user', identifier, limit],
    enabled: !!identifier,
    queryFn: async () => {
      if (!identifier) return [];
      const res = await postsApi.listUser(identifier, limit);
      return (res as any).data || res;
    }
  });
}

export function useFollowingFeed(limit = 20) {
  return useQuery({
    queryKey: ['posts','following', limit],
    queryFn: async () => {
      const res = await postsApi.following(limit);
      return (res as any).data || res;
    }
  });
}

export function useDiscoverFeed(limit = 20) {
  return useQuery({
    queryKey: ['posts','discover', limit],
    queryFn: async () => {
      const res = await postsApi.discover(limit);
      return (res as any).data || res;
    }
  });
}
