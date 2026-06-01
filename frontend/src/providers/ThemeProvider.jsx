import { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'jk_theme';

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(STORAGE_KEY, 'light');
  }, []);

  const value = useMemo(
    () => ({
      theme: 'light',
      setTheme: () => {},
      toggleTheme: () => {}
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
