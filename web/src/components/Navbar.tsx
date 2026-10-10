import React from 'react';
import { Layout, Button, Space, Tooltip, Tag, theme } from 'antd';
import {
  CompassOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  CalculatorOutlined,
  GithubOutlined,
  BugOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  AimOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { ActiveView } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { getRouteUrl } from '../utils/router';

const { Header } = Layout;

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onMyIpClick: () => void;
  isLoadingMyIp: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onMyIpClick,
  isLoadingMyIp,
  isDarkTheme,
  onToggleTheme,
}) => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();

  const handleNavClick = (e: React.MouseEvent, view: ActiveView) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
      e.preventDefault();
      setActiveView(view);
    }
  };

  const navItems: { key: ActiveView; label: string; icon: React.ReactNode; id?: string }[] = [
    { key: 'lookup', label: t.nav.singleLookup, icon: <CompassOutlined />, id: 'nav-btn-lookup' },
    { key: 'country-ips', label: t.nav.countryIps, icon: <GlobalOutlined />, id: 'nav-btn-country-ips' },
    { key: 'batch', label: t.nav.batch, icon: <UnorderedListOutlined />, id: 'nav-btn-batch' },
    { key: 'subnet-calc', label: t.nav.subnetCalc, icon: <CalculatorOutlined />, id: 'nav-btn-subnet' },
    { key: 'source', label: t.nav.source, icon: <GithubOutlined />, id: 'nav-btn-source' },
    { key: 'issues', label: t.nav.issues, icon: <BugOutlined />, id: 'nav-btn-issues' },
  ];

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 16px',
        height: 'auto',
        minHeight: 56,
        lineHeight: 'normal',
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, gap: 12 }}>
        {/* Brand */}
        <a
          href={getRouteUrl('lookup', { lang: language })}
          hrefLang={language}
          onClick={(e) => handleNavClick(e, 'lookup')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: token.borderRadiusLG,
              background: token.colorPrimary,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            <ClusterOutlined />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: token.colorTextHeading }}>
              {t.brand}
            </span>
            <Tag color="processing" variant="filled" style={{ marginInlineStart: 8, fontSize: 11 }}>
              RIPE &amp; GeoIP
            </Tag>
          </div>
        </a>

        {/* Center Desktop Navigation */}
        <div className="hidden xl:flex items-center">
          <Space orientation="horizontal" size={4}>
            {navItems.map((item) => (
              <Button
                key={item.key}
                id={item.id}
                type={activeView === item.key ? 'primary' : 'text'}
                icon={item.icon}
                size="middle"
                href={getRouteUrl(item.key, { lang: language })}
                onClick={(e) => handleNavClick(e, item.key)}
              >
                {item.label}
              </Button>
            ))}
          </Space>
        </div>

        {/* Right Controls */}
        <Space orientation="horizontal" size={8} align="center">
          <LanguageSelector />

          <Tooltip title={isDarkTheme ? t.nav.themeLight : t.nav.themeDark}>
            <Button
              shape="circle"
              icon={isDarkTheme ? <SunOutlined /> : <MoonOutlined />}
              onClick={onToggleTheme}
              aria-label="Toggle Theme"
            />
          </Tooltip>

          <Tooltip title={t.nav.settings}>
            <Button
              shape="circle"
              type={activeView === 'settings' ? 'primary' : 'default'}
              icon={<SettingOutlined />}
              onClick={() => setActiveView('settings')}
              aria-label="Open Settings"
            />
          </Tooltip>

          <Button
            id="btn-lookup-my-ip"
            type="primary"
            icon={<AimOutlined />}
            loading={isLoadingMyIp}
            onClick={onMyIpClick}
          >
            <span className="hidden sm:inline">
              {isLoadingMyIp ? t.nav.detectingIp : t.nav.myIp}
            </span>
          </Button>
        </Space>
      </div>

      {/* Mobile Navigation Row */}
      <div
        className="flex xl:hidden overflow-x-auto py-2 scrollbar-none"
        style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Space orientation="horizontal" size={4}>
          {navItems.map((item) => (
            <Button
              key={item.key}
              type={activeView === item.key ? 'primary' : 'text'}
              icon={item.icon}
              size="small"
              href={getRouteUrl(item.key, { lang: language })}
              onClick={(e) => handleNavClick(e, item.key)}
            >
              {item.label}
            </Button>
          ))}
        </Space>
      </div>
    </Header>
  );
};
