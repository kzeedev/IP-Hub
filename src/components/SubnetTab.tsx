import React, { useState } from 'react';
import { SubnetBreakdown } from '../types';
import { Calculator, Copy, Check, Binary } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';

interface SubnetTabProps {
  subnet?: SubnetBreakdown;
  cidr: string;
}

export const SubnetTab: React.FC<SubnetTabProps> = ({ subnet, cidr }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, val: string) => {
    copyToClipboard(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!subnet) {
    return (
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
        <Calculator className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="text-sm font-semibold">Subnet details not available for this resource format</p>
        <p className="text-xs text-slate-500 mt-1">CIDR: {cidr}</p>
      </div>
    );
  }

  const isV4 = subnet.ipVersion === 4;

  return (
    <div className="space-y-6">
      
      {/* Subnet Specs Grid */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">CIDR Subnet Math &amp; Netmask Architecture</h3>
              <p className="text-xs text-slate-400 font-mono">
                Block {subnet.cidr} (/{subnet.prefixLength})
              </p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-mono font-bold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            IPv{subnet.ipVersion}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs font-mono">
          
          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-slate-400 font-sans font-medium">Network Address</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-cyan-300">{subnet.networkAddress}</span>
              <button onClick={() => handleCopy('netAddr', subnet.networkAddress)} className="text-slate-500 hover:text-slate-200">
                {copiedKey === 'netAddr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {subnet.broadcastAddress && (
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
              <span className="text-slate-400 font-sans font-medium">Broadcast Address</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-300">{subnet.broadcastAddress}</span>
                <button onClick={() => handleCopy('bcast', subnet.broadcastAddress)} className="text-slate-500 hover:text-slate-200">
                  {copiedKey === 'bcast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {subnet.netmask && (
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
              <span className="text-slate-400 font-sans font-medium">Subnet Netmask</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">{subnet.netmask}</span>
                <button onClick={() => handleCopy('mask', subnet.netmask)} className="text-slate-500 hover:text-slate-200">
                  {copiedKey === 'mask' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {subnet.wildcardMask && (
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
              <span className="text-slate-400 font-sans font-medium">Wildcard (Cisco ACL) Mask</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-300">{subnet.wildcardMask}</span>
                <button onClick={() => handleCopy('wildcard', subnet.wildcardMask)} className="text-slate-500 hover:text-slate-200">
                  {copiedKey === 'wildcard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {subnet.firstUsableIp && subnet.lastUsableIp && (
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800 md:col-span-2">
              <span className="text-slate-400 font-sans font-medium">Usable Host Range</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-300">
                  {subnet.firstUsableIp} &mdash; {subnet.lastUsableIp}
                </span>
                <button onClick={() => handleCopy('range', `${subnet.firstUsableIp} - ${subnet.lastUsableIp}`)} className="text-slate-500 hover:text-slate-200">
                  {copiedKey === 'range' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-slate-400 font-sans font-medium">Total Addresses</span>
            <span className="text-sm font-bold text-white">{subnet.totalHosts} IPs</span>
          </div>

          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
            <span className="text-slate-400 font-sans font-medium">Usable Host Capacity</span>
            <span className="text-sm font-bold text-emerald-400">{subnet.usableHosts} hosts</span>
          </div>

        </div>

        {/* Binary Visualization for IPv4 */}
        {isV4 && subnet.binaryIp && (
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-cyan-400" />
              Binary IP Representation
            </span>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-cyan-400 tracking-wider">
              {subnet.binaryIp}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
