import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Slider, Descriptions, Typography, Space, theme, Tag } from 'antd';
import { CalculatorOutlined, NumberOutlined, CodeOutlined } from '@ant-design/icons';
import { SubnetBreakdown } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { formatHostsCount } from '../utils/helpers';
import { upsertPageDatasetSchema, removePageDatasetSchema } from '../utils/datasetSchema';

const { Title, Text, Paragraph } = Typography;

export const SubnetCalcTool: React.FC = () => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();
  const [ipInput, setIpInput] = useState('193.0.0.0');
  const [prefixLength, setPrefixLength] = useState<number>(21);
  const [data, setData] = useState<SubnetBreakdown | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubnet(ipInput, prefixLength);
    }, 250);
    return () => clearTimeout(timer);
  }, [ipInput, prefixLength]);

  useEffect(() => {
    if (!data) {
      removePageDatasetSchema();
      return;
    }

    const langPrefix = language === 'fa' ? '/fa' : '';
    const inLang = language === 'fa' ? 'fa-IR' : 'en-US';
    const pageUrl = `https://ip-hub.ir${langPrefix}/subnet-calc`;

    upsertPageDatasetSchema({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      '@id': `${pageUrl}#dataset-${encodeURIComponent(data.cidr)}`,
      name:
        language === 'fa'
          ? `داده‌های محاسبه ساب‌نت CIDR برای ${data.cidr}`
          : `CIDR Subnet Calculation Dataset for ${data.cidr} (IPv${data.ipVersion})`,
      description:
        language === 'fa'
          ? `محاسبه دقیق مهندسی شبکه برای ساب‌نت ${data.cidr}: آدرس شبکه ${data.networkAddress}، نت‌مسک ${data.netmask || '-'}، وایلدکارد ${data.wildcardMask || '-'} و ${data.usableHosts} هاست قابل استفاده.`
          : `Original CIDR subnet breakdown dataset for ${data.cidr}: Network Address ${data.networkAddress}, Netmask ${data.netmask || 'N/A'}, Wildcard Mask ${data.wildcardMask || 'N/A'}, Broadcast ${data.broadcastAddress || 'N/A'}, Usable Range ${data.firstUsableIp || '-'} to ${data.lastUsableIp || '-'} (${data.usableHosts} usable hosts).`,
      url: pageUrl,
      inLanguage: inLang,
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      creator: {
        '@type': 'Organization',
        '@id': 'https://ip-hub.ir/#organization',
        name: 'IP-Hub',
        url: 'https://ip-hub.ir/',
      },
      keywords: [
        data.cidr,
        data.networkAddress,
        ...(data.netmask ? [data.netmask] : []),
        ...(data.wildcardMask ? [data.wildcardMask] : []),
        `IPv${data.ipVersion} subnet`,
      ],
      variableMeasured: [
        {
          '@type': 'PropertyValue',
          name: 'CIDR Notation',
          value: data.cidr,
        },
        {
          '@type': 'PropertyValue',
          name: 'IP Version',
          value: `IPv${data.ipVersion}`,
        },
        {
          '@type': 'PropertyValue',
          name: 'Prefix Length',
          value: `/${data.prefixLength}`,
        },
        {
          '@type': 'PropertyValue',
          name: 'Network Address',
          value: data.networkAddress,
        },
        ...(data.broadcastAddress
          ? [
              {
                '@type': 'PropertyValue',
                name: 'Broadcast Address',
                value: data.broadcastAddress,
              },
            ]
          : []),
        ...(data.netmask
          ? [
              {
                '@type': 'PropertyValue',
                name: 'Subnet Mask (Netmask)',
                value: data.netmask,
              },
            ]
          : []),
        ...(data.wildcardMask
          ? [
              {
                '@type': 'PropertyValue',
                name: 'Cisco Wildcard Mask',
                value: data.wildcardMask,
              },
            ]
          : []),
        ...(data.firstUsableIp && data.lastUsableIp
          ? [
              {
                '@type': 'PropertyValue',
                name: 'Usable Host IP Range',
                value: `${data.firstUsableIp} - ${data.lastUsableIp}`,
              },
            ]
          : []),
        {
          '@type': 'PropertyValue',
          name: 'Total Address Capacity',
          value: data.totalHosts,
        },
        {
          '@type': 'PropertyValue',
          name: 'Total Usable Hosts',
          value: data.usableHosts,
        },
        ...(data.binaryIp
          ? [
              {
                '@type': 'PropertyValue',
                name: 'Binary IP Representation',
                value: data.binaryIp,
              },
            ]
          : []),
      ],
      distribution: [
        {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          name: `${data.cidr} Subnet JSON Calculation`,
          contentUrl: `https://ip-hub.ir/api/whois/subnet?ip=${encodeURIComponent(data.ip)}&cidr=${data.prefixLength}`,
        },
      ],
    });

    return () => {
      removePageDatasetSchema();
    };
  }, [data, language]);

  const fetchSubnet = async (ip: string, cidr: number) => {
    try {
      const res = await fetch(`/api/whois/subnet?ip=${encodeURIComponent(ip)}&cidr=${cidr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // ignore
    }
  };

  const subnetItems = data
    ? [
        {
          key: 'netAddr',
          label: t.subnetCalc.networkAddr,
          children: (
            <Text strong copyable={{ text: data.networkAddress }} style={{ fontFamily: 'monospace', color: token.colorPrimary }}>
              {data.networkAddress}
            </Text>
          ),
        },
        ...(data.broadcastAddress
          ? [
              {
                key: 'bcast',
                label: t.subnetCalc.broadcastAddr,
                children: (
                  <Text copyable={{ text: data.broadcastAddress }} style={{ fontFamily: 'monospace' }}>
                    {data.broadcastAddress}
                  </Text>
                ),
              },
            ]
          : []),
        ...(data.netmask
          ? [
              {
                key: 'mask',
                label: t.subnetCalc.netmask,
                children: (
                  <Text copyable={{ text: data.netmask }} style={{ fontFamily: 'monospace' }}>
                    {data.netmask}
                  </Text>
                ),
              },
            ]
          : []),
        ...(data.wildcardMask
          ? [
              {
                key: 'wildcard',
                label: t.subnetCalc.wildcard,
                children: (
                  <Text copyable={{ text: data.wildcardMask }} style={{ fontFamily: 'monospace' }}>
                    {data.wildcardMask}
                  </Text>
                ),
              },
            ]
          : []),
        ...(data.firstUsableIp && data.lastUsableIp
          ? [
              {
                key: 'range',
                label: t.subnetCalc.usableRange,
                span: { xs: 1, sm: 2 },
                children: (
                  <Text copyable={{ text: `${data.firstUsableIp} - ${data.lastUsableIp}` }} style={{ fontFamily: 'monospace', color: '#52c41a' }}>
                    {data.firstUsableIp} &mdash; {data.lastUsableIp}
                  </Text>
                ),
              },
            ]
          : []),
        {
          key: 'totalHosts',
          label: t.subnetCalc.totalHosts,
          children: <Text strong>{formatHostsCount(data.totalHosts)}</Text>,
        },
        {
          key: 'usableHosts',
          label: t.subnetCalc.usableHosts,
          children: (
            <Text strong style={{ color: '#52c41a' }}>
              {formatHostsCount(data.usableHosts)}
            </Text>
          ),
        },
      ]
    : [];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
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
              <CalculatorOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                {t.subnetCalc.title}
              </Title>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                {t.subnetCalc.description}
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* Controls Card */}
        <Card title={t.subnetCalc.title}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {t.subnetCalc.ipLabel}
              </Text>
              <Input
                size="large"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                placeholder="e.g. 192.168.1.0 or 10.0.0.0"
                style={{ fontFamily: 'monospace' }}
              />
            </Col>

            <Col xs={24} md={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>
                  {t.subnetCalc.cidrLabel} (/{prefixLength})
                </Text>
                <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                  {data?.netmask ? `${t.subnetCalc.maskShort}: ${data.netmask}` : `/${prefixLength}`}
                </Tag>
              </div>
              <Slider
                min={1}
                max={32}
                value={prefixLength}
                onChange={(val) => setPrefixLength(val as number)}
                marks={{ 1: '/1', 8: '/8', 16: '/16', 24: '/24', 32: '/32' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Results Card */}
        {data && (
          <Card
            title={
              <Space orientation="horizontal" size={8}>
                <NumberOutlined style={{ color: token.colorPrimary }} />
                <span>
                  {t.subnetCalc.title} ({data.cidr})
                </span>
              </Space>
            }
          >
            <Descriptions
              bordered
              size="middle"
              column={{ xs: 1, sm: 2, md: 2 }}
              items={subnetItems}
            />

            {data.binaryIp && (
              <div style={{ marginTop: 20 }}>
                <Space orientation="horizontal" size={6} style={{ marginBottom: 8 }}>
                  <CodeOutlined style={{ color: token.colorPrimary }} />
                  <Text type="secondary" strong style={{ fontSize: 12 }}>
                    {t.subnetCalc.binaryMask}
                  </Text>
                </Space>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: token.borderRadiusLG,
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    color: token.colorPrimary,
                    letterSpacing: '0.05em',
                  }}
                >
                  {data.binaryIp}
                </div>
              </div>
            )}
          </Card>
        )}
      </Space>
    </div>
  );
};

export default SubnetCalcTool;
