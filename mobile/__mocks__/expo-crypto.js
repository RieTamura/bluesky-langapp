/* eslint-disable */
// Minimal mock for expo-crypto for Jest environment
// This mock respects the `alg` parameter where possible and falls back
// deterministically to SHA-256. It aims to mimic `expo-crypto` behavior
// sufficiently for tests without introducing nondeterminism.
// eslint-disable-next-line global-require
/* eslint-disable @typescript-eslint/no-var-requires, global-require */
const nodeCrypto = require('crypto');


function mapAlgToNode(alg) {
  if (!alg) return 'sha256';
  const a = String(alg).toLowerCase();
  // common values used by consumers: 'SHA-256', 'SHA256', 'sha256'
  if (a.includes('sha') && a.includes('256')) return 'sha256';
  // unknown alg -> undefined
  return undefined;
}

const Crypto = {
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },

  async digestStringAsync(alg, data) {
    // Validate and map algorithm. Default to sha256 when missing.
    const mapped = mapAlgToNode(alg) || 'sha256';

    try {
      // Use the mapped algorithm. This will throw on truly unsupported
      // algorithms at the Node level (rare in tests), which we catch below
      // and attempt a deterministic fallback to sha256.
      const hash = nodeCrypto.createHash(mapped).update(String(data), 'utf8').digest('hex');
      return hash;
    } catch (e) {
      // Only convert expected crypto-related errors into a deterministic
      // sha256 fallback. For other unexpected errors rethrow to surface
      // test failures.
      const isCryptoError = e && (e.code || e.message) && (String(e.message).toLowerCase().includes('digest') || String(e.message).toLowerCase().includes('unsupported') || String(e.code).toLowerCase().includes('err'));
      if (!isCryptoError) {
        // Unexpected: surface to help debugging
        // eslint-disable-next-line no-console
        console.error('[expo-crypto mock] unexpected error in digestStringAsync', e);
        throw e;
      }

      // Deterministic fallback to sha256
      try {
        const fallback = nodeCrypto.createHash('sha256').update(String(data), 'utf8').digest('hex');
        // eslint-disable-next-line no-console
        console.warn('[expo-crypto mock] crypto error, falling back to sha256');
        return fallback;
      } catch (err2) {
        // If even the fallback fails, rethrow the original error to avoid
        // hiding severe environment issues.
        // eslint-disable-next-line no-console
        console.error('[expo-crypto mock] fallback sha256 also failed', err2);
        throw e;
      }
    }
  }
};

module.exports = Crypto;