import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';
import en from '@vision-board/shared/i18n/en.json';
import ja from '@vision-board/shared/i18n/ja.json';
import ko from '@vision-board/shared/i18n/ko.json';
import es from '@vision-board/shared/i18n/es.json';
import zhCN from '@vision-board/shared/i18n/zh-CN.json';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

const messages: Record<Locale, typeof en> = {
  en,
  ja,
  ko,
  es,
  'zh-CN': zhCN,
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  // Cookieの値が有効なロケールかチェック
  const locale: Locale = locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : defaultLocale;

  return {
    locale,
    messages: messages[locale],
  };
});
