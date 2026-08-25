import React, { useState } from 'react';
import { GeoLocation } from '../types';
import { Globe, Compass, ExternalLink, Check, Copy, Map, Radio, MapPin, Navigation } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';
import { getCountryName, getCountryCoordinates } from '../utils/countries';
import { FlagIcon } from './FlagIcon';
import { useLanguage } from '../i18n/LanguageContext';

interface GeolocTabProps {
  geoloc?: GeoLocation;
  ip: string;
  reverseDns?: string;
}

export const GeolocTab: React.FC<GeolocTabProps> = ({ geoloc, ip, reverseDns }) => {
  const { language, t } = useLanguage();
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [mapMode, setMapMode] = useState<'interactive' | 'radar'>('interactive');
  const [mapLoaded, setMapLoaded] = useState(false);

  const countryCode = geoloc?.countryCode && geoloc.countryCode !== 'XX' ? geoloc.countryCode : '';
  const localizedCountry = getCountryName(countryCode, language, geoloc?.country);

  // Coordinate resolution: Explicit GPS from RIPEstat/MaxMind -> Country centroid fallback -> Default (Amsterdam)
  const hasExplicitCoords = typeof geoloc?.latitude === 'number' && typeof geoloc?.longitude === 'number';
  const countryCentroid = getCountryCoordinates(countryCode);
  
  const lat = hasExplicitCoords 
    ? geoloc!.latitude! 
    : (countryCentroid?.lat ?? 52.3676);
  const lon = hasExplicitCoords 
    ? geoloc!.longitude! 
    : (countryCentroid?.lon ?? 4.9041);

  const hasAnyCoords = hasExplicitCoords || countryCentroid !== null;

  const handleCopyCoords = () => {
    copyToClipboard(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Equirectangular projection coordinates for SVG radar view
  const mapX = Math.min(Math.max(((lon + 180) / 360) * 100, 2), 98);
  const mapY = Math.min(Math.max(((90 - lat) / 180) * 100, 5), 95);

  // OpenStreetMap embed URL with bounding box around coordinates
  const delta = hasExplicitCoords ? 0.04 : 4.0;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className="space-y-6">
      
      {/* Geolocation Details & Map Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Geographic Registry Data Panel */}
        <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              {t.geolocTab.title}
            </h3>

            <div className="space-y-3.5 text-xs">
              
              {/* Country */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">{t.geolocTab.country}</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  {countryCode && <FlagIcon code={countryCode} className="w-4 h-3 text-base rounded-[2px]" />}
                  <span>{localizedCountry || geoloc?.country || t.geolocTab.none} {countryCode ? `(${countryCode})` : ''}</span>
                </span>
              </div>

              {/* City / Municipality */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">{t.geolocTab.city}</span>
                <span className="font-semibold text-white">
                  {geoloc?.city ? geoloc.city : (countryCode ? t.geolocTab.regionalAlloc : t.geolocTab.none)}
                </span>
              </div>

              {/* State / Province (if present) */}
              {geoloc?.region && (
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">{t.geolocTab.region}</span>
                  <span className="font-medium text-slate-200">{geoloc.region}</span>
                </div>
              )}

              {/* Coordinates */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">{t.geolocTab.coordinates}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-300 font-semibold">
                    {hasExplicitCoords 
                      ? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` 
                      : (countryCentroid ? `${lat.toFixed(2)}°, ${lon.toFixed(2)}° (${t.geolocTab.estimated})` : t.geolocTab.estimated)}
                  </span>
                  {hasAnyCoords && (
                    <button
                      onClick={handleCopyCoords}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                      title={t.geolocTab.copyCoords}
                      type="button"
                    >
                      {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Timezone */}
              {geoloc?.timezone && (
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">{t.geolocTab.timezone}</span>
                  <span className="font-mono text-slate-200">{geoloc.timezone}</span>
                </div>
              )}

              {/* Routed Prefix */}
              {geoloc?.prefix && (
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">{t.geolocTab.prefix}</span>
                  <span className="font-mono text-cyan-300">{geoloc.prefix}</span>
                </div>
              )}

              {/* Reverse DNS */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">{t.geolocTab.reverseDns}</span>
                <span className="font-mono text-slate-300 truncate max-w-[180px]" title={reverseDns || t.geolocTab.none}>
                  {reverseDns || t.geolocTab.none}
                </span>
              </div>

            </div>
          </div>

          {/* External Map Action Links */}
          <div className="space-y-2 pt-2">
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>{t.geolocTab.openStreetMap}</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            </a>

            <a
              href={`https://www.google.com/maps?q=${lat},${lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition-colors"
            >
              <span>{t.geolocTab.googleMaps}</span>
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Right: Interactive Geolocation Map View */}
        <div className="lg:col-span-2 bg-slate-850 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                {t.geolocTab.mapVisualizer}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Map Mode Switcher */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setMapMode('interactive')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    mapMode === 'interactive'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>{t.geolocTab.interactiveMap}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapMode('radar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                    mapMode === 'radar'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{t.geolocTab.radarView}</span>
                </button>
              </div>

              {/* Location Badge */}
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>{geoloc?.city || localizedCountry || geoloc?.country || 'Global'}</span>
              </span>
            </div>
          </div>

          {/* Map Display Container */}
          <div className="relative w-full aspect-[2/1] min-h-[300px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
            
            {mapMode === 'interactive' ? (
              /* Interactive OpenStreetMap Embed */
              <div className="relative w-full h-full">
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                    <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                  </div>
                )}
                <iframe
                  key={`${lat}-${lon}`}
                  src={osmEmbedUrl}
                  title="OpenStreetMap Location"
                  className="w-full h-full border-0 filter brightness-[0.88] contrast-[1.1] grayscale-[25%]"
                  onLoad={() => setMapLoaded(true)}
                  loading="lazy"
                />

                {/* Floating GPS HUD Overlay */}
                <div className="absolute bottom-2.5 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-200 shadow-xl flex items-center gap-2 z-20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{ip}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-300 font-semibold">{lat.toFixed(4)}°, {lon.toFixed(4)}°</span>
                </div>
              </div>
            ) : (
              /* Radar & Vector World Map Visualizer */
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                
                {/* World Map Graticule Grid */}
                <svg
                  className="w-full h-full opacity-40 text-slate-700"
                  viewBox="0 0 1000 500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                >
                  {/* Latitude parallels */}
                  <line x1="0" y1="125" x2="1000" y2="125" strokeDasharray="4 4" />
                  <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="1" stroke="rgba(148, 163, 184, 0.4)" />
                  <line x1="0" y1="375" x2="1000" y2="375" strokeDasharray="4 4" />

                  {/* Longitude meridians */}
                  <line x1="250" y1="0" x2="250" y2="500" strokeDasharray="4 4" />
                  <line x1="500" y1="0" x2="500" y2="500" strokeWidth="1" stroke="rgba(148, 163, 184, 0.4)" />
                  <line x1="750" y1="0" x2="750" y2="500" strokeDasharray="4 4" />

                  {/* Continents outline paths */}
                  <path
                    d="M150,110 Q210,80 290,110 Q340,150 260,230 Q190,210 140,140 Z M210,250 Q270,250 280,360 Q240,410 190,330 Z M460,90 Q540,80 570,130 Q510,170 450,130 Z M440,170 Q560,170 540,330 Q470,360 420,240 Z M590,90 Q810,80 870,170 Q790,250 640,190 Z M740,310 Q850,300 860,390 Q780,420 720,360 Z"
                    fill="currentColor"
                    opacity="0.3"
                    stroke="none"
                  />
                </svg>

                {/* Radar Grid Rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-48 h-48 border border-emerald-500/40 rounded-full" />
                  <div className="w-80 h-80 border border-emerald-500/20 rounded-full absolute" />
                </div>

                {/* Target Coordinate Radar Ping Marker */}
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 transition-all duration-700 ease-out"
                  style={{ left: `${mapX}%`, top: `${mapY}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute -inset-4 bg-emerald-500 rounded-full animate-ping opacity-75" />
                    <div className="absolute -inset-2 bg-emerald-400/40 rounded-full animate-pulse" />
                    <div className="w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/60">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Bottom-left overlay info */}
                <div className="absolute bottom-2.5 left-3 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-md border border-slate-800 text-[10px] font-mono text-slate-300 z-10 flex items-center gap-2">
                  <span className="text-emerald-400 font-semibold">{ip}</span>
                  <span className="text-slate-600">|</span>
                  <span>Lat: <strong className="text-white">{lat.toFixed(2)}°</strong></span>
                  <span>Lon: <strong className="text-white">{lon.toFixed(2)}°</strong></span>
                </div>
              </div>
            )}

          </div>

          {/* Footer Metadata */}
          <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
            <span className="text-slate-300 font-medium">{t.geolocTab.ripestatService}</span>
            <span className="text-[11px] text-slate-500">{t.geolocTab.ripestatDesc}</span>
          </div>

        </div>

      </div>

    </div>
  );
};

