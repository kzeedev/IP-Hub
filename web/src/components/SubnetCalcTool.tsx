import React, { useState, useEffect } from 'react';
import { Calculator, Copy, Check, Hash, Binary } from 'lucide-react';
import { SubnetBreakdown } from '../types';
import { copyToClipboard } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

export const SubnetCalcTool: React.FC = () => {
  const { t } = useLanguage();
  const [ipInput, setIpInput] = useState('193.0.0.0');
  const [prefixLength, setPrefixLength] = useState<number>(21);
  const [data, setData] = useState<SubnetBreakdown | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchSubnet(ipInput, prefixLength);
  }, [ipInput, prefixLength]);

  const fetchSubnet = async (ip: string, cidr: number) => {
    try {
      const res = await fetch(`/api/whois/subnet?ip=${encodeURIComponent(ip)}&cidr=${cidr}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // ignore
    }
  };

  const handleCopy = (key: string, val?: string) => {
    if (!val) return;
    copyToClipboard(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4">
      
      {/* Header */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{t.subnetCalc.title}</h1>
            <p className="text-xs text-slate-400">
              {t.subnetCalc.description}
            </p>
          </div>
        </div>
      </div>

      {/* Calculator Controls */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {t.subnetCalc.ipLabel}
            </label>
            <input
              type="text"
              value={ipInput}
              onChange={e => setIpInput(e.target.value)}
              placeholder="e.g. 192.168.1.0 or 10.0.0.0"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t.subnetCalc.cidrLabel} (/{prefixLength})
              </label>
              <span className="font-mono text-xs text-indigo-400 font-bold">
                {data?.netmask ? `${t.subnetCalc.maskShort}: ${data.netmask}` : `/${prefixLength}`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={32}
              value={prefixLength}
              onChange={e => setPrefixLength(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>/1</span>
              <span>/8</span>
              <span>/16</span>
              <span>/24</span>
              <span>/32</span>
            </div>
          </div>

        </div>
      </div>

      {/* Subnet Results Output */}
      {data && (
        <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-cyan-400" />
            <span>{t.subnetCalc.title} ({data.cidr})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs font-mono">
            
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
              <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.networkAddr}</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan-300">{data.networkAddress}</span>
                <button onClick={() => handleCopy('netAddr', data.networkAddress)} className="text-slate-500 hover:text-slate-200">
                  {copiedKey === 'netAddr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {data.broadcastAddress && (
              <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
                <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.broadcastAddr}</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-300">{data.broadcastAddress}</span>
                  <button onClick={() => handleCopy('bcast', data.broadcastAddress)} className="text-slate-500 hover:text-slate-200">
                    {copiedKey === 'bcast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {data.netmask && (
              <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
                <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.netmask}</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">{data.netmask}</span>
                  <button onClick={() => handleCopy('mask', data.netmask)} className="text-slate-500 hover:text-slate-200">
                    {copiedKey === 'mask' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {data.wildcardMask && (
              <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
                <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.wildcard}</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-300">{data.wildcardMask}</span>
                  <button onClick={() => handleCopy('wildcard', data.wildcardMask)} className="text-slate-500 hover:text-slate-200">
                    {copiedKey === 'wildcard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {data.firstUsableIp && data.lastUsableIp && (
              <div className="flex flex-col gap-1 pb-3 border-b border-slate-800 md:col-span-2">
                <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.usableRange}</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-300">
                    {data.firstUsableIp} &mdash; {data.lastUsableIp}
                  </span>
                  <button onClick={() => handleCopy('range', `${data.firstUsableIp} - ${data.lastUsableIp}`)} className="text-slate-500 hover:text-slate-200">
                    {copiedKey === 'range' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
              <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.totalHosts}</span>
              <span className="text-sm font-bold text-white">{data.totalHosts}</span>
            </div>

            <div className="flex flex-col gap-1 pb-3 border-b border-slate-800">
              <span className="text-slate-400 font-sans font-medium">{t.subnetCalc.usableHosts}</span>
              <span className="text-sm font-bold text-emerald-400">{data.usableHosts}</span>
            </div>

          </div>

          {data.binaryIp && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-cyan-400" />
                {t.subnetCalc.binaryMask}
              </span>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-cyan-400 tracking-wider">
                {data.binaryIp}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
