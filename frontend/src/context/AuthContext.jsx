import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { hydrateLocalStore } from '../utils/localStore.js';
import { clearUserSession, readUserSession } from '../utils/userStore.js';

const AuthContext = createContext(null);
const BROWSER_SESSION_KEY = 'jk_browser_session_alive';
const AI_MESSAGES_KEY = 'jk_ai_messages';
const AI_SESSION_KEY = 'jk_ai_session_id';
const PAYMENT_KEYS = ['jk_pending_payment_booking', 'jk_pending_payment_mode', 'jk_pending_payment_provider'];
const adminEmails = new Set(
  String(import.meta.env.VITE_CLERK_ADMIN_EMAILS || 'admin@jkhospital.local')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);
const staffRoleByEmail = {
  'receptionist@jkhospital.com': 'receptionist',
  'pharmacist@jkhospital.com': 'pharmacist',
  'viji@jkhospital.com': 'doctor',
  'jahan@jkhospital.com': 'doctor',
  'sugu@jkhospital.com': 'doctor'
};

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [booting, setBooting] = useState(true);
  const [localSession, setLocalSession] = useState(() => readUserSession());
  const [clerkTimedOut, setClerkTimedOut] = useState(false);
  const freshBrowserSession = useRef(sessionStorage.getItem(BROWSER_SESSION_KEY) !== 'active');
  const previousUserId = useRef(null);

  useEffect(() => {
    const boot = async () => {
      await hydrateLocalStore();
      setLocalSession(readUserSession());
      setBooting(false);
    };
    void boot();
  }, []);

  useEffect(() => {
    if (isLoaded) return undefined;
    const timer = window.setTimeout(() => setClerkTimedOut(true), 3500);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  const email = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || '';
  const normalizedEmail = email.toLowerCase();
  const role = clerkUser?.publicMetadata?.role || staffRoleByEmail[normalizedEmail] || (adminEmails.has(normalizedEmail) ? 'admin' : 'patient');
  const hospitalProfile = clerkUser?.unsafeMetadata?.hospitalProfile || {};
  const firstName = hospitalProfile.firstName || clerkUser?.firstName || '';
  const lastName = hospitalProfile.lastName || clerkUser?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const phone = hospitalProfile.phone || clerkUser?.primaryPhoneNumber?.phoneNumber || clerkUser?.phoneNumbers?.[0]?.phoneNumber || '';
  const clerkNeedsProfileCompletion = Boolean(isSignedIn && clerkUser && role === 'patient' && (!fullName || !/^[6-9]\d{9}$/.test(String(phone))));
  const clerkSessionUser = isSignedIn && clerkUser
    ? {
        id: clerkUser.id,
        name: fullName || clerkUser.fullName || email.split('@')[0],
        email,
        phone,
        role,
        needsProfileCompletion: clerkNeedsProfileCompletion,
        isVerified: Boolean(clerkUser.primaryEmailAddress?.verification?.status === 'verified' || clerkUser.emailAddresses?.length)
      }
    : null;
  const localUser = localSession?.user ? { ...localSession.user, needsProfileCompletion: false } : null;
  const user = clerkSessionUser || localUser;
  const needsProfileCompletion = Boolean(clerkSessionUser?.needsProfileCompletion);

  const logout = async () => {
    sessionStorage.removeItem(AI_MESSAGES_KEY);
    sessionStorage.removeItem(AI_SESSION_KEY);
    PAYMENT_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    sessionStorage.removeItem('jk_token');
    sessionStorage.removeItem('jk_user');
    localStorage.removeItem('jk_token');
    localStorage.removeItem('jk_user');
    clearUserSession();
    setLocalSession(null);
    if (isSignedIn) await signOut();
    toast.success('Logged out securely');
  };

  useEffect(() => {
  if (!isLoaded) return;
  sessionStorage.setItem(BROWSER_SESSION_KEY, 'active');
}, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    const currentUserId = isSignedIn ? clerkUser?.id || null : null;
    if (currentUserId && previousUserId.current !== currentUserId) {
      sessionStorage.removeItem(AI_MESSAGES_KEY);
      sessionStorage.removeItem(AI_SESSION_KEY);
    }
    previousUserId.current = currentUserId;
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  useEffect(() => {
    window.jkGetClerkToken = getToken;
    return () => {
      if (window.jkGetClerkToken === getToken) delete window.jkGetClerkToken;
    };
  }, [getToken]);

  useEffect(() => {
    const syncLocalSession = () => setLocalSession(readUserSession());
    window.addEventListener('jk-auth-sync', syncLocalSession);
    return () => window.removeEventListener('jk-auth-sync', syncLocalSession);
  }, []);

  const authLoading = (!isLoaded && !clerkTimedOut) || booting;

  const value = useMemo(
    () => ({ user, clerkUser, loading: authLoading, logout, getToken, isAdmin: user?.role === 'admin', needsProfileCompletion }),
    [user, clerkUser, authLoading, getToken, logout, needsProfileCompletion]
  );

  if (authLoading) {
    return (
      <div className="route-loader-shell min-h-screen">
        <div className="route-loader">
          <span />
          <p>Preparing your JK Hospital visit</p>
          <small>Secure session check</small>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
