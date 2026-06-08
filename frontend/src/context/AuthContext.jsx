import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    const boot = async () => {
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

  const user = clerkSessionUser;
  const needsProfileCompletion = Boolean(clerkSessionUser?.needsProfileCompletion);

  const logout = async () => {
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
