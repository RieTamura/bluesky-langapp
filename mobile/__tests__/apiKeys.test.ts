// Mock expo-secure-store before importing the module under test so Jest doesn't try to
// parse ESM-only files from node_modules during module evaluation.
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('validateRawKey', () => {
  const originalFetch = global.fetch;
  let validateRawKey: any;

  beforeAll(() => {
    // Import after mocking
    validateRawKey = require('../src/stores/apiKeys').validateRawKey;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns ok true on 200 response for openai', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '[]' } as any));
    const res = await validateRawKey('openai', 'sk-test');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });

  it('returns ok false and error on timeout or network failure', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network error'); });
    const res = await validateRawKey('openai', 'sk-bad');
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('returns ok false for unsupported provider', async () => {
    const res = await validateRawKey('unknown' as any, 'key');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('unsupported-provider');
  });
});
