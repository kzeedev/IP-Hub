import React, { useState } from 'react';
import { ListPlus, Play, Download, Trash2, ExternalLink } from 'lucide-react';
import { BatchLookupItemResult } from '../types';
import { getCountryFlag, downloadText } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

interface BatchInspectorProps {
  onInspectSingle: (ip: string) => void;
}

const DEFAULT_BATCH = `193.0.6.139
1.1.1.1
8.8.8.8
9.9.9.9
2001:67c:2e8::2
185.199.108.153
140.82.121.4`;

export const BatchInspector: React.FC<BatchInspectorProps> = ({ onInspectSingle }) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState(DEFAULT_BATCH);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BatchLookupItemResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatch = async () => {
    const lines = inputText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/whois/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines.slice(0, 50) }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Batch query failed');
      }

      const data = await res.json();
      setResults(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to execute batch lookup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const headers = ['Query', 'Status', 'IP Version', 'Network Name', 'Range', 'Country', 'Origin AS', 'Abuse Email'];
    const rows = results.map(r => [
      `"${r.query}"`,
      `"${r.status}"`,
      `"${r.ipVersion || ''}"`,
      `"${(r.netname || '').replace(/"/g, '""')}"`,
      `"${(r.range || '').replace(/"/g, '""')}"`,
      `"${r.countryCode || ''}"`,
      `"${r.originAsn || ''}"`,
      `"${r.abuseEmail || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadText('ripe_batch_whois_results.csv', csvContent);
  };

  const handleExportJson = () => {
    if (results.length === 0) return;
    downloadText('ripe_batch_whois_results.json', JSON.stringify(results, null, 2));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      
      {/* Header Banner */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <ListPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t.batch.title}</h2>
            <p className="text-xs text-slate-400">
              {t.batch.description}
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {t.batch.inputPlaceholder}
          </label>
          <button
            onClick={() => setInputText('')}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.batch.clearButton}
          </button>
        </div>

        <textarea
          rows={6}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Paste IP addresses or CIDR prefixes here (e.g. 1.1.1.1, 8.8.8.8, 193.0.0.0/21)..."
          className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {inputText.split('\n').filter(l => l.trim()).length} targets queued
          </span>

          <button
            onClick={handleRunBatch}
            disabled={isLoading || !inputText.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition-all active:scale-95"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>{isLoading ? t.batch.analyzing : t.batch.analyzeButton}</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-slate-850 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">
              {t.batch.resultsTitle} ({results.length} processed)
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.batch.exportCsv}</span>
              </button>
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.batch.exportJson}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">{t.batch.colTarget}</th>
                  <th className="py-3 px-4">{t.batch.colNetname}</th>
                  <th className="py-3 px-4">Range</th>
                  <th className="py-3 px-4">{t.batch.colOrigin}</th>
                  <th className="py-3 px-4">{t.batch.colCountry}</th>
                  <th className="py-3 px-4">Abuse Email</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                      {row.query}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold truncate max-w-[160px]">
                      {row.netname || <span className="text-slate-500 italic">Unknown</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-[140px]">
                      {row.range || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {row.originAsn || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span>{getCountryFlag(row.countryCode)}</span>
                        <span className="font-mono text-[11px]">{row.countryCode || '-'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-[150px]">
                      {row.abuseEmail || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspectSingle(row.query)}
                        className="p-1 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10 rounded transition-colors"
                        title="Open full WHOIS report"
                      >
                        <ExternalLink className="w-4 h-4 ml-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
