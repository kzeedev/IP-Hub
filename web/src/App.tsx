import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  ConfigProvider,
  Layout,
  App as AntdApp,
  Tabs,
  Alert,
  Button,
  Skeleton,
  Space,
  Typography,
  theme,
} from 'antd';
import enUS from 'antd/locale/en_US';
import faIR from 'antd/locale/fa_IR';
import {
  ReloadOutlined,
  ClusterOutlined,
  RadarChartOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { WhoisRecord, AsnRecord, ActiveView, ActiveTab, SearchHistoryItem } from './types';
import { Navbar } from './components/Navbar';
import { SearchHeader } from './components/SearchHeader';
import { SummaryCards } from './components/SummaryCards';
import { OverviewTab } from './components/OverviewTab';
import { useLanguage } from './i18n/LanguageContext';
import { parseRoute, navigateRoute, updateDocumentSeoMeta } from './utils/router';

// Code-split Views for Core Web Vitals LCP & Bundle Size
const CountryIpExplorer = lazy(() => import('./components/CountryIpExplorer').then(m => ({ default: m.CountryIpExplorer || m.default })));
const BatchInspector = lazy(() => import('./components/BatchInspector').then(m => ({ default: m.BatchInspector || m.default })));
const SubnetCalcTool = lazy(() => import('./components/SubnetCalcTool').then(m => ({ default: m.SubnetCalcTool || m.default })));
const SourceView = lazy(() => import('./components/SourceView').then(m => ({ default: m.SourceView || m.default })));
const IssuesView = lazy(() => import('./components/IssuesView').then(m => ({ default: m.IssuesView || m.default })));
const NotFoundView = lazy(() => import('./components/NotFoundView').then(m => ({ default: m.NotFoundView || m.default })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView || m.default })));
const AsnView = lazy(() => import('./components/AsnView').then(m => ({ default: m.AsnView })));
const SeoSection = lazy(() => import('./components/SeoSection').then(m => ({ default: m.SeoSection })));

// Lazy-loaded Secondary Tabs
const RipeObjectsTab = lazy(() => import('./components/RipeObjectsTab').then(m => ({ default: m.RipeObjectsTab })));
const RoutingTab = lazy(() => import('./components/RoutingTab').then(m => ({ default: m.RoutingTab })));
const AbuseTab = lazy(() => import('./components/AbuseTab').then(m => ({ default: m.AbuseTab })));
const GeolocTab = lazy(() => import('./components/GeolocTab').then(m => ({ default: m.GeolocTab })));
const SubnetTab = lazy(() => import('./components/SubnetTab').then(m => ({ default: m.SubnetTab })));
const RawWhoisTab = lazy(() => import('./components/RawWhoisTab').then(m => ({ default: m.RawWhoisTab })));

const { Content, Footer } = Layout;
const { Text } = Typography;

const ViewFallback = () => (
  <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', width: '100%' }}>
    <Skeleton active paragraph={{ rows: 8 }} />
  </div>
);

