import React from 'react';
import { Home, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { ActiveView } from '../types';

interface NotFoundViewProps {
  onNavigate: (view: ActiveView) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-8 sm:p-12 shadow-sm space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div>
          <div className="text-6xl sm:text-7xl font-extrabold text-white tracking-tight font-mono">
            {t.notFound.code}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-3">
            {t.notFound.title}
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            {t.notFound.description}
          </p>
        </div>

        <div>
          <button
            onClick={() => onNavigate('lookup')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/30 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t.notFound.homeBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
