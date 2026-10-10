import React from 'react';
import { Card, Row, Col, Progress, Tag, Button, Typography, Space, theme } from 'antd';
import {
  RadarChartOutlined,
  GlobalOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { RoutingStatus } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text, Paragraph } = Typography;

interface RoutingTabProps {
  routing: RoutingStatus;
  cidr: string;
  onSearchResource: (res: string) => void;
}

export const RoutingTab: React.FC<RoutingTabProps> = ({ routing, cidr, onSearchResource }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const visPercent = routing?.bgpVisibilityPercentage || 0;

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {/* Top Routing Status Card */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '6px 0' }}>
            <Space orientation="horizontal" size={10}>
              <RadarChartOutlined style={{ color: routing?.isAnnounced ? '#52c41a' : '#faad14', fontSize: 20 }} />
              <div>
                <Space orientation="horizontal" size={8} align="center">
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{t.routingTab.routingStatus}</span>
                  <Tag color={routing?.isAnnounced ? 'success' : 'warning'} variant="filled">
                    {routing?.isAnnounced ? t.routingTab.globallyRouted : t.routingTab.unannounced}
                  </Tag>
                </Space>
                <div style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 400 }}>
                  {t.routingTab.risDescription}
                </div>
              </div>
            </Space>

            {routing?.originAsn && routing.originAsn !== 'Unrouted' && (
              <Button
                type="primary"
                ghost
                icon={<ArrowRightOutlined />}
                style={{ fontFamily: 'monospace' }}
                onClick={() => onSearchResource(routing.originAsn)}
              >
                {t.routingTab.originButton} {routing.originAsn}
              </Button>
            )}
          </div>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card type="inner" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>{t.routingTab.bgpVisibility}</Text>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', fontFamily: 'monospace' }}>
                {visPercent}%
                <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 6, fontWeight: 400 }}>
                  {t.routingTab.acrossRis}
                </Text>
              </div>
              <Progress
                percent={visPercent}
                size="small"
                status={visPercent > 80 ? 'success' : visPercent > 30 ? 'normal' : 'exception'}
                showInfo={false}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card type="inner" size="small">
              <Space orientation="horizontal" size={6}>
                <GlobalOutlined style={{ color: token.colorPrimary }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{t.routingTab.peerSightings}</Text>
              </Space>
              <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', fontFamily: 'monospace' }}>
                {routing?.risPeersSeen || 0}
                <Text type="secondary" style={{ fontSize: 12, marginInlineStart: 6, fontWeight: 400 }}>
                  / {routing?.totalRisPeers || '600+'} {t.routingTab.peers}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{t.routingTab.activeFeeds}</Text>
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card type="inner" size="small">
              <Space orientation="horizontal" size={6}>
                <ShareAltOutlined style={{ color: '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{t.routingTab.announcedPrefix}</Text>
              </Space>
              <Paragraph
                copyable={{ text: routing?.announcedPrefix || cidr }}
                style={{ fontSize: 16, fontWeight: 700, margin: '12px 0 6px', fontFamily: 'monospace' }}
              >
                {routing?.announcedPrefix || cidr}
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 11 }}>{t.routingTab.originAnnouncement}</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* RPKI & Route Object Details */}
      <Card
        title={
          <Space orientation="horizontal" size={8}>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span>{t.routingTab.roaTitle}</span>
          </Space>
        }
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div
            style={{
              padding: 12,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 3 }} />
            <div>
              <Text strong>{t.routingTab.irrTitle}</Text>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                {t.routingTab.irrDesc} {cidr}.
              </Paragraph>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <RadarChartOutlined style={{ color: token.colorPrimary, marginTop: 3 }} />
            <div>
              <Text strong>{t.routingTab.risCoverageTitle}</Text>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                {t.routingTab.risCoverageDesc}
              </Paragraph>
            </div>
          </div>
        </Space>
      </Card>
    </Space>
  );
};
