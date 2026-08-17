import React, { useState } from 'react';
import { GeoLocation } from '../types';
import { Globe, Compass, ExternalLink, Check, Copy } from 'lucide-react';
import { getCountryFlag, copyToClipboard } from '../utils/helpers';

interface GeolocTabProps {
  geoloc: GeoLocation;
  ip: string;
  reverseDns?: string;
}

export const GeolocTab: React.FC<GeolocTabProps> = ({ geoloc, ip, reverseDns }) => {
  const [copiedCoords, setCopiedCoords] = useState(false);

  const hasCoords = typeof geoloc?.latitude === 'number' && typeof geoloc?.longitude === 'number';
  const lat = geoloc?.latitude || 52.3676;
  const lon = geoloc?.longitude || 4.9041;

  const handleCopyCoords = () => {
    if (hasCoords) {
      copyToClipboard(`${lat}, ${lon}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const mapX = Math.min(Math.max(((lon + 180) / 360) * 100, 2), 98);
  const mapY = Math.min(Math.max(((90 - lat) / 180) * 100, 5), 95);

  return (
    <div className="space-y-6">
      
      {/* Geolocation Details & Map Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Location Specs */}
        <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Geographic Registry Data
            </h3>

            <div className="space-y-3.5 text-xs">
              
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">Country</span>
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="text-base">{getCountryFlag(geoloc?.countryCode)}</span>
                  <span>{geoloc?.country} ({geoloc?.countryCode})</span>
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">City / Municipality</span>
                <span className="font-semibold text-white">
                  {geoloc?.city || 'Regional allocation'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">Coordinates</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-300 font-semibold">
                    {hasCoords ? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` : 'Estimated'}
                  </span>
                  {hasCoords && (
                    <button
                      onClick={handleCopyCoords}
                      className="text-slate-500 hover:text-slate-200"
                      title="Copy Coordinates"
                    >
                      {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {geoloc?.timezone && (
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-slate-400">Timezone</span>
                  <span className="font-mono text-slate-200">{geoloc.timezone}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <span className="text-slate-400">Reverse DNS Host</span>
                <span className="font-mono text-slate-300 truncate max-w-[180px]" title={reverseDns || 'None'}>
                  {reverseDns || 'N/A'}
                </span>
              </div>

            </div>
          </div>

          {hasCoords && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>View on OpenStreetMap</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            </a>
          )}
        </div>

        {/* Right: Interactive Geolocation Map View */}
        <div className="lg:col-span-2 bg-slate-850 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              World Location Visualizer
            </h3>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
              {geoloc?.city || geoloc?.country}
            </span>
          </div>

          {/* SVG Map Canvas with Coordinate Pin */}
          <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
            
            {/* World Map Graticule Grid */}
            <svg
              className="w-full h-full opacity-30 text-slate-600"
              viewBox="0 0 1000 500"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            >
              <line x1="0" y1="125" x2="1000" y2="125" strokeDasharray="4 4" />
              <line x1="0" y1="250" x2="1000" y2="250" strokeWidth="1" />
              <line x1="0" y1="375" x2="1000" y2="375" strokeDasharray="4 4" />

              <line x1="250" y1="0" x2="250" y2="500" strokeDasharray="4 4" />
              <line x1="500" y1="0" x2="500" y2="500" strokeWidth="1" />
              <line x1="750" y1="0" x2="750" y2="500" strokeDasharray="4 4" />

              <path
                d="M150,120 Q200,90 280,120 Q320,160 250,220 Q200,200 150,150 Z M220,260 Q260,260 270,350 Q230,400 200,320 Z M480,100 Q540,90 560,140 Q500,160 470,120 Z M460,180 Q560,180 540,320 Q480,350 440,240 Z M600,100 Q800,90 850,180 Q780,240 650,180 Z M760,320 Q840,310 850,380 Q780,410 740,350 Z"
                fill="currentColor"
                opacity="0.2"
                stroke="none"
              />
            </svg>

            {/* Target Coordinate Radar Ping Marker */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              style={{ left: `${mapX}%`, top: `${mapY}%` }}
            >
              <div className="relative">
                <div className="absolute -inset-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
                <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
            </div>

            {/* Bottom-left overlay info */}
            <div className="absolute bottom-2 left-3 bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-800 text-[10px] font-mono text-slate-300">
              IP: {ip} | Lat: {lat.toFixed(2)} Lon: {lon.toFixed(2)}
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400 flex items-center justify-between">
            <span>RIPEstat Geolocation Service</span>
            <span className="text-[11px] text-slate-500">MaxMind &amp; RIPE RIR Registry mapping</span>
          </div>

        </div>

      </div>

    </div>
  );
};
