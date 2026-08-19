import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language } from '../types';
import { translations } from './translations';
import { parseRoute } from '../utils/router';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  // 1. Check path for /fa prefix
  try {
    const route = parseRoute();
    if (route.lang === 'fa' || route.lang === 'en') {
      return route.lang;
    }
  } catch {
    // ignore
  }

  // 2. Check localStorage
  try {
    const stored = localStorage.getItem('iphub_language') as Language;
    if (stored === 'en' || stored === 'fa') {
      return stored;
    }
  } catch {
    // ignore
  }

  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Sync language with URL on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const route = parseRoute();
        setLanguageState(route.lang);
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);

    try {
      localStorage.setItem('iphub_language', lang);
    } catch {
      // ignore
    }

    // Update URL path to reflect /fa prefix or clean default for en
    try {
      const currentPath = window.location.pathname;
      let newPath = currentPath;

      if (lang === 'fa') {
        if (!currentPath.startsWith('/fa')) {
          newPath = currentPath === '/' ? '/fa' : `/fa${currentPath}`;
        }
      } else {
        if (currentPath.startsWith('/fa')) {
          newPath = currentPath.replace(/^\/fa(\/|$)/, '$1') || '/';
          if (!newPath.startsWith('/')) newPath = `/${newPath}`;
        }
      }

      if (newPath !== currentPath) {
        window.history.pushState(window.history.state, '', newPath + window.location.search);
      }
    } catch {
      // ignore
    }
  }, []);

  const isRtl = language === 'fa';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    if (isRtl) {
      document.documentElement.classList.add('font-persian');
    } else {
      document.documentElement.classList.remove('font-persian');
    }
  }, [language, isRtl]);

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
