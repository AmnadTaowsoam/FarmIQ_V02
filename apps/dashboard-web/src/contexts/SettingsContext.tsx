import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import i18n from '../i18n';

export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageCode = 'en' | 'th';

type SettingsContextType = {
  themeMode: ThemeMode;
  language: LanguageCode;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: LanguageCode) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const THEME_KEY = 'farmiQ.theme';
const LANG_KEY = 'farmiQ.lang';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const storedLang = localStorage.getItem(LANG_KEY) as LanguageCode | null;
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      setThemeModeState(storedTheme);
    } else {
      setThemeModeState('system');
    }
    if (storedLang === 'en' || storedLang === 'th') {
      setLanguageState(storedLang);
    } else {
      const prefersThai = navigator.language.toLowerCase().startsWith('th');
      setLanguageState(prefersThai ? 'th' : 'en');
    }
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_KEY, mode);
  };

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);
  };

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      themeMode,
      language,
      setThemeMode,
      setLanguage,
    }),
    [themeMode, language]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
