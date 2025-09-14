// import bundled json (keep as any to avoid strict typing errors)
import ngslJson from '../../assets/ngsl.json';

const ngsl: any = ngslJson;

export function getWordsForLevel(level: number): string[] {
  const l = String(level);
  if (ngsl && ngsl.levels && ngsl.levels[l]) {
    return ngsl.levels[l] as string[];
  }
  return [];
}
