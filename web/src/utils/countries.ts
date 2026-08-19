import { Language } from '../types';

export interface CountryOption {
  code: string;
  name: string;
  faName: string;
  region: string;
}

export const COUNTRY_DICTIONARY: Record<string, { name: string; faName: string; region: string }> = {
  IR: { name: 'Iran', faName: 'ایران', region: 'Middle East' },
  NL: { name: 'Netherlands', faName: 'هلند', region: 'Europe' },
  DE: { name: 'Germany', faName: 'آلمان', region: 'Europe' },
  GB: { name: 'United Kingdom', faName: 'بریتانیا', region: 'Europe' },
  FR: { name: 'France', faName: 'فرانسه', region: 'Europe' },
  US: { name: 'United States', faName: 'ایالات متحده آمریکا', region: 'North America' },
  CA: { name: 'Canada', faName: 'کانادا', region: 'North America' },
  TR: { name: 'Turkey', faName: 'ترکیه', region: 'Middle East/Europe' },
  AE: { name: 'United Arab Emirates', faName: 'امارات متحده عربی', region: 'Middle East' },
  IT: { name: 'Italy', faName: 'ایتالیا', region: 'Europe' },
  ES: { name: 'Spain', faName: 'اسپانیا', region: 'Europe' },
  CH: { name: 'Switzerland', faName: 'سوئیس', region: 'Europe' },
  SE: { name: 'Sweden', faName: 'سوئد', region: 'Europe' },
  FI: { name: 'Finland', faName: 'فنلاند', region: 'Europe' },
  NO: { name: 'Norway', faName: 'نروژ', region: 'Europe' },
  RU: { name: 'Russian Federation', faName: 'روسیه', region: 'Europe/Asia' },
  JP: { name: 'Japan', faName: 'ژاپن', region: 'Asia-Pacific' },
  SG: { name: 'Singapore', faName: 'سنگاپور', region: 'Asia-Pacific' },
  AU: { name: 'Australia', faName: 'استرالیا', region: 'Oceania' },
  BR: { name: 'Brazil', faName: 'برزیل', region: 'South America' },
  AF: { name: 'Afghanistan', faName: 'افغانستان', region: 'Asia' },
  AL: { name: 'Albania', faName: 'آلبانی', region: 'Europe' },
  DZ: { name: 'Algeria', faName: 'الجزایر', region: 'Africa' },
  AR: { name: 'Argentina', faName: 'آرژانتین', region: 'South America' },
  AM: { name: 'Armenia', faName: 'ارمنستان', region: 'Asia' },
  AT: { name: 'Austria', faName: 'اتریش', region: 'Europe' },
  AZ: { name: 'Azerbaijan', faName: 'آذربایجان', region: 'Asia' },
  BH: { name: 'Bahrain', faName: 'بحرین', region: 'Middle East' },
  BD: { name: 'Bangladesh', faName: 'بنگلادش', region: 'Asia' },
  BY: { name: 'Belarus', faName: 'بلاروس', region: 'Europe' },
  BE: { name: 'Belgium', faName: 'بلژیک', region: 'Europe' },
  BO: { name: 'Bolivia', faName: 'بولیوی', region: 'South America' },
  BA: { name: 'Bosnia and Herzegovina', faName: 'بوسنی و هرزگوین', region: 'Europe' },
  BG: { name: 'Bulgaria', faName: 'بلغارستان', region: 'Europe' },
  CL: { name: 'Chile', faName: 'شیلی', region: 'South America' },
  CN: { name: 'China', faName: 'چین', region: 'Asia-Pacific' },
  CO: { name: 'Colombia', faName: 'کلمبیا', region: 'South America' },
  HR: { name: 'Croatia', faName: 'کرواسی', region: 'Europe' },
  CY: { name: 'Cyprus', faName: 'قبرس', region: 'Europe' },
  CZ: { name: 'Czech Republic', faName: 'جمهوری چک', region: 'Europe' },
  DK: { name: 'Denmark', faName: 'دانمارک', region: 'Europe' },
  EG: { name: 'Egypt', faName: 'مصر', region: 'Africa' },
  EE: { name: 'Estonia', faName: 'استونی', region: 'Europe' },
  GE: { name: 'Georgia', faName: 'گرجستان', region: 'Asia' },
  GR: { name: 'Greece', faName: 'یونان', region: 'Europe' },
  HK: { name: 'Hong Kong', faName: 'هنگ کنگ', region: 'Asia-Pacific' },
  HU: { name: 'Hungary', faName: 'مجارستان', region: 'Europe' },
  IS: { name: 'Iceland', faName: 'ایسلند', region: 'Europe' },
  IN: { name: 'India', faName: 'هند', region: 'Asia-Pacific' },
  ID: { name: 'Indonesia', faName: 'اندونزی', region: 'Asia-Pacific' },
  IQ: { name: 'Iraq', faName: 'عراق', region: 'Middle East' },
  IE: { name: 'Ireland', faName: 'ایرلند', region: 'Europe' },
  IL: { name: 'Israel', faName: 'اسرائیل', region: 'Middle East' },
  JO: { name: 'Jordan', faName: 'اردن', region: 'Middle East' },
  KZ: { name: 'Kazakhstan', faName: 'قزاقستان', region: 'Asia' },
  KW: { name: 'Kuwait', faName: 'کویت', region: 'Middle East' },
  LB: { name: 'Lebanon', faName: 'لبنان', region: 'Middle East' },
  LU: { name: 'Luxembourg', faName: 'لوکزامبورگ', region: 'Europe' },
  MY: { name: 'Malaysia', faName: 'مالزی', region: 'Asia-Pacific' },
  MX: { name: 'Mexico', faName: 'مکزیک', region: 'North America' },
  NZ: { name: 'New Zealand', faName: 'نیوزیلند', region: 'Oceania' },
  OM: { name: 'Oman', faName: 'عمان', region: 'Middle East' },
  PK: { name: 'Pakistan', faName: 'پاکستان', region: 'Asia' },
  PL: { name: 'Poland', faName: 'لهستان', region: 'Europe' },
  PT: { name: 'Portugal', faName: 'پرتغال', region: 'Europe' },
  QA: { name: 'Qatar', faName: 'قطر', region: 'Middle East' },
  RO: { name: 'Romania', faName: 'رومانی', region: 'Europe' },
  SA: { name: 'Saudi Arabia', faName: 'عربستان سعودی', region: 'Middle East' },
  RS: { name: 'Serbia', faName: 'صربستان', region: 'Europe' },
  SK: { name: 'Slovakia', faName: 'اسلواکی', region: 'Europe' },
  SI: { name: 'Slovenia', faName: 'اسلوونی', region: 'Europe' },
  ZA: { name: 'South Africa', faName: 'آفریقای جنوبی', region: 'Africa' },
  KR: { name: 'South Korea', faName: 'کره جنوبی', region: 'Asia-Pacific' },
  SY: { name: 'Syria', faName: 'سوریه', region: 'Middle East' },
  TW: { name: 'Taiwan', faName: 'تایوان', region: 'Asia-Pacific' },
  TH: { name: 'Thailand', faName: 'تایلند', region: 'Asia-Pacific' },
  UA: { name: 'Ukraine', faName: 'اوکراین', region: 'Europe' },
  VN: { name: 'Vietnam', faName: 'ویتنام', region: 'Asia-Pacific' },
  YE: { name: 'Yemen', faName: 'یمن', region: 'Middle East' },
  UZ: { name: 'Uzbekistan', faName: 'ازبکستان', region: 'Asia' },
  TM: { name: 'Turkmenistan', faName: 'ترکمنستان', region: 'Asia' },
  TJ: { name: 'Tajikistan', faName: 'تاجیکستان', region: 'Asia' },
  KG: { name: 'Kyrgyzstan', faName: 'قرقیزستان', region: 'Asia' },
  MD: { name: 'Moldova', faName: 'مولداوی', region: 'Europe' },
  LT: { name: 'Lithuania', faName: 'لیتوانی', region: 'Europe' },
  LV: { name: 'Latvia', faName: 'لتونی', region: 'Europe' },
  MT: { name: 'Malta', faName: 'مالت', region: 'Europe' },
  MC: { name: 'Monaco', faName: 'موناکو', region: 'Europe' },
  ME: { name: 'Montenegro', faName: 'مونته‌نگرو', region: 'Europe' },
  MK: { name: 'North Macedonia', faName: 'مقدونیه شمالی', region: 'Europe' },
  MA: { name: 'Morocco', faName: 'مراکش', region: 'Africa' },
  TN: { name: 'Tunisia', faName: 'تونس', region: 'Africa' },
  LY: { name: 'Libya', faName: 'لیبی', region: 'Africa' },
  SD: { name: 'Sudan', faName: 'سودان', region: 'Africa' },
  KE: { name: 'Kenya', faName: 'کنیا', region: 'Africa' },
  NG: { name: 'Nigeria', faName: 'نیجریه', region: 'Africa' },
  GH: { name: 'Ghana', faName: 'غنا', region: 'Africa' },
  ET: { name: 'Ethiopia', faName: 'اتیوپی', region: 'Africa' },
  PH: { name: 'Philippines', faName: 'فیلیپین', region: 'Asia-Pacific' },
  PE: { name: 'Peru', faName: 'پرو', region: 'South America' },
  VE: { name: 'Venezuela', faName: 'ونزوئلا', region: 'South America' },
  EC: { name: 'Ecuador', faName: 'اکوادور', region: 'South America' },
  UY: { name: 'Uruguay', faName: 'اروگوئه', region: 'South America' },
  PY: { name: 'Paraguay', faName: 'پاراگوئه', region: 'South America' },
  CU: { name: 'Cuba', faName: 'کوبا', region: 'Central America' },
  PA: { name: 'Panama', faName: 'پاناما', region: 'Central America' },
  CR: { name: 'Costa Rica', faName: 'کاستاریکا', region: 'Central America' },
  DO: { name: 'Dominican Republic', faName: 'جمهوری دومینیکن', region: 'Caribbean' },
  PR: { name: 'Puerto Rico', faName: 'پورتوریکو', region: 'Caribbean' },
  KH: { name: 'Cambodia', faName: 'کامبوج', region: 'Asia-Pacific' },
  LA: { name: 'Laos', faName: 'لائوس', region: 'Asia-Pacific' },
  LK: { name: 'Sri Lanka', faName: 'سری‌لانکا', region: 'Asia-Pacific' },
  NP: { name: 'Nepal', faName: 'نپال', region: 'Asia' },
  MM: { name: 'Myanmar', faName: 'میانمار', region: 'Asia-Pacific' },
  MN: { name: 'Mongolia', faName: 'مغولستان', region: 'Asia' },
  MO: { name: 'Macau', faName: 'ماکائو', region: 'Asia-Pacific' },
  PS: { name: 'Palestine', faName: 'فلسطین', region: 'Middle East' },
};

