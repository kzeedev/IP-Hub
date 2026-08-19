import React from 'react';
import { Settings, ShieldCheck, Globe, Moon, Sun, CheckCircle2, Server } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface SettingsModalProps {
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isDarkTheme, onToggleTheme, onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-slate-850 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.settingsModal.title}</h2>
              <p className="text-xs text-slate-400">IP-Hub v2.0</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
            v2.0.0
          </span>
        </div>

        <div className="space-y-4 text-xs">
          
          {/* Status */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-slate-400 block">{t.settingsModal.status}</span>
                <span className="font-semibold text-white">{t.settingsModal.connected}</span>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              200 OK
            </span>
          </div>

          {/* Language Switch */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-slate-400 block">{t.settingsModal.language}</span>
                <span className="font-semibold text-white">English / فارسی</span>
              </div>
            </div>
            <LanguageSelector />
          </div>

          {/* Theme Preference */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkTheme ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-cyan-400" />}
              <div>
                <span className="text-slate-400 block">{t.settingsModal.theme}</span>
                <span className="font-semibold text-white">{isDarkTheme ? t.nav.themeDark : t.nav.themeLight}</span>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold"
            >
              Toggle
            </button>
          </div>

        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30"
          >
            {t.settingsModal.close}
          </button>
        </div>

      </div>
    </div>
  );
};
