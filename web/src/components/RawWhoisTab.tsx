import React, { useState } from 'react';
import { Card, Input, Button, Space, Typography, theme } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  DownloadOutlined,
  SearchOutlined,
  AlignLeftOutlined,
} from '@ant-design/icons';
import { copyToClipboard, downloadText } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

const { Text } = Typography;

interface RawWhoisTabProps {
  rawText: string;
  query: string;
  source: string;
}

export const RawWhoisTab: React.FC<RawWhoisTabProps> = ({ rawText = '', query, source }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const handleCopy = () => {
    copyToClipboard(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadText(`whois_${(query || 'query').replace(/[^a-zA-Z0-9.-]/g, '_')}.txt`, rawText);
  };

  const lines = (rawText || '').split('\n');

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {/* Toolbar Card */}
      <Card>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Input
            style={{ flex: 1, minWidth: 200 }}
            prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
            placeholder={t.rawWhoisTab.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />

          <Space orientation="horizontal" size={8}>
            <Button
              icon={<AlignLeftOutlined />}
              type={wrap ? 'primary' : 'default'}
              onClick={() => setWrap(!wrap)}
            >
              {t.rawWhoisTab.wrap}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownload}
            >
              {t.rawWhoisTab.export}
            </Button>
            <Button
              type="primary"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={handleCopy}
            >
              {copied ? t.rawWhoisTab.copied : t.rawWhoisTab.copyText}
            </Button>
          </Space>
        </div>
      </Card>

      {/* Terminal View Container */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'monospace' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4d4f', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#faad14', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }} />
            <span style={{ marginInlineStart: 8, color: token.colorTextSecondary }}>
              whois -h whois.ripe.net {query}
            </span>
          </div>
        }
        extra={
          <Text code style={{ margin: 0 }}>
            {source || 'RIPE'} NCC
          </Text>
        }
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            padding: 16,
            maxHeight: 600,
            overflowY: 'auto',
            background: token.colorFillAlter,
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'inherit',
              whiteSpace: wrap ? 'pre-wrap' : 'pre',
              wordBreak: 'break-all',
            }}
          >
            {lines.map((line, idx) => {
              const isComment = line.trim().startsWith('%') || line.trim().startsWith('#');
              const isMatch = searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase());

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    background: isMatch ? token.colorPrimaryBg : 'transparent',
                    color: isMatch ? token.colorPrimary : undefined,
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      textAlign: 'right',
                      paddingInlineEnd: 16,
                      color: token.colorTextQuaternary,
                      userSelect: 'none',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    style={{
                      color: isComment ? token.colorTextTertiary : token.colorText,
                      fontStyle: isComment ? 'italic' : 'normal',
                    }}
                  >
                    {line}
                  </span>
                </div>
              );
            })}
          </pre>
        </div>
      </Card>
    </Space>
  );
};
