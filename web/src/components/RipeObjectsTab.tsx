import React, { useState } from 'react';
import { RipeObject } from '../types';
import { Database, Search, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';
import { useLanguage } from '../i18n/LanguageContext';

interface RipeObjectsTabProps {
  objects?: RipeObject[];
  onSearchResource: (res: string) => void;
}

export const RipeObjectsTab: React.FC<RipeObjectsTabProps> = ({ objects = [], onSearchResource }) => {
  const { t } = useLanguage();
  const [filterText, setFilterText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    if (!text) return;
    copyToClipboard(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const safeObjects = Array.isArray(objects) ? objects.filter(Boolean) : [];

  const objectTypes: string[] = Array.from(
    new Set(safeObjects.map(o => o?.type).filter((t): t is string => Boolean(t)))
  );

  const filteredObjects = safeObjects.filter(obj => {
    if (!obj) return false;
    const objType = obj.type || '';
    const primaryKey = obj.primaryKey || '';

    if (selectedType !== 'all' && objType !== selectedType) return false;
    if (!filterText.trim()) return true;

    const query = filterText.toLowerCase();
    if (objType.toLowerCase().includes(query) || primaryKey.toLowerCase().includes(query)) return true;

    return obj.attributes?.some(attr => {
      const name = attr?.name || '';
      const val = attr?.value != null ? String(attr.value) : '';
      return name.toLowerCase().includes(query) || val.toLowerCase().includes(query);
    });
  });

  return (
    <div className="space-y-6">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-850 p-4 rounded-2xl border border-slate-800">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder={t.ripeObjectsTab.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Type pills filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedType === 'all'
                ? 'bg-cyan-600 text-white shadow-sm font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {t.ripeObjectsTab.allTypes} ({safeObjects.length})
          </button>
          {objectTypes.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono whitespace-nowrap uppercase transition-colors ${
                selectedType === type
                  ? 'bg-cyan-600 text-white shadow-sm font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

      </div>

      {/* Objects Listing */}
      {filteredObjects.length === 0 ? (
        <div className="text-center py-12 bg-slate-850 rounded-2xl border border-slate-800 text-slate-400">
          <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium">{t.ripeObjectsTab.noObjects}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredObjects.map((obj, objIdx) => {
            const objectBadgeColors: Record<string, string> = {
              inetnum: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
              inet6num: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
              organisation: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
              person: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
              role: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
              route: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
              'aut-num': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
              mntner: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
            };
            const objType = obj.type ? obj.type.toLowerCase() : 'unknown';
            const badgeClass = objectBadgeColors[objType] || 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';

            return (
              <div key={objIdx} className="bg-slate-850 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                
                {/* Object Header */}
                <div className="bg-slate-900/80 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-md border ${badgeClass}`}>
                      {obj.type || 'OBJECT'}
                    </span>
                    <span className="font-mono text-sm font-semibold text-white truncate">
                      {obj.primaryKey || '—'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {obj.attributes?.length || 0} attributes
                  </span>
                </div>

                {/* Attributes Table */}
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <tbody>
                      {obj.attributes?.map((attr, attrIdx) => {
                        const attrName = attr?.name || '';
                        const attrVal = attr?.value != null ? String(attr.value) : '';
                        const nameLower = attrName.toLowerCase();
                        const isLinkable = ['admin-c', 'tech-c', 'org', 'organisation', 'origin', 'mnt-by', 'abuse-c', 'person', 'role'].includes(nameLower);
                        const isEmail = nameLower.includes('email') || nameLower.includes('abuse-mailbox') || attrVal.includes('@');
                        const copyId = `${objIdx}_${attrIdx}`;

                        return (
                          <tr
                            key={attrIdx}
                            className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2.5 px-5 w-44 font-semibold text-slate-400 whitespace-nowrap align-top select-none">
                              {attrName}
                            </td>
                            <td className="py-2.5 px-5 text-slate-200 align-top break-all">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  {isLinkable ? (
                                    <button
                                      onClick={() => onSearchResource(attrVal)}
                                      className="text-cyan-400 hover:text-cyan-300 underline font-semibold hover:bg-cyan-500/10 px-1 rounded -ml-1 transition-colors"
                                      title="Inspect object"
                                    >
                                      {attrVal}
                                    </button>
                                  ) : isEmail ? (
                                    <a
                                      href={`mailto:${attrVal}`}
                                      className="text-emerald-400 hover:underline font-semibold"
                                    >
                                      {attrVal}
                                    </a>
                                  ) : (
                                    <span>{attrVal}</span>
                                  )}
                                  {attr?.comment && (
                                    <span className="text-slate-500 ml-2 italic">#{attr.comment}</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleCopy(copyId, attrVal)}
                                  className="text-slate-500 hover:text-slate-300 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity shrink-0"
                                  title="Copy value"
                                >
                                  {copiedKey === copyId ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
