import React, { useState } from 'react';
import { Card, Row, Col, Select, Input, Button, Typography, Space, theme, Tag } from 'antd';
import {
  SafetyCertificateOutlined,
  MailOutlined,
  BankOutlined,
  CopyOutlined,
  CheckOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { AbuseContact, WhoisRecord } from '../types';
import { copyToClipboard } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

const { Text, Paragraph } = Typography;

interface AbuseTabProps {
  abuse: AbuseContact;
  record: WhoisRecord;
}

export const AbuseTab: React.FC<AbuseTabProps> = ({ abuse, record }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [incidentType, setIncidentType] = useState('Port Scanning / Reconnaissance');
  const [customLogs, setCustomLogs] = useState('[Log excerpt showing IP timestamp, port, and headers]');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const abuseEmail = abuse?.email || 'abuse@' + (record.netname || 'network').toLowerCase().replace(/[^a-z0-9]/g, '') + '.net';

  const abuseTemplate = `To: ${abuseEmail}
Subject: [Abuse Report] Incident from IP ${record.query} (${record.netname})
Date: ${new Date().toUTCString()}

Dear Network Abuse Team (${record.orgName || record.netname}),

We are writing to report suspicious or abusive network activity originating from an IP address within your allocated network block:

Target IP: ${record.query}
Network Name: ${record.netname}
CIDR Block: ${record.cidr}
Origin AS: ${record.routing?.originAsn || 'Unknown'}
Incident Category: ${incidentType}
Timestamp (UTC): ${new Date().toISOString()}

Relevant Log Evidence:
${customLogs}

Please investigate this activity and take appropriate corrective action in accordance with standard network abuse management guidelines.

Thank you,
Network Security Operations`;

  const handleCopyTemplate = () => {
    copyToClipboard(abuseTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {/* Abuse Contact Card */}
      <Card
        title={
          <Space orientation="horizontal" size={8}>
            <SafetyCertificateOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
            <div>
              <span style={{ fontWeight: 700 }}>{t.abuseTab.title}</span>
              <div style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 400 }}>
                {t.abuseTab.subtitle}
              </div>
            </div>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card type="inner" size="small">
              <Space orientation="horizontal" size={10} align="center">
                <MailOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t.abuseTab.email}</Text>
                  <Paragraph
                    copyable={{ text: abuseEmail }}
                    style={{ margin: 0, fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}
                  >
                    {abuseEmail}
                  </Paragraph>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card type="inner" size="small">
              <Space orientation="horizontal" size={10} align="center">
                <BankOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t.abuseTab.org}</Text>
                  <Text strong style={{ fontSize: 14 }}>
                    {record.orgName || record.netname}
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Incident Abuse Report Generator */}
      <Card
        title={
          <Space orientation="horizontal" size={8}>
            <FileTextOutlined style={{ color: token.colorPrimary }} />
            <span>{t.abuseTab.generatorTitle}</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={copiedTemplate ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopyTemplate}
          >
            {copiedTemplate ? t.common.copied : t.abuseTab.copyTemplate}
          </Button>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              {t.abuseTab.incidentCategory}
            </Text>
            <Select
              style={{ width: '100%' }}
              value={incidentType}
              onChange={setIncidentType}
              options={[
                { value: t.abuseTab.portScan, label: t.abuseTab.portScan },
                { value: t.abuseTab.ddos, label: t.abuseTab.ddos },
                { value: t.abuseTab.bruteForce, label: t.abuseTab.bruteForce },
                { value: t.abuseTab.spam, label: t.abuseTab.spam },
                { value: t.abuseTab.malware, label: t.abuseTab.malware },
              ]}
            />
          </Col>

          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
              {t.abuseTab.customLogs}
            </Text>
            <Input
              value={customLogs}
              onChange={(e) => setCustomLogs(e.target.value)}
              placeholder="e.g. 2026-08-14 12:30:15 UTC SRC=..."
            />
          </Col>
        </Row>

        <div
          style={{
            background: token.colorFillAlter,
            padding: 16,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: token.colorText,
            }}
          >
            {abuseTemplate}
          </pre>
        </div>
      </Card>
    </Space>
  );
};
