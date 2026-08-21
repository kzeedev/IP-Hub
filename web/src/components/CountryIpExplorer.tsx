import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe2,
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Network,
  Radio,
  Hash,
  SlidersHorizontal,
  FileText,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  RefreshCw,
  Building2,
  Terminal,
  Code2,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { CountryIpResource, ExportFormat, IpVersionOption, AccessTypeOption } from '../types';
import { ALL_COUNTRIES, POPULAR_COUNTRIES, getCountryDetails } from '../utils/countries';
import { copyToClipboard, downloadText } from '../utils/helpers';
import { generateFirewallConfig } from '../utils/formatters';
import { getRouteUrl } from '../utils/router';
import { TurnstileWidget } from './TurnstileWidget';
import { useLanguage } from '../i18n/LanguageContext';

interface CountryIpExplorerProps {
  initialCountry?: string;
  onInspectResource: (resource: string) => void;
}

type TabType = 'ipv4' | 'ipv6' | 'asns';

export const CountryIpExplorer: React.FC<CountryIpExplorerProps> = ({
  initialCountry = 'IR',
  onInspectResource,
}) => {
  const { language, t, isRtl } = useLanguage();
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry.toUpperCase());
  const [countrySearchQuery, setCountrySearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const [data, setData] = useState<CountryIpResource | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Table view Tab & Filters
  const [activeTab, setActiveTab] = useState<TabType>('ipv4');
  const [listSearch, setListSearch] = useState<string>('');
  const [cidrFilter, setCidrFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Firewall Generator States
  const [format, setFormat] = useState<ExportFormat>('mikrotik');
  const [ipVersion, setIpVersion] = useState<IpVersionOption>('any');
  const [accessType, setAccessType] = useState<AccessTypeOption>('allow');
  const [customListName, setCustomListName] = useState<string>('');
  const [isConfigCopied, setIsConfigCopied] = useState<boolean>(false);

  // ISP / Organization resolution cache
  const [resolvedOrgs, setResolvedOrgs] = useState<Record<string, string>>({});
  const [isResolvingOrgs, setIsResolvingOrgs] = useState<boolean>(false);

  // Copy feedback for individual table items
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isTableCopied, setIsTableCopied] = useState<boolean>(false);

  // Fetch country data from backend
  const fetchCountryData = async (code: string) => {
    setIsLoading(true);
    setError(null);
    setPage(1);

    try {
      const res = await fetch(`/api/whois/country/${encodeURIComponent(code)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch resources for country ${code}`);
      }
      const json = await res.json();
      setData(json.data);
      if (json.data?.asNames) {
        const orgMap: Record<string, string> = {};
        for (const [asn, name] of Object.entries(json.data.asNames as Record<string, string>)) {
          orgMap[`AS${asn}`] = name;
          orgMap[asn] = name;
        }
        if (json.data?.prefixOrgs) {
          Object.assign(orgMap, json.data.prefixOrgs);
        }
        setResolvedOrgs(prev => ({ ...prev, ...orgMap }));
      }
    } catch (err: any) {
      setError(err.message || t.countryExplorer.apiError);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCountryData(selectedCountry);
  }, [selectedCountry]);

  // Filter countries for dropdown with bilingual name support
  const filteredCountries = useMemo(() => {
    const q = countrySearchQuery.toLowerCase().trim();
    return ALL_COUNTRIES.map(c => ({
      ...c,
      name: language === 'fa' ? c.faName : c.name,
    })).filter(
      c => !q || c.name.toLowerCase().includes(q) || c.faName.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)
    );
  }, [countrySearchQuery, language]);

  const popularCountries = useMemo(() => {
    return POPULAR_COUNTRIES.map(c => ({
      ...c,
      name: language === 'fa' ? c.faName : c.name,
    }));
  }, [language]);

  const currentMeta = useMemo(() => getCountryDetails(selectedCountry, language), [selectedCountry, language]);

  // Generated firewall script
  const generatedScript = useMemo(() => {
    if (!data) return { text: '', filename: '', ruleCount: 0 };
    return generateFirewallConfig({
      countryCode: data.countryCode,
      countryName: data.countryName,
      format,
      version: ipVersion,
      access: accessType,
      listName: customListName || data.countryCode,
      data,
      resolvedOrgs,
    });
  }, [data, format, ipVersion, accessType, customListName, resolvedOrgs]);

  // Filtered list for table
  const filteredList = useMemo(() => {
    if (!data) return [];
    const q = listSearch.trim().toLowerCase();

    if (activeTab === 'ipv4') {
      return data.ipv4.filter(prefix => {
        const org = (resolvedOrgs[prefix] || '').toLowerCase();
        const matchesSearch = !q || prefix.toLowerCase().includes(q) || org.includes(q);
        if (!matchesSearch) return false;
        if (cidrFilter === 'all') return true;
        return prefix.endsWith(`/${cidrFilter}`);
      });
    } else if (activeTab === 'ipv6') {
      return data.ipv6.filter(prefix => {
        const org = (resolvedOrgs[prefix] || '').toLowerCase();
        const matchesSearch = !q || prefix.toLowerCase().includes(q) || org.includes(q);
        if (!matchesSearch) return false;
        if (cidrFilter === 'all') return true;
        return prefix.endsWith(`/${cidrFilter}`);
      });
    } else {
      return data.asns
        .map(a => `AS${a}`)
        .filter(asnStr => {
          const cleanAsn = asnStr.replace(/^AS/i, '');
          const org = (resolvedOrgs[asnStr] || resolvedOrgs[cleanAsn] || '').toLowerCase();
          return !q || asnStr.toLowerCase().includes(q) || org.includes(q);
        });
    }
  }, [data, activeTab, listSearch, cidrFilter, resolvedOrgs]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, page, itemsPerPage]);

  // Background resolution of ISP names for current table page
  useEffect(() => {
    if (!paginatedList.length) return;

    const missingPrefixes: string[] = [];
    const missingAsns: string[] = [];

    for (const item of paginatedList) {
      if (activeTab === 'asns') {
        const clean = item.replace(/^AS/i, '');
        if (!resolvedOrgs[item] && !resolvedOrgs[clean]) {
          missingAsns.push(clean);
        }
      } else {
        if (!resolvedOrgs[item]) {
          missingPrefixes.push(item);
        }
      }
    }

    if (missingPrefixes.length === 0 && missingAsns.length === 0) return;

    let isMounted = true;
    setIsResolvingOrgs(true);

    fetch('/api/whois/resolve-orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: missingPrefixes, asns: missingAsns }),
    })
      .then(res => (res.ok ? res.json() : { orgs: {} }))
      .then(resData => {
        if (isMounted && resData?.orgs && Object.keys(resData.orgs).length > 0) {
          setResolvedOrgs(prev => ({ ...prev, ...resData.orgs }));
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsResolvingOrgs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [paginatedList, activeTab]);

  const getOrgForItem = (item: string): string | undefined => {
    if (activeTab === 'asns') {
      const clean = item.replace(/^AS/i, '');
      return resolvedOrgs[item] || resolvedOrgs[clean];
    }
    return resolvedOrgs[item];
  };

  const availableCidrs = useMemo(() => {
    if (!data || activeTab === 'asns') return [];
    const counts = new Map<string, number>();
    const list = activeTab === 'ipv4' ? data.ipv4 : data.ipv6;
    list.forEach(p => {
      if (p.includes('/')) {
        const c = p.split('/')[1];
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
      .slice(0, 10);
  }, [data, activeTab]);

  const handleCopyGenerated = () => {
    if (!generatedScript.text) return;
    copyToClipboard(generatedScript.text);
    setIsConfigCopied(true);
    setTimeout(() => setIsConfigCopied(false), 2000);
  };

  const handleDownloadGenerated = () => {
    if (!generatedScript.text) return;
    downloadText(generatedScript.filename, generatedScript.text);
  };

  const handleCopySingle = (val: string) => {
    copyToClipboard(val);
    setCopiedItem(val);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  const handleCopyAllTable = () => {
    if (!data) return;
    let text = '';
    if (activeTab === 'ipv4') text = data.ipv4.join('\n');
    else if (activeTab === 'ipv6') text = data.ipv6.join('\n');
    else text = data.asns.map(a => `AS${a}`).join('\n');
    copyToClipboard(text);
    setIsTableCopied(true);
    setTimeout(() => setIsTableCopied(false), 2000);
  };

  const calculateIpv4HostCount = (prefix: string): string => {
    if (!prefix.includes('/')) return '1';
    const mask = parseInt(prefix.split('/')[1], 10);
    if (isNaN(mask) || mask < 0 || mask > 32) return '1';
    const hosts = Math.pow(2, 32 - mask);
    return hosts.toLocaleString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

      {/* Header & Country Selector */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shadow-inner shrink-0">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{t.countryExplorer.title}</h1>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-semibold uppercase">
                RIPEstat &amp; GeoIP
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 leading-relaxed">
              {t.countryExplorer.description}
            </p>
          </div>
        </div>

        {/* Dedicated Country Selector Row */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t.countryExplorer.selectCountry}:
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left text-sm font-semibold text-white flex items-center justify-between gap-2 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={`text-xl fi fi-${currentMeta.code.toLowerCase()} fis`}></span>
                <span className="truncate">{currentMeta.name}</span>
                <span className="text-xs text-cyan-400 font-mono">({currentMeta.code})</span>
              </div>
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {isDropdownOpen && (
              <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-full sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 space-y-2`}>
                <div className="relative">
                  <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={e => setCountrySearchQuery(e.target.value)}
                    placeholder={t.countryExplorer.searchCountry}
                    className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500`}
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-slate-800/40">
                  {filteredCountries.map(c => (
                    <a
                      key={c.code}
                      href={getRouteUrl('country-ips', { countryCode: c.code, lang: language })}
                      hrefLang={language}
                      onClick={(e) => {
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                          e.preventDefault();
                          setSelectedCountry(c.code);
                          setIsDropdownOpen(false);
                          setCountrySearchQuery('');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${c.code === selectedCountry
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`text-base fi fi-${c.code.toLowerCase()} fis`}></span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${c.code === selectedCountry ? 'text-cyan-100' : 'text-slate-500'}`}>
                        {c.code}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Popular Country Chips */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider shrink-0 mr-1">
            {t.countryExplorer.topRegions}
          </span>
          {popularCountries.map(c => (
            <a
              key={c.code}
              href={getRouteUrl('country-ips', { countryCode: c.code, lang: language })}
              hrefLang={language}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                  e.preventDefault();
                  setSelectedCountry(c.code);
                }
              }}
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${c.code === selectedCountry
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm font-bold'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700 hover:text-white'
                }`}
            >
              <span className={`fi fi-${c.code.toLowerCase()} fis rounded-xs`}></span>
              <span>{c.name}</span>
              <span className="text-[10px] font-mono text-slate-500">({c.code})</span>
            </a>
          ))}
        </div>
      </div>

      {/* Metrics Banner */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-850 rounded-2xl border border-slate-800" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div
            onClick={() => setActiveTab('ipv4')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTab === 'ipv4'
              ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-850 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.countryExplorer.ipv4Allocations}</span>
              <Network className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {data.ipv4Count.toLocaleString()}
            </div>
            <p className="text-[11px] text-cyan-400 mt-1">{t.countryExplorer.prefixBlocks}</p>
          </div>

          <div
            onClick={() => setActiveTab('ipv6')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTab === 'ipv6'
              ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
              : 'bg-slate-850 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.countryExplorer.ipv6Allocations}</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {data.ipv6Count.toLocaleString()}
            </div>
            <p className="text-[11px] text-indigo-400 mt-1">{t.countryExplorer.nextGenPrefixes}</p>
          </div>

          <div
            onClick={() => setActiveTab('asns')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all ${activeTab === 'asns'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-slate-850 border-slate-800 hover:border-slate-700'
              }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.countryExplorer.originAsns}</span>
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {data.asnCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-amber-400 mt-1">{t.countryExplorer.asNetworks}</p>
          </div>

          <div className="p-5 bg-slate-850 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{t.countryExplorer.estCapacity}</span>
              <Hash className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {data.totalEstimatedIpv4Addresses > 1000000
                ? `${(data.totalEstimatedIpv4Addresses / 1000000).toFixed(1)}M`
                : data.totalEstimatedIpv4Addresses.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{t.countryExplorer.totalRouted}</p>
          </div>

        </div>
      ) : null}

      {error && (
        <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 flex items-start justify-between gap-4">
          <div>
            <span className="font-bold text-sm block">{t.countryExplorer.loadError}</span>
            <p className="text-xs mt-1 text-red-300/90">{error}</p>
          </div>
          <button
            onClick={() => fetchCountryData(selectedCountry)}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.search.retry}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 CORE FEATURE: Integrated Firewall & Format Generator  */}
      {/* ======================================================== */}
      {data && !isLoading && (
        <div className="bg-slate-850 rounded-2xl border border-cyan-500/30 p-6 shadow-xl space-y-5">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{t.countryExplorer.firewallGenerator}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    {currentMeta.name} ({currentMeta.code})
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.countryExplorer.generatorDesc}
                </p>
              </div>
            </div>

            {/* Actions: Copy & Download */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyGenerated}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/30 active:scale-95"
              >
                {isConfigCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{t.countryExplorer.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t.countryExplorer.copyScript}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadGenerated}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{t.countryExplorer.downloadScript}</span>
              </button>
            </div>
          </div>

          {/* Controls: Formats, Version, Access Type, List Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">

            {/* Format Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.countryExplorer.formatLabel}
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as ExportFormat)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="mikrotik">{t.countryExplorer.formats.mikrotik}</option>
                <option value="cisco">{t.countryExplorer.formats.cisco}</option>
                <option value="pf">{t.countryExplorer.formats.pf}</option>
                <option value="ipset">{t.countryExplorer.formats.ipset}</option>
                <option value="htaccess">{t.countryExplorer.formats.htaccess}</option>
                <option value="iptables">{t.countryExplorer.formats.iptables}</option>
                <option value="json">{t.countryExplorer.formats.json}</option>
                <option value="csv">{t.countryExplorer.formats.csv}</option>
                <option value="txt">{t.countryExplorer.formats.txt}</option>
              </select>
            </div>

            {/* IP Version Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.countryExplorer.versionLabel}
              </label>
              <select
                value={ipVersion}
                onChange={e => setIpVersion(e.target.value as IpVersionOption)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="any">{t.countryExplorer.versions.any}</option>
                <option value="ipv4">{t.countryExplorer.versions.ipv4}</option>
                <option value="ipv6">{t.countryExplorer.versions.ipv6}</option>
              </select>
            </div>

            {/* Access Policy Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.countryExplorer.accessLabel}
              </label>
              <select
                value={accessType}
                onChange={e => setAccessType(e.target.value as AccessTypeOption)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value="allow">{t.countryExplorer.access.allow}</option>
                <option value="deny">{t.countryExplorer.access.deny}</option>
              </select>
            </div>

            {/* Address List / ACL Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {t.countryExplorer.listNameLabel}
              </label>
              <input
                type="text"
                value={customListName}
                onChange={e => setCustomListName(e.target.value)}
                placeholder={data.countryCode}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono font-semibold"
              />
            </div>

          </div>

          {/* Code Preview Block */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-300">{t.countryExplorer.previewRules}</span>
                <span className="font-mono text-cyan-400">({generatedScript.ruleCount.toLocaleString()} {t.countryExplorer.rulesGenerated})</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">{generatedScript.filename}</span>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed selection:bg-cyan-500/40">
              <pre className="whitespace-pre">{generatedScript.text}</pre>
            </div>
          </div>

          {/* Cloudflare Turnstile CAPTCHA */}
          <div className="pt-2 flex justify-center border-t border-slate-800/60">
            <TurnstileWidget
              onVerify={token => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken('')}
            />
          </div>

        </div>
      )}

      {/* Prefix Table & Explorer */}
      {data && !isLoading && (
        <div className="bg-slate-850 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">

          {/* Controls Bar */}
          <div className="p-5 bg-slate-900/90 border-b border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {/* Type Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setActiveTab('ipv4');
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'ipv4'
                    ? 'bg-cyan-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>IPv4 ({data.ipv4Count})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('ipv6');
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'ipv6'
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>IPv6 ({data.ipv6Count})</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('asns');
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'asns'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>ASNs ({data.asnCount})</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAllTable}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  {isTableCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t.common.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t.countryExplorer.copyAll} ({filteredList.length})</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Filter Search & Subnets */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={e => {
                    setListSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t.countryExplorer.filterPlaceholder}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {availableCidrs.length > 0 && activeTab !== 'asns' && (
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
                  <span className="text-slate-500 font-medium shrink-0">CIDR:</span>
                  <button
                    onClick={() => {
                      setCidrFilter('all');
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all ${cidrFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                  >
                    {t.countryExplorer.allCidrs}
                  </button>
                  {availableCidrs.slice(0, 6).map(([c, count]) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCidrFilter(c);
                        setPage(1);
                      }}
                      className={`px-2 py-1 rounded-lg font-mono transition-all flex items-center gap-1 ${cidrFilter === c
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                    >
                      <span>/{c}</span>
                      <span className="text-[9px] text-slate-500">({count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-5">{t.countryExplorer.colIndex}</th>
                  <th className="py-3 px-5">{t.countryExplorer.colResource}</th>
                  <th className="py-3 px-5">{t.countryExplorer.colOrg}</th>
                  {activeTab !== 'asns' && (
                    <>
                      <th className="py-3 px-5">{t.countryExplorer.colPrefixLen}</th>
                      <th className="py-3 px-5">{t.countryExplorer.colCapacity}</th>
                    </>
                  )}
                  <th className="py-3 px-5">{t.countryExplorer.colCountry}</th>
                  <th className="py-3 px-5 text-right">{t.countryExplorer.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {paginatedList.map((item, idx) => {
                  const itemIndex = (page - 1) * itemsPerPage + idx + 1;
                  const isIp = activeTab !== 'asns';
                  const prefixLen = item.includes('/') ? `/${item.split('/')[1]}` : '-';
                  const org = getOrgForItem(item);

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="py-3 px-5 text-slate-500 text-[11px]">{itemIndex}</td>
                      <td className="py-3 px-5 font-bold text-cyan-300">
                        <div className="flex items-center gap-2">
                          <span>{item}</span>
                          <button
                            onClick={() => handleCopySingle(item)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 transition-opacity"
                            title={t.countryExplorer.copyPrefix}
                          >
                            {copiedItem === item ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-5 font-sans max-w-xs">
                        {org ? (
                          <div className="flex items-center gap-1.5" title={org}>
                            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="text-slate-200 font-medium truncate block max-w-[220px]">{org}</span>
                          </div>
                        ) : isResolvingOrgs ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span>{t.countryExplorer.resolving}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-mono">{t.countryExplorer.unknownOrg}</span>
                        )}
                      </td>
                      {isIp && (
                        <>
                          <td className="py-3 px-5">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[11px]">
                              {prefixLen}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-slate-300">
                            {activeTab === 'ipv4' ? (
                              <span className="text-emerald-400 font-semibold">
                                {calculateIpv4HostCount(item)} {t.countryExplorer.addresses}
                              </span>
                            ) : (
                              <span className="text-indigo-300">{t.countryExplorer.ipv6Block}</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-5 font-sans">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className={`fi fi-${data.countryCode.toLowerCase()} fis`}></span>
                          <span className="font-mono text-xs">{data.countryName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-sans">
                        <button
                          onClick={() => onInspectResource(item)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          title={t.countryExplorer.openWhoisTooltip}
                        >
                          <span>{t.countryExplorer.openWhois}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {paginatedList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-sans">
                      {t.countryExplorer.noPrefixesFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                {t.common.page} <strong className="text-white font-mono">{page}</strong> {t.common.of} <strong className="text-white font-mono">{totalPages}</strong> ({filteredList.length.toLocaleString()} {t.common.items})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white rounded-lg transition-colors font-medium"
                >
                  {t.common.previous}
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white rounded-lg transition-colors font-medium"
                >
                  {t.common.next}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
