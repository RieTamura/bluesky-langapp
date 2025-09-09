import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wordsApi } from '../services/api';
import { useOfflineQueue, OfflineState } from '../stores/offlineQueue';

export interface WordItem {
  id: string;
  word: string;
  status: 'unknown' | 'learning' | 'known';
  languageCode?: string;
  definition?: string;
  exampleSentence?: string;
  reviewCount?: number;
  correctCount?: number;
  lastReviewedAt?: string;
}

const WORDS_KEY = (lang?: string, status?: string) => ['words', lang || 'all', status || 'all'];

export function useWords(params: { languageCode?: string; status?: string } = {}) {
  const { languageCode, status } = params;
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: WORDS_KEY(languageCode, status),
    queryFn: async () => {
      const res = await wordsApi.list({ languageCode, status });
      return res.data as WordItem[];
    }
  });

  const enqueue = useOfflineQueue((state: OfflineState) => state.enqueue);

  const createMutation = useMutation({
    mutationFn: async (payload: { word: string; languageCode?: string; definition?: string; exampleSentence?: string }) => {
      try {
        return (await wordsApi.create(payload)).data as WordItem;
      } catch (e: any) {
        if (e?.error === 'NETWORK_OFFLINE' || e?.error === 'AUTH_REQUIRED') {
          await enqueue({ type: 'word.create', payload, });
          return { id: `temp_${Date.now()}`, word: payload.word, status: 'unknown' } as WordItem;
        }
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WORDS_KEY(languageCode, status) })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WordItem> }) => {
      try {
        return (await wordsApi.update(id, patch)).data as WordItem;
      } catch (e: any) {
        if (e?.error === 'NETWORK_OFFLINE') {
          await enqueue({ type: 'word.update', payload: { id, patch } });
          return { id, word: patch.word || 'pending', status: (patch.status as any) || 'learning' } as WordItem;
        }
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WORDS_KEY(languageCode, status) })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await wordsApi.remove(id);
        return id;
      } catch (e: any) {
        if (e?.error === 'NETWORK_OFFLINE') {
          await enqueue({ type: 'word.delete', payload: { id } });
          return id;
        }
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WORDS_KEY(languageCode, status) })
  });

  const addWord = useCallback((word: string, lang?: string) => {
    createMutation.mutate({ word, languageCode: lang || languageCode });
  }, [createMutation, languageCode]);

  const updateStatus = useCallback((id: string, status: WordItem['status']) => {
    updateMutation.mutate({ id, patch: { status } });
  }, [updateMutation]);

  const removeWord = useCallback((id: string) => { deleteMutation.mutate(id); }, [deleteMutation]);

  return {
    words: listQuery.data || [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    refetch: listQuery.refetch,
    addWord,
    updateStatus,
    removeWord,
    createState: createMutation,
    updateState: updateMutation,
    deleteState: deleteMutation
  };
}
