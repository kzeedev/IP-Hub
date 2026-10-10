import { Row, Col, Card, Tag, Typography, Space, theme, BorderBeam } from 'antd';
import {
  CloudServerOutlined,
  NumberOutlined,
  RadarChartOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { WhoisRecord } from '../types';
import { getCountryName } from '../utils/countries';
import { getRouteUrl } from '../utils/router';
import { FlagIcon } from './FlagIcon';
import { useLanguage } from '../i18n/LanguageContext';

const { Text, Title, Paragraph } = Typography;

interface SummaryCardsProps {
  record: WhoisRecord;
  onSearchResource: (resource: string) => void;
  onExploreCountry?: (countryCode: string) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  record,
  onSearchResource,
  onExploreCountry,
}) => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();

  const localizedCountry = getCountryName(record.countryCode, language, record.country);
  const isAnnounced = record.routing.isAnnounced;

  return (
    <Row gutter={[16, 16]}>
      {/* 1. Network & Org Card */}
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
          <Card
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: 16 } }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Space orientation="horizontal" size={6}>
                  <CloudServerOutlined style={{ color: token.colorPrimary }} />
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {t.summary.netname}
                  </Text>
                </Space>
                <Tag color="processing" variant="filled">
                  {record.status || 'ALLOCATED'}
                </Tag>
              </div>
              <Title level={4} style={{ margin: 0, fontWeight: 700 }} ellipsis={{ tooltip: record.netname }}>
                {record.netname}
              </Title>
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }} ellipsis={{ tooltip: record.orgName || record.description?.[0] }}>
                {record.orgName || record.description?.[0] || 'RIPE NCC Member'}
              </Paragraph>
            </div>
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <Text type="secondary">{t.summary.registry}:</Text>
              <Text strong>{record.source}</Text>
            </div>
          </Card>
        </BorderBeam>
      </Col>

      {/* 2. Range & CIDR Card */}
      <Col xs={24} sm={12} lg={6}>
        <BorderBeam
          size={120}
          duration={6}
          color={[
            { color: '#722ed1', percent: 0 },
            { color: '#2f54eb', percent: 50 },
            { color: '#1677ff', percent: 100 },
          ]}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Card
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: 16 } }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Space orientation="horizontal" size={6}>
                  <NumberOutlined style={{ color: '#722ed1' }} />
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {t.summary.cidr}
                  </Text>
                </Space>
                <Tag color="purple" variant="filled">
                  IPv{record.subnet?.ipVersion || (record.query.includes(':') ? '6' : '4')}
                </Tag>
              </div>
              <Paragraph
                copyable={{ text: record.cidr }}
                style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}
              >
                {record.cidr}
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 4, marginBottom: 0 }} ellipsis={{ tooltip: record.range }}>
                {record.range}
              </Paragraph>
            </div>
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <Text type="secondary">{t.summary.capacity}:</Text>
              <Text strong>{record.subnet?.usableHosts?.toLocaleString() || '1'} {t.summary.hosts}</Text>
            </div>
          </Card>
        </BorderBeam>
      </Col>

      {/* 3. Routing & Origin ASN Card */}
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
          <Card
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: 16 } }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Space orientation="horizontal" size={6}>
                  <RadarChartOutlined style={{ color: '#fa8c16' }} />
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {t.summary.originAsn}
                  </Text>
                </Space>
                <Tag color={isAnnounced ? 'success' : 'warning'} variant="filled">
                  {isAnnounced ? t.routingTab.globallyRouted : t.summary.unannounced}
                </Tag>
              </div>
              {record.routing.originAsn && record.routing.originAsn !== 'Unrouted' ? (
                <a
                  href={getRouteUrl('lookup', { query: record.routing.originAsn, lang: language })}
                  hrefLang={language}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                      e.preventDefault();
                      onSearchResource(record.routing.originAsn);
                    }
                  }}
                  style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: token.colorPrimary, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {record.routing.originAsn}
                  <ArrowRightOutlined style={{ fontSize: 11 }} />
                </a>
              ) : (
                <Text type="secondary" style={{ fontSize: 14 }}>{t.summary.unrouted}</Text>
              )}
              <div style={{ marginTop: 4, fontSize: 12 }}>
                <Text type="secondary">{t.routingTab.bgpVisibility}: </Text>
                <Text strong>{record.routing.bgpVisibilityPercentage}%</Text>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <Text type="secondary">{t.routingTab.lookingGlassTitle}:</Text>
              <Text strong>{record.routing.risPeersSeen} {t.summary.peers}</Text>
            </div>
          </Card>
        </BorderBeam>
      </Col>

      {/* 4. Geolocation & Abuse Card */}
      <Col xs={24} sm={12} lg={6}>
        <BorderBeam
          size={120}
          duration={6}
          color={[
            { color: '#52c41a', percent: 0 },
            { color: '#13c2c2', percent: 50 },
            { color: '#73d13d', percent: 100 },
          ]}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <Card
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: 16 } }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Space orientation="horizontal" size={6}>
                  <EnvironmentOutlined style={{ color: '#52c41a' }} />
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {t.summary.country}
                  </Text>
                </Space>
                <FlagIcon code={record.countryCode} className="w-5 h-3.5" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 15 }}>
                <Text ellipsis={{ tooltip: `${record.geolocation?.city ? `${record.geolocation.city}, ` : ''}${localizedCountry}` }}>
                  {record.geolocation?.city ? `${record.geolocation.city}, ` : ''}{localizedCountry}
                </Text>
              </div>
              <Paragraph
                type="secondary"
                copyable={record.abuseContact?.email ? { text: record.abuseContact.email } : false}
                style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}
                ellipsis={{ tooltip: record.abuseContact?.email }}
              >
                {record.abuseContact?.email || t.summary.noAbuseEmail}
              </Paragraph>
            </div>
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <Text type="secondary">{t.summary.isoCode}:</Text>
              {onExploreCountry && record.countryCode && record.countryCode !== 'XX' ? (
                <a
                  href={getRouteUrl('country-ips', { countryCode: record.countryCode, lang: language })}
                  hrefLang={language}
                  onClick={(e) => {
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                      e.preventDefault();
                      onExploreCountry(record.countryCode);
                    }
                  }}
                  style={{ fontWeight: 700, fontFamily: 'monospace', color: token.colorPrimary }}
                >
                  {record.countryCode} ({localizedCountry})
                </a>
              ) : (
                <Text code>{record.countryCode}</Text>
              )}
            </div>
          </Card>
        </BorderBeam>
      </Col>
    </Row>
  );
};
