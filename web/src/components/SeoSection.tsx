import React, { useState } from 'react';
import { Card, Row, Col, Button, Tag, Typography, Space, theme } from 'antd';
import {
  ClusterOutlined,
  ReadOutlined,
  DownOutlined,
  UpOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';
import { POPULAR_COUNTRIES } from '../utils/countries';
import { getRouteUrl } from '../utils/router';
import { FlagIcon } from './FlagIcon';

const { Title, Paragraph, Text } = Typography;

interface SeoSectionProps {
  onExploreCountry?: (countryCode: string) => void;
}

export const SeoSection: React.FC<SeoSectionProps> = ({ onExploreCountry }) => {
  const { language, t, isRtl } = useLanguage();
  const { token } = theme.useToken();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const keywordsEn = [
    'Country IP List', 'GeoIP Database', 'MikroTik Address-List', 'Cisco ACL Country IP',
    'Apache .htaccess Geo-Blocking', 'Linux iptables Country Filter', 'RIPE WHOIS Lookup',
    'BGP Routing Inspector', 'Origin ASN Explorer', 'CIDR Subnet Calculator',
    'IPv4 Country Delegations', 'IPv6 Country Delegations', 'Autonomous System Number',
    'Network Abuse Contact Finder', 'RIR Resource Lists', 'Iran IP List', 'Netherlands IP List',
    'Germany IP List', 'USA IP List', 'DDoS Geographic Protection',
  ];

  const keywordsFa = [
    'لیست IP کشورها', 'آی پی هاب', 'آی پی یاب', 'هویز RIPE', 'رنج آی پی میکروتیک',
    'فایروال سیسکو ACL', 'مسدود سازی بر اساس کشور', 'فایروال لینوکس iptables',
    'بستن IP کشور در htaccess', 'استعلام شماره ASN', 'مسیریابی BGP', 'لیست کامل IP ایران',
    'رنج آی پی هلند', 'رنج آی پی آلمان', 'محاسبه گر ساب نت CIDR', 'پیشوندهای IPv4 و IPv6',
    'گزارش تخلف شبکه Abuse', 'رجیستری های قاره ای RIR', 'جلوگیری از اتک DDoS',
  ];

  const activeKeywords = isRtl ? keywordsFa : keywordsEn;

  return (
    <section
      style={{
        marginTop: 48,
        padding: '36px 16px',
        background: token.colorBgLayout,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Space orientation="horizontal" size={10} align="center">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <ClusterOutlined />
              </div>
              <div>
                <Space orientation="horizontal" size={8} align="center">
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{t.seo.heading}</span>
                  <Tag color="blue" variant="filled" style={{ fontSize: 11 }}>
                    {t.seo.guideBadge}
                  </Tag>
                </Space>
                <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  {t.seo.subheading}
                </div>
              </div>
            </Space>

            <Button
              id="btn-toggle-guide"
              type={isExpanded ? 'primary' : 'default'}
              icon={<ReadOutlined />}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? t.seo.hideGuide : t.seo.readGuide}
              {isExpanded ? <UpOutlined style={{ fontSize: 10, marginInlineStart: 6 }} /> : <DownOutlined style={{ fontSize: 10, marginInlineStart: 6 }} />}
            </Button>
          </div>

          {/* Expanded Guide Cards */}
          {isExpanded && (
            <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
              <Col xs={24} md={8}>
                <Card size="small" style={{ height: '100%' }}>
                  <Space orientation="horizontal" size={8} style={{ marginBottom: 8 }}>
                    <SafetyCertificateOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    <Text strong>{t.seo.section1Title}</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                    {t.seo.section1Text}
                  </Paragraph>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card size="small" style={{ height: '100%' }}>
                  <Space orientation="horizontal" size={8} style={{ marginBottom: 8 }}>
                    <GlobalOutlined style={{ color: '#722ed1', fontSize: 16 }} />
                    <Text strong>{t.seo.section2Title}</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                    {t.seo.section2Text}
                  </Paragraph>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card size="small" style={{ height: '100%' }}>
                  <Space orientation="horizontal" size={8} style={{ marginBottom: 8 }}>
                    <CodeOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    <Text strong>{t.seo.section3Title}</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                    {t.seo.section3Text}
                  </Paragraph>
                </Card>
              </Col>
            </Row>
          )}

          {/* Popular Countries Directory */}
          <div style={{ marginTop: 12, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <Text type="secondary" strong style={{ fontSize: 11, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              {t.countryExplorer.topRegions}
            </Text>
            <Space wrap size={[6, 8]}>
              {POPULAR_COUNTRIES.map((c) => (
                <Tag
                  key={c.code}
                  style={{ padding: '3px 8px', cursor: 'pointer' }}
                >
                  <a
                    href={getRouteUrl('country-ips', { countryCode: c.code, lang: language })}
                    hrefLang={language}
                    onClick={(e) => {
                      if (onExploreCountry && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                        e.preventDefault();
                        onExploreCountry(c.code);
                      }
                    }}
                    style={{ color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <FlagIcon code={c.code} className="w-3.5 h-2.5 rounded-[2px]" />
                    <span>{language === 'fa' ? c.faName : c.name}</span>
                    <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>({c.code})</span>
                  </a>
                </Tag>
              ))}
            </Space>
          </div>

          {/* SEO Tag Cloud */}
          <div style={{ marginTop: 10, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <Text type="secondary" strong style={{ fontSize: 11, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              {t.seo.keywordsTitle}
            </Text>
            <Space wrap size={[4, 6]}>
              {activeKeywords.map((kw, idx) => (
                <Tag key={idx} variant="filled" style={{ fontSize: 11 }}>
                  #{kw}
                </Tag>
              ))}
            </Space>
          </div>
        </Space>
      </div>
    </section>
  );
};
