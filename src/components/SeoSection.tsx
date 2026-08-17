import React, { useState } from 'react';
import { Globe, Shield, Terminal, ChevronDown, ChevronUp, Network, Search, Hash } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const SeoSection: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const keywordsEn = [
    'Country IP List', 'GeoIP Database', 'MikroTik Address-List', 'Cisco ACL Country IP',
    'Apache .htaccess Geo-Blocking', 'Linux iptables Country Filter', 'RIPE WHOIS Lookup',
    'BGP Routing Inspector', 'Origin ASN Explorer', 'CIDR Subnet Calculator',
    'IPv4 Country Delegations', 'IPv6 Country Delegations', 'Autonomous System Number',
    'Network Abuse Contact Finder', 'RIR Resource Lists', 'Iran IP List', 'Netherlands IP List',
    'Germany IP List', 'USA IP List', 'DDoS Geographic Protection'
  ];

  const keywordsFa = [
    'لیست IP کشورها', 'آی پی هاب', 'آی پی یاب', 'هویز RIPE', 'رنج آی پی میکروتیک',
    'فایروال سیسکو ACL', 'مسدود سازی بر اساس کشور', 'فایروال لینوکس iptables',
    'بستن IP کشور در htaccess', 'استعلام شماره ASN', 'مسیریابی BGP', 'لیست کامل IP ایران',
    'رنج آی پی هلند', 'رنج آی پی آلمان', 'محاسبه گر ساب نت CIDR', 'پیشوندهای IPv4 و IPv6',
    'گزارش تخلف شبکه Abuse', 'رجیستری های قاره ای RIR', 'جلوگیری از اتک DDoS'
  ];

  const activeKeywords = isRtl ? keywordsFa : keywordsEn;

  return (
    <section className="border-t border-slate-800/80 bg-slate-950/80 mt-12 py-10 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                {t.seo.heading}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authoritative GeoIP, RIPEstat &amp; Firewall Configuration Resource
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
          >
            <span>{isExpanded ? (isRtl ? 'بستن توضیحات' : 'Show Less') : (isRtl ? 'مشاهده توضیحات' : 'Read Guide & Details')}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Content Body */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-850 ${isExpanded ? 'block' : 'hidden md:grid'}`}>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>{t.seo.section1Title}</span>
            </h3>
            <p className="text-slate-400 leading-relaxed text-[11px] text-justify">
              {t.seo.section1Text}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{t.seo.section2Title}</span>
            </h3>
            <p className="text-slate-400 leading-relaxed text-[11px] text-justify">
              {t.seo.section2Text}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>{t.seo.section3Title}</span>
            </h3>
            <p className="text-slate-400 leading-relaxed text-[11px] text-justify">
              {t.seo.section3Text}
            </p>
          </div>

        </div>

        {/* SEO Tag Cloud */}
        <div className="pt-4 border-t border-slate-900">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">
            {t.seo.keywordsTitle}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {activeKeywords.map((kw, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] text-slate-400 font-medium hover:text-cyan-300 hover:border-cyan-500/30 transition-colors"
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
