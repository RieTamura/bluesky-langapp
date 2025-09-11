import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineQueue } from '../stores/offlineQueue';
import { wordsApi } from '../services/api';

/**
 * Hook to process offline queue tasks.
 * - periodically attempts to sync queued tasks
 * - exposes isSyncing, lastSyncAt, pendingCount and syncNow()
 */
export function useSyncQueue(autoStart = true) {
  const qc = useQueryClient();
  const tasks = useOfflineQueue(state => state.tasks);
  const replaceAll = useOfflineQueue(state => state.replaceAll);
  const dequeue = useOfflineQueue(state => state.dequeue);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const syncOnce = useCallback(async () => {
    if (isSyncing) return;
    if (!tasks || tasks.length === 0) return;

    setIsSyncing(true);
    // process a snapshot of tasks sequentially
    for (const task of [...tasks]) {
      try {
        switch (task.type) {
          case 'word.create': {
            // payload is the create body
            await wordsApi.create(task.payload);
            await dequeue(task.id);
            // refresh words queries
            qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
            break;
          }
          case 'word.update': {
            const { id, patch } = task.payload;
            await wordsApi.update(id, patch);
            await dequeue(task.id);
            qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
            break;
          }
          case 'word.delete': {
            const id = task.payload.id || task.payload;
            await wordsApi.remove(id);
            await dequeue(task.id);
            qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey[0] === 'words' });
            break;
          }
          case 'quiz.answer': {
            // Not implemented server endpoint for queued quiz answers in this version
            // Just drop the task to avoid blocking other syncs
            await dequeue(task.id);
            break;
          }
          default: {
            // Unknown task types: remove after a few retries
            await dequeue(task.id);
            break;
          }
        }
      } catch (e: any) {
        // If network offline, stop processing and leave queue intact
        if (e?.error === 'NETWORK_OFFLINE' || e?.status === 0) {
          break;
        }

        // Other errors: increment retries, persist, and if exceeded, drop
        const updated = (tasks || []).map(t => t.id === task.id ? { ...t, retries: (t.retries || 0) + 1 } : t);
        replaceAll(updated);
        const current = updated.find(t => t.id === task.id);
        if (current && (current.retries || 0) > 3) {
          // give up after 3 retries
          await dequeue(task.id);
        }
        // continue with next task
      }
    }

    setLastSyncAt(Date.now());
    setIsSyncing(false);
  }, [tasks, isSyncing, qc, replaceAll, dequeue]);

  useEffect(() => {
    if (!autoStart) return;
    // try immediately, then periodically
    syncOnce().catch(() => {});
    const id = setInterval(() => { syncOnce().catch(() => {}); }, 10000);
    return () => clearInterval(id);
  }, [autoStart, syncOnce]);

  return { isSyncing, lastSyncAt, pendingCount: tasks.length, syncNow: syncOnce };
}
