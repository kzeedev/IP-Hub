import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Input,
  Button,
  Tabs,
  Table,
  Tag,
  Typography,
  Space,
  Statistic,
  Alert,
  theme,
  Spin,
  BorderBeam,
} from 'antd';
import {
  GlobalOutlined,
  DownloadOutlined,
  CopyOutlined,
  CheckOutlined,
  LinkOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  RadarChartOutlined,
  NumberOutlined,
  CodeOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { CountryIpResource, ExportFormat, IpVersionOption, AccessTypeOption, FormatResult, PluginFormat } from '../types';
import { ALL_COUNTRIES, POPULAR_COUNTRIES, getCountryDetails } from '../utils/countries';
import { copyToClipboard, downloadText } from '../utils/helpers';
import { getRouteUrl } from '../utils/router';
import { useLanguage } from '../i18n/LanguageContext';
import { FlagIcon } from './FlagIcon';

const { Text, Title, Paragraph } = Typography;

interface CountryIpExplorerProps {
  countryCode?: string;
  onCountryChange?: (code: string) => void;
  onInspectResource: (resource: string) => void;
}

type TabType = 'ipv4' | 'ipv6' | 'asns';

export const CountryIpExplorer: React.FC<CountryIpExplorerProps> = ({
  countryCode,
  onCountryChange,
  onInspectResource,
}) => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();
  const [selectedCountry, setSelectedCountry] = useState<string>(countryCode ? countryCode.toUpperCase() : '');

  const [data, setData] = useState<CountryIpResource | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Table view Tab & Filters
  const [activeTab, setActiveTab] = useState<TabType>('ipv4');
  const [listSearch, setListSearch] = useState<string>('');
  const deferredListSearch = useDeferredValue(listSearch);
  const [cidrFilter, setCidrFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const itemsPerPage = 50;

  // Dynamic plugins list fetched from backend
  const [pluginsList, setPluginsList] = useState<PluginFormat[]>([]);
  const [isLoadingPlugins, setIsLoadingPlugins] = useState<boolean>(true);

  // Derived formats list from pluginsList IDs
  const formats: string[] = useMemo(() => pluginsList.map((p) => p.id), [pluginsList]);

  // Firewall Generator States
  const [format, setFormat] = useState<ExportFormat>('mikrotik');
  const [ipVersion, setIpVersion] = useState<IpVersionOption>('any');
  const [accessType, setAccessType] = useState<AccessTypeOption>('allow');
  const [customListName, setCustomListName] = useState<string>('');
  const [isConfigCopied, setIsConfigCopied] = useState<boolean>(false);
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(false);

  // Fetch available plugins from backend dynamically on mount
  useEffect(() => {
    let isMounted = true;
    const fetchPlugins = async () => {
      try {
        const res = await fetch('/api/system/plugins');
        if (res.ok) {
          const json = await res.json();
          const list: PluginFormat[] = json.plugins || [];
          if (isMounted && list.length > 0) {
            setPluginsList(list);
            const availableFormatIds = list.map((p) => p.id);
            setFormat((currentFormat) => {
              if (currentFormat && availableFormatIds.includes(currentFormat)) {
                return currentFormat;
              }
              return availableFormatIds[0];
            });
          }
        }
      } catch (err) {
        console.error('Failed to load plugins:', err);
      } finally {
        if (isMounted) {
          setIsLoadingPlugins(false);
        }
      }
    };
    fetchPlugins();
    return () => {
      isMounted = false;
    };
  }, []);

  // ISP / Organization resolution cache
  const [resolvedOrgs, setResolvedOrgs] = useState<Record<string, string>>({});
  const [isResolvingOrgs, setIsResolvingOrgs] = useState<boolean>(false);

  // Copy feedback for individual table items
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Generated firewall script from server-side plugins
  const [generatedScript, setGeneratedScript] = useState<FormatResult>({ text: '', filename: '', ruleCount: 0 });

  // Fetch country data from backend
  const fetchCountryData = async (code: string) => {
    setIsLoading(true);
    setError(null);
    setPage(1);

    const activeFormat = format || (formats.length > 0 ? formats[0] : 'json');

    try {
      const res = await fetch('/api/whois/country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          format: activeFormat,
          version: ipVersion,
          access: accessType,
          listName: customListName || code,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch resources for country ${code}`);
      }
      const json = await res.json();
      setData(json.data);
      if (json.result) {
        setGeneratedScript(json.result);
      }
      if (json.data?.asNames) {
        const orgMap: Record<string, string> = {};
        for (const [asn, name] of Object.entries(json.data.asNames as Record<string, string>)) {
          orgMap[`AS${asn}`] = name;
          orgMap[asn] = name;
        }
        if (json.data?.prefixOrgs) {
          Object.assign(orgMap, json.data.prefixOrgs);
        }
        setResolvedOrgs((prev) => ({ ...prev, ...orgMap }));
      }
    } catch (err: any) {
      setError(err.message || t.countryExplorer.apiError);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCountry) {
      fetchCountryData(selectedCountry);
    }
  }, [selectedCountry]);

  // Sync countryCode prop changes from URL/parent
  useEffect(() => {
    const normalized = countryCode ? countryCode.toUpperCase() : '';
    if (normalized !== selectedCountry) {
      setSelectedCountry(normalized);
      if (!normalized) {
        setData(null);
        setGeneratedScript({ text: '', filename: '', ruleCount: 0 });
        setError(null);
      }
    }
  }, [countryCode]);

  const handleCountrySelect = (code: string) => {
    const normalized = code ? code.toUpperCase() : '';
    setSelectedCountry(normalized);
    if (onCountryChange) {
      onCountryChange(normalized);
    }
  };

  // Update server-side plugin formatted output when formatting options change
  const isInitialFormatLoad = useRef(true);
  useEffect(() => {
    if (isInitialFormatLoad.current) {
      isInitialFormatLoad.current = false;
      return;
    }
    if (!data || !selectedCountry || !format) return;
    const controller = new AbortController();
    setIsConfigLoading(true);

    fetch('/api/whois/country', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: selectedCountry,
        format,
        version: ipVersion,
        access: accessType,
        listName: customListName || selectedCountry,
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.result) {
          setGeneratedScript(json.result);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // ignore
        }
      })
      .finally(() => {
        setIsConfigLoading(false);
      });

    return () => controller.abort();
  }, [format, ipVersion, accessType, customListName]);

  // Country select options
  const countryOptions = useMemo(() => {
    return ALL_COUNTRIES.map((c) => {
      const localized = language === 'fa' ? c.faName : c.name;
      return {
        value: c.code,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space orientation="horizontal" size={8} align="center">
              <FlagIcon code={c.code} className="w-4 h-3 rounded-[2px]" />
              <span>{localized}</span>
            </Space>
            <Tag style={{ margin: 0, fontFamily: 'monospace' }}>{c.code}</Tag>
          </div>
        ),
        searchKey: `${c.code} ${c.name} ${c.faName} ${localized}`.toLowerCase(),
      };
    });
  }, [language]);

  const popularCountries = useMemo(() => {
    return POPULAR_COUNTRIES.map((c) => ({
      ...c,
      name: language === 'fa' ? c.faName : c.name,
    }));
  }, [language]);

  const currentMeta = useMemo(() => getCountryDetails(selectedCountry, language), [selectedCountry, language]);

  // Filtered list for table
  const filteredList = useMemo(() => {
    if (!data) return [];
    const q = deferredListSearch.trim().toLowerCase();

    if (activeTab === 'ipv4') {
      return data.ipv4.filter((prefix) => {
        const org = (resolvedOrgs[prefix] || '').toLowerCase();
        const matchesSearch = !q || prefix.toLowerCase().includes(q) || org.includes(q);
        if (!matchesSearch) return false;
        if (cidrFilter === 'all') return true;
        return prefix.endsWith(`/${cidrFilter}`);
      });
    } else if (activeTab === 'ipv6') {
      return data.ipv6.filter((prefix) => {
        const org = (resolvedOrgs[prefix] || '').toLowerCase();
        const matchesSearch = !q || prefix.toLowerCase().includes(q) || org.includes(q);
        if (!matchesSearch) return false;
        if (cidrFilter === 'all') return true;
        return prefix.endsWith(`/${cidrFilter}`);
      });
    } else {
      return data.asns
        .map((a) => `AS${a}`)
        .filter((asnStr) => {
          const cleanAsn = asnStr.replace(/^AS/i, '');
          const org = (resolvedOrgs[asnStr] || resolvedOrgs[cleanAsn] || '').toLowerCase();
          return !q || asnStr.toLowerCase().includes(q) || org.includes(q);
        });
    }
  }, [data, activeTab, deferredListSearch, cidrFilter, resolvedOrgs]);

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
      .then((res) => (res.ok ? res.json() : { orgs: {} }))
      .then((resData) => {
        if (isMounted && resData?.orgs && Object.keys(resData.orgs).length > 0) {
          setResolvedOrgs((prev) => ({ ...prev, ...resData.orgs }));
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
    list.forEach((p) => {
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
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const tableColumns = [
    {
      title: activeTab === 'asns' ? 'ASN' : t.countryExplorer.colResource,
      dataIndex: 'item',
      key: 'item',
      render: (item: string) => (
        <Space orientation="horizontal" size={8}>
          <Text strong style={{ fontFamily: 'monospace', color: token.colorPrimary }}>
            {item}
          </Text>
        </Space>
      ),
    },
    {
      title: t.countryExplorer.colOrg,
      key: 'isp',
      render: (_: any, record: { item: string }) => {
        const org = getOrgForItem(record.item);
        if (org) {
          return <Text strong>{org}</Text>;
        }
        if (isResolvingOrgs) {
          return <Text type="secondary" italic>{t.countryExplorer.resolving}</Text>;
        }
        return <Text type="secondary" italic>{t.countryExplorer.unknownOrg}</Text>;
      },
    },
    {
      title: t.countryExplorer.colActions,
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: { item: string }) => (
        <Space orientation="horizontal" size={4}>
          <Button
            type="text"
            size="small"
            icon={copiedItem === record.item ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
            onClick={() => handleCopySingle(record.item)}
            title={t.common.copy}
          />
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => onInspectResource(record.item)}
            title={t.countryExplorer.openWhoisTooltip}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Generator Form Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <Space orientation="horizontal" size={10}>
                <GlobalOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
                <div>
                  <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                    {t.countryExplorer.title}
                  </Title>
                  <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                    {t.countryExplorer.description}
                  </Paragraph>
                </div>
              </Space>

              {currentMeta && (
                <Tag color="blue" style={{ fontSize: 12, padding: '4px 8px' }}>
                  <FlagIcon code={currentMeta.code} className="w-4 h-3 rounded-[2px]" />
                  <span style={{ marginInlineStart: 6, fontWeight: 700 }}>{currentMeta.name}</span>
                </Tag>
              )}
            </div>
          }
        >
          <Row gutter={[16, 16]}>
            {/* 1. Country Selection */}
            <Col xs={24} md={8}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                {t.countryExplorer.selectCountry}
              </Text>
              <Select
                showSearch={{
                  filterOption: (input, option) =>
                    Boolean((option as any)?.searchKey?.includes(input.toLowerCase().trim())),
                }}
                style={{ width: '100%' }}
                placeholder={t.countryExplorer.searchCountry}
                value={selectedCountry || undefined}
                onChange={handleCountrySelect}
                options={countryOptions}
              />
            </Col>

            {/* 2. Format Selection */}
            <Col xs={24} sm={12} md={4}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                {t.countryExplorer.formatLabel}
              </Text>
              <Select
                style={{ width: '100%' }}
                value={format}
                onChange={setFormat}
                loading={isLoadingPlugins}
                options={
                  pluginsList.length > 0
                    ? pluginsList.map((p) => ({
                      value: p.id,
                      label:
                        (t.countryExplorer.formats as Record<string, string>)?.[p.id] ||
                        (p.id === 'freebsd-pf' ? (t.countryExplorer.formats as Record<string, string>)?.pf : null) ||
                        p.name ||
                        p.id,
                    }))
                    : [{ value: format, label: (t.countryExplorer.formats as Record<string, string>)?.[format] || format }]
                }
              />
            </Col>

            {/* 3. IP Version */}
            <Col xs={24} sm={12} md={4}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                {t.countryExplorer.versionLabel}
              </Text>
              <Select
                style={{ width: '100%' }}
                value={ipVersion}
                onChange={setIpVersion}
                options={[
                  { value: 'any', label: t.countryExplorer.versions.any },
                  { value: 'ipv4', label: t.countryExplorer.versions.ipv4 },
                  { value: 'ipv6', label: t.countryExplorer.versions.ipv6 },
                ]}
              />
            </Col>

            {/* 4. Access Policy */}
            <Col xs={24} sm={12} md={4}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                {t.countryExplorer.accessLabel}
              </Text>
              <Select
                style={{ width: '100%' }}
                value={accessType}
                onChange={setAccessType}
                options={[
                  { value: 'allow', label: t.countryExplorer.access.allow },
                  { value: 'deny', label: t.countryExplorer.access.deny },
                ]}
              />
            </Col>

            {/* 5. List Name */}
            <Col xs={24} sm={12} md={4}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                {t.countryExplorer.listNameLabel}
              </Text>
              <Input
                value={customListName}
                onChange={(e) => setCustomListName(e.target.value)}
                placeholder={data?.countryCode || selectedCountry}
                style={{ fontFamily: 'monospace' }}
              />
            </Col>
          </Row>

          {/* Popular Countries Chips */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text type="secondary" strong style={{ fontSize: 11, textTransform: 'uppercase', marginInlineEnd: 6 }}>
              {t.countryExplorer.topRegions}:
            </Text>
            {popularCountries.map((c) => (
              <Tag
                key={c.code}
                color={c.code === selectedCountry ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '2px 8px' }}
                onClick={() => handleCountrySelect(c.code)}
              >
                <FlagIcon code={c.code} className="w-3.5 h-2.5 rounded-[2px]" />
                <span style={{ marginInlineStart: 4 }}>{c.name}</span>
                <span style={{ fontFamily: 'monospace', marginInlineStart: 4, opacity: 0.7 }}>({c.code})</span>
              </Tag>
            ))}
          </div>
        </Card>

        {/* Empty Selection State for /country-ips */}
        {!selectedCountry && !isLoading && !data && (
          <Card style={{ textAlign: 'center', padding: '36px 16px' }}>
            <Space orientation="vertical" size="small" align="center">
              <GlobalOutlined style={{ fontSize: 40, color: token.colorPrimary, opacity: 0.85 }} />
              <Title level={5} style={{ margin: '8px 0 0' }}>
                {t.countryExplorer.selectCountry}
              </Title>
              <Text type="secondary" style={{ maxWidth: 520, fontSize: 13 }}>
                {t.countryExplorer.description}
              </Text>
            </Space>
          </Card>
        )}

        {/* Metrics Banner */}
        {isLoading ? (
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4].map((i) => (
              <Col key={i} xs={24} sm={12} lg={6}>
                <Card loading />
              </Col>
            ))}
          </Row>
        ) : data ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <BorderBeam
                size={120}
                duration={6}
                color={[
                  { color: '#1677ff', percent: 0 },
                  { color: '#36cfc9', percent: 50 },
                  { color: '#95de64', percent: 100 },
                ]}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Card style={{ height: '100%' }}>
                  <Statistic
                    title={
                      <Space orientation="horizontal" size={6}>
                        <CloudServerOutlined style={{ color: token.colorPrimary }} />
                        <span>{t.countryExplorer.ipv4Allocations}</span>
                      </Space>
                    }
                    value={data.ipv4Count}
                    suffix={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{t.countryExplorer.prefixBlocks}</span>}
                  />
                </Card>
              </BorderBeam>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <BorderBeam
                size={120}
                duration={6}
                color={[
                  { color: '#722ed1', percent: 0 },
                  { color: '#eb2f96', percent: 50 },
                  { color: '#f759ab', percent: 100 },
                ]}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Card style={{ height: '100%' }}>
                  <Statistic
                    title={
                      <Space orientation="horizontal" size={6}>
                        <CloudServerOutlined style={{ color: '#722ed1' }} />
                        <span>{t.countryExplorer.ipv6Allocations}</span>
                      </Space>
                    }
                    value={data.ipv6Count}
                    suffix={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{t.countryExplorer.nextGenPrefixes}</span>}
                  />
                </Card>
              </BorderBeam>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <BorderBeam
                size={120}
                duration={6}
                color={[
                  { color: '#fa8c16', percent: 0 },
                  { color: '#faad14', percent: 50 },
                  { color: '#ffd666', percent: 100 },
                ]}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Card style={{ height: '100%' }}>
                  <Statistic
                    title={
                      <Space orientation="horizontal" size={6}>
                        <RadarChartOutlined style={{ color: '#fa8c16' }} />
                        <span>{t.countryExplorer.originAsns}</span>
                      </Space>
                    }
                    value={data.asnCount}
                    suffix={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{t.countryExplorer.asNetworks}</span>}
                  />
                </Card>
              </BorderBeam>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <BorderBeam
                size={120}
                duration={6}
                color={[
                  { color: '#52c41a', percent: 0 },
                  { color: '#13c2c2', percent: 50 },
                  { color: '#95de64', percent: 100 },
                ]}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <Card style={{ height: '100%' }}>
                  <Statistic
                    title={
                      <Space orientation="horizontal" size={6}>
                        <NumberOutlined style={{ color: '#52c41a' }} />
                        <span>{t.countryExplorer.estCapacity}</span>
                      </Space>
                    }
                    value={
                      data.totalEstimatedIpv4Addresses > 1000000
                        ? `${(data.totalEstimatedIpv4Addresses / 1000000).toFixed(1)}M`
                        : data.totalEstimatedIpv4Addresses.toLocaleString()
                    }
                    suffix={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{t.countryExplorer.totalRouted}</span>}
                  />
                </Card>
              </BorderBeam>
            </Col>
          </Row>
        ) : null}

        {error && (
          <Alert
            type="error"
            showIcon
            title={t.countryExplorer.loadError}
            description={error}
            action={
              <Button size="small" danger icon={<ReloadOutlined />} onClick={() => fetchCountryData(selectedCountry)}>
                {t.search.retry}
              </Button>
            }
          />
        )}

        {/* Configuration Result Card */}
        {isLoading || isConfigLoading ? (
          <Card loading />
        ) : generatedScript.text ? (
          <Card
            title={
              <Space orientation="horizontal" size={10} wrap>
                <CodeOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                <span style={{ fontWeight: 700 }}>{t.countryExplorer.previewRules}</span>
                <Tag color="blue" variant="filled">
                  {generatedScript.ruleCount.toLocaleString()} {t.countryExplorer.rulesGenerated}
                </Tag>
                <Tag color="default" style={{ fontFamily: 'monospace' }}>
                  {generatedScript.filename}
                </Tag>
              </Space>
            }
            extra={
              <Space orientation="horizontal" size={8}>
                <Button
                  type="primary"
                  icon={isConfigCopied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={handleCopyGenerated}
                >
                  {isConfigCopied ? t.countryExplorer.copied : t.countryExplorer.copyScript}
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadGenerated}>
                  {t.countryExplorer.downloadScript}
                </Button>
              </Space>
            }
          >
            <div
              style={{
                background: token.colorFillAlter,
                padding: 16,
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
                maxHeight: 380,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: token.colorText }}>
                {generatedScript.text}
              </pre>
            </div>
          </Card>
        ) : null}

        {/* Data Table Card */}
        {isLoading ? (
          <Card loading />
        ) : data ? (
          <Card
            title={
              <Tabs
                activeKey={activeTab}
                onChange={(k) => {
                  setActiveTab(k as TabType);
                  setPage(1);
                }}
                items={[
                  {
                    key: 'ipv4',
                    label: `${t.countryExplorer.ipv4Allocations} (${data.ipv4Count.toLocaleString()})`,
                  },
                  {
                    key: 'ipv6',
                    label: `${t.countryExplorer.ipv6Allocations} (${data.ipv6Count.toLocaleString()})`,
                  },
                  {
                    key: 'asns',
                    label: `${t.countryExplorer.originAsns} (${data.asnCount.toLocaleString()})`,
                  },
                ]}
                style={{ marginBottom: 0 }}
              />
            }
          >
            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <Input
                style={{ flex: 1, minWidth: 200 }}
                prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
                placeholder={t.countryExplorer.filterPlaceholder}
                value={listSearch}
                onChange={(e) => {
                  setListSearch(e.target.value);
                  setPage(1);
                }}
                allowClear
              />

              {activeTab !== 'asns' && availableCidrs.length > 0 && (
                <Select
                  style={{ minWidth: 150 }}
                  value={cidrFilter}
                  onChange={(v) => {
                    setCidrFilter(v);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: `${t.countryExplorer.allCidrs} (${availableCidrs.reduce((a, b) => a + b[1], 0)})` },
                    ...availableCidrs.map(([c, count]) => ({
                      value: c,
                      label: `/${c} (${count})`,
                    })),
                  ]}
                />
              )}
            </div>

            <Table
              size="middle"
              columns={tableColumns}
              dataSource={paginatedList.map((item) => ({ item }))}
              rowKey="item"
              pagination={{
                current: page,
                pageSize: itemsPerPage,
                total: filteredList.length,
                onChange: setPage,
                showSizeChanger: false,
              }}
            />
          </Card>
        ) : null}
      </Space>
    </div>
  );
};
