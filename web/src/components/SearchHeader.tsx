import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, X, History, Trash2 } from 'lucide-react';
import { SearchHistoryItem } from '../types';
import { TurnstileWidget } from './TurnstileWidget';
import { useLanguage } from '../i18n/LanguageContext';

interface SearchHeaderProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q: string) => void;
  isLoading: boolean;
  history: SearchHistoryItem[];
  onClearHistory: () => void;
}

const SAMPLE_QUERIES = [
  { label: 'RIPE NCC IPv4', query: '193.0.6.139', tag: 'IPv4' },
  { label: 'Cloudflare', query: '1.1.1.1', tag: 'DNS' },
  { label: 'Google Public', query: '8.8.8.8', tag: 'DNS' },
  { label: 'RIPE IPv6', query: '2001:67c:2e8::2', tag: 'IPv6' },
  { label: 'RIPE NCC ASN', query: 'AS3333', tag: 'ASN' },
  { label: 'RIPE Prefix', query: '193.0.0.0/21', tag: 'CIDR' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  query,
  setQuery,
  onSearch,
  isLoading,
  history,
  onClearHistory,
}) => {
  const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowHistory(false);
      onSearch(query.trim());
    }
  };

  const getQueryTypeHint = (val: string) => {
    const v = val.trim();
    if (!v) return null;
    if (v.toUpperCase().startsWith('AS') || /^\d{2,6}$/.test(v)) return { type: 'ASN', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    if (v.includes('/')) return { type: t.search.typeCidr, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' };
    if (v.includes(':')) return { type: 'IPv6', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' };
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) return { type: 'IPv4', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    return { type: t.search.typeQuery, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
  };

  const typeHint = getQueryTypeHint(query);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800/80 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Main SEO Title & Subtitle */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.search.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl mx-auto">
            {t.search.subtitle}
          </p>
        </div>

        {/* Main Search Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden border border-slate-700 bg-slate-800/90 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
            
            <div className="pl-3 sm:pl-4 pr-1 text-slate-400 flex items-center shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>

            <input
              id="whois-search-input"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
              placeholder={t.search.placeholder}
              className="w-full py-3 sm:py-4 px-2 text-xs sm:text-base bg-transparent text-white placeholder-slate-400 focus:outline-none font-mono"
            />

            {/* Type Hint Badge */}
            {typeHint && (
              <div className="hidden sm:flex items-center mx-1 sm:mx-2 shrink-0">
                <span className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded border ${typeHint.color}`}>
                  {typeHint.type}
                </span>
              </div>
            )}

            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-white mx-0.5 sm:mx-1 shrink-0"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            {/* Submit button */}
            <button
              id="btn-search-submit"
              type="submit"
              disabled={isLoading || !query.trim()}
              className="m-1 sm:m-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shadow-md shadow-cyan-600/30 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="hidden xs:inline">{t.search.button}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </div>

          {/* Search History Dropdown */}
          {showHistory && history.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 border border-slate-700 rounded-xl shadow-2xl z-40 p-2 backdrop-blur-md">
              <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700/60 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  {t.search.historyTitle}
                </span>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3 h-3" />
                  {t.search.clearHistory}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(item.query);
                      setShowHistory(false);
                      onSearch(item.query);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700/60 flex items-center justify-between text-xs text-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-2 font-mono truncate">
                      <span className="font-semibold text-cyan-300 group-hover:text-cyan-200">{item.query}</span>
                      {item.netname && <span className="text-slate-400 text-[11px] font-sans truncate">({item.netname})</span>}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans shrink-0 ml-2">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Cloudflare Turnstile CAPTCHA for Single Lookup */}
        <div className="mt-3 flex justify-center">
          <TurnstileWidget
            onVerify={token => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
          />
        </div>

        {/* Quick Sample Queries */}
        <div className="mt-3 sm:mt-4 flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium text-[11px] sm:text-xs">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            {t.search.quickSamples}
          </span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample.query);
                onSearch(sample.query);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] sm:text-xs font-mono group"
            >
              <span className="text-[9px] sm:text-[10px] font-sans px-1 py-0.2 bg-slate-900 rounded text-cyan-400 group-hover:text-cyan-300">
                {sample.tag}
              </span>
              <span>{sample.query}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
