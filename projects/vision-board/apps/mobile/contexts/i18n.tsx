import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Use require for JSON files - Metro bundler handles this better
/* eslint-disable @typescript-eslint/no-require-imports */
const en = require('@vision-board/shared/i18n/en.json');
const ja = require('@vision-board/shared/i18n/ja.json');
const ko = require('@vision-board/shared/i18n/ko.json');
const es = require('@vision-board/shared/i18n/es.json');
const zhCN = require('@vision-board/shared/i18n/zh-CN.json');
/* eslint-enable @typescript-eslint/no-require-imports */

const messages = { en, ja, ko, es, 'zh-CN': zhCN } as const;

type Locale = 'en' | 'ja' | 'ko' | 'es' | 'zh-CN';
type Messages = typeof en;

const SUPPORTED_LOCALES: Locale[] = ['en', 'ja', 'ko', 'es', 'zh-CN'];
const STORAGE_KEY = 'app_locale';

interface I18nContextType {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => Promise<void>;
  supportedLocales: { code: Locale; name: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  'zh-CN': '简体中文',
};

function getDeviceLocale(): Locale {
  const deviceLocale = Localization.getLocales()[0]?.languageTag || 'en';

  // Check for exact match
  if (SUPPORTED_LOCALES.includes(deviceLocale as Locale)) {
    return deviceLocale as Locale;
  }

  // Check for language code match (e.g., "ja-JP" -> "ja")
  const languageCode = deviceLocale.split('-')[0];
  if (SUPPORTED_LOCALES.includes(languageCode as Locale)) {
    return languageCode as Locale;
  }

  // Special case for Chinese
  if (languageCode === 'zh') {
    return 'zh-CN';
  }

  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale as Locale)) {
          setLocaleState(savedLocale as Locale);
        } else {
          setLocaleState(getDeviceLocale());
        }
      } catch {
        setLocaleState(getDeviceLocale());
      } finally {
        setIsInitialized(true);
      }
    };
    loadLocale();
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLocale);
      setLocaleState(newLocale);
    } catch (error) {
      console.error('Failed to save locale:', error);
    }
  }, []);

  const t = messages[locale] as Messages;

  const supportedLocales = SUPPORTED_LOCALES.map((code) => ({
    code,
    name: LOCALE_NAMES[code],
  }));

  if (!isInitialized) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, supportedLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
