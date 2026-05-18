import { decryptJson, encryptJson } from './secureCrypto.js';

const cache = new Map();

export const secureGet = async (key, fallback = null) => {
  if (cache.has(key)) return cache.get(key);
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const value = raw.startsWith('jkenc:') ? await decryptJson(raw.slice(6)) : JSON.parse(raw);
    cache.set(key, value);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

export const secureSet = async (key, value) => {
  cache.set(key, value);
  const encrypted = await encryptJson(value);
  localStorage.setItem(key, `jkenc:${encrypted}`);
};

export const secureRemove = (key) => {
  cache.delete(key);
  localStorage.removeItem(key);
};

export const migratePlainKey = async (key, parser = JSON.parse) => {
  const raw = localStorage.getItem(key);
  if (!raw || raw.startsWith('jkenc:')) return;
  try {
    const value = parser(raw);
    await secureSet(key, value);
  } catch {
    localStorage.removeItem(key);
  }
};
