// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, CAT_COLOR_DARK, CAT_COLOR_LIGHT } from '../constants/theme';

type ThemeColors = typeof DarkColors;

interface ThemeContextType {
  colors: ThemeColors;
  catColors: Record<string, string>;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: DarkColors,
  catColors: CAT_COLOR_DARK,
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(true);

  // Load persisted preference on mount
  React.useEffect(() => {
    AsyncStorage.getItem('theme_mode').then(val => {
      if (val === 'light') setIsDark(false);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('theme_mode', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const colors = isDark ? DarkColors : LightColors;
  const catColors = isDark ? CAT_COLOR_DARK : CAT_COLOR_LIGHT;

  return (
    <ThemeContext.Provider value={{ colors, catColors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);