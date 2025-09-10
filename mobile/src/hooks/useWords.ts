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

  // Remove punctuation/symbols from the word before registering. Keep internal apostrophes and dashes.
  const sanitizeForRegistration = (w: string) => {
    if (!w) return w;
    // Trim and remove surrounding punctuation or symbols, but keep internal apostrophes/hyphens and letters/digits.
    const m = w.trim().match(/^([\p{L}\p{N}'\u2019\-][\p{L}\p{N}'\u2019\-\s]*)$/u);
    if (m) return m[1].trim();
    // Fallback: remove punctuation from edges and collapse internal zero-widths
    return w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '').replace(/[\u200B\uFEFF]/g, '').trim();
  };

  const addWord = useCallback((word: string, lang?: string) => {
    const sanitized = sanitizeForRegistration(word);
    if (!sanitized) return; // don't register empty strings or pure punctuation
    createMutation.mutate({ word: sanitized, languageCode: lang || languageCode });
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
