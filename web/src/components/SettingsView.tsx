import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Switch, Tag, Badge, theme, BorderBeam } from 'antd';
import {
  SettingOutlined,
  CloudServerOutlined,
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { SystemVersionResponse, SystemStatusResponse, BackendRipeStatus, ActiveView } from '../types';

const { Title, Text, Paragraph } = Typography;

export interface SettingsViewProps {
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onNavigate?: (view: ActiveView) => void;
  onClose?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDarkTheme,
  onToggleTheme,
  onNavigate,
  onClose,
}) => {
  const { t, isRtl } = useLanguage();
  const { token } = theme.useToken();
  const [version, setVersion] = useState<string>('dev');
  const [status, setStatus] = useState<BackendRipeStatus>('checking');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const fetchVersion = useCallback(() => {
    fetch('/api/system/version')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch backend version');
      })
      .then((data: SystemVersionResponse) => {
        if (data?.version) {
          const formatted = data.version.startsWith('v') ? data.version : `v${data.version}`;
          setVersion(formatted);
        }
      })
      .catch(() => {
        // Fallback to initial build-time/git version
      });
  }, []);

  const checkStatus = useCallback(() => {
    setIsChecking(true);
    setStatus('checking');
    fetch('/api/system/status')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Status request failed');
      })
      .then((data: SystemStatusResponse) => {
        if (data.status === 'reachable' || data.status === 'unreachable' || data.status === 'fail') {
          setStatus(data.status);
        } else {
          setStatus('fail');
        }
      })
      .catch(() => {
        setStatus('unreachable');
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, []);

  useEffect(() => {
    fetchVersion();
    checkStatus();
  }, [fetchVersion, checkStatus]);

  const getStatusConfig = () => {
    switch (status) {
      case 'reachable':
        return {
          badgeStatus: 'success' as const,
          color: '#52c41a',
          label: t.settingsPage.reachable,
        };
      case 'unreachable':
        return {
          badgeStatus: 'error' as const,
          color: '#ff4d4f',
          label: t.settingsPage.unreachable,
        };
      case 'fail':
        return {
          badgeStatus: 'warning' as const,
          color: '#faad14',
          label: t.settingsPage.fail,
        };
      case 'checking':
      default:
        return {
          badgeStatus: 'processing' as const,
          color: token.colorPrimary,
          label: t.settingsPage.checking,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('lookup');
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 16px', width: '100%' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header Hero Card with BorderBeam */}
        <BorderBeam
          size={140}
          duration={6}
          color={[
            { color: '#1677ff', percent: 0 },
            { color: '#36cfc9', percent: 50 },
            { color: '#95de64', percent: 100 },
          ]}
        >
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <Space orientation="horizontal" size={16} align="center">
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: token.borderRadiusLG,
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                >
                  <SettingOutlined />
                </div>
                <div>
                  <Space orientation="horizontal" size={8} align="center">
                    <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                      {t.settingsPage.title}
                    </Title>
                    <Tag color="success" variant="filled" style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {version}
                    </Tag>
                  </Space>
                  <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {t.settingsPage.subtitle}
                  </Paragraph>
                </div>
              </Space>

              {(onNavigate || onClose) && (
                <Button
                  icon={<ArrowLeftOutlined style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />}
                  onClick={handleBack}
                >
                  {t.settingsPage.back}
                </Button>
              )}
            </div>
          </Card>
        </BorderBeam>

        {/* Backend & Connectivity Status Card */}
        <Card
          title={
            <Space orientation="horizontal" size={10} align="center">
              <CloudServerOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
              <Text strong>{t.settingsPage.status}</Text>
            </Space>
          }
          extra={
            <Button
              size="small"
              icon={<ReloadOutlined spin={isChecking} />}
              loading={isChecking}
              onClick={checkStatus}
            >
              {t.settingsPage.recheck}
            </Button>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Text strong style={{ display: 'block', fontSize: 14 }}>
                {t.settingsPage.serviceTitle}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t.settingsPage.statusDesc}
              </Text>
            </div>
            <Badge
              status={statusConfig.badgeStatus}
              text={
                <Text strong style={{ color: statusConfig.color, fontFamily: 'monospace', fontSize: 14 }}>
                  {statusConfig.label}
                </Text>
              }
            />
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text type="secondary">{t.settingsPage.version}:</Text>
            <Text strong style={{ fontFamily: 'monospace' }}>{version}</Text>
          </div>
        </Card>

        {/* Language Selection Card */}
        <Card
          title={
            <Space orientation="horizontal" size={10} align="center">
              <GlobalOutlined style={{ color: '#722ed1', fontSize: 18 }} />
              <Text strong>{t.settingsPage.language}</Text>
            </Space>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t.settingsPage.languageDesc}
              </Text>
            </div>
            <LanguageSelector />
          </div>
        </Card>

        {/* Theme Preference Card */}
        <Card
          title={
            <Space orientation="horizontal" size={10} align="center">
              {isDarkTheme ? <MoonOutlined style={{ color: '#fa8c16', fontSize: 18 }} /> : <SunOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />}
              <Text strong>{t.settingsPage.theme}</Text>
            </Space>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t.settingsPage.themeDesc}
              </Text>
            </div>
            <Switch
              checked={isDarkTheme}
              onChange={onToggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </div>
        </Card>
      </Space>
    </div>
  );
};

// Also export as SettingsModal to preserve full backwards compatibility
export const SettingsModal = SettingsView;
export type SettingsModalProps = SettingsViewProps;
export default SettingsView;
