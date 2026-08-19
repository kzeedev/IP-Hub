import React, { useState } from 'react';
import { Server, Globe, Radio, Check, Copy, ExternalLink, MapPin, Hash } from 'lucide-react';
import { WhoisRecord } from '../types';
import { copyToClipboard } from '../utils/helpers';
import { getCountryName } from '../utils/countries';
import { getRouteUrl } from '../utils/router';
import { FlagIcon } from './FlagIcon';
import { useLanguage } from '../i18n/LanguageContext';

interface SummaryCardsProps {
  record: WhoisRecord;
  onSearchResource: (resource: string) => void;
  onExploreCountry?: (countryCode: string) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ record, onSearchResource, onExploreCountry }) => {
  const { language, t } = useLanguage();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const localizedCountry = getCountryName(record.countryCode, language, record.country);

  const handleCopy = (field: string, text: string) => {
    copyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isAnnounced = record.routing.isAnnounced;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Network & Org Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t.summary.netname}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {record.status || 'ALLOCATED'}
          </span>
        </div>
        <div className="mt-3">
          <h3 className="text-base font-bold text-white tracking-tight truncate" title={record.netname}>
            {record.netname}
          </h3>
          <p className="text-xs text-slate-400 mt-1 truncate" title={record.orgName || record.description?.[0] || 'RIPE NCC Member'}>
            {record.orgName || record.description?.[0] || 'RIPE NCC Member'}
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t.summary.registry}:</span>
          <span className="font-semibold text-slate-200">{record.source}</span>
        </div>
      </div>

      {/* 2. Range & CIDR Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Hash className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t.summary.cidr}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            IPv{record.subnet?.ipVersion || (record.query.includes(':') ? '6' : '4')}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold text-indigo-300 truncate" title={record.cidr}>
              {record.cidr}
            </span>
            <button
              onClick={() => handleCopy('cidr', record.cidr)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              title={t.common.copy}
            >
              {copiedField === 'cidr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-400 mt-1 truncate" title={record.range}>
            {record.range}
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t.summary.capacity}:</span>
          <span className="font-medium text-slate-200">{record.subnet?.usableHosts?.toLocaleString() || '1'} {t.summary.hosts}</span>
        </div>
      </div>

      {/* 3. Routing & Origin ASN Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t.summary.originAsn}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            isAnnounced
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {isAnnounced ? t.routingTab.globallyRouted : t.summary.unannounced}
          </span>
        </div>
        <div className="mt-3">
          {record.routing.originAsn && record.routing.originAsn !== 'Unrouted' ? (
            <a
              href={getRouteUrl('lookup', { query: record.routing.originAsn, lang: language })}
              hrefLang={language}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                  e.preventDefault();
                  onSearchResource(record.routing.originAsn);
                }
              }}
              className="flex items-center gap-1.5 font-mono text-base font-bold text-amber-300 hover:text-amber-200 hover:underline transition-colors cursor-pointer"
            >
              <span>{record.routing.originAsn}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-slate-400 text-sm font-semibold">{t.summary.unrouted}</span>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {t.routingTab.bgpVisibility}: <span className="text-slate-200 font-semibold">{record.routing.bgpVisibilityPercentage}%</span>
          </p>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t.routingTab.lookingGlassTitle}:</span>
          <span className="font-semibold text-slate-200">{record.routing.risPeersSeen} {t.summary.peers}</span>
        </div>
      </div>

      {/* 4. Geolocation & Abuse Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t.summary.country}</span>
          </div>
          <div className="flex items-center" title={`Country: ${record.country}`}>
            <FlagIcon code={record.countryCode} className="w-5 h-3.5 text-base" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-1 text-sm font-bold text-white truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{record.geolocation?.city ? `${record.geolocation.city}, ` : ''}{localizedCountry}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
            <span className="truncate" title={record.abuseContact?.email}>
              {record.abuseContact?.email || t.summary.noAbuseEmail}
            </span>
            {record.abuseContact?.email && (
              <button
                onClick={() => handleCopy('abuse', record.abuseContact!.email)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
                title={t.abuseTab.copyEmail}
              >
                {copiedField === 'abuse' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t.summary.isoCode}:</span>
          {onExploreCountry && record.countryCode && record.countryCode !== 'XX' ? (
            <a
              href={getRouteUrl('country-ips', { countryCode: record.countryCode, lang: language })}
              hrefLang={language}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                  e.preventDefault();
                  onExploreCountry(record.countryCode);
                }
              }}
              className="font-mono font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
              title={`Explore all IP allocations for ${localizedCountry}`}
            >
              <span>{record.countryCode}</span>
              <span className="text-[10px] text-slate-400 font-sans">({localizedCountry})</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          ) : (
            <span className="font-mono font-semibold text-slate-200">{record.countryCode}</span>
          )}
        </div>
      </div>

    </div>
  );
};
