import React from 'react';
import { Card, Button, Tag, Typography, Space, theme } from 'antd';
import {
  BugOutlined,
  PullRequestOutlined,
  CheckCircleOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Paragraph, Text } = Typography;

export const IssuesView: React.FC = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: token.borderRadiusLG,
                background: token.colorError,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              <BugOutlined />
            </div>
            <div>
              <Space orientation="horizontal" size={8} align="center">
                <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                  {t.issuesPage.title}
                </Title>
                <Tag color="error" variant="filled" style={{ fontWeight: 600 }}>
                  {t.issuesPage.badge}
                </Tag>
              </Space>
              <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {t.issuesPage.intro}
              </Paragraph>
            </div>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <Space orientation="horizontal" size={10} wrap>
              <Button
                type="primary"
                danger
                icon={<BugOutlined />}
                href="https://github.com/kzeedev/IP-Hub/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.issuesPage.submitIssue}
              </Button>
              <Button
                icon={<PullRequestOutlined />}
                href="https://github.com/kzeedev/IP-Hub/pulls"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.issuesPage.createPr}
              </Button>
            </Space>
          </div>
        </Card>

        {/* Guidelines Card */}
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <CommentOutlined style={{ color: token.colorPrimary }} />
              <span>{t.issuesPage.guidelinesTitle}</span>
            </Space>
          }
        >
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div
              style={{
                padding: 14,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 3 }} />
              <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.issuesPage.guide1}</Paragraph>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 3 }} />
              <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.issuesPage.guide2}</Paragraph>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: token.borderRadiusLG,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <CheckCircleOutlined style={{ color: '#722ed1', marginTop: 3 }} />
              <Paragraph style={{ margin: 0, fontSize: 13 }}>{t.issuesPage.guide3}</Paragraph>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};
