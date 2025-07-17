
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/de';
import 'dayjs/locale/en';
// import { useLanguage } from '../contexts/LanguageProvider';
// Locale-aware date formatting utility
// Usage: const formatted = formatLocaleDate(date)
// Locale-aware date formatting utility
// Usage: const formatted = formatLocaleDate(date, { language })
export function formatLocaleDate(
  date: Parameters<typeof dayjs>[0],
  opts?: { format?: string; language?: 'en' | 'de' }
): string {
  // Always require language to be passed explicitly, or fallback to 'en'
  const lang: 'en' | 'de' = opts?.language || 'en';
  // Use European format for both 'en' and 'de'
  const formatStr = opts?.format || 'DD.MM.YYYY';
  return dayjs(date).locale(lang).format(formatStr);
}

// Extend dayjs with plugins we need
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);

// Helper to map date-fns style tokens to dayjs format tokens when simple mapping exists
const mapFormatToken = (token: string): string => {
  switch (token) {
    case 'PPP':
      // Example: Apr 5, 2025
      return 'MMM D, YYYY';
    default:
      return token;
  }
};

export function format(date: Parameters<typeof dayjs>[0], formatStr: string): string {
  return dayjs(date).format(mapFormatToken(formatStr));
}

export function parseISO(isoString: string): Date {
  const parsed = dayjs(isoString);
  
  if (!parsed.isValid()) {
    throw new Error(`Invalid ISO date string: "${isoString}"`);
  }
  
  return parsed.toDate();
}

export function isValid(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isValid();
}

export function addDays(date: Parameters<typeof dayjs>[0], amount: number): Date {
  return dayjs(date).add(amount, 'day').toDate();
}

export function isToday(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function isYesterday(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
}

export function isTomorrow(date: Parameters<typeof dayjs>[0]): boolean {
  return dayjs(date).isSame(dayjs().add(1, 'day'), 'day');
} 