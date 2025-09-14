// Import bundled JSON and type it for safety.
import ngslJson from '../../assets/ngsl.json';

// Define typed shape for the NGSL JSON file. Levels are stored under string keys
// (e.g. "1", "2") mapping to arrays of words.
type NgslJson = Readonly<{
  metadata?: {
    source?: string;
    license?: string;
    [k: string]: any;
  };
  levels: Readonly<Record<string, ReadonlyArray<string>>>;
}>;

const ngsl = ngslJson as NgslJson;

export function getWordsForLevel(level: number): string[] {
  const l = String(level);
  if (ngsl && ngsl.levels && Array.isArray(ngsl.levels[l])) {
    // Return a defensive copy to avoid external mutation of the underlying asset
    return [...ngsl.levels[l]];
  }
  return [];
}

export function getAvailableLevels(): number[] {
  if (!ngsl || !ngsl.levels) return [];
  return Object.keys(ngsl.levels)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}
