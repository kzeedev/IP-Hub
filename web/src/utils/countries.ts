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
 * Approximate center coordinates for countries (fallback when IP GPS is missing)
 */
export const COUNTRY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  IR: { lat: 32.4279, lon: 53.6880 },
  NL: { lat: 52.1326, lon: 5.2913 },
  DE: { lat: 51.1657, lon: 10.4515 },
  GB: { lat: 55.3781, lon: -3.4360 },
  FR: { lat: 46.2276, lon: 2.2137 },
  US: { lat: 37.0902, lon: -95.7129 },
  CA: { lat: 56.1304, lon: -106.3468 },
  TR: { lat: 38.9637, lon: 35.2433 },
  AE: { lat: 23.4241, lon: 53.8478 },
  IT: { lat: 41.8719, lon: 12.5674 },
  ES: { lat: 40.4637, lon: -3.7492 },
  CH: { lat: 46.8182, lon: 8.2275 },
  SE: { lat: 60.1282, lon: 18.6435 },
  FI: { lat: 61.9241, lon: 25.7482 },
  NO: { lat: 60.4720, lon: 8.4689 },
  RU: { lat: 61.5240, lon: 105.3188 },
  JP: { lat: 36.2048, lon: 138.2529 },
  SG: { lat: 1.3521, lon: 103.8198 },
  AU: { lat: -25.2744, lon: 133.7751 },
  BR: { lat: -14.2350, lon: -51.9253 },
  AF: { lat: 33.9391, lon: 67.7100 },
  AL: { lat: 41.1533, lon: 20.1683 },
  DZ: { lat: 28.0339, lon: 1.6596 },
  AR: { lat: -38.4161, lon: -63.6167 },
  AM: { lat: 40.0691, lon: 45.0382 },
  AT: { lat: 47.5162, lon: 14.5501 },
  AZ: { lat: 40.1431, lon: 47.5769 },
  BH: { lat: 26.0667, lon: 50.5577 },
  BD: { lat: 23.6850, lon: 90.3563 },
  BY: { lat: 53.7098, lon: 27.9534 },
  BE: { lat: 50.5039, lon: 4.4699 },
  BO: { lat: -16.2902, lon: -63.5887 },
  BA: { lat: 43.9159, lon: 17.6791 },
  BG: { lat: 42.7339, lon: 25.4858 },
  CL: { lat: -35.6751, lon: -71.5430 },
  CN: { lat: 35.8617, lon: 104.1954 },
  CO: { lat: 4.5709, lon: -74.2973 },
  HR: { lat: 45.1000, lon: 15.2000 },
  CY: { lat: 35.1264, lon: 33.4299 },
  CZ: { lat: 49.8175, lon: 15.4730 },
  DK: { lat: 56.2639, lon: 9.5018 },
  EG: { lat: 26.8206, lon: 30.8025 },
  EE: { lat: 58.5953, lon: 25.0136 },
  GE: { lat: 42.3154, lon: 43.3569 },
  GR: { lat: 39.0742, lon: 21.8243 },
  HK: { lat: 22.3193, lon: 114.1694 },
  HU: { lat: 47.1625, lon: 19.5033 },
  IS: { lat: 64.9631, lon: -19.0208 },
  IN: { lat: 20.5937, lon: 78.9629 },
  ID: { lat: -0.7893, lon: 113.9213 },
  IQ: { lat: 33.2232, lon: 43.6793 },
  IE: { lat: 53.1424, lon: -7.6921 },
  IL: { lat: 31.0461, lon: 34.8516 },
  JO: { lat: 30.5852, lon: 36.2384 },
  KZ: { lat: 48.0196, lon: 66.9237 },
  KW: { lat: 29.3117, lon: 47.4818 },
  LB: { lat: 33.8547, lon: 35.8623 },
  LU: { lat: 49.8153, lon: 6.1296 },
  MY: { lat: 4.2105, lon: 101.9758 },
  MX: { lat: 23.6345, lon: -102.5528 },
  NZ: { lat: -40.9006, lon: 174.8860 },
  OM: { lat: 21.5126, lon: 55.9233 },
  PK: { lat: 30.3753, lon: 69.3451 },
  PL: { lat: 51.9194, lon: 19.1451 },
  PT: { lat: 39.3999, lon: -8.2245 },
  QA: { lat: 25.3548, lon: 51.1839 },
  RO: { lat: 45.9432, lon: 24.9668 },
  SA: { lat: 23.8859, lon: 45.0792 },
  RS: { lat: 44.0165, lon: 21.0059 },
  SK: { lat: 48.6690, lon: 19.6990 },
  SI: { lat: 46.1512, lon: 14.9955 },
  ZA: { lat: -30.5595, lon: 22.9375 },
  KR: { lat: 35.9078, lon: 127.7669 },
  SY: { lat: 34.8021, lon: 38.9968 },
  TW: { lat: 23.6978, lon: 120.9605 },
  TH: { lat: 15.8700, lon: 100.9925 },
  UA: { lat: 48.3794, lon: 31.1656 },
  VN: { lat: 14.0583, lon: 108.2772 },
  YE: { lat: 15.5527, lon: 48.5164 },
  UZ: { lat: 41.3775, lon: 64.5853 },
  TM: { lat: 38.9697, lon: 59.5563 },
  TJ: { lat: 38.8610, lon: 71.2761 },
  KG: { lat: 41.2044, lon: 74.7661 },
  MD: { lat: 47.4116, lon: 28.3699 },
  LT: { lat: 55.1694, lon: 23.8813 },
  LV: { lat: 56.8796, lon: 24.6032 },
  MT: { lat: 35.9375, lon: 14.3754 },
  MC: { lat: 43.7384, lon: 7.4246 },
  ME: { lat: 42.7087, lon: 19.3744 },
  MK: { lat: 41.6086, lon: 21.7453 },
  MA: { lat: 31.7917, lon: -7.0926 },
  TN: { lat: 33.8869, lon: 9.5375 },
  LY: { lat: 26.3351, lon: 17.2283 },
  SD: { lat: 12.8628, lon: 30.2176 },
  KE: { lat: -0.0236, lon: 37.9062 },
  NG: { lat: 9.0820, lon: 8.6753 },
  GH: { lat: 7.9465, lon: -1.0232 },
  ET: { lat: 9.1450, lon: 40.4897 },
  PH: { lat: 12.8797, lon: 121.7740 },
  PE: { lat: -9.1900, lon: -75.0152 },
  VE: { lat: 6.4238, lon: -66.5897 },
  EC: { lat: -1.8312, lon: -78.1834 },
  UY: { lat: -32.5228, lon: -55.7658 },
  PY: { lat: -23.4425, lon: -58.4438 },
  CU: { lat: 21.5218, lon: -77.7812 },
  PA: { lat: 8.5379, lon: -80.7821 },
  CR: { lat: 9.7489, lon: -83.7534 },
  DO: { lat: 18.7357, lon: -70.1627 },
  PR: { lat: 18.2208, lon: -66.5901 },
  KH: { lat: 12.5657, lon: 104.9910 },
  LA: { lat: 19.8563, lon: 102.4955 },
  LK: { lat: 7.8731, lon: 80.7718 },
  NP: { lat: 28.3949, lon: 84.1240 },
  MM: { lat: 21.9162, lon: 95.9560 },
  MN: { lat: 46.8625, lon: 103.8467 },
  MO: { lat: 22.1987, lon: 113.5439 },
  PS: { lat: 31.9522, lon: 35.2332 },
};

/**
 * Returns fallback center coordinates for a country code.
 */
export function getCountryCoordinates(code?: string): { lat: number; lon: number } | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return COUNTRY_COORDINATES[upper] || null;
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

