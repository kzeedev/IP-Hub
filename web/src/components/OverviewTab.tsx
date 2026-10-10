import React from 'react';
import { Card, Descriptions, Tag, Typography, Row, Col, Space, Button, theme } from 'antd';
import {
  ClusterOutlined,
  BankOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { WhoisRecord } from '../types';
import { formatDate } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

const { Text, Paragraph } = Typography;

interface OverviewTabProps {
  record: WhoisRecord;
  onSearchResource: (res: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ record, onSearchResource }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  const networkItems = [
    {
      key: 'netname',
      label: t.overviewTab.netnameLabel,
      children: (
        <Text strong copyable={{ text: record.netname }} style={{ fontFamily: 'monospace' }}>
          {record.netname}
        </Text>
      ),
    },
    {
      key: 'range',
      label: t.overviewTab.ipRangeLabel,
      children: (
        <Text copyable={{ text: record.range }} style={{ fontFamily: 'monospace' }}>
          {record.range}
        </Text>
      ),
    },
    {
      key: 'cidr',
      label: t.overviewTab.cidrLabel,
      children: (
        <Text strong copyable={{ text: record.cidr }} style={{ fontFamily: 'monospace', color: token.colorPrimary }}>
          {record.cidr}
        </Text>
      ),
    },
    {
      key: 'status',
      label: t.overviewTab.statusLabel,
      children: (
        <Tag color="processing" variant="filled">
          {record.status}
        </Tag>
      ),
    },
    {
      key: 'rdns',
      label: t.overviewTab.reverseDns,
      children: record.reverseDns ? (
        <Text copyable={{ text: record.reverseDns }} style={{ fontFamily: 'monospace' }}>
          {record.reverseDns}
        </Text>
      ) : (
        <Text type="secondary" italic>
          {t.overviewTab.noReverseDns}
        </Text>
      ),
    },
    {
      key: 'source',
      label: t.overviewTab.rirSource,
      children: <Tag color="default">{record.source}</Tag>,
    },
  ];

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {/* Network Overview Card */}
      <Card
        title={
          <Space orientation="horizontal" size={8}>
            <ClusterOutlined style={{ color: token.colorPrimary }} />
            <span>{t.overviewTab.allocationTitle}</span>
          </Space>
        }
      >
        <Descriptions
          bordered
          size="middle"
          column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
          items={networkItems}
        />

        {record.description && record.description.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Text type="secondary" strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              {t.overviewTab.description}
            </Text>
            <div
              style={{
                background: token.colorFillAlter,
                padding: '12px 16px',
                borderRadius: token.borderRadiusLG,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              {record.description.map((desc, idx) => (
                <Paragraph key={idx} style={{ margin: 0, fontFamily: 'monospace', fontSize: 13 }}>
                  {desc}
                </Paragraph>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Organization & Administration Row */}
      <Row gutter={[16, 16]}>
        {/* Organization Card */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space orientation="horizontal" size={8}>
                <BankOutlined style={{ color: token.colorPrimary }} />
                <span>{t.overviewTab.orgTitle}</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t.overviewTab.orgName}>
                <Text strong>{record.orgName || record.netname || t.overviewTab.autonomousOrg}</Text>
              </Descriptions.Item>
              {record.orgHandle && (
                <Descriptions.Item label={t.overviewTab.orgHandle}>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, fontFamily: 'monospace' }}
                    onClick={() => onSearchResource(record.orgHandle!)}
                  >
                    {record.orgHandle}
                  </Button>
                </Descriptions.Item>
              )}
            </Descriptions>

            {record.mntBy && record.mntBy.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  {t.overviewTab.mntBy}
                </Text>
                <Space wrap size={[6, 6]}>
                  {record.mntBy.map((mnt, idx) => (
                    <Tag
                      key={idx}
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSearchResource(mnt)}
                    >
                      {mnt}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </Col>

        {/* Contacts Card */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space orientation="horizontal" size={8}>
                <UserOutlined style={{ color: '#52c41a' }} />
                <span>{t.overviewTab.adminContact}</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t.overviewTab.adminContactsLabel}>
                {record.adminContacts && record.adminContacts.length > 0 ? (
                  <Space wrap size={[6, 6]}>
                    {record.adminContacts.map((c, idx) => (
                      <Tag
                        key={idx}
                        color="green"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSearchResource(c.handle)}
                      >
                        {c.handle}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" italic>{t.overviewTab.inheritedContact}</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label={t.overviewTab.techContactsLabel}>
                {record.techContacts && record.techContacts.length > 0 ? (
                  <Space wrap size={[6, 6]}>
                    {record.techContacts.map((c, idx) => (
                      <Tag
                        key={idx}
                        color="cyan"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSearchResource(c.handle)}
                      >
                        {c.handle}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" italic>{t.overviewTab.inheritedContact}</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <Space orientation="horizontal" size={4}>
                <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                <Text type="secondary">
                  {t.overviewTab.created}: {record.created ? formatDate(record.created) : 'N/A'}
                </Text>
              </Space>
              {record.lastModified && (
                <Text type="secondary">
                  {t.overviewTab.lastModified}: {formatDate(record.lastModified)}
                </Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};
