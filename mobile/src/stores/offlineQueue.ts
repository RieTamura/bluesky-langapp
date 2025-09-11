import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineTask {
  id: string;
  type: 'word.create' | 'word.update' | 'word.delete' | 'quiz.answer';
  payload: any;
  createdAt: number;
  retries: number;
}

export interface OfflineState {
  tasks: OfflineTask[];
  enqueue: (task: Omit<OfflineTask, 'id' | 'createdAt' | 'retries'>) => Promise<void>;
  dequeue: (id: string) => Promise<void>;
  replaceAll: (tasks: OfflineTask[]) => void;
}

const STORAGE_KEY = 'offline.queue.v1';

export const useOfflineQueue = create<OfflineState>((set, get) => ({
  tasks: [],
  enqueue: async (task: Omit<OfflineTask, 'id' | 'createdAt' | 'retries'>) => {
    const newTask: OfflineTask = { id: `t_${Date.now()}_${Math.random().toString(36).slice(2)}`, createdAt: Date.now(), retries: 0, ...task };
    const tasks = [...get().tasks, newTask];
    set({ tasks });
    // Debug logging: show tasks before persisting
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('[offlineQueue] failed to persist tasks to AsyncStorage:', err);
      throw err;
    }
  },
  dequeue: async (id: string) => {
    const tasks = get().tasks.filter(t => t.id !== id);
    set({ tasks });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('[offlineQueue] failed to persist tasks after dequeue:', err);
      throw err;
    }
  },
  replaceAll: (tasks: OfflineTask[]) => set({ tasks })
}));

export async function loadOfflineQueue() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: OfflineTask[] = JSON.parse(raw);
  useOfflineQueue.getState().replaceAll(parsed);
    }
  } catch {/* ignore */}
}
