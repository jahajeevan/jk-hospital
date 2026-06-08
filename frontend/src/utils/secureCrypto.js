const PEPPER = import.meta.env.VITE_APP_SECRET || 'jk-hospital-local-v1';
const encoder = new TextEncoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

// Use a static device ID for encryption - no localStorage
const getDeviceId = () => crypto.randomUUID();

const deriveKey = async (material, salt, usages) => {
  const base = await crypto.subtle.importKey('raw', encoder.encode(material), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
};

let storageKeyPromise;

export const getStorageKey = async () => {
  if (!storageKeyPromise) {
    const salt = encoder.encode(`jk-store:${getDeviceId()}`);
    storageKeyPromise = deriveKey(`${PEPPER}:${getDeviceId()}`, salt, ['encrypt', 'decrypt']);
  }
  return storageKeyPromise;
};

export const encryptJson = async (payload) => {
  const key = await getStorageKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
};

export const decryptJson = async (value) => {
  if (!value || typeof value !== 'string' || !value.includes('.')) return null;
  const [ivPart, cipherPart] = value.split('.');
  const key = await getStorageKey();
  const iv = fromBase64(ivPart);
  const cipher = fromBase64(cipherPart);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
};

export const hashPassword = async (password, saltB64) => {
  const salt = saltB64 ? fromBase64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt: toBase64(salt), hash: toBase64(new Uint8Array(bits)) };
};

export const verifyPassword = async (password, record) => {
  if (!record?.salt || !record?.hash) return false;
  const next = await hashPassword(password, record.salt);
  return next.hash === record.hash;
};

export const hashOtp = async (otp, saltB64) => {
  const salt = saltB64 ? fromBase64(saltB64) : crypto.getRandomValues(new Uint8Array(12));
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${otp}:${toBase64(salt)}:${PEPPER}`));
  return { salt: toBase64(salt), hash: toBase64(new Uint8Array(digest)) };
};

export const verifyOtp = async (otp, record) => {
  if (!record?.salt || !record?.hash) return false;
  const next = await hashOtp(otp, record.salt);
  return next.hash === record.hash;
};

export const createSessionToken = () => toBase64(crypto.getRandomValues(new Uint8Array(32)));
