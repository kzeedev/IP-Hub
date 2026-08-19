import React, { useState } from 'react';
import { AbuseContact, WhoisRecord } from '../types';
import { ShieldAlert, Mail, MapPin, Copy, Check, FileText } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

interface AbuseTabProps {
  abuse: AbuseContact;
  record: WhoisRecord;
}

export const AbuseTab: React.FC<AbuseTabProps> = ({ abuse, record }) => {
  const { t } = useLanguage();
  const [incidentType, setIncidentType] = useState('Port Scanning / Reconnaissance');
  const [customLogs, setCustomLogs] = useState('[Log excerpt showing IP timestamp, port, and headers]');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const abuseEmail = abuse?.email || 'abuse@' + (record.netname || 'network').toLowerCase().replace(/[^a-z0-9]/g, '') + '.net';

  const abuseTemplate = `To: ${abuseEmail}
Subject: [Abuse Report] Incident from IP ${record.query} (${record.netname})
Date: ${new Date().toUTCString()}

Dear Network Abuse Team (${record.orgName || record.netname}),

We are writing to report suspicious or abusive network activity originating from an IP address within your allocated network block:

Target IP: ${record.query}
Network Name: ${record.netname}
CIDR Block: ${record.cidr}
Origin AS: ${record.routing?.originAsn || 'Unknown'}
Incident Category: ${incidentType}
Timestamp (UTC): ${new Date().toISOString()}

Relevant Log Evidence:
${customLogs}

Please investigate this activity and take appropriate corrective action in accordance with standard network abuse management guidelines.

Thank you,
Network Security Operations`;

  const handleCopyEmail = () => {
    copyToClipboard(abuseEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyTemplate = () => {
    copyToClipboard(abuseTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Abuse Contact Card */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t.abuseTab.title}</h3>
            <p className="text-xs text-slate-400">
              {t.abuseTab.subtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-xs text-slate-400 block">{t.abuseTab.email}</span>
                <a
                  href={`mailto:${abuseEmail}`}
                  className="font-mono text-sm font-bold text-white hover:text-cyan-300 transition-colors"
                >
                  {abuseEmail}
                </a>
              </div>
            </div>
            <button
              onClick={handleCopyEmail}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={t.abuseTab.copyEmail}
            >
              {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs text-slate-400 block">{t.abuseTab.org}</span>
                <span className="text-sm font-semibold text-white">
                  {record.orgName || record.netname}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Incident Abuse Report Generator */}
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              {t.abuseTab.generatorTitle}
            </h3>
          </div>
          <button
            onClick={handleCopyTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            {copiedTemplate ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTemplate ? t.common.copied : t.abuseTab.copyTemplate}</span>
          </button>
        </div>

        {/* Configuration row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t.abuseTab.incidentCategory}
            </label>
            <select
              value={incidentType}
              onChange={e => setIncidentType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            >
              <option>{t.abuseTab.portScan}</option>
              <option>{t.abuseTab.ddos}</option>
              <option>{t.abuseTab.bruteForce}</option>
              <option>{t.abuseTab.spam}</option>
              <option>{t.abuseTab.malware}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {t.abuseTab.customLogs}
            </label>
            <input
              type="text"
              value={customLogs}
              onChange={e => setCustomLogs(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              placeholder="e.g. 2026-08-14 12:30:15 UTC SRC=..."
            />
          </div>
        </div>

        {/* Preview Output */}
        <div className="relative">
          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
            {abuseTemplate}
          </pre>
        </div>

      </div>

    </div>
  );
};
