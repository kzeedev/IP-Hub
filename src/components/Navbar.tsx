import React from 'react';
import { Network, Database, Layers, Calculator, ListPlus, Globe2, Compass, GitBranch, Bug, Settings, Sun, Moon } from 'lucide-react';
import { ActiveView } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

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
  const { t, isRtl } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setActiveView('lookup')}
              className="flex items-center gap-2 sm:gap-3 text-left focus:outline-none group"
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
            </button>
          </div>

          {/* Center Navigation Buttons (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-semibold">
            <button
              id="nav-btn-lookup"
              onClick={() => setActiveView('lookup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'lookup'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t.nav.singleLookup}</span>
            </button>

            <button
              id="nav-btn-country-ips"
              onClick={() => setActiveView('country-ips')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'country-ips'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>{t.nav.countryIps}</span>
            </button>

            <button
              id="nav-btn-batch"
              onClick={() => setActiveView('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'batch'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>{t.nav.batch}</span>
            </button>

            <button
              id="nav-btn-subnet"
              onClick={() => setActiveView('subnet-calc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'subnet-calc'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t.nav.subnetCalc}</span>
            </button>

            <button
              id="nav-btn-source"
              onClick={() => setActiveView('source')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'source'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{t.nav.source}</span>
            </button>

            <button
              id="nav-btn-issues"
              onClick={() => setActiveView('issues')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeView === 'issues'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>{t.nav.issues}</span>
            </button>
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
          <button
            onClick={() => setActiveView('lookup')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs ${
              activeView === 'lookup' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>{t.nav.singleLookup}</span>
          </button>
          <button
            onClick={() => setActiveView('country-ips')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs ${
              activeView === 'country-ips' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3 h-3" />
            <span>{t.nav.countryIps}</span>
          </button>
          <button
            onClick={() => setActiveView('batch')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs ${
              activeView === 'batch' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListPlus className="w-3 h-3" />
            <span>{t.nav.batch}</span>
          </button>
          <button
            onClick={() => setActiveView('subnet-calc')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs ${
              activeView === 'subnet-calc' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3 h-3" />
            <span>{t.nav.subnetCalc}</span>
          </button>
          <button
            onClick={() => setActiveView('source')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs ${
              activeView === 'source' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3 h-3" />
            <span>{t.nav.source}</span>
          </button>
          <button
            onClick={() => setActiveView('issues')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 text-[11px] sm:text-xs ${
              activeView === 'issues' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3 h-3" />
            <span>{t.nav.issues}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
