import React, { useState } from 'react';
import { Card, Row, Col, Descriptions, Segmented, Button, Typography, Space, Tag, theme } from 'antd';
import {
  GlobalOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { GeoLocation } from '../types';
import { getCountryName, getCountryCoordinates } from '../utils/countries';
import { FlagIcon } from './FlagIcon';
import { useLanguage } from '../i18n/LanguageContext';

const { Text } = Typography;

interface GeolocTabProps {
  geoloc?: GeoLocation;
  ip: string;
  reverseDns?: string;
}

export const GeolocTab: React.FC<GeolocTabProps> = ({ geoloc, ip, reverseDns }) => {
  const { language, t } = useLanguage();
  const { token } = theme.useToken();
  const [mapMode, setMapMode] = useState<'interactive' | 'radar'>('interactive');
  const [mapLoaded, setMapLoaded] = useState(false);

  const countryCode = geoloc?.countryCode && geoloc.countryCode !== 'XX' ? geoloc.countryCode : '';
  const localizedCountry = getCountryName(countryCode, language, geoloc?.country);

  const hasExplicitCoords = typeof geoloc?.latitude === 'number' && typeof geoloc?.longitude === 'number';
  const countryCentroid = getCountryCoordinates(countryCode);

  const lat = hasExplicitCoords ? geoloc!.latitude! : (countryCentroid?.lat ?? 52.3676);
  const lon = hasExplicitCoords ? geoloc!.longitude! : (countryCentroid?.lon ?? 4.9041);
  const coordsFormatted = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

  const mapX = Math.min(Math.max(((lon + 180) / 360) * 100, 2), 98);
  const mapY = Math.min(Math.max(((90 - lat) / 180) * 100, 5), 95);

  const delta = hasExplicitCoords ? 0.04 : 4.0;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;

  const geoItems = [
    {
      key: 'country',
      label: t.geolocTab.country,
      children: (
        <Space orientation="horizontal" size={6} align="center">
          {countryCode && <FlagIcon code={countryCode} className="w-4 h-3 rounded-[2px]" />}
          <Text strong>{localizedCountry || geoloc?.country || t.geolocTab.none}</Text>
          {countryCode && <Tag style={{ margin: 0 }}>{countryCode}</Tag>}
        </Space>
      ),
    },
    {
      key: 'city',
      label: t.geolocTab.city,
      children: geoloc?.city ? geoloc.city : (countryCode ? t.geolocTab.regionalAlloc : t.geolocTab.none),
    },
    ...(geoloc?.region
      ? [
          {
            key: 'region',
            label: t.geolocTab.region,
            children: geoloc.region,
          },
        ]
      : []),
    {
      key: 'coordinates',
      label: t.geolocTab.coordinates,
      children: (
        <Text copyable={{ text: coordsFormatted }} style={{ fontFamily: 'monospace' }}>
          {hasExplicitCoords
            ? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
            : countryCentroid
            ? `${lat.toFixed(2)}°, ${lon.toFixed(2)}° (${t.geolocTab.estimated})`
            : t.geolocTab.estimated}
        </Text>
      ),
    },
    ...(geoloc?.timezone
      ? [
          {
            key: 'timezone',
            label: t.geolocTab.timezone,
            children: <Text code>{geoloc.timezone}</Text>,
          },
        ]
      : []),
    ...(geoloc?.prefix
      ? [
          {
            key: 'prefix',
            label: t.geolocTab.prefix,
            children: <Text code>{geoloc.prefix}</Text>,
          },
        ]
      : []),
    {
      key: 'reverseDns',
      label: t.geolocTab.reverseDns,
      children: reverseDns ? (
        <Text copyable={{ text: reverseDns }} style={{ fontFamily: 'monospace' }}>
          {reverseDns}
        </Text>
      ) : (
        <Text type="secondary" italic>{t.geolocTab.none}</Text>
      ),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {/* Left: Geographic Registry Data */}
      <Col xs={24} lg={8}>
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <GlobalOutlined style={{ color: '#52c41a' }} />
              <span>{t.geolocTab.title}</span>
            </Space>
          }
          style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
        >
          <Descriptions
            column={1}
            bordered
            size="small"
            items={geoItems}
          />

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button
              block
              icon={<LinkOutlined />}
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.geolocTab.openStreetMap}
            </Button>
            <Button
              block
              icon={<EnvironmentOutlined />}
              href={`https://www.google.com/maps?q=${lat},${lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.geolocTab.googleMaps}
            </Button>
          </div>
        </Card>
      </Col>

      {/* Right: Map Visualizer */}
      <Col xs={24} lg={16}>
        <Card
          title={
            <Space orientation="horizontal" size={8}>
              <CompassOutlined style={{ color: token.colorPrimary }} />
              <span>{t.geolocTab.mapVisualizer}</span>
            </Space>
          }
          extra={
            <Space orientation="horizontal" size={8}>
              <Segmented<'interactive' | 'radar'>
                size="small"
                value={mapMode}
                onChange={(v) => setMapMode(v)}
                options={[
                  { value: 'interactive', label: t.geolocTab.interactiveMap },
                  { value: 'radar', label: t.geolocTab.radarView },
                ]}
              />
              <Tag color="cyan" style={{ margin: 0 }}>
                {geoloc?.city || localizedCountry || geoloc?.country || 'Global'}
              </Tag>
            </Space>
          }
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '2 / 1',
              minHeight: 300,
              background: token.colorBgLayout,
              borderRadius: token.borderRadiusLG,
              overflow: 'hidden',
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {mapMode === 'interactive' ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <iframe
                  key={`${lat}-${lon}`}
                  src={osmEmbedUrl}
                  title="OpenStreetMap Location"
                  style={{ width: '100%', height: '100%', border: 0 }}
                  onLoad={() => setMapLoaded(true)}
                  loading="lazy"
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    insetInlineStart: 12,
                    background: token.colorBgElevated,
                    padding: '4px 10px',
                    borderRadius: token.borderRadiusSM,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    boxShadow: token.boxShadowSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 10,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }} />
                  <span>{ip}</span>
                  <span style={{ color: token.colorTextSecondary }}>|</span>
                  <span style={{ color: token.colorPrimary, fontWeight: 700 }}>{lat.toFixed(4)}°, {lon.toFixed(4)}°</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: token.colorFillAlter,
                }}
              >
                {/* SVG Vector World Map */}
                <svg
                  style={{ width: '100%', height: '100%', opacity: 0.35, color: token.colorTextSecondary }}
                  viewBox="0 0 1000 500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                >
                  <line x1="0" y1="125" x2="1000" y2="125" strokeDasharray="4 4" />
                  <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="1" stroke="currentColor" />
                  <line x1="0" y1="375" x2="1000" y2="375" strokeDasharray="4 4" />
                  <line x1="250" y1="0" x2="250" y2="500" strokeDasharray="4 4" />
                  <line x1="500" y1="0" x2="500" y2="500" strokeWidth="1" stroke="currentColor" />
                  <line x1="750" y1="0" x2="750" y2="500" strokeDasharray="4 4" />
                  <path
                    d="M150,110 Q210,80 290,110 Q340,150 260,230 Q190,210 140,140 Z M210,250 Q270,250 280,360 Q240,410 190,330 Z M460,90 Q540,80 570,130 Q510,170 450,130 Z M440,170 Q560,170 540,330 Q470,360 420,240 Z M590,90 Q810,80 870,170 Q790,250 640,190 Z M740,310 Q850,300 860,390 Q780,420 720,360 Z"
                    fill="currentColor"
                    opacity="0.3"
                  />
                </svg>

                {/* Radar Ring */}
                <div
                  style={{
                    position: 'absolute',
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    border: `1px solid ${token.colorPrimary}`,
                    opacity: 0.3,
                  }}
                />

                {/* Radar Target Marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${mapX}%`,
                    top: `${mapY}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: token.colorPrimary,
                      border: '2px solid #fff',
                      boxShadow: `0 0 10px ${token.colorPrimary}`,
                    }}
                  />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    insetInlineStart: 12,
                    background: token.colorBgElevated,
                    padding: '4px 10px',
                    borderRadius: token.borderRadiusSM,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    boxShadow: token.boxShadowSecondary,
                  }}
                >
                  <Text strong>{ip}</Text> | {lat.toFixed(2)}°, {lon.toFixed(2)}°
                </div>
              </div>
            )}
          </div>
        </Card>
      </Col>
    </Row>
  );
};
