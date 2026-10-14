import React from 'react';
import { Card, Button, Row, Col, Tag, Typography, Space, theme } from 'antd';
import {
  GithubOutlined,
  GlobalOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  DatabaseOutlined,
  LinkOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Paragraph, Text } = Typography;

export const SourceView: React.FC = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header Banner */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: token.borderRadiusLG,
                background: token.colorPrimary,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              <GithubOutlined />
            </div>
            <div>
              <Space orientation="horizontal" size={8} align="center">
                <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                  {t.sourcePage.title}
                </Title>
                <Tag color="processing" variant="filled" style={{ fontWeight: 600 }}>
                  {t.sourcePage.badge}
                </Tag>
              </Space>
              <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {t.sourcePage.intro}
              </Paragraph>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <Space orientation="horizontal" size={10} wrap>
              <Button
                type="primary"
                icon={<GlobalOutlined />}
                href="https://ip-hub.ir/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.sourcePage.projectPage}
              </Button>
              <Button
                icon={<GithubOutlined />}
                href="https://github.com/kzeedev/IP-Hub"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.sourcePage.githubRepo}
              </Button>
            </Space>
          </div>
        </Card>

        {/* Feature Grid */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <ApiOutlined style={{ color: token.colorPrimary }} />
              <span>{t.sourcePage.featuresTitle}</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card type="inner" size="small">
                <Space orientation="horizontal" size={10} align="start">
                  <DatabaseOutlined style={{ color: token.colorPrimary, fontSize: 18, marginTop: 2 }} />
                  <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.sourcePage.feature1}</Paragraph>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card type="inner" size="small">
                <Space orientation="horizontal" size={10} align="start">
                  <CodeOutlined style={{ color: '#722ed1', fontSize: 18, marginTop: 2 }} />
                  <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.sourcePage.feature2}</Paragraph>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card type="inner" size="small">
                <Space orientation="horizontal" size={10} align="start">
                  <ThunderboltOutlined style={{ color: '#fa8c16', fontSize: 18, marginTop: 2 }} />
                  <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.sourcePage.feature3}</Paragraph>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card type="inner" size="small">
                <Space orientation="horizontal" size={10} align="start">
                  <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 18, marginTop: 2 }} />
                  <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.sourcePage.feature4}</Paragraph>
                </Space>
              </Card>
            </Col>
          </Row>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: token.borderRadiusLG,
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
              {t.sourcePage.communityTitle}
            </Text>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
              {t.sourcePage.communityText}
            </Paragraph>
          </div>
        </Card>
      </Space>
    </div>
  );
};

export default SourceView;
