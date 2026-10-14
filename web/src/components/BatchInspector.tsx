import React, { useState } from 'react';
import { Card, Input, Button, Table, Space, Typography, Tag, Alert, theme } from 'antd';
import {
  UnorderedListOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { BatchLookupItemResult } from '../types';
import { downloadText } from '../utils/helpers';
import { getCountryName } from '../utils/countries';
import { getRouteUrl } from '../utils/router';
import { FlagIcon } from './FlagIcon';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text, Paragraph } = Typography;

interface BatchInspectorProps {
  onInspectSingle: (query: string) => void;
}

const DEFAULT_BATCH = `193.0.6.139
1.1.1.1
8.8.8.8
9.9.9.9
2001:67c:2e8::2
185.199.108.153
140.82.121.4`;

export const BatchInspector: React.FC<BatchInspectorProps> = ({ onInspectSingle }) => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();
  const [inputText, setInputText] = useState(DEFAULT_BATCH);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BatchLookupItemResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatch = async () => {
    const lines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/whois/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.slice(0, 50),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Batch query failed');
      }

      const data = await res.json();
      setResults(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to execute batch lookup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const headers = ['Query', 'Status', 'IP Version', 'Network Name', 'Range', 'Country', 'Origin AS', 'Abuse Email'];
    const rows = results.map((r) => [
      `"${r.query}"`,
      `"${r.status}"`,
      `"${r.ipVersion || ''}"`,
      `"${(r.netname || '').replace(/"/g, '""')}"`,
      `"${(r.range || '').replace(/"/g, '""')}"`,
      `"${r.countryCode || ''}"`,
      `"${r.originAsn || ''}"`,
      `"${r.abuseEmail || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadText('ripe_batch_whois_results.csv', csvContent);
  };

  const handleExportJson = () => {
    if (results.length === 0) return;
    downloadText('ripe_batch_whois_results.json', JSON.stringify(results, null, 2));
  };

  const columns = [
    {
      title: t.batch.colTarget,
      dataIndex: 'query',
      key: 'query',
      render: (text: string) => (
        <Text strong style={{ fontFamily: 'monospace', color: token.colorPrimary }}>
          {text}
        </Text>
      ),
    },
    {
      title: t.batch.colNetname,
      dataIndex: 'netname',
      key: 'netname',
      render: (text: string) => text || <Text type="secondary" italic>{t.common.unknown}</Text>,
    },
    {
      title: t.batch.colRange,
      dataIndex: 'range',
      key: 'range',
      render: (text: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{text || '-'}</Text>
      ),
    },
    {
      title: t.batch.colOrigin,
      dataIndex: 'originAsn',
      key: 'originAsn',
      render: (text: string) => (
        <Text style={{ fontFamily: 'monospace', color: '#fa8c16' }}>{text || '-'}</Text>
      ),
    },
    {
      title: t.batch.colCountry,
      dataIndex: 'countryCode',
      key: 'countryCode',
      render: (cCode: string) => (
        <Space orientation="horizontal" size={6} align="center">
          <FlagIcon code={cCode} className="w-4 h-3 rounded-[2px]" />
          <Text code style={{ margin: 0 }}>{cCode || '-'}</Text>
          {cCode && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({getCountryName(cCode, language)})
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t.batch.colAbuse,
      dataIndex: 'abuseEmail',
      key: 'abuseEmail',
      render: (text: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }} ellipsis={{ tooltip: text }}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: t.batch.colActions,
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: BatchLookupItemResult) => (
        <Button
          type="link"
          size="small"
          icon={<LinkOutlined />}
          href={getRouteUrl('lookup', { query: record.query, lang: language })}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
              e.preventDefault();
              onInspectSingle(record.query);
            }
          }}
          title={t.batch.openWhoisTooltip}
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header */}
        <Card>
          <Space orientation="horizontal" size={12} align="center">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: token.borderRadiusLG,
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              <UnorderedListOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                {t.batch.title}
              </Title>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                {t.batch.description}
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* Input Card */}
        <Card
          title={t.batch.inputPlaceholder}
          extra={
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => setInputText('')}
            >
              {t.batch.clearButton}
            </Button>
          }
        >
          <Input.TextArea
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste IP addresses or CIDR prefixes here (e.g. 1.1.1.1, 8.8.8.8, 193.0.0.0/21)..."
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {inputText.split('\n').filter((l) => l.trim()).length} {t.batch.targetsQueued}
            </Text>

            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              loading={isLoading}
              disabled={!inputText.trim()}
              onClick={handleRunBatch}
            >
              {isLoading ? t.batch.analyzing : t.batch.analyzeButton}
            </Button>
          </div>

          {error && (
            <Alert
              type="error"
              showIcon
              title={error}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {/* Results Card */}
        {results.length > 0 && (
          <Card
            title={
              <Space orientation="horizontal" size={8}>
                <span>
                  {t.batch.resultsTitle} ({results.length} {t.batch.processed})
                </span>
              </Space>
            }
            extra={
              <Space orientation="horizontal" size={8}>
                <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
                  {t.batch.exportCsv}
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExportJson}>
                  {t.batch.exportJson}
                </Button>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              size="middle"
              columns={columns}
              dataSource={results}
              rowKey="query"
              pagination={{ pageSize: 15 }}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default BatchInspector;
