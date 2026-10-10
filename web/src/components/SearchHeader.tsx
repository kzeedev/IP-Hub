import React, { useState } from 'react';
import { Input, Typography, Tag, Space, Button, Popover, theme } from 'antd';
import {
  SearchOutlined,
  HistoryOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { SearchHistoryItem } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Paragraph, Text } = Typography;

interface SearchHeaderProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q: string) => void;
  isLoading: boolean;
  history: SearchHistoryItem[];
  onClearHistory: () => void;
}

const SAMPLE_QUERIES = [
  { label: 'RIPE NCC IPv4', query: '193.0.6.139', tag: 'IPv4' },
  { label: 'Cloudflare', query: '1.1.1.1', tag: 'DNS' },
  { label: 'Google Public', query: '8.8.8.8', tag: 'DNS' },
  { label: 'RIPE IPv6', query: '2001:67c:2e8::2', tag: 'IPv6' },
  { label: 'RIPE NCC ASN', query: 'AS3333', tag: 'ASN' },
  { label: 'RIPE Prefix', query: '193.0.0.0/21', tag: 'CIDR' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  query,
  setQuery,
  onSearch,
  isLoading,
  history,
  onClearHistory,
}) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSearchSubmit = (val: string) => {
    const trimmed = val.trim();
    if (trimmed) {
      setIsHistoryOpen(false);
      onSearch(trimmed);
    }
  };

  const getQueryTypeHint = (val: string) => {
    const v = val.trim();
    if (!v) return null;
    if (v.toUpperCase().startsWith('AS') || /^\d{2,6}$/.test(v)) return { type: 'ASN', color: 'gold' };
    if (v.includes('/')) return { type: t.search.typeCidr, color: 'blue' };
    if (v.includes(':')) return { type: 'IPv6', color: 'purple' };
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) return { type: 'IPv4', color: 'green' };
    return { type: t.search.typeQuery, color: 'cyan' };
  };

  const typeHint = getQueryTypeHint(query);

  const historyContent = (
    <div style={{ minWidth: 340, maxWidth: 480, maxHeight: 350, overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, whiteSpace: 'nowrap' }}>
        <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {t.search.historyTitle}
        </Text>
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={onClearHistory}
          style={{ whiteSpace: 'nowrap' }}
        >
          {t.search.clearHistory}
        </Button>
      </div>
      {history.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          No recent searches
        </Text>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {history.map((item, idx) => (
            <div
              key={idx}
              style={{
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: token.borderRadiusSM,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                whiteSpace: 'nowrap',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = token.colorFillTertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={() => {
                setQuery(item.query);
                setIsHistoryOpen(false);
                onSearch(item.query);
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <Text code style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {item.query}
                </Text>
                {item.netname && (
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={item.netname}
                  >
                    ({item.netname})
                  </Text>
                )}
              </div>
              <Tag
                color={item.type === 'asn' ? 'gold' : item.type === 'prefix' ? 'blue' : 'default'}
                variant="filled"
                style={{ margin: 0, fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {item.type?.toUpperCase()}
              </Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: '32px 16px',
      }}
    >
      <div style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 800 }}>
          {t.search.title}
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 24, fontSize: 14 }}>
          {t.search.subtitle}
        </Paragraph>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input.Search
            id="whois-search-input"
            size="large"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            enterButton={t.search.button}
            loading={isLoading}
            allowClear
            prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
            suffix={
              typeHint ? (
                <Tag color={typeHint.color} variant="filled" style={{ marginInlineEnd: 4 }}>
                  {typeHint.type}
                </Tag>
              ) : undefined
            }
            onSearch={handleSearchSubmit}
          />

          {history.length > 0 && (
            <Popover
              open={isHistoryOpen}
              onOpenChange={setIsHistoryOpen}
              content={historyContent}
              trigger="click"
              placement="bottomRight"
            >
              <Button
                size="large"
                icon={<HistoryOutlined />}
                title={t.search.historyTitle}
                aria-label={t.search.historyTitle}
              />
            </Popover>
          )}
        </div>

        {/* Quick Sample Queries */}
        <div style={{ marginTop: 14, textAlign: 'start', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Space orientation="horizontal" size={4} align="center">
            <ThunderboltOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t.search.quickSamples}:
            </Text>
          </Space>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <Tag
              key={idx}
              color="default"
              style={{ cursor: 'pointer', margin: '2px 4px' }}
              onClick={() => {
                setQuery(sample.query);
                onSearch(sample.query);
              }}
            >
              <Text type="secondary" style={{ fontSize: 10, marginInlineEnd: 4 }}>
                {sample.tag}
              </Text>
              <span style={{ fontFamily: 'monospace' }}>{sample.query}</span>
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
};
