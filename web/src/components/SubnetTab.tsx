import React from 'react';
import { Card, Descriptions, Tag, Typography, Space, theme, Empty } from 'antd';
import { CalculatorOutlined, CodeOutlined } from '@ant-design/icons';
import { SubnetBreakdown } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const { Text, Paragraph } = Typography;

interface SubnetTabProps {
  subnet?: SubnetBreakdown;
  cidr: string;
}

export const SubnetTab: React.FC<SubnetTabProps> = ({ subnet, cidr }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  if (!subnet) {
    return (
      <Card>
        <Empty
          description={
            <div>
              <Text strong>{t.subnetTab.notAvailable}</Text>
              <div style={{ marginTop: 4 }}>
                <Text code>{cidr}</Text>
              </div>
            </div>
          }
        />
      </Card>
    );
  }

  const isV4 = subnet.ipVersion === 4;

  const subnetItems = [
    {
      key: 'netAddr',
      label: t.subnetTab.networkAddress,
      children: (
        <Text strong copyable={{ text: subnet.networkAddress }} style={{ fontFamily: 'monospace', color: token.colorPrimary }}>
          {subnet.networkAddress}
        </Text>
      ),
    },
    ...(subnet.broadcastAddress
      ? [
          {
            key: 'bcast',
            label: t.subnetTab.broadcastAddress,
            children: (
              <Text copyable={{ text: subnet.broadcastAddress }} style={{ fontFamily: 'monospace' }}>
                {subnet.broadcastAddress}
              </Text>
            ),
          },
        ]
      : []),
    ...(subnet.netmask
      ? [
          {
            key: 'mask',
            label: t.subnetTab.netmask,
            children: (
              <Text copyable={{ text: subnet.netmask }} style={{ fontFamily: 'monospace' }}>
                {subnet.netmask}
              </Text>
            ),
          },
        ]
      : []),
    ...(subnet.wildcardMask
      ? [
          {
            key: 'wildcard',
            label: t.subnetTab.wildcardMask,
            children: (
              <Text copyable={{ text: subnet.wildcardMask }} style={{ fontFamily: 'monospace' }}>
                {subnet.wildcardMask}
              </Text>
            ),
          },
        ]
      : []),
    ...(subnet.firstUsableIp && subnet.lastUsableIp
      ? [
          {
            key: 'range',
            label: t.subnetCalc.usableRange,
            span: { xs: 1, sm: 2 },
            children: (
              <Text copyable={{ text: `${subnet.firstUsableIp} - ${subnet.lastUsableIp}` }} style={{ fontFamily: 'monospace', color: '#52c41a' }}>
                {subnet.firstUsableIp} &mdash; {subnet.lastUsableIp}
              </Text>
            ),
          },
        ]
      : []),
    {
      key: 'totalHosts',
      label: t.subnetTab.totalHosts,
      children: <Text strong>{subnet.totalHosts} IPs</Text>,
    },
    {
      key: 'usableHosts',
      label: t.subnetTab.usableHosts,
      children: (
        <Text strong style={{ color: '#52c41a' }}>
          {subnet.usableHosts}
        </Text>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space orientation="horizontal" size={8}>
            <CalculatorOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
            <div>
              <span style={{ fontWeight: 700 }}>{t.subnetTab.title}</span>
              <div style={{ fontSize: 12, color: token.colorTextSecondary, fontFamily: 'monospace' }}>
                {t.subnetTab.block} {subnet.cidr} (/{subnet.prefixLength})
              </div>
            </div>
          </Space>
          <Tag color="purple">IPv{subnet.ipVersion}</Tag>
        </div>
      }
    >
      <Descriptions
        bordered
        size="middle"
        column={{ xs: 1, sm: 2, md: 2 }}
        items={subnetItems}
      />

      {isV4 && subnet.binaryIp && (
        <div style={{ marginTop: 20 }}>
          <Space orientation="horizontal" size={6} style={{ marginBottom: 8 }}>
            <CodeOutlined style={{ color: token.colorPrimary }} />
            <Text type="secondary" strong style={{ fontSize: 12 }}>
              {t.subnetTab.binaryNetmask}
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
            {subnet.binaryIp}
          </div>
        </div>
      )}
    </Card>
  );
};
