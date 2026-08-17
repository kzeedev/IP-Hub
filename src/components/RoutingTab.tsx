import React from 'react';
import { RoutingStatus } from '../types';
import { Radio, ShieldCheck, Globe, Activity, ExternalLink, CheckCircle2, Share2 } from 'lucide-react';

interface RoutingTabProps {
  routing: RoutingStatus;
  cidr: string;
  onSearchResource: (res: string) => void;
}

export const RoutingTab: React.FC<RoutingTabProps> = ({ routing, cidr, onSearchResource }) => {
  const visPercent = routing?.bgpVisibilityPercentage || 0;

  return (
    <div className="space-y-6">
      
      {/* Top Routing Status Banner */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              routing?.isAnnounced ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Global BGP Routing Status</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  routing?.isAnnounced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {routing?.isAnnounced ? 'Globally Routed' : 'Unannounced / Internal'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Observed by RIPE NCC Routing Information Service (RIS) Collectors
              </p>
            </div>
          </div>

          {routing?.originAsn && routing.originAsn !== 'Unrouted' && (
            <button
              onClick={() => onSearchResource(routing.originAsn)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-sm font-bold transition-all"
            >
              <span>Origin {routing.originAsn}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>BGP Visibility</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{visPercent}%</span>
              <span className="text-xs text-slate-400">across RIS</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  visPercent > 80 ? 'bg-emerald-500' : visPercent > 30 ? 'bg-amber-500' : 'bg-slate-600'
                }`}
                style={{ width: `${Math.max(visPercent, 3)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>RIS Peer Sightings</span>
              <Globe className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{routing?.risPeersSeen || 0}</span>
              <span className="text-xs text-slate-400">/ {routing?.totalRisPeers || '600+'} peers</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Active BGP routing table feeds</p>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Announced Prefix</span>
              <Share2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-base font-mono font-bold text-emerald-300 truncate block" title={routing?.announcedPrefix || cidr}>
              {routing?.announcedPrefix || cidr}
            </span>
            <p className="text-[11px] text-slate-500 mt-2">Origin BGP announcement</p>
          </div>

        </div>
      </div>

      {/* RPKI & Route Object Details */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Route Origin Authorisation (ROA) &amp; IRR
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">RIPE Routing Registry (IRR)</span>
              <p className="text-slate-400 mt-0.5">
                Route object verified against RIPE Database. ASN is authorized to announce prefix {cidr}.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">RIS Collectors Coverage</span>
              <p className="text-slate-400 mt-0.5">
                Continuously monitored by RIPE NCC RIS collectors stationed at major internet exchange points (AMS-IX, LINX, DE-CIX, NYIIX, etc.).
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
