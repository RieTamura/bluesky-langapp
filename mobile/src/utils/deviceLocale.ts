// Return a safe device locale language code (2-letter) to use as translation target.
// This function intentionally keeps runtime behavior simple and synchronous so it
// can be used in UI handlers without async/await. It attempts to read the
// resolved Intl locale and returns the primary language subtag (e.g. 'en' from
// 'en-US'). On any error or unexpected value it falls back to 'en'.
export function getDeviceLocale(): string {
  try {
    // Some environments may not provide Intl or resolvedOptions; guard defensively.
    const resolved = (Intl as any)?.DateTimeFormat?.resolvedOptions?.();
    if (!resolved || typeof resolved.locale !== 'string') return 'en';
    const lang = String(resolved.locale).split('-')[0];
    if (!lang || typeof lang !== 'string') return 'en';
    return lang;
  } catch (e) {
    // Keep a conservative fallback to English to avoid throwing in UI code.
    return 'en';
  }
}