const TabFallback = () => (
  <div style={{ padding: '16px 0' }}>
    <Skeleton active paragraph={{ rows: 6 }} />
  </div>
);

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ViewErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('View rendering error caught by ViewErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 800, margin: '48px auto', padding: '0 16px' }}>
          <Alert
            type="error"
            showIcon
            title="Failed to Load View"
            description={this.state.error?.message || 'An unexpected error occurred while loading this view.'}
            action={
              <Button type="primary" size="small" onClick={() => window.location.reload()}>
                Reload
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_FALLBACK_IP = '193.0.6.139';

export default function App() {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    try {
      return parseRoute().view;
    } catch {
      return 'lookup';
    }
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [query, setQuery] = useState<string>('');
  const [countryExplorerCountry, setCountryExplorerCountry] = useState<string>('');
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
      } else {
        setIsDarkTheme(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const next = !prev;
      try {
        localStorage.setItem('iphub_theme', next ? 'dark' : 'light');
      } catch {
        // ignore
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
  const performLookup = async (targetQuery: string, updateUrl = true) => {
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
    const targetCountry = view === 'country-ips' ? (opts?.countryCode ? opts.countryCode.toUpperCase() : '') : '';
    if (view === 'country-ips') {
      setCountryExplorerCountry(targetCountry);
    }

    navigateRoute(view, {
      query: opts?.query || (view === 'lookup' ? query : undefined),
      countryCode: targetCountry || undefined,
      lang: language,
    });

    updateDocumentSeoMeta(view, language, {
      query: opts?.query || query,
      countryCode: targetCountry || undefined,
      netname: currentRecord?.netname || asnRecord?.holder,
    });
  }, [language, query, currentRecord, asnRecord]);

  // Initial Route Resolution on Mount
  useEffect(() => {
    const route = parseRoute();
    setActiveView(route.view);

    if (route.lang !== language) {
      setLanguage(route.lang);
    }

    if (route.view === 'country-ips') {
      const cCode = route.countryCode ? route.countryCode.toUpperCase() : '';
      setCountryExplorerCountry(cCode);
      setIsLoading(false);
      updateDocumentSeoMeta('country-ips', route.lang, { countryCode: cCode || undefined });
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
        const cCode = route.countryCode ? route.countryCode.toUpperCase() : '';
        setCountryExplorerCountry(cCode);
        updateDocumentSeoMeta('country-ips', route.lang, { countryCode: cCode || undefined });
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

  const tabItems = currentRecord
    ? [
        {
          key: 'overview',
          label: (
            <Space orientation="horizontal" size={6}>
              <ClusterOutlined />
              <span>{t.tabs.overview}</span>
            </Space>
          ),
          children: (
            <OverviewTab
              record={currentRecord}
              onSearchResource={(res) => performLookup(res, true)}
            />
          ),
        },
        {
          key: 'routing',
          label: (
            <Space orientation="horizontal" size={6}>
              <RadarChartOutlined />
              <span>{t.tabs.routing}</span>
              {currentRecord.routing.isAnnounced && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }} />
              )}
            </Space>
          ),
          children: (
            <Suspense fallback={<TabFallback />}>
              <RoutingTab
                routing={currentRecord.routing}
                cidr={currentRecord.cidr}
                onSearchResource={(res) => performLookup(res, true)}
              />
            </Suspense>
          ),
        },
        {
          key: 'abuse',
          label: (
            <Space orientation="horizontal" size={6}>
              <SafetyCertificateOutlined />
              <span>{t.tabs.abuse}</span>
            </Space>
          ),
          children: (
            <Suspense fallback={<TabFallback />}>
              <AbuseTab
                abuse={currentRecord.abuseContact}
                record={currentRecord}
              />
            </Suspense>
          ),
        },
        {
          key: 'geoloc',
          label: (
            <Space orientation="horizontal" size={6}>
              <GlobalOutlined />
              <span>{t.tabs.location}</span>
            </Space>
          ),
          children: (
            <Suspense fallback={<TabFallback />}>
              <GeolocTab
                geoloc={currentRecord.geolocation}
                ip={currentRecord.query}
                reverseDns={currentRecord.reverseDns}
              />
            </Suspense>
          ),
        },
        {
          key: 'subnet',
          label: (
            <Space orientation="horizontal" size={6}>
              <CalculatorOutlined />
              <span>{t.tabs.subnet}</span>
            </Space>
          ),
          children: (
            <Suspense fallback={<TabFallback />}>
              <SubnetTab
                subnet={currentRecord.subnet}
                cidr={currentRecord.cidr}
              />
            </Suspense>
          ),
        },
        {
          key: 'objects',
          label: (
            <Space orientation="horizontal" size={6}>
              <DatabaseOutlined />
              <span>{t.tabs.objects}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>
                ({currentRecord.ripeObjects?.length || 0})
              </span>
            </Space>
          ),
          children: (
            <Suspense fallback={<TabFallback />}>
              <RipeObjectsTab
                objects={currentRecord.ripeObjects}
                onSearchResource={(res) => performLookup(res, true)}
              />
            </Suspense>
          ),
        },
        {
          key: 'raw',
          label: (
            <Space orientation="horizontal" size={6}>
              <CodeOutlined />
              <span>{t.tabs.rawWhois}</span>
            </Space>
          ),
          children: (
            <Suspense fallback={<TabFallback />}>
              <RawWhoisTab
                rawText={currentRecord.rawWhoisText}
                query={currentRecord.query}
                source={currentRecord.source}
              />
            </Suspense>
          ),
        },
      ]
    : [];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkTheme ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDarkTheme
          ? undefined
          : {
              colorBgLayout: '#f4f6f8',
              colorBgContainer: '#ffffff',
              colorBorderSecondary: '#d0d7de',
              colorBorder: '#bec4ce',
            },
      }}
      locale={language === 'fa' ? faIR : enUS}
      direction={isRtl ? 'rtl' : 'ltr'}
    >
      <AntdApp>
        <Layout style={{ minHeight: '100vh' }}>
          {/* Top Navbar */}
          <Navbar
            activeView={activeView}
            setActiveView={(v) => handleNavigateView(v)}
            onMyIpClick={handleMyIp}
            isLoadingMyIp={isLoadingMyIp}
            isDarkTheme={isDarkTheme}
            onToggleTheme={toggleTheme}
          />

          <Content style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Conditional View Rendering */}
            <ViewErrorBoundary>
              <Suspense fallback={<ViewFallback />}>
                {activeView === 'country-ips' && (
                  <CountryIpExplorer
                    countryCode={countryExplorerCountry}
                    onCountryChange={(code) => {
                      handleNavigateView('country-ips', { countryCode: code });
                    }}
                    onInspectResource={(resource) => {
                      setQuery(resource);
                      handleNavigateView('lookup', { query: resource });
                      performLookup(resource, true);
                    }}
                  />
                )}

                {activeView === 'batch' && (
                  <BatchInspector
                    onInspectSingle={(ip) => {
                      setQuery(ip);
                      handleNavigateView('lookup', { query: ip });
                      performLookup(ip, true);
                    }}
                  />
                )}

                {activeView === 'subnet-calc' && <SubnetCalcTool />}
                {activeView === 'source' && <SourceView />}
                {activeView === 'issues' && <IssuesView />}
                {activeView === 'settings' && (
                  <SettingsView
                    isDarkTheme={isDarkTheme}
                    onToggleTheme={toggleTheme}
                    onNavigate={handleNavigateView}
                  />
                )}
                {activeView === 'not-found' && <NotFoundView onNavigate={handleNavigateView} />}
              </Suspense>
            </ViewErrorBoundary>

            {activeView === 'lookup' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Search Header */}
                <SearchHeader
                  query={query}
                  setQuery={setQuery}
                  onSearch={(q) => performLookup(q, true)}
                  isLoading={isLoading}
                  history={searchHistory}
                  onClearHistory={handleClearHistory}
                />

                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', width: '100%', flex: 1 }}>
                  {/* Error Notification */}
                  {error && (
                    <Alert
                      type="error"
                      showIcon
                      title={t.search.queryError}
                      description={error}
                      action={
                        <Button
                          size="small"
                          danger
                          icon={<ReloadOutlined />}
                          onClick={() => (query ? performLookup(query, true) : handleMyIp())}
                        >
                          {t.search.retry}
                        </Button>
                      }
                      style={{ marginBottom: 20 }}
                    />
                  )}

                  {/* Loading Skeleton */}
                  {isLoading && !currentRecord && !asnRecord && (
                    <div style={{ padding: '20px 0' }}>
                      <Skeleton active paragraph={{ rows: 10 }} />
                    </div>
                  )}

                  {/* ASN Specialized View */}
                  {!isLoading && asnRecord && (
                    <Suspense fallback={<ViewFallback />}>
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
                    </Suspense>
                  )}

                  {/* Regular IP / Prefix Result View */}
                  {!isLoading && currentRecord && (
                    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                      {/* 4 Summary Cards */}
                      <SummaryCards
                        record={currentRecord}
                        onSearchResource={(res) => performLookup(res, true)}
                        onExploreCountry={(cCode) => handleNavigateView('country-ips', { countryCode: cCode })}
                      />

                      {/* Tabs Navigation and Contents */}
                      <Tabs
                        activeKey={activeTab}
                        onChange={(k) => setActiveTab(k as ActiveTab)}
                        items={tabItems}
                        size="large"
                      />
                    </Space>
                  )}
                </div>
              </div>
            )}
          </Content>

          {/* Rich SEO Content Section */}
          <Suspense fallback={null}>
            <SeoSection onExploreCountry={(cCode) => handleNavigateView('country-ips', { countryCode: cCode })} />
          </Suspense>

          {/* Footer */}
          <Footer style={{ textAlign: 'center', fontSize: 12, padding: '24px 16px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <Space orientation="horizontal" size={8}>
                <Text strong>{t.brand}</Text>
                <span>&bull;</span>
                <Text type="secondary">{t.footer.ripestatTools}</Text>
              </Space>

              <Space orientation="horizontal" size={16} wrap>
                <Button type="link" size="small" onClick={() => handleNavigateView('country-ips')}>
                  {t.nav.countryIps}
                </Button>
                <Button type="link" size="small" onClick={() => handleNavigateView('subnet-calc')}>
                  {t.nav.subnetCalc}
                </Button>
                <Button type="link" size="small" onClick={() => handleNavigateView('batch')}>
                  {t.nav.batch}
                </Button>
                <Button type="link" size="small" onClick={() => handleNavigateView('source')}>
                  {t.nav.source}
                </Button>
                <Button type="link" size="small" onClick={() => handleNavigateView('issues')}>
                  {t.nav.issues}
                </Button>
              </Space>
            </div>
          </Footer>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
}
