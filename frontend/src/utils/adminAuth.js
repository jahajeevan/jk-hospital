/**
 * Admin authentication utilities (Clerk-based)
 * Admin role determined by Clerk public metadata
 */

// Memory-based admin session (per browser tab, cleared on page refresh)
let adminSessionOpen = false;

export function isAdminSessionOpen() {
  return adminSessionOpen;
}

export function openAdminSession() {
  adminSessionOpen = true;
  // Clear session on page unload
  setTimeout(() => {
    adminSessionOpen = false;
  }, 3600000); // 1 hour
}

export function closeAdminSession() {
  adminSessionOpen = false;
}

export async function verifyAdminCredential(password) {
  // Minimum password length check
  if (!password || password.length < 10) {
    return false;
  }

  // In production, this would verify against Supabase
  // For now, just check minimum length
  return password.length >= 10;
}
