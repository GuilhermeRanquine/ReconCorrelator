'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeId, THEMES, ThemeConfig, applyThemeToDocument } from '@/lib/themes';

interface ThemeContextType {
  currentTheme: ThemeConfig;
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('cyber-dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexus_theme_id') as ThemeId;
      if (saved && THEMES.some(t => t.id === saved)) {
        setThemeId(saved);
        applyThemeToDocument(saved);
      } else {
        applyThemeToDocument('cyber-dark');
      }
    } catch {
      applyThemeToDocument('cyber-dark');
    }
  }, []);

  const handleSetTheme = (newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    applyThemeToDocument(newThemeId);
  };

  const currentTheme = THEMES.find(t => t.id === themeId) || THEMES[0];

  return (
    <ThemeContext.Provider 
      value={{
        currentTheme,
        themeId,
        setTheme: handleSetTheme,
        availableThemes: THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return context;
}
