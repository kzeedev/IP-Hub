export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  region: string;
}

export const POPULAR_COUNTRIES: CountryOption[] = [
  { code: 'IR', name: 'Iran', flag: '🇮🇷', region: 'Middle East' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'Middle East/Europe' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
  { code: 'RU', name: 'Russian Federation', flag: '🇷🇺', region: 'Europe/Asia' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia-Pacific' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia-Pacific' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
];

export const ALL_COUNTRIES: CountryOption[] = [
  ...POPULAR_COUNTRIES,
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', region: 'Asia' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', region: 'Europe' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', region: 'Africa' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'South America' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', region: 'Asia' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', region: 'Asia' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', region: 'Middle East' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', region: 'Asia' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', region: 'Europe' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', region: 'South America' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', region: 'Europe' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', region: 'Europe' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'South America' },
  { code: 'CN', name: 'China', flag: '🇨🇳', region: 'Asia-Pacific' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'South America' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', region: 'Europe' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'Africa' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', region: 'Europe' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', region: 'Asia' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia-Pacific' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', region: 'Europe' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', region: 'Europe' },
  { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia-Pacific' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', region: 'Asia-Pacific' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', region: 'Middle East' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', region: 'Middle East' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', region: 'Middle East' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', region: 'Asia' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', region: 'Middle East' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', region: 'Middle East' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', region: 'Europe' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'Asia-Pacific' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'North America' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', region: 'Middle East' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', region: 'Middle East' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', region: 'Europe' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', region: 'Europe' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', region: 'Europe' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', region: 'Europe' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', region: 'Asia-Pacific' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', region: 'Middle East' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', region: 'Asia-Pacific' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'Asia-Pacific' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', region: 'Europe' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', region: 'Asia-Pacific' },
];

export function getCountryDetails(code: string): CountryOption {
  const upper = (code || '').toUpperCase();
  const found = ALL_COUNTRIES.find(c => c.code === upper);
  if (found) return found;
  const flag = upper.length === 2
    ? String.fromCodePoint(...upper.split('').map(c => 127397 + c.charCodeAt(0)))
    : '🌐';
  return { code: upper, name: upper, flag, region: 'Other' };
}
