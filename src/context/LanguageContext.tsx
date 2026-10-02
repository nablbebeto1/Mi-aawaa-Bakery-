import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, SUPPORTED_LANGUAGES, LanguageOption, dictionaries, TranslationKey } from '../i18n';
import { storage } from '../services/storage';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('miaawaa_preferred_language') as Language;
    if (saved && (saved === 'en' || saved === 'om' || saved === 'am')) {
      return saved;
    }
    const settings = storage.getSettings();
    return settings.defaultLanguage || 'en';
  });

  useEffect(() => {
    localStorage.setItem('miaawaa_preferred_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const dict = dictionaries[language] || dictionaries.en;
    if (dict[key]) {
      return dict[key];
    }
    // Fallback to English dictionary
    if (dictionaries.en[key]) {
      return dictionaries.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES
      }}
    >
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
