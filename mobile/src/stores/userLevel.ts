// Minimal store without adding Zustand dependency
type Listener = (value?: number | null) => void;

const state = {
  selectedLevel: null as number | null,
  listeners: [] as Listener[],
};

export function setSelectedLevel(level: number) {
  // Only update and notify listeners when the value actually changes
  if (state.selectedLevel === level) return;
  state.selectedLevel = level;
  state.listeners.forEach((l) => l());
}

export function getSelectedLevel(): number | null {
  const v = state.selectedLevel;
  if (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5) return v;
  return null;
}

export function subscribe(cb: Listener, immediateOrOptions?: boolean | { immediate?: boolean }) {
  const immediate = typeof immediateOrOptions === 'boolean' ? immediateOrOptions : (immediateOrOptions?.immediate ?? false);
  state.listeners.push(cb);
  if (immediate) {
    // Invoke immediately with current validated value
    try {
      cb(getSelectedLevel());
    } catch (e) {
      // swallow listener errors to avoid breaking subscription
      console.warn('subscribe immediate callback error', e);
    }
  }
  return () => {
    const idx = state.listeners.indexOf(cb);
    if (idx >= 0) state.listeners.splice(idx, 1);
  };
}