const POPULAR_CODES = [
  'IR', 'NL', 'DE', 'GB', 'FR', 'US', 'CA', 'TR', 'AE', 'IT',
  'ES', 'CH', 'SE', 'FI', 'NO', 'RU', 'JP', 'SG', 'AU', 'BR'
];

export const POPULAR_COUNTRIES: CountryOption[] = POPULAR_CODES.map(code => ({
  code,
  name: COUNTRY_DICTIONARY[code]?.name || code,
  faName: COUNTRY_DICTIONARY[code]?.faName || code,
  region: COUNTRY_DICTIONARY[code]?.region || 'Other',
}));

export const ALL_COUNTRIES: CountryOption[] = Object.entries(COUNTRY_DICTIONARY).map(([code, item]) => ({
  code,
  name: item.name,
  faName: item.faName,
  region: item.region,
}));

/**
 * Returns localized country name based on active language.
 */
export function getCountryName(code?: string, lang: Language = 'en', fallbackName?: string): string {
  if (!code) return fallbackName || '';
  const upper = code.toUpperCase();
  const found = COUNTRY_DICTIONARY[upper];
  if (!found) return fallbackName || upper;
  return lang === 'fa' ? found.faName : found.name;
}

/**
 * Returns localized CountryOption object for a country code.
 */
export function getCountryDetails(code: string, lang: Language = 'en'): CountryOption {
  const upper = (code || '').toUpperCase();
  const found = COUNTRY_DICTIONARY[upper];
  if (found) {
    return {
      code: upper,
      name: lang === 'fa' ? found.faName : found.name,
      faName: found.faName,
      region: found.region,
    };
  }
  return { code: upper, name: upper, faName: upper, region: 'Other' };
}
