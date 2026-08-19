import React, { useState } from 'react';
import { Copy, Check, Download, Search, AlignLeft } from 'lucide-react';
import { copyToClipboard, downloadText } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

interface RawWhoisTabProps {
  rawText: string;
  query: string;
  source: string;
}

export const RawWhoisTab: React.FC<RawWhoisTabProps> = ({ rawText = '', query, source }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleCopy = () => {
    copyToClipboard(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadText(`whois_${(query || 'query').replace(/[^a-zA-Z0-9.-]/g, '_')}.txt`, rawText);
  };

  const lines = (rawText || '').split('\n');

  return (
    <div className="space-y-4">
      
      {/* Raw Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-850 p-4 rounded-2xl border border-slate-800">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t.rawWhoisTab.searchPlaceholder}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrap(!wrap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              wrap ? 'bg-cyan-600 text-white border-cyan-500 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>{t.rawWhoisTab.wrap}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Download .txt"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.rawWhoisTab.export}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 font-bold"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t.rawWhoisTab.copied : t.rawWhoisTab.copyText}</span>
          </button>
        </div>

      </div>

      {/* Terminal View Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="font-mono text-xs text-slate-400 ml-2">whois -h whois.ripe.net {query}</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-semibold">{source || 'RIPE'} NCC</span>
        </div>

        {/* Monospace Output */}
        <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className={`font-mono text-xs leading-relaxed text-slate-300 ${wrap ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
            {lines.map((line, idx) => {
              const isComment = line.trim().startsWith('%') || line.trim().startsWith('#');
              const isMatch = searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase());

              return (
                <div
                  key={idx}
                  className={`flex items-baseline ${isMatch ? 'bg-cyan-500/20 text-cyan-200' : ''}`}
                >
                  <span className="w-10 text-right pr-4 text-slate-600 select-none text-[11px]">
                    {idx + 1}
                  </span>
                  <span className={isComment ? 'text-slate-500 italic' : 'text-slate-200'}>
                    {line}
                  </span>
                </div>
              );
            })}
          </pre>
        </div>

      </div>

    </div>
  );
};
