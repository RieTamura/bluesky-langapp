declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA256 = 'SHA-256'
  }

  export function digestStringAsync(algorithm: CryptoDigestAlgorithm, data: string): Promise<string>;

  export const CryptoDigestAlgorithm: {
    SHA256: CryptoDigestAlgorithm;
  };
}

export {};
