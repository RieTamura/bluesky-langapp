/* global jest */
// Jest mock for @react-native-async-storage/async-storage
// Minimal implementation sufficient for tests in this project.
let storage = {};

const AsyncStorage = {
  setItem: jest.fn(async (key, value) => { storage[key] = String(value); }),
  getItem: jest.fn(async (key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null)),
  removeItem: jest.fn(async (key) => { delete storage[key]; }),
  clear: jest.fn(async () => { storage = {}; }),
  getAllKeys: jest.fn(async () => Object.keys(storage)),
  multiGet: jest.fn(async (keys) => keys.map(k => [k, storage[k] ?? null])),
  multiSet: jest.fn(async (pairs) => { pairs.forEach(([k, v]) => { storage[k] = v; }); }),
  multiRemove: jest.fn(async (keys) => { keys.forEach(k => delete storage[k]); }),
};

module.exports = AsyncStorage;