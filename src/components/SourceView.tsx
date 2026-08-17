import React from 'react';
import { GitBranch, ExternalLink, ShieldCheck, Database, Zap, Cpu, Code2, Globe2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const SourceView: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      
      {/* Header Banner */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <GitBranch className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{t.sourcePage.title}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">
                  {t.sourcePage.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {t.sourcePage.intro}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="https://ip-hub.ir/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-cyan-600/30"
            >
              <Globe2 className="w-4 h-4" />
              <span>{t.sourcePage.projectPage}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://github.com/kzeedev/IP-Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <GitBranch className="w-4 h-4 text-cyan-400" />
              <span>{t.sourcePage.githubRepo}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 md:p-8 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>{t.sourcePage.featuresTitle}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 leading-relaxed">{t.sourcePage.feature1}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <Code2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 leading-relaxed">{t.sourcePage.feature2}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 leading-relaxed">{t.sourcePage.feature3}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 leading-relaxed">{t.sourcePage.feature4}</p>
          </div>
        </div>

        <div className="p-5 bg-cyan-500/5 rounded-xl border border-cyan-500/20 text-xs text-slate-300 space-y-2">
          <h3 className="font-bold text-white text-sm">{t.sourcePage.communityTitle}</h3>
          <p className="leading-relaxed">{t.sourcePage.communityText}</p>
        </div>
      </div>

    </div>
  );
};
