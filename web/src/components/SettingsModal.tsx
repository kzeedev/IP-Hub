import React from 'react';
import { Card, Button, Typography, Space, Switch, Tag, Badge, theme } from 'antd';
import {
  SettingOutlined,
  CloudServerOutlined,
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

const { Title, Text, Paragraph } = Typography;

interface SettingsModalProps {
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isDarkTheme, onToggleTheme, onClose }) => {
  const { t } = useLanguage();
  const { token } = theme.useToken();

  return (
    <div style={{ maxWidth: 580, margin: '32px auto', padding: '0 16px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space orientation="horizontal" size={10} align="center">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: token.borderRadiusLG,
                  background: token.colorPrimaryBg,
                  color: token.colorPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                <SettingOutlined />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                  {t.settingsModal.title}
                </Title>
              </div>
            </Space>
            <Tag color="success" variant="filled" style={{ fontWeight: 700, fontFamily: 'monospace' }}>
              v2.0.0
            </Tag>
          </div>
        }
        actions={[
          <div key="actions" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px' }}>
            <Button type="primary" onClick={onClose}>
              {t.settingsModal.close}
            </Button>
          </div>,
        ]}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {/* Status */}
          <Card type="inner" size="small">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space orientation="horizontal" size={10}>
                <CloudServerOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{t.settingsModal.status}</Text>
                  <Text strong>{t.settingsModal.connected}</Text>
                </div>
              </Space>
              <Badge status="processing" text={<Text strong style={{ color: '#52c41a', fontFamily: 'monospace' }}>200 OK</Text>} />
            </div>
          </Card>

          {/* Language Switch */}
          <Card type="inner" size="small">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space orientation="horizontal" size={10}>
                <GlobalOutlined style={{ color: '#722ed1', fontSize: 18 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{t.settingsModal.language}</Text>
                  <Text strong>English / پارسی</Text>
                </div>
              </Space>
              <LanguageSelector />
            </div>
          </Card>

          {/* Theme Preference */}
          <Card type="inner" size="small">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space orientation="horizontal" size={10}>
                {isDarkTheme ? <MoonOutlined style={{ color: '#fa8c16', fontSize: 18 }} /> : <SunOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />}
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{t.settingsModal.theme}</Text>
                  <Text strong>{isDarkTheme ? t.nav.themeDark : t.nav.themeLight}</Text>
                </div>
              </Space>
              <Switch
                checked={isDarkTheme}
                onChange={onToggleTheme}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
              />
            </div>
          </Card>
        </Space>
      </Card>
    </div>
  );
};
