/**
 * Simple admin authentication utilities
 * Uses localStorage to store admin session state
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
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function openAdminSession() {
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  // Set session timeout - clear after 1 hour
  setTimeout(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }, 3600000);
}

export function closeAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function verifyAdminCredential(password) {
  // Minimum password length check
  if (!password || password.length < 10) {
    return false;
  }

  const storedHash = localStorage.getItem(ADMIN_PASSWORD_KEY);
  const providedHash = simpleHash(password);

  // If no stored hash, set this as the first password
  if (!storedHash) {
    localStorage.setItem(ADMIN_PASSWORD_KEY, providedHash);
    return true;
  }

  // Verify password matches stored hash
  return storedHash === providedHash;
}
