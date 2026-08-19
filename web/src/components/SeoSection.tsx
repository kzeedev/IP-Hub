import React, { useState } from 'react';
import {
  Globe,
  Shield,
  Terminal,
  ChevronDown,
  ChevronUp,
  Network,
  BookOpen,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { copyToClipboard } from '../utils/helpers';
import { POPULAR_COUNTRIES } from '../utils/countries';
import { getRouteUrl } from '../utils/router';

export const SeoSection: React.FC = () => {
  const { language, t, isRtl } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'mikrotik' | 'cisco' | 'iptables' | 'webserver'>('mikrotik');

  const handleCopy = (key: string, text: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

  const CODE_SNIPPETS = {
    mikrotik: {
      title: 'MikroTik RouterOS Address-List',
      desc: isRtl
        ? 'اضافه کردن رنج‌های IP کشور به فهرست آدرس‌ها جهت استفاده در قوانین فایروال و مسدودسازی یا FastTrack.'
        : 'Import country IP ranges into RouterOS address-list for fast packet matching and firewall filters.',
      code: `# 1. Add subnet to address-list\n/ip firewall address-list add list=allowed_countries address=5.160.0.0/19 comment="IP-Hub GeoIP"\n\n# 2. Allow only listed countries in Filter Rules\n/ip firewall filter add chain=input src-address-list=!allowed_countries action=drop comment="Drop foreign traffic"`
    },
    cisco: {
      title: 'Cisco IOS Standard & Extended ACL',
      desc: isRtl
        ? 'پیکربندی Access Control List با استفاده از وایلدکارت ماسک (Wildcard Mask) برای تجهیزات سیسکو.'
        : 'Configure Standard & Extended ACLs using inverse wildcard masks on Cisco routers and firewalls.',
      code: `! Standard ACL definition\nip access-list standard GEO_FILTER\n permit 5.160.0.0 0.0.31.255\n deny any\n\n! Apply to inbound WAN interface\ninterface GigabitEthernet0/0\n ip access-group GEO_FILTER in`
    },
    iptables: {
      title: 'Linux iptables & ipset High-Performance Filter',
      desc: isRtl
        ? 'استفاده از ipset برای پردازش هزاران رنج آی‌پی با سرعت فوق‌العاده بالا O(1) در لینوکس.'
        : 'Use ipset hash:net for O(1) ultra-fast lookup across thousands of CIDR blocks in Linux kernel.',
      code: `# Create fast ipset collection\nipset create geo_allow hash:net\n\n# Add CIDR networks\nipset add geo_allow 5.160.0.0/19\n\n# Enforce firewall rule with iptables\niptables -I INPUT -m set ! --match-set geo_allow src -p tcp --dport 443 -j DROP`
    },
    webserver: {
      title: 'Apache .htaccess & Nginx Geo-Blocking',
      desc: isRtl
        ? 'محدودسازی دسترسی وب‌سرور آپاچی و انجین‌ایکس براساس رنج‌های معتبر کشورها.'
        : 'Restrict HTTP/HTTPS access on Apache and Nginx web servers based on country delegations.',
      code: `# Apache 2.4+ (.htaccess)\n<RequireAll>\n    Require all granted\n    Require not ip 5.160.0.0/19\n</RequireAll>\n\n# Nginx CIDR block directive\n# geo $block_country { default 0; 5.160.0.0/19 1; }\n# if ($block_country) { return 403; }`
    }
  };

  return (
    <section className="border-t border-slate-800/80 bg-slate-950/80 mt-12 py-10 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs transition-all">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-inner">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-200">
                  {t.seo.heading}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold hidden md:inline-block">
                  {t.seo.guideBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t.seo.subheading}
              </p>
            </div>
          </div>

          <button
            id="btn-toggle-guide"
            onClick={() => setIsExpanded(prev => !prev)}
            aria-expanded={isExpanded}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${isExpanded
                ? 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20'
                : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {isExpanded ? t.seo.hideGuide : t.seo.readGuide}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Content Body: Visible when isExpanded is true */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t border-slate-800/80">

            {/* 3 Main Architectural Concept Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 hover:border-cyan-500/40 transition-colors shadow-sm">
                <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span>{t.seo.section1Title}</span>
                </h3>
                <p className="text-slate-300 leading-relaxed text-[11px] text-justify">
                  {t.seo.section1Text}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 hover:border-indigo-500/40 transition-colors shadow-sm">
                <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span>{t.seo.section2Title}</span>
                </h3>
                <p className="text-slate-300 leading-relaxed text-[11px] text-justify">
                  {t.seo.section2Text}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 hover:border-emerald-500/40 transition-colors shadow-sm">
                <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <span>{t.seo.section3Title}</span>
                </h3>
                <p className="text-slate-300 leading-relaxed text-[11px] text-justify">
                  {t.seo.section3Text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Popular Country IP Directory Links with href & hrefLang */}
        <div className="pt-4 border-t border-slate-900/80">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2.5">
            {t.countryExplorer.topRegions}
          </span>
          <div className="flex flex-wrap gap-2">
            {POPULAR_COUNTRIES.map(c => (
              <a
                key={c.code}
                href={getRouteUrl('country-ips', { countryCode: c.code, lang: language })}
                hrefLang={language}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className={`fi fi-${c.code.toLowerCase()} fis rounded-xs`}></span>
                <span>{language === 'fa' ? c.faName : c.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({c.code})</span>
              </a>
            ))}
          </div>
        </div>

        {/* SEO Tag Cloud */}
        <div className="pt-4 border-t border-slate-900/80">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">
            {t.seo.keywordsTitle}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {activeKeywords.map((kw, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[10px] text-slate-400 font-medium hover:text-cyan-300 hover:border-cyan-500/30 transition-colors cursor-default"
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
