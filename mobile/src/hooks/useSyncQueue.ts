import { useCallback, useEffect, useRef, useState } from 'react';
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

  const tasksRef = useRef(tasks);
  const isSyncingRef = useRef(isSyncing);

  // keep refs up-to-date with latest state
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);

  const syncOnce = useCallback(async () => {
    if (isSyncingRef.current) return;
    const currentTasks = tasksRef.current;
    if (!currentTasks || currentTasks.length === 0) return;

    setIsSyncing(true);
    isSyncingRef.current = true;
    // process a snapshot of tasks sequentially
    for (const task of [...currentTasks]) {
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
        // inspect status (supports various error shapes)
        const status = e?.status || e?.response?.status;

        // If network offline, stop processing and leave queue intact.
        // Detect multiple shapes: custom offline flag, numeric status 0, axios/no-response, common OS error codes,
        // error messages containing network/timeout, and navigator.onLine === false when available.
        const errCode = (e && (e.code || e.errno || e.error)) ? String(e.code || e.errno || e.error).toLowerCase() : '';
        const errMsg = (e && e.message) ? String(e.message).toLowerCase() : '';
        const hasNoResponse = !!(e && !e.response && (e.request || e.code || e.message));

        const networkErrCodes = ['enotfound', 'econnrefused', 'econnreset', 'etimedout', 'ehostunreach', 'eai_again', 'ecanceled'];
        const msgLooksOffline = errMsg.includes('network error') || errMsg.includes('timeout') || errMsg.includes('networkrequestfailed') || errMsg.includes('socket hang up');

        const navigatorOffline = (typeof navigator !== 'undefined' && (navigator as any).onLine === false);

        const isOffline = (
          e?.error === 'NETWORK_OFFLINE' ||
          status === 0 ||
          (hasNoResponse && (msgLooksOffline || networkErrCodes.some(c => errCode.includes(c)))) ||
          navigatorOffline
        );

        if (isOffline) {
          // Leave the queue intact for next sync attempt when network returns
          break;
        }

        // Permanent client errors (400-499) except 429: do not retry, drop immediately
        if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) {
          await dequeue(task.id);
          // continue with next task
          continue;
        }

        // Transient errors (5xx, 429) or unknown: increment retries, persist, and drop after >3
        const updated = (tasksRef.current || []).map(t => t.id === task.id ? { ...t, retries: (t.retries || 0) + 1 } : t);
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
    isSyncingRef.current = false;
  }, [tasks, isSyncing, qc, replaceAll, dequeue]);

  // Make a ref to the latest syncOnce so the interval can call the latest implementation
  const syncOnceRef = useRef(syncOnce);
  useEffect(() => { syncOnceRef.current = syncOnce; }, [syncOnce]);

  useEffect(() => {
    if (!autoStart) return;
    // try immediately, then periodically
    // call via ref to avoid effect rerunning when syncOnce identity changes
    syncOnceRef.current().catch(() => {});
    const id = setInterval(() => { syncOnceRef.current().catch(() => {}); }, 10000);
    return () => clearInterval(id);
  }, [autoStart]);

  // expose a stable syncNow that calls the latest implementation
  const syncNow = useCallback(() => syncOnceRef.current(), []);

  return { isSyncing, lastSyncAt, pendingCount: tasks.length, syncNow };
}
