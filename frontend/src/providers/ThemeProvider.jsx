import { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
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
