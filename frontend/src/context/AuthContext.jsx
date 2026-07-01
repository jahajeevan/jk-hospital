import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import api from '../api/client.js';

const AuthContext = createContext(null);
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
  const [clerkTimedOut, setClerkTimedOut] = useState(false);
  // The role/identity used for authorization always comes from a verified
  // /auth/me call against the stored token — never from the sessionStorage
  // JSON blob directly, since that blob is editable via devtools and must
  // not be trusted for access-control decisions.
  const [localSessionUser, setLocalSessionUser] = useState(null);

  const verifyLocalSession = async () => {
    const token = sessionStorage.getItem('jk_doctor_token');
    if (!token) {
      setLocalSessionUser(null);
      return;
    }
    try {
      const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const verifiedUser = data?.user;
      if (!verifiedUser) throw new Error('No user in response');
      setLocalSessionUser({ ...verifiedUser, id: verifiedUser._id || verifiedUser.id });
    } catch {
      // Token invalid/expired, or role was tampered with client-side — drop the session
      sessionStorage.removeItem('jk_doctor_token');
      sessionStorage.removeItem('jk_doctor_user');
      setLocalSessionUser(null);
    }
  };

  useEffect(() => {
    const boot = async () => {
      await verifyLocalSession();
      setBooting(false);
    };
    void boot();
  }, []);

  useEffect(() => {
    if (isLoaded) return undefined;
    const timer = window.setTimeout(() => setClerkTimedOut(true), 3500);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    const syncLocalSession = () => {
      void verifyLocalSession();
    };
    window.addEventListener('jk-auth-sync', syncLocalSession);
    window.addEventListener('storage', syncLocalSession);
    return () => {
      window.removeEventListener('jk-auth-sync', syncLocalSession);
      window.removeEventListener('storage', syncLocalSession);
    };
  }, []);

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

  const user = localSessionUser || clerkSessionUser;
  const needsProfileCompletion = Boolean(clerkSessionUser?.needsProfileCompletion);

  const logout = async () => {
    sessionStorage.removeItem('jk_doctor_token');
    sessionStorage.removeItem('jk_doctor_user');
    setLocalSessionUser(null);
    window.dispatchEvent(new Event('jk-auth-sync'));
    if (isSignedIn) await signOut();
    toast.success('Logged out securely');
  };

  useEffect(() => {
    window.jkGetClerkToken = getToken;
    return () => {
      if (window.jkGetClerkToken === getToken) delete window.jkGetClerkToken;
    };
  }, [getToken]);

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
