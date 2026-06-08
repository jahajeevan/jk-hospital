/**
 * Simple admin authentication utilities
 * Uses sessionStorage to store admin session state (session-only, no persistence)
 */

const ADMIN_SESSION_KEY = 'jk_admin_session_open';
const ADMIN_PASSWORD_KEY = 'jk_admin_password_hash';

// Simple hash function (not cryptographically secure, for demo purposes only)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function isAdminSessionOpen() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function openAdminSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  // Set session timeout - clear after 1 hour
  setTimeout(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }, 3600000);
}

export function closeAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function verifyAdminCredential(password) {
  // Minimum password length check
  if (!password || password.length < 10) {
    return false;
  }

  const storedHash = sessionStorage.getItem(ADMIN_PASSWORD_KEY);
  const providedHash = simpleHash(password);

  // If no stored hash, set this as the first password
  if (!storedHash) {
    sessionStorage.setItem(ADMIN_PASSWORD_KEY, providedHash);
    return true;
  }

  // Verify password matches stored hash
  return storedHash === providedHash;
}
