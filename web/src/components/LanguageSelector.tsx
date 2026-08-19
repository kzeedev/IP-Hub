import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { parseRoute, switchRouteLanguage } from '../utils/router';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const currentRoute = parseRoute();
  const enHref = switchRouteLanguage('en', currentRoute.view, { query: currentRoute.query, countryCode: currentRoute.countryCode });
  const faHref = switchRouteLanguage('fa', currentRoute.view, { query: currentRoute.query, countryCode: currentRoute.countryCode });

  const handleLangClick = (e: React.MouseEvent, targetLang: 'en' | 'fa') => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
      e.preventDefault();
      setLanguage(targetLang);
    }
  };

  return (
    <div className="inline-flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-0.5 shadow-sm text-xs font-semibold">
      <a
        href={enHref}
        hrefLang="en"
        onClick={(e) => handleLangClick(e, 'en')}
        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
          language === 'en'
            ? 'bg-cyan-600 text-white shadow-sm font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="English"
      >
        <span className="fi fi-us fis rounded-xs"></span>
        <span>EN</span>
      </a>
      <a
        href={faHref}
        hrefLang="fa"
        onClick={(e) => handleLangClick(e, 'fa')}
        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
          language === 'fa'
            ? 'bg-cyan-600 text-white shadow-sm font-bold font-persian'
            : 'text-slate-400 hover:text-slate-200 font-persian'
        }`}
        title="فارسی"
      >
        <span className="fi fi-ir fis rounded-xs"></span>
        <span>فارسی</span>
      </a>
    </div>
  );
};
