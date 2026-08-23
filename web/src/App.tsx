import React, { useState, useEffect, useCallback } from 'react';
import { WhoisRecord, AsnRecord, ActiveView, ActiveTab, SearchHistoryItem } from './types';
import { Navbar } from './components/Navbar';
import { SearchHeader } from './components/SearchHeader';
import { SummaryCards } from './components/SummaryCards';
import { OverviewTab } from './components/OverviewTab';
import { RipeObjectsTab } from './components/RipeObjectsTab';
import { RoutingTab } from './components/RoutingTab';
import { AbuseTab } from './components/AbuseTab';
import { GeolocTab } from './components/GeolocTab';
import { SubnetTab } from './components/SubnetTab';
import { RawWhoisTab } from './components/RawWhoisTab';
import { AsnView } from './components/AsnView';
import { BatchInspector } from './components/BatchInspector';
import { SubnetCalcTool } from './components/SubnetCalcTool';
import { CountryIpExplorer } from './components/CountryIpExplorer';
import { SourceView } from './components/SourceView';
import { IssuesView } from './components/IssuesView';
import { SettingsModal } from './components/SettingsModal';
import { SeoSection } from './components/SeoSection';
import { useLanguage } from './i18n/LanguageContext';
import { parseRoute, navigateRoute, updateDocumentSeoMeta } from './utils/router';
import { Network, Database, Radio, ShieldAlert, Globe, Calculator, Terminal, AlertCircle, RefreshCw } from 'lucide-react';

const DEFAULT_FALLBACK_IP = '193.0.6.139';

