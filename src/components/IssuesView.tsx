import React from 'react';
import { Bug, GitPullRequest, ExternalLink, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const IssuesView: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      
      {/* Header */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 text-white">
              <Bug className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{t.issuesPage.title}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-semibold">
                  {t.issuesPage.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {t.issuesPage.intro}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="https://github.com/kzeedev/IP-Hub/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/30"
            >
              <Bug className="w-4 h-4" />
              <span>{t.issuesPage.submitIssue}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href="https://github.com/kzeedev/IP-Hub/pulls"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <GitPullRequest className="w-4 h-4 text-cyan-400" />
              <span>{t.issuesPage.createPr}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Guidelines Box */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 md:p-8 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <span>{t.issuesPage.guidelinesTitle}</span>
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300">
          <div className="flex items-start gap-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.issuesPage.guide1}</p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.issuesPage.guide2}</p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.issuesPage.guide3}</p>
          </div>
        </div>
      </div>

    </div>
  );
};
