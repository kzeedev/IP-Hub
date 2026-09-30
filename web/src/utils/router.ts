import { ActiveView, Language } from '../types';
import { translations } from '../i18n/translations';
import { getCountryName } from './countries';

export interface RouteState {
  view: ActiveView;
  query?: string;
  countryCode?: string;
  lang: Language;
}

/**
 * Parses pathname (and fallback query params) into structured RouteState.
 * Supports /fa/... prefix for Persian and root /... for English.
 */
export function parseRoute(
  pathname: string = window.location.pathname,
  search: string = window.location.search
): RouteState {
  let cleanPath = pathname.replace(/\/+$/, '').trim();
  const searchParams = new URLSearchParams(search);
  const langQuery = searchParams.get('lang')?.toLowerCase();

  let lang: Language = 'en';
  let segments = cleanPath.split('/').filter(Boolean);

  // Language prefix
  if (segments.length > 0 && segments[0].toLowerCase() === 'fa') {
    lang = 'fa';
    segments = segments.slice(1);
  } else if (segments.length > 0 && segments[0].toLowerCase() === 'en') {
    lang = 'en';
    segments = segments.slice(1);
  } else if (langQuery === 'fa') {
    lang = 'fa';
  } else {
    // Check localStorage fallback if on root path without explicit language
    try {
      const stored = localStorage.getItem('iphub_language') as Language;
      if (stored === 'fa' && cleanPath === '') {
        lang = 'fa';
      }
    } catch {
      // ignore
    }
  }

  if (segments.length === 0) {
    return { view: 'lookup', lang };
  }

  const first = segments[0].toLowerCase();
  const rest = segments.slice(1).join('/');

  if (first === 'country' || first === 'countries' || first === 'country-ips') {
    const countryCode = rest ? rest.toUpperCase() : 'IR';
    return { view: 'country-ips', countryCode, lang };
  }

  if (first === 'batch' || first === 'batch-inspector') {
    return { view: 'batch', lang };
  }

  if (first === 'subnet-calc' || first === 'subnet' || first === 'calculator') {
    return { view: 'subnet-calc', query: rest ? decodeURIComponent(rest) : undefined, lang };
  }

  if (first === 'source' || first === 'about') {
    return { view: 'source', lang };
  }

  if (first === 'issues' || first === 'bugs') {
    return { view: 'issues', lang };
  }

  if (first === 'lookup' || first === 'ip' || first === 'asn' || first === 'prefix') {
    return { view: 'lookup', query: rest ? decodeURIComponent(rest) : undefined, lang };
  }

  // Fallback
  return { view: 'lookup', lang };
}

/**
 * Constructs clean URL with optional /fa prefix for Persian.
 */
export function getRouteUrl(
  view: ActiveView,
  opts: { query?: string; countryCode?: string; lang?: Language } = {}
): string {
  const lang = opts.lang || 'en';
  const prefix = lang === 'fa' ? '/fa' : '';
  let subPath = '';

  switch (view) {
    case 'country-ips':
      subPath = opts.countryCode ? `/country/${encodeURIComponent(opts.countryCode.toUpperCase())}` : '/country-ips';
      break;
    case 'batch':
      subPath = '/batch';
      break;
    case 'subnet-calc':
      subPath = '/subnet-calc';
      break;
    case 'source':
      subPath = '/source';
      break;
    case 'issues':
      subPath = '/issues';
      break;
    case 'lookup':
      if (opts.query && opts.query.trim()) {
        subPath = `/lookup/${encodeURIComponent(opts.query.trim())}`;
      } else {
        subPath = '';
      }
      break;
    default:
      subPath = '';
  }

  const fullPath = `${prefix}${subPath}` || (lang === 'fa' ? '/fa' : '/');
  return fullPath;
}

/**
 * Returns URL when switching language while preserving current view & parameters.
 */
export function switchRouteLanguage(targetLang: Language, currentView: ActiveView, opts?: { query?: string; countryCode?: string }): string {
  return getRouteUrl(currentView, {
    query: opts?.query,
    countryCode: opts?.countryCode,
    lang: targetLang,
  });
}

/**
 * Pushes or replaces history state cleanly without full page reloads.
 */
export function navigateRoute(
  view: ActiveView,
  opts: { query?: string; countryCode?: string; lang?: Language; replace?: boolean } = {}
) {
  const url = getRouteUrl(view, opts);
  const currentUrl = window.location.pathname;

  if (currentUrl !== url) {
    if (opts.replace) {
      window.history.replaceState({ view, query: opts.query, countryCode: opts.countryCode, lang: opts.lang }, '', url);
    } else {
      window.history.pushState({ view, query: opts.query, countryCode: opts.countryCode, lang: opts.lang }, '', url);
    }
  }
}

/**
 * Updates document.title, canonical link, and meta description using centralized translations.
 */
export function updateDocumentSeoMeta(
  view: ActiveView,
  lang: Language,
  opts: { query?: string; countryCode?: string; countryName?: string; netname?: string } = {}
) {
  const dict = (translations[lang] || translations.en).meta;
  let title = dict.defaultTitle;
  let desc = dict.defaultDesc;

  switch (view) {
    case 'country-ips':
      if (opts.countryCode) {
        const cCode = opts.countryCode.toUpperCase();
        const cName = opts.countryName || getCountryName(cCode, lang);
        title = dict.countryTitle.replace('{country}', cName).replace('{code}', cCode);
        desc = dict.countryDesc.replace('{country}', cName).replace('{code}', cCode);
      } else {
        title = dict.countryTitleDefault;
      }
      break;

    case 'lookup':
      if (opts.query) {
        const q = opts.query.trim();
        const extraName = opts.netname ? ` - ${opts.netname}` : '';
        title = dict.lookupTitle.replace('{query}', q).replace('{extra}', extraName);
        desc = dict.lookupDesc.replace('{query}', q);
      }
      break;

    case 'batch':
      title = dict.batchTitle;
      desc = dict.batchDesc;
      break;

    case 'subnet-calc':
      title = dict.subnetTitle;
      desc = dict.subnetDesc;
      break;

    case 'source':
      title = dict.sourceTitle;
      desc = dict.sourceDesc;
      break;

    case 'issues':
      title = dict.issuesTitle;
      desc = dict.issuesDesc;
      break;
  }

  document.title = title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', desc);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', title);
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.setAttribute('content', desc);
  }

  // Canonical and Hreflang alternate link tags
  const origin = window.location.origin;
  const currentPath = getRouteUrl(view, { query: opts.query, countryCode: opts.countryCode, lang });
  const enPath = getRouteUrl(view, { query: opts.query, countryCode: opts.countryCode, lang: 'en' });
  const faPath = getRouteUrl(view, { query: opts.query, countryCode: opts.countryCode, lang: 'fa' });

  setOrUpdateHeadLink('canonical', `${origin}${currentPath}`);
  setOrUpdateHeadLink('alternate', `${origin}${enPath}`, { hreflang: 'en' });
  setOrUpdateHeadLink('alternate', `${origin}${faPath}`, { hreflang: 'fa' });
  setOrUpdateHeadLink('alternate', `${origin}${enPath}`, { hreflang: 'x-default' });
}

function setOrUpdateHeadLink(rel: string, href: string, attributes: Record<string, string> = {}) {
  let selector = `link[rel="${rel}"]`;
  if (attributes.hreflang) {
    selector += `[hreflang="${attributes.hreflang}"]`;
  }
  let link = document.querySelector(selector) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    for (const [k, v] of Object.entries(attributes)) {
      link.setAttribute(k, v);
    }
    document.head.appendChild(link);
  }
  link.href = href;
}
