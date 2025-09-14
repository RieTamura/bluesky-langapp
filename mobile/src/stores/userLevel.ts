// Minimal store without adding Zustand dependency
type Listener = () => void;

const state = {
  selectedLevel: 1 as number | null,
  listeners: [] as Listener[],
};

export function setSelectedLevel(level: number) {
  state.selectedLevel = level;
  state.listeners.forEach((l) => l());
}

export function getSelectedLevel(): number | null {
  return state.selectedLevel;
}

export function subscribe(cb: Listener) {
  state.listeners.push(cb);
  return () => {
    const idx = state.listeners.indexOf(cb);
    if (idx >= 0) state.listeners.splice(idx, 1);
  };
}
