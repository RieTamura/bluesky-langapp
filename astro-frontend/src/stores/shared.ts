import { atom } from 'nanostores';

// Shared state for cross-island communication
export interface SharedState {
  selectedWord: string | null;
  showWordModal: boolean;
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    timestamp: number;
  }>;
}

export const sharedStore = atom<SharedState>({
  selectedWord: null,
  showWordModal: false,
  notifications: []
});

// Actions for shared state
export const selectWord = (word: string) => {
  sharedStore.set({
    ...sharedStore.get(),
    selectedWord: word,
    showWordModal: true
  });
};

export const closeWordModal = () => {
  sharedStore.set({
    ...sharedStore.get(),
    selectedWord: null,
    showWordModal: false
  });
};

export const addNotification = (message: string, type: SharedState['notifications'][0]['type'] = 'info') => {
  const currentState = sharedStore.get();
  const notification = {
    id: Date.now().toString(),
    message,
    type,
    timestamp: Date.now()
  };

  sharedStore.set({
    ...currentState,
    notifications: [...currentState.notifications, notification]
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeNotification(notification.id);
  }, 5000);
};

export const removeNotification = (id: string) => {
  const currentState = sharedStore.get();
  sharedStore.set({
    ...currentState,
    notifications: currentState.notifications.filter(n => n.id !== id)
  });
};

export const clearNotifications = () => {
  sharedStore.set({
    ...sharedStore.get(),
    notifications: []
  });
};