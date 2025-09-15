import AsyncStorage from '@react-native-async-storage/async-storage';

const PAID_KEY = 'feature_paid_v1';

export async function isPaidUser(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PAID_KEY);
    return v === '1';
  } catch (e) {
    return false;
  }
}

export async function setPaidUser(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PAID_KEY, enabled ? '1' : '0');
  } catch (e) {
    // ignore
  }
}

export async function clearPaidUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PAID_KEY);
  } catch (e) {
    // ignore
  }
}

// Simple synchronous helper for components that want a promise-based check
export function usePaidUser(): [boolean, (v: boolean) => Promise<void>] {
  const [state, setState] = require('react').useState(false);
  ReactCheck();
  function ReactCheck() {
    const React = require('react');
    React.useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const p = await isPaidUser();
          if (mounted) setState(p);
        } catch (e) {}
      })();
      return () => { mounted = false; };
    }, []);
  }
  return [state, setPaidUser];
}
