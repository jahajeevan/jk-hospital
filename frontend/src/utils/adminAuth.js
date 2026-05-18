import { createSessionToken, hashPassword, verifyPassword } from './secureCrypto.js';
import { secureGet, secureSet } from './secureStore.js';

const ADMIN_KEY = 'jk_admin_credentials';
const ADMIN_SESSION_KEY = 'jk_admin_session';
const SESSION_MS = 2 * 60 * 60 * 1000;

export const hasAdminCredential = async () => Boolean(await secureGet(ADMIN_KEY));

export const setupAdminCredential = async (password) => {
  if (!password || password.length < 10) {
    throw new Error('Admin password must be at least 10 characters');
  }
  await secureSet(ADMIN_KEY, await hashPassword(password));
};

export const verifyAdminCredential = async (password) => {
  const record = await secureGet(ADMIN_KEY);
  if (!record) {
    await setupAdminCredential(password);
    return true;
  }
  return verifyPassword(password, record);
};

export const openAdminSession = () => {
  const session = {
    token: createSessionToken(),
    expiresAt: Date.now() + SESSION_MS
  };
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const isAdminSessionOpen = () => {
  const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (!session?.token || session.expiresAt < Date.now()) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return false;
  }
};

export const closeAdminSession = () => sessionStorage.removeItem(ADMIN_SESSION_KEY);
