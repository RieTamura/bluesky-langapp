/// <reference types="jest" />
import { getDeviceLocale } from '../src/utils/deviceLocale';

describe('getDeviceLocale', () => {
  const orig = (Intl as any)?.DateTimeFormat?.resolvedOptions;

  afterEach(() => {
    // restore if jest environment mutated Intl
    if (orig) {
      (Intl as any).DateTimeFormat.resolvedOptions = orig;
    }
  });

  test('returns primary language subtag when available', () => {
    (Intl as any).DateTimeFormat.resolvedOptions = () => ({ locale: 'ja-JP' });
    expect(getDeviceLocale()).toBe('ja');
    (Intl as any).DateTimeFormat.resolvedOptions = () => ({ locale: 'en-US' });
    expect(getDeviceLocale()).toBe('en');
  });

  test('falls back to en on missing or malformed locale', () => {
    (Intl as any).DateTimeFormat.resolvedOptions = () => ({});
    expect(getDeviceLocale()).toBe('en');
    // throw from resolvedOptions
    (Intl as any).DateTimeFormat.resolvedOptions = () => { throw new Error('boom'); };
    expect(getDeviceLocale()).toBe('en');
  });
});
