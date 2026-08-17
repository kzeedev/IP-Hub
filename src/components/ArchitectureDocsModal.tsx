import React, { useState } from 'react';
import { Layers, Database, ShieldCheck, Code2, Server, Terminal, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';

export const ArchitectureDocsModal: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (idx: number, text: string) => {
    copyToClipboard(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const API_EXAMPLES = [
    {
      title: 'IP / Prefix WHOIS Lookup',
      method: 'GET',
      endpoint: '/api/whois/lookup/193.0.6.139',
      curl: 'curl -s https://<host>/api/whois/lookup/193.0.6.139 | jq .',
    },
    {
      title: 'Autonomous System (ASN) Lookup',
      method: 'GET',
      endpoint: '/api/whois/lookup/AS3333',
      curl: 'curl -s https://<host>/api/whois/lookup/AS3333 | jq .',
    },
    {
      title: 'Client IP Auto-Discovery',
      method: 'GET',
      endpoint: '/api/whois/myip',
      curl: 'curl -s https://<host>/api/whois/myip | jq .',
    },
    {
      title: 'Batch IP & CIDR Inspection',
      method: 'POST',
      endpoint: '/api/whois/batch',
      curl: `curl -X POST https://<host>/api/whois/batch \\
  -H "Content-Type: application/json" \\
  -d '{"items":["193.0.6.139","1.1.1.1","AS3333"]}' | jq .`,
    },
    {
      title: 'Country IP Allocations (IPv4 / IPv6 / ASNs)',
      method: 'GET',
      endpoint: '/api/whois/country/NL',
      curl: 'curl -s https://<host>/api/whois/country/NL | jq .',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-4">
      
      {/* Architecture Header */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Clean Architecture &amp; RIPE API Specifications</h2>
            <p className="text-xs text-slate-400">
              Domain-Driven Design (DDD) with decoupled Repositories, Use Cases, and Resilient Go Backend
            </p>
          </div>
        </div>
      </div>

      {/* Clean Architecture Diagram & Layers */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          Layered Architecture Model
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Layer 1: Domain Entities */}
          <div className="p-4 bg-slate-900 rounded-xl border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">1. Domain Core</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-2">Entities &amp; Value Objects</p>
            <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
              <li>• WhoisRecord</li>
              <li>• RipeObject &amp; Attr</li>
              <li>• RoutingStatus</li>
              <li>• SubnetBreakdown</li>
            </ul>
          </div>

          {/* Layer 2: Use Cases */}
          <div className="p-4 bg-slate-900 rounded-xl border border-blue-500/30">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Server className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">2. Use Cases</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-2">Application Orchestration</p>
            <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
              <li>• LookupIp</li>
              <li>• LookupAsn</li>
              <li>• LookupCountryIps</li>
              <li>• BatchLookup</li>
            </ul>
          </div>

          {/* Layer 3: Gateways & Repositories */}
          <div className="p-4 bg-slate-900 rounded-xl border border-indigo-500/30">
            <div className="flex items-center gap-2 mb-2 text-indigo-400">
              <Database className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">3. Repositories</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-2">RIPE API Gateway &amp; RDAP</p>
            <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
              <li>• RIPE REST DB API</li>
              <li>• RIPEstat Datasets</li>
              <li>• RDAP Registry Fallback</li>
              <li>• Redis In-Memory Cache</li>
            </ul>
          </div>

          {/* Layer 4: Handlers & Delivery */}
          <div className="p-4 bg-slate-900 rounded-xl border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">4. Handlers &amp; UI</span>
            </div>
            <p className="text-xs text-slate-300 font-medium mb-2">HTTP Handlers &amp; React</p>
            <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
              <li>• Go Fiber Router</li>
              <li>• JSON Response Normalizer</li>
              <li>• React 19 Frontend</li>
              <li>• Tailwind CSS &amp; Motion</li>
            </ul>
          </div>

        </div>
      </div>

      {/* API Reference & cURL Samples */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Internal Backend Endpoint Reference
        </h3>

        <div className="space-y-4">
          {API_EXAMPLES.map((ex, idx) => (
            <div key={idx} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    ex.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {ex.method}
                  </span>
                  <span className="font-mono text-xs text-slate-200 font-semibold">{ex.endpoint}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{ex.title}</span>
              </div>

              <div className="relative mt-2">
                <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                  {ex.curl}
                </pre>
                <button
                  onClick={() => handleCopy(idx, ex.curl)}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                  title="Copy cURL snippet"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
