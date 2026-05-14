import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useIPAM } from './store/IPAMContext';
import { useTheme, ThemeMode } from './store/ThemeContext';
import { NetworkVisualizer } from './components/NetworkVisualizer';
import { AllocationModal } from './components/AllocationModal';
import { SettingsModal } from './components/SettingsModal';
import { BaseNetworkModal } from './components/BaseNetworkModal';
import { CommitModal } from './components/CommitModal';
import { HistoryModal } from './components/HistoryModal';
import { Search, Plus, Settings, Download, Upload, AlertCircle, RefreshCw, Hash, Network, Moon, Sun, Languages, Trash2, Edit2, CheckCircle2, Monitor, History } from 'lucide-react';
import { IPAMData, isValidCIDR, getSize, formatNumber } from './lib/ipam';

export default function App() {
  const { t, i18n } = useTranslation();
  const { data, remoteData, gitlabConfig, importData, isLoading, error, refresh, addBaseNetwork, removeBaseNetwork } = useIPAM();
  const { themeMode, setThemeMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [initialAllocCidr, setInitialAllocCidr] = useState('');
  const [editingAlloc, setEditingAlloc] = useState<any>(null);
  const [showBaseModal, setShowBaseModal] = useState(false);
  const [editingBase, setEditingBase] = useState<any>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { totalBaseIPs, totalAllocatedIPs, totalUsagePercent } = useMemo(() => {
    const bIPs = data.baseNetworks.reduce((acc, b) => acc + getSize(b.cidr), 0);
    const aIPs = data.allocations.reduce((acc, a) => acc + getSize(a.cidr), 0);
    const pct = bIPs > 0 ? (aIPs / bIPs) * 100 : 0;
    return { totalBaseIPs: bIPs, totalAllocatedIPs: aIPs, totalUsagePercent: pct };
  }, [data]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    data.allocations.forEach(a => a.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [data.allocations]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipam-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content) as IPAMData;
        if (!importedData.baseNetworks || !importedData.allocations) {
          throw new Error("Invalid format");
        }
        await importData(importedData);
        alert("Data imported successfully!");
      } catch (err) {
        alert("Failed to parse JSON file. Ensure it is a valid IPAM export.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasChanges = useMemo(() => {
    if (!remoteData || !gitlabConfig.enabled) return false;
    return JSON.stringify(data) !== JSON.stringify(remoteData);
  }, [data, remoteData, gitlabConfig]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClick = () => {
      setLangDropdownOpen(false);
      setThemeDropdownOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Network size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex-shrink-0">{t('IPAM Matrix')}</h1>
            
            {gitlabConfig.enabled && (
              <div className="hidden sm:flex items-center gap-2 ml-4">
                <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full border border-green-200 dark:border-green-800/50 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-green-500" />
                  {t('GitLab Sync')}
                </span>
                
                {hasChanges && (
                  <button 
                    onClick={() => setShowCommitModal(true)}
                    className="flex text-xs font-medium items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full shadow-sm transition"
                  >
                    {t('Commit Changes')}
                  </button>
                )}

                <button 
                  onClick={() => setShowHistoryModal(true)}
                  className="flex text-xs font-medium items-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 transition"
                  title={t('Commit History')}
                >
                  <History size={14} />
                  {t('History')}
                </button>
              </div>
            )}
            {isLoading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setLangDropdownOpen(!langDropdownOpen); setThemeDropdownOpen(false); }}
                className="p-2 flex items-center gap-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition" title={t('Language')}
              >
                <Languages size={18} />
                <span className="text-xs font-medium hidden sm:inline">{i18n.language === 'zh' ? '中文' : 'English'}</span>
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-1 sm:mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col z-50">
                  <button onClick={() => {i18n.changeLanguage('en'); setLangDropdownOpen(false);}} className={`text-left px-4 py-2 text-sm ${i18n.language === 'en' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>English</button>
                  <button onClick={() => {i18n.changeLanguage('zh'); setLangDropdownOpen(false);}} className={`text-left px-4 py-2 text-sm ${i18n.language === 'zh' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>中文</button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setThemeDropdownOpen(!themeDropdownOpen); setLangDropdownOpen(false); }}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition" title={t('Theme')}
              >
                {themeMode === 'dark' ? <Moon size={18} /> : themeMode === 'light' ? <Sun size={18} /> : <Monitor size={18} />}
              </button>
              {themeDropdownOpen && (
                <div className="absolute right-0 mt-1 sm:mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col z-50">
                  <button onClick={() => {setThemeMode('auto'); setThemeDropdownOpen(false);}} className={`flex items-center gap-2 px-4 py-2 text-sm ${themeMode === 'auto' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}><Monitor size={14}/> {t('Auto')}</button>
                  <button onClick={() => {setThemeMode('light'); setThemeDropdownOpen(false);}} className={`flex items-center gap-2 px-4 py-2 text-sm ${themeMode === 'light' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}><Sun size={14}/> {t('Light')}</button>
                  <button onClick={() => {setThemeMode('dark'); setThemeDropdownOpen(false);}} className={`flex items-center gap-2 px-4 py-2 text-sm ${themeMode === 'dark' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}><Moon size={14}/> {t('Dark')}</button>
                </div>
              )}
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button onClick={handleExport} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition" title={t('Export JSON')}>
              <Download size={18} />
            </button>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition" title={t('Import JSON')}>
              <Upload size={18} />
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition" title={t('Settings')}>
              <Settings size={18} />
            </button>
            <button onClick={() => { setInitialAllocCidr(''); setEditingAlloc(null); setShowAllocModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
              <Plus size={16} />
              <span className="hidden sm:inline">{t('Allocate IP')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar - Filters & Stats */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6 hidden md:block">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t('Filter by Tag')}</h2>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTag(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTag === null ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                {t('All')}
              </button>
              {allTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  <Hash size={12} className="inline mr-1 opacity-60" />
                  {tag}
                </button>
              ))}
              {allTags.length === 0 && <span className="text-sm text-slate-400">{t('No tags used yet.')}</span>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t('Quick Stats')}</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('Total Allocations')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{data.allocations.length}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t('Base Networks')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{data.baseNetworks.length}</span>
              </li>
              <li className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-3">
                <span className="text-slate-500 dark:text-slate-400">{t('Total Base IPs')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(totalBaseIPs)}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('Total Allocated IPs')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatNumber(totalAllocatedIPs)}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t('Global Usage')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalUsagePercent.toFixed(2)}%</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex justify-between items-center">
              {t('Base Networks')}
              <button 
                 onClick={() => {
                   setEditingBase(null);
                   setShowBaseModal(true);
                 }}
                 className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 transition-colors"
                 title={t("Add Base Network")}
              >
                <Plus size={14} />
              </button>
            </h2>
            <ul className="space-y-2 text-sm">
              {data.baseNetworks.map(base => (
                <li key={base.cidr} className="flex justify-between items-start group py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
                  <div className="flex flex-col min-w-0">
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{base.cidr}</span>
                    <span className="text-xs text-slate-500 truncate mt-0.5">{base.description || t('No description')}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingBase(base);
                        setShowBaseModal(true);
                      }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title={t("Edit Base Network")}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`${t('Are you sure you want to remove base network')} ${base.cidr}?`)) {
                          removeBaseNetwork(base.cidr);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                      title={t("Remove Base Network")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Right Content - Visualizer */}
        <div className="flex-1 min-w-0 flex flex-col">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-red-800 dark:text-red-300 flex-1">
                <p className="font-semibold">{t('Sync Error')}</p>
                <p className="opacity-90">{error}</p>
                <button onClick={refresh} className="mt-2 text-xs font-medium underline">{t('Retry')}</button>
              </div>
            </div>
          )}

          <div className="mb-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={t('Search placeholder')} 
              className="w-full pl-10 pr-16 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
              <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">Ctrl</span>
              <span>+</span>
              <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">K</span>
            </div>
          </div>

          <NetworkVisualizer 
             searchQuery={searchQuery} 
             activeTag={activeTag} 
             onAllocateBase={(cidr) => {
               setInitialAllocCidr(cidr);
               setEditingAlloc(null);
               setShowAllocModal(true);
             }}
             onEditAllocation={(alloc) => {
               setEditingAlloc(alloc);
               setInitialAllocCidr('');
               setShowAllocModal(true);
             }}
          />
        </div>
      </main>

      {/* Modals */}
      {showAllocModal && <AllocationModal onClose={() => setShowAllocModal(false)} initialCidr={initialAllocCidr} editData={editingAlloc} />}
      {showBaseModal && <BaseNetworkModal onClose={() => setShowBaseModal(false)} editData={editingBase} />}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
      {showCommitModal && <CommitModal onClose={() => setShowCommitModal(false)} />}
      {showHistoryModal && <HistoryModal onClose={() => setShowHistoryModal(false)} />}
      
    </div>
  );
}
