import React, { useState } from 'react';
import { WhoisRecord } from '../types';
import { formatDate, copyToClipboard } from '../utils/helpers';
import { Network, Server, Clock, User, Building, Copy, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface OverviewTabProps {
  record: WhoisRecord;
  onSearchResource: (res: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ record, onSearchResource }) => {
  const { t } = useLanguage();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, val: string) => {
    copyToClipboard(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Network Overview Grid */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          {t.overviewTab.allocationTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          
          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">{t.overviewTab.netnameLabel}</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-cyan-300">{record.netname}</span>
              <button
                onClick={() => handleCopy('netname', record.netname)}
                className="text-slate-500 hover:text-slate-200"
                title="Copy"
              >
                {copiedKey === 'netname' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">{t.overviewTab.ipRangeLabel}</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-slate-200 font-semibold">{record.range}</span>
              <button
                onClick={() => handleCopy('range', record.range)}
                className="text-slate-500 hover:text-slate-200"
                title={t.common.copy}
              >
                {copiedKey === 'range' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">{t.overviewTab.cidrLabel}</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-indigo-300 font-bold">{record.cidr}</span>
              <button
                onClick={() => handleCopy('cidr', record.cidr)}
                className="text-slate-500 hover:text-slate-200"
                title={t.common.copy}
              >
                {copiedKey === 'cidr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">{t.overviewTab.statusLabel}</span>
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-mono font-bold rounded bg-slate-800 text-cyan-300 border border-cyan-500/20">
                {record.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">{t.overviewTab.reverseDns}</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-emerald-300 truncate" title={record.reverseDns || 'No PTR record found'}>
                {record.reverseDns || <span className="text-slate-500 italic">{t.overviewTab.noReverseDns}</span>}
              </span>
              {record.reverseDns && (
                <button
                  onClick={() => handleCopy('rdns', record.reverseDns!)}
                  className="text-slate-500 hover:text-slate-200 ml-2"
                >
                  {copiedKey === 'rdns' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">{t.overviewTab.rirSource}</span>
            <span className="font-semibold text-xs text-slate-200 uppercase tracking-wide">{record.source}</span>
          </div>

        </div>

        {/* Network Description */}
        {record.description && record.description.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400 font-medium block mb-2">{t.overviewTab.description}</span>
            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80 space-y-1">
              {record.description.map((desc, idx) => (
                <p key={idx} className="text-xs text-slate-300 font-mono">
                  {desc}
                </p>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Organization & Administrative Entities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Organization Box */}
        <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-400" />
              {t.overviewTab.orgTitle}
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">{t.overviewTab.orgName}</span>
                <span className="text-sm font-bold text-white block">
                  {record.orgName || record.netname || t.overviewTab.autonomousOrg}
                </span>
              </div>

              {record.orgHandle && (
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">{t.overviewTab.orgHandle}</span>
                  <button
                    onClick={() => onSearchResource(record.orgHandle!)}
                    className="font-mono text-xs font-semibold text-cyan-400 hover:underline bg-slate-900/80 px-2 py-1 rounded border border-slate-700"
                  >
                    {record.orgHandle}
                  </button>
                </div>
              )}
            </div>
          </div>

          {record.mntBy && record.mntBy.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400 block mb-1.5">{t.overviewTab.mntBy}</span>
              <div className="flex flex-wrap gap-1.5">
                {record.mntBy.map((mnt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSearchResource(mnt)}
                    className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    {mnt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contacts & Administration Box */}
        <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              {t.overviewTab.adminContact}
            </h3>

            <div className="space-y-4">
              
              <div>
                <span className="text-xs text-slate-400 block mb-1">{t.overviewTab.adminContactsLabel}</span>
                {record.adminContacts && record.adminContacts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {record.adminContacts.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSearchResource(c.handle)}
                        className="font-mono text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded"
                      >
                        {c.handle}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">{t.overviewTab.inheritedContact}</span>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">{t.overviewTab.techContactsLabel}</span>
                {record.techContacts && record.techContacts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {record.techContacts.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSearchResource(c.handle)}
                        className="font-mono text-xs text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2 py-1 rounded"
                      >
                        {c.handle}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">{t.overviewTab.inheritedContact}</span>
                )}
              </div>

            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.overviewTab.created}: {record.created ? formatDate(record.created) : 'N/A'}</span>
            </div>
            {record.lastModified && (
              <span>{t.overviewTab.lastModified}: {formatDate(record.lastModified)}</span>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
