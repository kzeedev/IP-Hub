import React, { useState, useEffect } from 'react';
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
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { CountryIpExplorer } from './components/CountryIpExplorer';
import { SourceView } from './components/SourceView';
import { IssuesView } from './components/IssuesView';
import { SettingsModal } from './components/SettingsModal';
import { SeoSection } from './components/SeoSection';
import { useLanguage } from './i18n/LanguageContext';
import { Network, Database, Radio, ShieldAlert, Globe, Calculator, Terminal, AlertCircle, RefreshCw } from 'lucide-react';

const INITIAL_QUERY = '193.0.6.139';

export default function App() {
  const { t, isRtl } = useLanguage();
  const [activeView, setActiveView] = useState<ActiveView>('lookup');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [query, setQuery] = useState<string>(INITIAL_QUERY);
  const [countryExplorerCountry, setCountryExplorerCountry] = useState<string>('IR');
  const [currentRecord, setCurrentRecord] = useState<WhoisRecord | null>(null);
  const [asnRecord, setAsnRecord] = useState<AsnRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  // Run initial lookup on mount
  useEffect(() => {
    performLookup(INITIAL_QUERY);
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

  const performLookup = async (targetQuery: string) => {
    const cleanQuery = targetQuery.trim();
    if (!cleanQuery) return;

    setIsLoading(true);
    setError(null);
    setActiveView('lookup');

    try {
      const res = await fetch(`/api/whois/lookup/${encodeURIComponent(cleanQuery)}`);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with status ${res.status}`);
      }

      const json = await res.json();
      if (json.type === 'asn') {
        setAsnRecord(json.data);
        setCurrentRecord(null);
        saveToHistory(json.data.asn, json.data.holder, json.data.countryCode, 'asn');
      } else {
        setCurrentRecord(json.data);
        setAsnRecord(null);
        saveToHistory(json.data.query, json.data.netname, json.data.countryCode, json.data.query.includes('/') ? 'prefix' : 'ip');
      }
    } catch (err: any) {
      console.error('Lookup failed:', err);
      setError(err.message || 'Failed to retrieve WHOIS information from RIPE service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMyIp = async () => {
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
      }
    } catch (err: any) {
      setError(err.message || 'Could not auto-detect public IP.');
    } finally {
      setIsLoadingMyIp(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-100 text-slate-900'} flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-200`}>

      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onMyIpClick={handleMyIp}
        isLoadingMyIp={isLoadingMyIp}
        isDarkTheme={isDarkTheme}
        onToggleTheme={toggleTheme}
      />

      {/* Conditional View Rendering */}
      {activeView === 'country-ips' && (
        <main className="flex-1">
          <CountryIpExplorer
            initialCountry={countryExplorerCountry}
            onInspectResource={(resource) => {
              setQuery(resource);
              setActiveView('lookup');
              performLookup(resource);
            }}
          />
        </main>
      )}

      {activeView === 'batch' && (
        <main className="flex-1">
          <BatchInspector
            onInspectSingle={(ip) => {
              setQuery(ip);
              performLookup(ip);
            }}
          />
        </main>
      )}

      {activeView === 'subnet-calc' && (
        <main className="flex-1">
          <SubnetCalcTool />
        </main>
      )}

      {activeView === 'architecture' && (
        <main className="flex-1">
          <ArchitectureDocsModal />
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
            onClose={() => setActiveView('lookup')}
          />
        </main>
      )}

      {activeView === 'lookup' && (
        <main className="flex-1 flex flex-col">

          {/* Search Header */}
          <SearchHeader
            query={query}
            setQuery={setQuery}
            onSearch={performLookup}
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
                  onClick={() => performLookup(query || INITIAL_QUERY)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.search.retry}</span>
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-850 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold text-slate-300">{t.search.querying}</p>
                <p className="text-xs text-slate-500 mt-1">{t.search.resolving}</p>
              </div>
            )}

            {/* ASN Direct View */}
            {!isLoading && asnRecord && (
              <AsnView
                record={asnRecord}
                onSearchResource={performLookup}
                onBack={() => {
                  setAsnRecord(null);
                  if (!currentRecord) performLookup(INITIAL_QUERY);
                }}
              />
            )}

            {/* IP WHOIS Record View */}
            {!isLoading && currentRecord && !asnRecord && (
              <div className="space-y-6">

                {/* Summary Cards */}
                <SummaryCards
                  record={currentRecord}
                  onSearchResource={performLookup}
                  onExploreCountry={(code) => {
                    setCountryExplorerCountry(code);
                    setActiveView('country-ips');
                  }}
                />

                {/* Tab Navigation */}
                <div className="bg-slate-850 p-1 sm:p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1 overflow-x-auto shadow-sm scrollbar-none">

                  <button
                    id="tab-overview"
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'overview'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Network className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{t.tabs.overview}</span>
                  </button>

                  <button
                    id="tab-objects"
                    onClick={() => setActiveTab('objects')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'objects'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>{t.tabs.objects}</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-cyan-300 font-mono">
                      {currentRecord.ripeObjects?.length || 0}
                    </span>
                  </button>

                  <button
                    id="tab-routing"
                    onClick={() => setActiveTab('routing')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'routing'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>{t.tabs.routing}</span>
                    {currentRecord.routing?.isAnnounced && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </button>

                  <button
                    id="tab-abuse"
                    onClick={() => setActiveTab('abuse')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'abuse'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>{t.tabs.abuse}</span>
                  </button>

                  <button
                    id="tab-geoloc"
                    onClick={() => setActiveTab('geoloc')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'geoloc'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>{t.tabs.location}</span>
                  </button>

                  <button
                    id="tab-subnet"
                    onClick={() => setActiveTab('subnet')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'subnet'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Calculator className="w-4 h-4" />
                    <span>{t.tabs.subnet}</span>
                  </button>

                  <button
                    id="tab-raw"
                    onClick={() => setActiveTab('raw')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'raw'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Terminal className="w-4 h-4" />
                    <span>{t.tabs.rawWhois}</span>
                  </button>

                </div>

                {/* Tab Contents */}
                <div>
                  {activeTab === 'overview' && (
                    <OverviewTab
                      record={currentRecord}
                      onSearchResource={performLookup}
                    />
                  )}

                  {activeTab === 'objects' && (
                    <RipeObjectsTab
                      objects={currentRecord.ripeObjects}
                      onSearchResource={performLookup}
                    />
                  )}

                  {activeTab === 'routing' && (
                    <RoutingTab
                      routing={currentRecord.routing}
                      cidr={currentRecord.cidr}
                      onSearchResource={performLookup}
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
            <span>RIPEstat &amp; GeoIP Tools</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('country-ips')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.countryIps}
            </button>
            <button
              onClick={() => setActiveView('subnet-calc')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.subnetCalc}
            </button>
            <button
              onClick={() => setActiveView('batch')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.batch}
            </button>
            <button
              onClick={() => setActiveView('source')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {t.nav.source}
            </button>
            <button
              onClick={() => setActiveView('issues')}
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
