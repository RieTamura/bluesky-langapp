export type ExampleSentence = {
  id: string;
  text: string;
  translation?: string;
  source?: string;
};

const DEFAULT_API = 'https://example.com/api/dictionary';
const CACHE_VERSION = 1;
const memoryCache = new Map<string, ExampleSentence[]>();

// AsyncStorage-based persistent cache
function storageKeyFor(word: string) {
  return `examples:${CACHE_VERSION}:${word}`;
}

async function readPersistentCache(word: string): Promise<ExampleSentence[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const k = storageKeyFor(word);
    const raw = await AsyncStorage.getItem(k);
    if (!raw) return null;
    return JSON.parse(raw) as ExampleSentence[];
  } catch (e) {
    return null;
  }
}

async function writePersistentCache(word: string, data: ExampleSentence[]): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const k = storageKeyFor(word);
    await AsyncStorage.setItem(k, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

function getApiBase() {
  // In Expo, prefer Constants.manifest or env setup. Fallback to DEFAULT_API.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    const url = (Constants.manifest?.extra?.DICTIONARY_API_URL) || DEFAULT_API;
    return url;
  } catch (e) {
    return DEFAULT_API;
  }
}

export async function fetchExampleSentences(word: string): Promise<ExampleSentence[]> {
  // try memory cache
  const mem = memoryCache.get(word);
  if (mem) return mem;

  // try persistent cache
  const persisted = await readPersistentCache(word);
  if (persisted) {
    memoryCache.set(word, persisted);
    return persisted;
  }
  const base = getApiBase();
  const url = `${base}/examples?word=${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Dictionary API error: ${res.status}`);
    }
    const data = await res.json();
    // Expecting data.examples: Array<{id,text,translation,source}>
    const out = (data.examples || []).map((e: any) => ({ id: e.id || `${word}-${Math.random()}`, text: e.text, translation: e.translation, source: e.source }));
    memoryCache.set(word, out);
    writePersistentCache(word, out).catch(()=>{});
    return out;
  } catch (e) {
    // Fallback: return a small mock set
    const mock = [ { id: 'mock-1', text: `${word} is used in a sample sentence.`, translation: '（例）' } ];
    memoryCache.set(word, mock);
    return mock;
  }
}