export default function App() {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const [activeView, setActiveView] = useState<ActiveView>('lookup');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [query, setQuery] = useState<string>('');
  const [countryExplorerCountry, setCountryExplorerCountry] = useState<string>('IR');
  const [currentRecord, setCurrentRecord] = useState<WhoisRecord | null>(null);
  const [asnRecord, setAsnRecord] = useState<AsnRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMyIp, setIsLoadingMyIp] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);

  // Theme management
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('iphub_theme');
      if (storedTheme === 'light') {
        setIsDarkTheme(false);
        document.documentElement.classList.add('light');
      } else {
        setIsDarkTheme(true);
        document.documentElement.classList.remove('light');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.remove('light');
        localStorage.setItem('iphub_theme', 'dark');
      } else {
        document.documentElement.classList.add('light');
        localStorage.setItem('iphub_theme', 'light');
      }
      return next;
    });
  };

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ripe_whois_history');
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (q: string, netname?: string, countryCode?: string, type: 'ip' | 'asn' | 'prefix' = 'ip') => {
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.query.toLowerCase() !== q.toLowerCase());
      const updated: SearchHistoryItem[] = [
        { query: q, type, netname, countryCode, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 15);
      try {
        localStorage.setItem('ripe_whois_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('ripe_whois_history');
    } catch {
      // ignore
    }
  };

  // Lookup action with optional URL history push
  const performLookup = async (targetQuery: string, updateUrl = true, token?: string) => {
    const cleanQuery = targetQuery.trim();
    if (!cleanQuery) return;

    setQuery(cleanQuery);
    setIsLoading(true);
    setError(null);
    setActiveView('lookup');

    if (updateUrl) {
      navigateRoute('lookup', { query: cleanQuery, lang: language });
    }

    try {
      const res = await fetch('/api/whois/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: cleanQuery,
          'cf-turnstile-response': token || '',
        }),
      });
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with status ${res.status}`);
      }

      const json = await res.json();
      if (json.type === 'asn') {
        setAsnRecord(json.data);
        setCurrentRecord(null);
        saveToHistory(json.data.asn, json.data.holder, json.data.countryCode, 'asn');
        updateDocumentSeoMeta('lookup', language, { query: cleanQuery, netname: json.data.holder });
      } else {
        setCurrentRecord(json.data);
        setAsnRecord(null);
        saveToHistory(json.data.query, json.data.netname, json.data.countryCode, json.data.query.includes('/') ? 'prefix' : 'ip');
        updateDocumentSeoMeta('lookup', language, { query: cleanQuery, netname: json.data.netname });
      }
    } catch (err: any) {
      console.error('Lookup failed:', err);
      setError(err.message || 'Failed to retrieve WHOIS information from RIPE service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMyIp = async () => {
    setIsLoading(true);
    setIsLoadingMyIp(true);
    setError(null);
    setActiveView('lookup');

    try {
      const res = await fetch('/api/whois/myip');
      if (!res.ok) {
        throw new Error('Failed to resolve client IP.');
      }
      const json = await res.json();
      if (json.data) {
        setQuery(json.data.query);
        setCurrentRecord(json.data);
        setAsnRecord(null);
        saveToHistory(json.data.query, json.data.netname, json.data.countryCode, 'ip');
        updateDocumentSeoMeta('lookup', language, { query: json.data.query, netname: json.data.netname });
      }
    } catch (err: any) {
      console.error('Auto-detect client IP failed, falling back:', err);
      performLookup(DEFAULT_FALLBACK_IP, false);
    } finally {
      setIsLoading(false);
      setIsLoadingMyIp(false);
    }
  };

  // View navigation handler
  const handleNavigateView = useCallback((view: ActiveView, opts?: { query?: string; countryCode?: string }) => {
    setActiveView(view);
    if (view === 'country-ips' && opts?.countryCode) {
      setCountryExplorerCountry(opts.countryCode.toUpperCase());
    }

    navigateRoute(view, {
      query: opts?.query || (view === 'lookup' ? query : undefined),
      countryCode: opts?.countryCode || countryExplorerCountry,
      lang: language,
    });

    updateDocumentSeoMeta(view, language, {
      query: opts?.query || query,
      countryCode: opts?.countryCode || countryExplorerCountry,
      netname: currentRecord?.netname || asnRecord?.holder,
    });
  }, [language, query, countryExplorerCountry, currentRecord, asnRecord]);

  // Initial Route Resolution on Mount
  useEffect(() => {
    const route = parseRoute();
    setActiveView(route.view);

    if (route.lang !== language) {
      setLanguage(route.lang);
    }

    if (route.view === 'country-ips') {
      const cCode = route.countryCode || 'IR';
      setCountryExplorerCountry(cCode);
      setIsLoading(false);
      updateDocumentSeoMeta('country-ips', route.lang, { countryCode: cCode });
    } else if (route.view === 'lookup') {
      if (route.query) {
        setQuery(route.query);
        performLookup(route.query, false);
      } else {
        handleMyIp();
      }
    } else {
      setIsLoading(false);
      updateDocumentSeoMeta(route.view, route.lang);
    }
  }, []);

  // Sync route on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute();
      setActiveView(route.view);

      if (route.view === 'country-ips') {
        const cCode = route.countryCode || 'IR';
        setCountryExplorerCountry(cCode);
        updateDocumentSeoMeta('country-ips', route.lang, { countryCode: cCode });
      } else if (route.view === 'lookup') {
        if (route.query && route.query !== query) {
          setQuery(route.query);
          performLookup(route.query, false);
        } else {
          updateDocumentSeoMeta('lookup', route.lang, { query });
        }
      } else {
        updateDocumentSeoMeta(route.view, route.lang);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [query, language]);

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-100 text-slate-900'} flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-200`}>

      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={(v) => handleNavigateView(v)}
        onMyIpClick={handleMyIp}
        isLoadingMyIp={isLoadingMyIp}
        isDarkTheme={isDarkTheme}
        onToggleTheme={toggleTheme}
      />

      {/* Conditional View Rendering */}
      {activeView === 'country-ips' && (
        <main className="flex-1">
          <CountryIpExplorer
            onInspectResource={(resource) => {
              setQuery(resource);
              handleNavigateView('lookup', { query: resource });
              performLookup(resource, true);
            }}
          />
        </main>
      )}

      {activeView === 'batch' && (
        <main className="flex-1">
          <BatchInspector
            onInspectSingle={(ip) => {
              setQuery(ip);
              handleNavigateView('lookup', { query: ip });
              performLookup(ip, true);
            }}
          />
        </main>
      )}

      {activeView === 'subnet-calc' && (
        <main className="flex-1">
          <SubnetCalcTool />
        </main>
      )}

      {activeView === 'source' && (
        <main className="flex-1">
          <SourceView />
        </main>
      )}

      {activeView === 'issues' && (
        <main className="flex-1">
          <IssuesView />
        </main>
      )}

      {activeView === 'settings' && (
        <main className="flex-1">
          <SettingsModal
            isDarkTheme={isDarkTheme}
            onToggleTheme={toggleTheme}
            onClose={() => handleNavigateView('lookup')}
          />
        </main>
      )}

      {activeView === 'lookup' && (
        <main className="flex-1 flex flex-col">

          {/* Search Header */}
          <SearchHeader
            query={query}
            setQuery={setQuery}
            onSearch={(q, token) => performLookup(q, true, token)}
            isLoading={isLoading}
            history={searchHistory}
            onClearHistory={handleClearHistory}
          />

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 w-full space-y-5 sm:space-y-6 flex-1">

            {/* Error Notification */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start justify-between gap-4 text-red-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm block">{t.search.queryError}</span>
                    <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => (query ? performLookup(query, true) : handleMyIp())}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.search.retry}</span>
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && !currentRecord && !asnRecord && (
              <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-slate-800/60 rounded-xl border border-slate-700/50" />
                  ))}
                </div>
                <div className="h-96 bg-slate-800/40 rounded-2xl border border-slate-700/40" />
              </div>
            )}

            {/* ASN Specialized View */}
            {!isLoading && asnRecord && (
              <AsnView
                record={asnRecord}
                onSearchResource={(res) => performLookup(res, true)}
                onBack={() => {
                  setAsnRecord(null);
                  if (searchHistory.length > 0) {
                    performLookup(searchHistory[0].query, true);
                  } else {
                    handleMyIp();
                  }
                }}
              />
            )}

            {/* Regular IP / Prefix Result View */}
            {!isLoading && currentRecord && (
              <div className="space-y-6">

                {/* 4 Summary Cards */}
                <SummaryCards
                  record={currentRecord}
                  onSearchResource={(res) => performLookup(res, true)}
                  onExploreCountry={(cCode) => handleNavigateView('country-ips', { countryCode: cCode })}
                />

                {/* Tabs Navigation Bar */}
                <div className="border-b border-slate-800">
                  <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-1 scrollbar-none" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'overview'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Network className="w-4 h-4" />
                      <span>{t.tabs.overview}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('routing')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'routing'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Radio className="w-4 h-4" />
                      <span>{t.tabs.routing}</span>
                      {currentRecord.routing.isAnnounced && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('abuse')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'abuse'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>{t.tabs.abuse}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('geoloc')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'geoloc'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>{t.tabs.location}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('subnet')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'subnet'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Calculator className="w-4 h-4" />
                      <span>{t.tabs.subnet}</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('objects')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'objects'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      <span>{t.tabs.objects}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded font-mono text-slate-400">
                        {currentRecord.ripeObjects?.length || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`py-3 px-3.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeTab === 'raw'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Terminal className="w-4 h-4" />
                      <span>{t.tabs.rawWhois}</span>
                    </button>
                  </nav>
                </div>

                {/* Tab Contents */}
                <div>
                  {activeTab === 'overview' && (
                    <OverviewTab
                      record={currentRecord}
                      onSearchResource={(res) => performLookup(res, true)}
                    />
                  )}

                  {activeTab === 'routing' && (
                    <RoutingTab
                      routing={currentRecord.routing}
                      cidr={currentRecord.cidr}
                      onSearchResource={(res) => performLookup(res, true)}
                    />
                  )}

                  {activeTab === 'abuse' && (
                    <AbuseTab
                      abuse={currentRecord.abuseContact}
                      record={currentRecord}
                    />
                  )}

                  {activeTab === 'geoloc' && (
                    <GeolocTab
                      geoloc={currentRecord.geolocation}
                      ip={currentRecord.query}
                      reverseDns={currentRecord.reverseDns}
                    />
                  )}

                  {activeTab === 'subnet' && (
                    <SubnetTab
                      subnet={currentRecord.subnet}
                      cidr={currentRecord.cidr}
                    />
                  )}

                  {activeTab === 'objects' && (
                    <RipeObjectsTab
                      objects={currentRecord.ripeObjects}
                      onSearchResource={(res) => performLookup(res, true)}
                    />
                  )}

                  {activeTab === 'raw' && (
                    <RawWhoisTab
                      rawText={currentRecord.rawWhoisText}
                      query={currentRecord.query}
                      source={currentRecord.source}
                    />
                  )}
                </div>

              </div>
            )}

          </div>

        </main>
      )}

      {/* Rich SEO Content Section */}
      <SeoSection />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">{t.brand}</span>
            <span>&bull;</span>
            <span>{t.footer.ripestatTools}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleNavigateView('country-ips')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.countryIps}
            </button>
            <button
              onClick={() => handleNavigateView('subnet-calc')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.subnetCalc}
            </button>
            <button
              onClick={() => handleNavigateView('batch')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.batch}
            </button>
            <button
              onClick={() => handleNavigateView('source')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.source}
            </button>
            <button
              onClick={() => handleNavigateView('issues')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.issues}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
