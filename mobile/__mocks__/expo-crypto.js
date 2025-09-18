// Minimal mock for expo-crypto for Jest environment
const nodeCrypto = require('crypto');

const Crypto = {
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  async digestStringAsync(alg, data) {
    try {
      const hash = nodeCrypto.createHash('sha256').update(String(data), 'utf8').digest('hex');
      return hash;
    } catch (e) {
      // fallback: simple hash-like string
      return 'deadbeefcafebabe';
    }
  }
};

module.exports = Crypto;