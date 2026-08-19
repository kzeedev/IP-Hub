import React, { useState } from 'react';
import { AsnRecord } from '../types';
import { Radio, Share2, Copy, Check, Terminal, ExternalLink, ArrowLeft } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

interface AsnViewProps {
  record: AsnRecord;
  onSearchResource: (res: string) => void;
  onBack: () => void;
}

export const AsnView: React.FC<AsnViewProps> = ({ record, onSearchResource, onBack }) => {
  const { t } = useLanguage();
  const [copiedAsn, setCopiedAsn] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleCopyAsn = () => {
    copyToClipboard(record.asn);
    setCopiedAsn(true);
    setTimeout(() => setCopiedAsn(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t.asnView.backButton}</span>
        </button>
      </div>

      {/* ASN Header Summary */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-mono">{record.asn}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                  {t.asnView.activeBgpAsn}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-300 mt-0.5">
                {record.holder}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAsn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {copiedAsn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAsn ? t.asnView.copied : t.asnView.copyAsn}</span>
            </button>
          </div>
        </div>

        {/* ASN Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">{t.asnView.holder}</span>
            <span className="font-semibold text-white text-sm block">{record.orgName || record.holder}</span>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">{t.asnView.announcedPrefixesTitle}</span>
            <span className="font-mono font-bold text-white text-base block">{record.announcedPrefixesCount} {t.asnView.prefixesCount}</span>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">{t.summary.abuseContact}</span>
            <span className="font-mono text-emerald-400 block truncate" title={record.abuseContact?.email || 'N/A'}>
              {record.abuseContact?.email || t.asnView.registeredDb}
            </span>
          </div>

        </div>
      </div>

      {/* Announced Prefixes Table */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              {t.asnView.announcedPrefixesTitle} ({record.prefixes?.length || 0})
            </h3>
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showRaw ? t.asnView.hideRaw : t.asnView.showRaw}</span>
          </button>
        </div>

        {record.prefixes && record.prefixes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
            {record.prefixes.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onSearchResource(p)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-left group transition-all"
              >
                <span className="font-mono text-xs text-slate-200 group-hover:text-cyan-300 font-semibold truncate">
                  {p}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-4">{t.asnView.noPrefixes}</p>
        )}

        {/* Raw View Toggle */}
        {showRaw && record.rawWhoisText && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-80 overflow-y-auto">
              {record.rawWhoisText}
            </pre>
          </div>
        )}

      </div>

    </div>
  );
};
