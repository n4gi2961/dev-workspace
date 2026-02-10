'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { setLocale } from '@/app/actions/locale';

interface LanguageSelectorProps {
  currentLocale: string;
  variant?: 'default' | 'compact';
}

export const LanguageSelector = ({ currentLocale, variant = 'default' }: LanguageSelectorProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (newLocale: Locale) => {
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  };

  if (variant === 'compact') {
    return (
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className="appearance-none bg-transparent text-gray-600 dark:text-gray-400 text-sm cursor-pointer outline-none hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-gray-400" />
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm px-3 py-1.5 pr-8 rounded-lg cursor-pointer outline-none border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
        }}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
};
