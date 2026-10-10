import React, { useState } from 'react';
import { Card, Row, Col, Button, Tag, Typography, Space, theme } from 'antd';
import {
  RadarChartOutlined,
  ShareAltOutlined,
  ArrowLeftOutlined,
  CodeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { AsnRecord } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text, Paragraph } = Typography;

interface AsnViewProps {
  record: AsnRecord;
  onSearchResource: (res: string) => void;
  onBack: () => void;
}

export const AsnView: React.FC<AsnViewProps> = ({ record, onSearchResource, onBack }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {/* Back button */}
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
        >
          {t.asnView.backButton}
        </Button>
      </div>

      {/* ASN Header Summary Card */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <Space orientation="horizontal" size={10}>
              <RadarChartOutlined style={{ color: '#fa8c16', fontSize: 22 }} />
              <div>
                <Space orientation="horizontal" size={8} align="center">
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace' }}>
                    {record.asn}
                  </span>
                  <Tag color="success" variant="filled">
                    {t.asnView.activeBgpAsn}
                  </Tag>
                </Space>
                <div style={{ fontSize: 13, color: token.colorTextSecondary, fontWeight: 500 }}>
                  {record.holder}
                </div>
              </div>
            </Space>
          </div>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card type="inner" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>{t.asnView.holder}</Text>
              <Paragraph strong style={{ fontSize: 14, margin: '6px 0 0' }} ellipsis={{ tooltip: record.orgName || record.holder }}>
                {record.orgName || record.holder}
              </Paragraph>
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card type="inner" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>{t.asnView.announcedPrefixesTitle}</Text>
              <div style={{ fontSize: 18, fontWeight: 700, margin: '6px 0 0', fontFamily: 'monospace' }}>
                {record.announcedPrefixesCount} <span style={{ fontSize: 12, fontWeight: 400 }}>{t.asnView.prefixesCount}</span>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card type="inner" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>{t.summary.abuseContact}</Text>
              <Paragraph
                copyable={record.abuseContact?.email ? { text: record.abuseContact.email } : false}
                style={{ fontSize: 13, margin: '6px 0 0', fontFamily: 'monospace' }}
                ellipsis={{ tooltip: record.abuseContact?.email }}
              >
                {record.abuseContact?.email || t.asnView.registeredDb}
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Announced Prefixes Card */}
      <Card
        title={
          <Space orientation="horizontal" size={8}>
            <ShareAltOutlined style={{ color: token.colorPrimary }} />
            <span>
              {t.asnView.announcedPrefixesTitle} ({record.prefixes?.length || 0})
            </span>
          </Space>
        }
        extra={
          record.rawWhoisText ? (
            <Button
              type="text"
              icon={<CodeOutlined />}
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? t.asnView.hideRaw : t.asnView.showRaw}
            </Button>
          ) : undefined
        }
      >
        {record.prefixes && record.prefixes.length > 0 ? (
          <Row gutter={[8, 8]} style={{ maxHeight: 360, overflowY: 'auto' }}>
            {record.prefixes.map((p, idx) => (
              <Col key={idx} xs={24} sm={12} md={8}>
                <Button
                  block
                  style={{ textAlign: 'start', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace' }}
                  onClick={() => onSearchResource(p)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p}
                  </span>
                  <LinkOutlined style={{ fontSize: 11, color: token.colorTextSecondary }} />
                </Button>
              </Col>
            ))}
          </Row>
        ) : (
          <Text type="secondary" italic>{t.asnView.noPrefixes}</Text>
        )}

        {showRaw && record.rawWhoisText && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <div
              style={{
                padding: 16,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {record.rawWhoisText}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </Space>
  );
};
