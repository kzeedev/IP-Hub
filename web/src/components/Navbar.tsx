import React from 'react';
import { Network, Database, Layers, Calculator, ListPlus, Globe2, Compass, GitBranch, Bug, Settings, Sun, Moon } from 'lucide-react';
import { ActiveView } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { getRouteUrl } from '../utils/router';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onMyIpClick: () => void;
  isLoadingMyIp: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onMyIpClick,
  isLoadingMyIp,
  isDarkTheme,
  onToggleTheme,
}) => {
  const { language, t, isRtl } = useLanguage();

  const handleNavClick = (e: React.MouseEvent, view: ActiveView) => {
    // Only intercept normal left clicks without modifier keys (Cmd/Ctrl/Shift/Alt)
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
      e.preventDefault();
      setActiveView(view);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href={getRouteUrl('lookup', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'lookup')}
              className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Network className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                    {t.brand}
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hidden md:inline-block">
                    RIPE &amp; GeoIP
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden xl:block leading-none mt-0.5">
                  {t.tagline}
                </p>
              </div>
            </a>
          </div>

          {/* Center Navigation Buttons (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-semibold">
            <a
              id="nav-btn-lookup"
              href={getRouteUrl('lookup', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'lookup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'lookup'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.nav.singleLookup}</span>
            </a>

            <a
              id="nav-btn-country-ips"
              href={getRouteUrl('country-ips', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'country-ips')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'country-ips'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{t.nav.countryIps}</span>
            </a>

            <a
              id="nav-btn-batch"
              href={getRouteUrl('batch', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'batch'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>{t.nav.batch}</span>
            </a>

            <a
              id="nav-btn-subnet"
              href={getRouteUrl('subnet-calc', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'subnet-calc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'subnet-calc'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t.nav.subnetCalc}</span>
            </a>

            <a
              id="nav-btn-source"
              href={getRouteUrl('source', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'source')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'source'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{t.nav.source}</span>
            </a>

            <a
              id="nav-btn-issues"
              href={getRouteUrl('issues', { lang: language })}
              hrefLang={language}
              onClick={(e) => handleNavClick(e, 'issues')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'issues'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>{t.nav.issues}</span>
            </a>
          </nav>

          {/* Right Controls: Language Selector, Theme Switch, My IP */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Switcher */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl transition-colors shadow-sm"
              title={isDarkTheme ? t.nav.themeLight : t.nav.themeDark}
              aria-label="Toggle Theme"
            >
              {isDarkTheme ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setActiveView('settings')}
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors shadow-sm ${
                activeView === 'settings'
                  ? 'bg-cyan-600 text-white border-cyan-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
              }`}
              title={t.nav.settings}
              aria-label="Open Settings"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* My IP Button */}
            <button
              id="btn-lookup-my-ip"
              onClick={onMyIpClick}
              disabled={isLoadingMyIp}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <Globe2 className={`w-3.5 h-3.5 ${isLoadingMyIp ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline sm:inline">{isLoadingMyIp ? t.nav.detectingIp : t.nav.myIp}</span>
            </button>

          </div>

        </div>

        {/* Responsive Mobile / Tablet Navigation Row */}
        <div className="flex xl:hidden items-center justify-start py-1.5 sm:py-2 border-t border-slate-800 gap-1 overflow-x-auto text-xs font-semibold scrollbar-none">
          <a
            href={getRouteUrl('lookup', { lang: language })}
            hrefLang={language}
            onClick={(e) => handleNavClick(e, 'lookup')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
              activeView === 'lookup' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>{t.nav.singleLookup}</span>
          </a>
          <a
            href={getRouteUrl('country-ips', { lang: language })}
            hrefLang={language}
            onClick={(e) => handleNavClick(e, 'country-ips')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
              activeView === 'country-ips' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3 h-3" />
            <span>{t.nav.countryIps}</span>
          </a>
          <a
            href={getRouteUrl('batch', { lang: language })}
            hrefLang={language}
            onClick={(e) => handleNavClick(e, 'batch')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
              activeView === 'batch' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListPlus className="w-3 h-3" />
            <span>{t.nav.batch}</span>
          </a>
          <a
            href={getRouteUrl('subnet-calc', { lang: language })}
            hrefLang={language}
            onClick={(e) => handleNavClick(e, 'subnet-calc')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
              activeView === 'subnet-calc' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3 h-3" />
            <span>{t.nav.subnetCalc}</span>
          </a>
          <a
            href={getRouteUrl('source', { lang: language })}
            hrefLang={language}
            onClick={(e) => handleNavClick(e, 'source')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
              activeView === 'source' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3 h-3" />
            <span>{t.nav.source}</span>
          </a>
          <a
            href={getRouteUrl('issues', { lang: language })}
            hrefLang={language}
            onClick={(e) => handleNavClick(e, 'issues')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer ${
              activeView === 'issues' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3 h-3" />
            <span>{t.nav.issues}</span>
          </a>
        </div>

      </div>
    </header>
  );
};
