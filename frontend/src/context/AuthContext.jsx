import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { hydrateLocalStore } from '../utils/localStore.js';
import {
  authenticateUser,
  clearUserSession,
  createUserSession,
  initUserStore,
  readUserSession,
  registerUser
} from '../utils/userStore.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const boot = async () => {
      await Promise.all([initUserStore(), hydrateLocalStore()]);
      const session = readUserSession();
      setUser(session?.user || null);
      setBooting(false);
    };
    void boot();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const record = await authenticateUser(credentials.email, credentials.password);
      const payload = await createUserSession(record);
      setUser(payload.user);
      toast.success('Welcome back to JK Hospital');
      return payload;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload) => {
    setLoading(true);
    try {
      const record = await registerUser(payload);
      const session = await createUserSession(record);
      setUser(session.user);
      toast.success('Account created securely on this device');
      return session;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearUserSession();
    setUser(null);
    toast.success('Logged out');
  };

  const value = useMemo(
    () => ({ user, loading: loading || booting, login, signup, logout, isAdmin: user?.role === 'admin' }),
    [user, loading, booting]
  );

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f8fb]">
        <div className="cinematic-loader">
          <span />
          <p>Securing your JK Hospital session</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
