import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Globe } from 'lucide-react';
import 'flag-icons/css/flag-icons.min.css';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-0.5 shadow-sm text-xs font-semibold">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${language === 'en'
          ? 'bg-cyan-600 text-white shadow-sm font-bold'
          : 'text-slate-400 hover:text-slate-200'
          }`}
        title="English"
      >
        <span className='fi fi-us fis'></span>
        <span>EN</span>
      </button>
      <button
        onClick={() => setLanguage('fa')}
        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${language === 'fa'
          ? 'bg-cyan-600 text-white shadow-sm font-bold font-persian'
          : 'text-slate-400 hover:text-slate-200 font-persian'
          }`}
        title="فارسی"
      >
        <span className='fi fi-ir fis'></span>
        <span>فارسی</span>
      </button>
    </div>
  );
};
