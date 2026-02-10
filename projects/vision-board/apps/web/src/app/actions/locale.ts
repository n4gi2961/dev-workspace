'use server';

import { cookies } from 'next/headers';
import { locales, type Locale } from '@/i18n/config';
import { LOCALE_COOKIE_NAME } from '@/i18n/request';

export async function setLocale(locale: Locale) {
  // 有効なロケールかチェック
  if (!locales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1年
    sameSite: 'lax',
  });
}
